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

type CurrencyCode = "NGN" | "USD";
type ShippingMethod = "standard" | "express";
type ShippingZone = "nigeria" | "africa" | "europe" | "north-america" | "south-america" | "asia-middle-east" | "oceania" | "rest-world";

const countryZones: Record<ShippingZone, string[]> = {
  nigeria: ["NG"],
  africa: ["GH", "KE", "ZA", "EG", "MA", "TZ", "UG", "RW", "SN", "CI", "CM"],
  europe: ["GB", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "SE", "NO", "DK", "FI", "PL", "CH", "AT"],
  "north-america": ["US", "CA", "MX"],
  "south-america": ["BR", "AR", "CL", "CO", "PE"],
  "asia-middle-east": ["AE", "SA", "QA", "TR", "IN", "PK", "CN", "JP", "KR", "SG", "MY", "ID", "PH", "TH", "VN"],
  oceania: ["AU", "NZ"],
  "rest-world": [],
};

const shippingPrices: Record<ShippingZone, Record<ShippingMethod, Record<CurrencyCode, number>>> = {
  nigeria: {
    standard: { NGN: 500000, USD: 400 },
    express: { NGN: 900000, USD: 700 },
  },
  africa: {
    standard: { NGN: 3500000, USD: 2200 },
    express: { NGN: 5500000, USD: 3500 },
  },
  europe: {
    standard: { NGN: 4500000, USD: 2800 },
    express: { NGN: 7000000, USD: 4400 },
  },
  "north-america": {
    standard: { NGN: 5000000, USD: 3200 },
    express: { NGN: 8000000, USD: 5000 },
  },
  "south-america": {
    standard: { NGN: 6000000, USD: 3800 },
    express: { NGN: 9000000, USD: 5600 },
  },
  "asia-middle-east": {
    standard: { NGN: 5000000, USD: 3200 },
    express: { NGN: 8000000, USD: 5000 },
  },
  oceania: {
    standard: { NGN: 6500000, USD: 4000 },
    express: { NGN: 9500000, USD: 6000 },
  },
  "rest-world": {
    standard: { NGN: 7000000, USD: 4500 },
    express: { NGN: 10500000, USD: 6500 },
  },
};

function getShippingZone(countryCode: string): ShippingZone {
  const normalizedCountryCode = countryCode.toUpperCase();
  const matchingZone = Object.entries(countryZones).find(([, countryCodes]) =>
    countryCodes.includes(normalizedCountryCode)
  );

  return (matchingZone?.[0] as ShippingZone | undefined) ?? "rest-world";
}

function getShippingAmount(
  countryCode: string,
  shippingMethod: string,
  currency: string,
) {
  if (shippingMethod !== "standard" && shippingMethod !== "express") {
    throw new Error("Unsupported shipping method");
  }

  if (currency !== "NGN" && currency !== "USD") {
    throw new Error("Unsupported currency");
  }

  return shippingPrices[getShippingZone(countryCode)][shippingMethod][currency];
}

interface CheckoutRequest {
  email: string;
  currency: "NGN" | "USD";
  shippingCountryCode: string;
  shippingMethod: "standard" | "express";
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  couponCode?: string;
  items: Array<{ sku: string; quantity: number }>;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = Deno.env.get("UNFAZED_SUPABASE_SECRET_KEY");
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const siteUrl = Deno.env.get("SITE_URL");

  if (!supabaseUrl || !supabaseSecretKey || !paystackSecretKey || !siteUrl) {
    return jsonResponse({ error: "Checkout service is not configured" }, 503);
  }

  let checkoutRequest: CheckoutRequest;
  try {
    checkoutRequest = await request.json() as CheckoutRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (
    !checkoutRequest.email?.includes("@") ||
    !checkoutRequest.shippingCountryCode ||
    !checkoutRequest.shippingMethod ||
    !Array.isArray(checkoutRequest.items) ||
    checkoutRequest.items.length === 0
  ) {
    return jsonResponse({ error: "Incomplete checkout details" }, 400);
  }

  try {
    const shippingAmount = getShippingAmount(
      checkoutRequest.shippingCountryCode,
      checkoutRequest.shippingMethod,
      checkoutRequest.currency,
    );
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authorizationHeader = request.headers.get("Authorization");
    let customerId: string | null = null;

    if (authorizationHeader) {
      const bearerMatch = authorizationHeader.match(/^Bearer\s+(\S+)$/i);
      if (!bearerMatch) {
        return jsonResponse({ error: "Invalid authorization header" }, 401);
      }

      const { data: authData, error: authError } = await supabase.auth.getUser(bearerMatch[1]);
      if (authError || !authData.user) {
        return jsonResponse({ error: "Your session is invalid or expired. Please sign in again." }, 401);
      }

      customerId = authData.user.id;
    }

    const { data: order, error: orderError } = await supabase.rpc("create_pending_order", {
      p_customer_id: customerId,
      p_email: checkoutRequest.email,
      p_currency: checkoutRequest.currency,
      p_shipping_country_code: checkoutRequest.shippingCountryCode,
      p_shipping_method: checkoutRequest.shippingMethod,
      p_shipping_amount: shippingAmount,
      p_shipping_address: checkoutRequest.shippingAddress,
      p_billing_address: checkoutRequest.billingAddress ?? checkoutRequest.shippingAddress,
      p_items: checkoutRequest.items,
      p_coupon_code: checkoutRequest.couponCode?.trim() || null,
    });

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Unable to create order");
    }

    try {
      const transaction = await initializePaystackTransaction(paystackSecretKey, {
        email: order.email,
        amount: order.total,
        currency: order.currency,
        reference: order.payment_reference,
        callbackUrl: `${siteUrl.replace(/\/$/, "")}/checkout/complete?reference=${encodeURIComponent(order.payment_reference)}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          shipping_country_code: order.shipping_country_code,
          coupon_code: order.coupon_code,
        },
      });

      return jsonResponse({
        authorizationUrl: transaction.authorization_url,
        reference: transaction.reference,
        orderId: order.id,
        orderNumber: order.order_number,
      });
    } catch (paymentError) {
      await supabase.rpc("cancel_pending_order", { p_order_id: order.id });
      throw paymentError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize checkout";
    return jsonResponse({ error: message }, 400);
  }
});
