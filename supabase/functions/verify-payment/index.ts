import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { verifyPaystackTransaction } from "../_shared/paystack.ts";

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
