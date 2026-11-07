// Generated for Supabase Dashboard deployment. Edit the canonical files in supabase/functions.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const PAYSTACK_API_URL = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: {
    email: string;
  };
}

interface PaystackInitialization {
  authorization_url: string;
  access_code: string;
  reference: string;
}

async function paystackRequest<T>(path: string, secretKey: string, init?: RequestInit) {
  const response = await fetch(`${PAYSTACK_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json() as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new Error(payload.message || "Paystack request failed");
  }

  return payload.data;
}

function initializePaystackTransaction(
  secretKey: string,
  payload: {
    email: string;
    amount: number;
    currency: "NGN" | "USD";
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  },
) {
  return paystackRequest<PaystackInitialization>("/transaction/initialize", secretKey, {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      callback_url: payload.callbackUrl,
      metadata: payload.metadata,
    }),
  });
}

function verifyPaystackTransaction(secretKey: string, reference: string) {
  return paystackRequest<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    secretKey,
  );
}

async function createPaystackSignature(secretKey: string, body: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function signaturesMatch(firstSignature: string, secondSignature: string) {
  if (firstSignature.length !== secondSignature.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < firstSignature.length; index += 1) {
    difference |= firstSignature.charCodeAt(index) ^ secondSignature.charCodeAt(index);
  }

  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const reference = new URL(request.url).searchParams.get("reference");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = Deno.env.get("UNFAZED_SUPABASE_SECRET_KEY");
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  if (!reference) {
    return jsonResponse({ error: "Payment reference is required" }, 400);
  }

  if (!supabaseUrl || !supabaseSecretKey || !paystackSecretKey) {
    return jsonResponse({ error: "Payment verification is not configured" }, 503);
  }

  try {
    const transaction = await verifyPaystackTransaction(paystackSecretKey, reference);
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,order_number,total,currency,status")
      .eq("payment_reference", reference)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    if (
      transaction.status === "success" &&
      transaction.amount === order.total &&
      transaction.currency === order.currency &&
      order.status === "pending_payment"
    ) {
      const { data: paidOrder, error: paidOrderError } = await supabase.rpc("mark_order_paid", {
        p_reference: transaction.reference,
        p_provider_transaction_id: String(transaction.id),
        p_provider_response: transaction,
        p_paid_at: transaction.paid_at ?? new Date().toISOString(),
      });

      if (paidOrderError) {
        throw paidOrderError;
      }

      return jsonResponse({
        orderNumber: paidOrder.order_number,
        status: paidOrder.status,
        total: paidOrder.total,
        currency: paidOrder.currency,
      });
    }

    return jsonResponse({
      orderNumber: order.order_number,
      status: order.status,
      total: order.total,
      currency: order.currency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify payment";
    return jsonResponse({ error: message }, 400);
  }
});
