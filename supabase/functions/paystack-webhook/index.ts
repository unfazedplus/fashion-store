import { createClient } from "npm:@supabase/supabase-js@2";
import { createPaystackSignature, signaturesMatch, verifyPaystackTransaction } from "../_shared/paystack.ts";

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = Deno.env.get("UNFAZED_SUPABASE_SECRET_KEY");
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  if (!supabaseUrl || !supabaseSecretKey || !paystackSecretKey) {
    return new Response("Service unavailable", { status: 503 });
  }

  const requestBody = await request.text();
  const suppliedSignature = request.headers.get("x-paystack-signature") ?? "";
  const expectedSignature = await createPaystackSignature(paystackSecretKey, requestBody);

  if (!signaturesMatch(suppliedSignature, expectedSignature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(requestBody) as {
    event: string;
    data?: { reference?: string };
  };

  if (event.event !== "charge.success" || !event.data?.reference) {
    return new Response("ok", { status: 200 });
  }

  try {
    const transaction = await verifyPaystackTransaction(paystackSecretKey, event.data.reference);
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,total,currency,status")
      .eq("payment_reference", transaction.reference)
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Order not found");
    }

    if (
      transaction.status !== "success" ||
      transaction.amount !== order.total ||
      transaction.currency !== order.currency
    ) {
      throw new Error("Payment verification mismatch");
    }

    const { error: paidOrderError } = await supabase.rpc("mark_order_paid", {
      p_reference: transaction.reference,
      p_provider_transaction_id: String(transaction.id),
      p_provider_response: transaction,
      p_paid_at: transaction.paid_at ?? new Date().toISOString(),
    });

    if (paidOrderError) {
      throw paidOrderError;
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
