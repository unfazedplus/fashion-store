import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { initializePaystackTransaction } from "../_shared/paystack.ts";
import { getShippingAmount } from "../_shared/shipping.ts";

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
