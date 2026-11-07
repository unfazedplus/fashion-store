// Generated for Supabase Dashboard deployment. Edit the canonical files in supabase/functions.
import { createClient } from "npm:@supabase/supabase-js@2";



type CurrencyCode = "NGN" | "USD";
type OrderEmailEvent = "order_paid" | "order_shipped" | "order_delivered";

interface QueuedEmail {
  id: string;
  order_id: string;
  event: OrderEmailEvent;
  recipient_email: string;
  attempt_count: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface Shipment {
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryName?: string;
  countryCode?: string;
}

interface OrderRecord {
  id: string;
  order_number: string;
  customer_id: string | null;
  email: string;
  currency: CurrencyCode;
  subtotal: number;
  shipping_amount: number;
  tax_amount: number;
  duty_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  status: string;
  shipping_method: string;
  shipping_address: ShippingAddress;
  paid_at: string | null;
  order_items: OrderItem[];
  shipments: Shipment[];
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const resendApiUrl = "https://api.resend.com/emails";
const maximumAttempts = 8;
const retryDelayMinutes = [1, 5, 15, 60, 180, 360, 720];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function secretsMatch(firstValue: string, secondValue: string) {
  if (firstValue.length !== secondValue.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < firstValue.length; index += 1) {
    difference |= firstValue.charCodeAt(index) ^ secondValue.charCodeAt(index);
  }
  return difference === 0;
}

function getSuppliedApiKey(request: Request) {
  const apiKey = request.headers.get("apikey")?.trim();
  if (apiKey) {
    return apiKey;
  }

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(amountInMinorUnits: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "NGN" ? 0 : 2,
  }).format(amountInMinorUnits / 100);
}

function normalizeSiteUrl(siteUrl: string) {
  const parsedUrl = new URL(siteUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("SITE_URL must use HTTP or HTTPS");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

function safeWebUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl.toString()
      : null;
  } catch {
    return null;
  }
}

function getAddressLines(address: ShippingAddress) {
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.addressLine1,
    address.addressLine2,
    [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
    address.countryName ?? address.countryCode,
  ].filter((line): line is string => Boolean(line));
}

function getGreetingName(order: OrderRecord) {
  return order.shipping_address.firstName?.trim() || "there";
}

function buildItemTable(order: OrderRecord) {
  const rows = order.order_items.map((item) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e7e5e4;vertical-align:top;">
        <div style="font-weight:800;color:#171717;">${escapeHtml(item.product_name)}</div>
        <div style="margin-top:4px;color:#737373;font-size:13px;">${escapeHtml(item.variant_description)} · Qty ${item.quantity}</div>
      </td>
      <td style="padding:16px 0;border-bottom:1px solid #e7e5e4;text-align:right;vertical-align:top;font-weight:800;color:#171717;white-space:nowrap;">
        ${escapeHtml(formatCurrency(item.line_total, order.currency))}
      </td>
    </tr>
  `).join("");

  return `<table role="presentation" style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function buildTotalsTable(order: OrderRecord) {
  const rows = [
    ["Subtotal", formatCurrency(order.subtotal, order.currency)],
    ["Shipping", formatCurrency(order.shipping_amount, order.currency)],
    ...(order.tax_amount > 0 ? [["Tax", formatCurrency(order.tax_amount, order.currency)]] : []),
    ...(order.duty_amount > 0 ? [["Duties", formatCurrency(order.duty_amount, order.currency)]] : []),
    ...(order.discount_amount > 0
      ? [[`Discount${order.coupon_code ? ` · ${order.coupon_code}` : ""}`, `-${formatCurrency(order.discount_amount, order.currency)}`]]
      : []),
  ];

  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:18px;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:5px 0;color:#737373;">${escapeHtml(label)}</td>
          <td style="padding:5px 0;text-align:right;font-weight:700;color:#171717;">${escapeHtml(value)}</td>
        </tr>
      `).join("")}
      <tr>
        <td style="padding:14px 0 0;border-top:1px solid #d6d3d1;font-size:18px;font-weight:900;color:#171717;">Total</td>
        <td style="padding:14px 0 0;border-top:1px solid #d6d3d1;text-align:right;font-size:18px;font-weight:900;color:#171717;">${escapeHtml(formatCurrency(order.total, order.currency))}</td>
      </tr>
    </table>
  `;
}

function buildPlainTextItems(order: OrderRecord) {
  return order.order_items
    .map((item) => `${item.product_name} — ${item.variant_description} — Qty ${item.quantity} — ${formatCurrency(item.line_total, order.currency)}`)
    .join("\n");
}

function buildPlainTextTotals(order: OrderRecord) {
  return [
    `Subtotal: ${formatCurrency(order.subtotal, order.currency)}`,
    `Shipping: ${formatCurrency(order.shipping_amount, order.currency)}`,
    ...(order.tax_amount > 0 ? [`Tax: ${formatCurrency(order.tax_amount, order.currency)}`] : []),
    ...(order.duty_amount > 0 ? [`Duties: ${formatCurrency(order.duty_amount, order.currency)}`] : []),
    ...(order.discount_amount > 0
      ? [`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}: -${formatCurrency(order.discount_amount, order.currency)}`]
      : []),
    `Total: ${formatCurrency(order.total, order.currency)}`,
  ].join("\n");
}

function buildEmailDocument(
  preheader: string,
  heading: string,
  content: string,
  actionLabel: string,
  actionUrl: string,
  supportEmail: string,
) {
  const supportLine = supportEmail
    ? `Questions? Reply to this email or contact <a href="mailto:${escapeHtml(supportEmail)}" style="color:#e11d48;">${escapeHtml(supportEmail)}</a>.`
    : "Questions? Reply to this email and our team will help.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#171717;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f5f5f4;">
      <tr>
        <td style="padding:28px 14px;">
          <table role="presentation" style="width:100%;max-width:620px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:24px 30px;background:#0a0a0a;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:0.18em;">UNFAZED</td>
            </tr>
            <tr>
              <td style="padding:34px 30px;">
                <h1 style="margin:0;font-size:30px;line-height:1.15;">${escapeHtml(heading)}</h1>
                <div style="margin-top:22px;font-size:15px;line-height:1.65;color:#404040;">${content}</div>
                <a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:26px;padding:13px 20px;border-radius:999px;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:800;">${escapeHtml(actionLabel)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#fafaf9;color:#737373;font-size:12px;line-height:1.6;">
                ${supportLine}<br>
                This transactional message was sent because an order was placed using this email address.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function createPaidEmail(order: OrderRecord, siteUrl: string, supportEmail: string): EmailContent {
  const orderUrl = order.customer_id ? `${siteUrl}/account/orders` : `${siteUrl}/shop`;
  const addressLines = getAddressLines(order.shipping_address);
  const heading = "Your order is confirmed";
  const content = `
    <p style="margin:0;">Hi ${escapeHtml(getGreetingName(order))},</p>
    <p style="margin:14px 0 0;">Payment is confirmed for order <strong>${escapeHtml(order.order_number)}</strong>. We’ll let you know when it leaves our studio.</p>
    <div style="margin-top:24px;padding:18px;border-radius:14px;background:#fafaf9;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#e11d48;">Order summary</div>
      ${buildItemTable(order)}
      ${buildTotalsTable(order)}
    </div>
    <div style="margin-top:24px;">
      <strong>Delivery address</strong><br>
      ${addressLines.map((line) => escapeHtml(line)).join("<br>")}
    </div>
  `;

  return {
    subject: `Order ${order.order_number} confirmed`,
    html: buildEmailDocument(
      `Payment confirmed for ${order.order_number}.`,
      heading,
      content,
      order.customer_id ? "View your orders" : "Continue shopping",
      orderUrl,
      supportEmail,
    ),
    text: [
      `Hi ${getGreetingName(order)},`,
      "",
      `Payment is confirmed for order ${order.order_number}. We’ll let you know when it leaves our studio.`,
      "",
      buildPlainTextItems(order),
      "",
      buildPlainTextTotals(order),
      "",
      "Delivery address:",
      ...addressLines,
      "",
      `${order.customer_id ? "View your orders" : "Continue shopping"}: ${orderUrl}`,
    ].join("\n"),
  };
}

function createShippedEmail(order: OrderRecord, siteUrl: string, supportEmail: string): EmailContent {
  const shipment = order.shipments[0];
  if (!shipment) {
    throw new Error("Shipment data is not available for the shipped-order email");
  }

  const trackingUrl = safeWebUrl(shipment.tracking_url);
  const fallbackUrl = order.customer_id ? `${siteUrl}/account/orders` : `${siteUrl}/shop`;
  const actionUrl = trackingUrl ?? fallbackUrl;
  const heading = "Your order is on the way";
  const carrier = shipment.carrier?.trim() || "the delivery carrier";
  const trackingDetails = [
    shipment.carrier ? `<strong>Carrier:</strong> ${escapeHtml(shipment.carrier)}` : "",
    shipment.service ? `<strong>Service:</strong> ${escapeHtml(shipment.service)}` : "",
    shipment.tracking_number ? `<strong>Tracking number:</strong> ${escapeHtml(shipment.tracking_number)}` : "",
  ].filter(Boolean).join("<br>");
  const content = `
    <p style="margin:0;">Hi ${escapeHtml(getGreetingName(order))},</p>
    <p style="margin:14px 0 0;">Order <strong>${escapeHtml(order.order_number)}</strong> has been handed to ${escapeHtml(carrier)}.</p>
    <div style="margin-top:24px;padding:18px;border-radius:14px;background:#fafaf9;line-height:1.8;">
      ${trackingDetails}
    </div>
    <p style="margin:22px 0 0;">The carrier may need a little time before the first tracking update appears.</p>
  `;

  return {
    subject: `Your UNFAZED order ${order.order_number} has shipped`,
    html: buildEmailDocument(
      `Tracking is ready for ${order.order_number}.`,
      heading,
      content,
      trackingUrl ? "Track your order" : order.customer_id ? "View your orders" : "Visit UNFAZED",
      actionUrl,
      supportEmail,
    ),
    text: [
      `Hi ${getGreetingName(order)},`,
      "",
      `Order ${order.order_number} has been handed to ${carrier}.`,
      shipment.carrier ? `Carrier: ${shipment.carrier}` : "",
      shipment.service ? `Service: ${shipment.service}` : "",
      shipment.tracking_number ? `Tracking number: ${shipment.tracking_number}` : "",
      trackingUrl ? `Track your order: ${trackingUrl}` : `Order information: ${fallbackUrl}`,
    ].filter(Boolean).join("\n"),
  };
}

function createDeliveredEmail(order: OrderRecord, siteUrl: string, supportEmail: string): EmailContent {
  const heading = "Your order was delivered";
  const content = `
    <p style="margin:0;">Hi ${escapeHtml(getGreetingName(order))},</p>
    <p style="margin:14px 0 0;">Order <strong>${escapeHtml(order.order_number)}</strong> has been marked delivered.</p>
    <p style="margin:14px 0 0;">We hope you love your UNFAZED pieces. If the parcel is not with you, check with anyone at the delivery address and contact us so we can help.</p>
    <div style="margin-top:24px;padding:18px;border-radius:14px;background:#fafaf9;">
      <strong>Order total:</strong> ${escapeHtml(formatCurrency(order.total, order.currency))}
    </div>
  `;

  return {
    subject: `Order ${order.order_number} was delivered`,
    html: buildEmailDocument(
      `${order.order_number} has been marked delivered.`,
      heading,
      content,
      "Shop new arrivals",
      `${siteUrl}/shop`,
      supportEmail,
    ),
    text: [
      `Hi ${getGreetingName(order)},`,
      "",
      `Order ${order.order_number} has been marked delivered.`,
      "If the parcel is not with you, check with anyone at the delivery address and contact us so we can help.",
      "",
      `Order total: ${formatCurrency(order.total, order.currency)}`,
      `Shop new arrivals: ${siteUrl}/shop`,
    ].join("\n"),
  };
}

function createEmailContent(
  event: OrderEmailEvent,
  order: OrderRecord,
  siteUrl: string,
  supportEmail: string,
) {
  if (event === "order_paid") {
    return createPaidEmail(order, siteUrl, supportEmail);
  }
  if (event === "order_shipped") {
    return createShippedEmail(order, siteUrl, supportEmail);
  }
  return createDeliveredEmail(order, siteUrl, supportEmail);
}

async function sendWithResend(
  apiKey: string,
  from: string,
  replyTo: string,
  delivery: QueuedEmail,
  content: EmailContent,
) {
  const payload: Record<string, unknown> = {
    from,
    to: [delivery.recipient_email],
    subject: content.subject,
    html: content.html,
    text: content.text,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `unfazed-${delivery.event}-${delivery.order_id}`,
    },
    body: JSON.stringify(payload),
  });
  const responseBody = await response.json().catch(() => ({})) as {
    id?: string;
    message?: string;
    error?: string;
  };

  if (!response.ok || !responseBody.id) {
    throw new Error(responseBody.message ?? responseBody.error ?? `Email provider returned ${response.status}`);
  }

  return responseBody.id;
}

function getRetryTimestamp(attemptCount: number) {
  if (attemptCount >= maximumAttempts) {
    return null;
  }

  const delayIndex = Math.min(Math.max(attemptCount - 1, 0), retryDelayMinutes.length - 1);
  return new Date(Date.now() + retryDelayMinutes[delayIndex] * 60_000).toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const supabaseSecretKey = Deno.env.get("UNFAZED_SUPABASE_SECRET_KEY")?.trim() ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim() ?? "";
  const orderEmailFrom = Deno.env.get("ORDER_EMAIL_FROM")?.trim() ?? "";
  const supportEmail = Deno.env.get("SUPPORT_EMAIL")?.trim() ?? "";
  const siteUrlValue = Deno.env.get("SITE_URL")?.trim() ?? "";
  const suppliedApiKey = getSuppliedApiKey(request);

  if (!supabaseSecretKey || !suppliedApiKey || !secretsMatch(suppliedApiKey, supabaseSecretKey)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!supabaseUrl || !resendApiKey || !orderEmailFrom || !siteUrlValue) {
    return jsonResponse({ error: "Transactional email is not configured" }, 503);
  }

  let siteUrl: string;
  try {
    siteUrl = normalizeSiteUrl(siteUrlValue);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "SITE_URL is invalid" }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: claimError } = await supabase.rpc("claim_order_email_deliveries", {
    p_limit: 10,
  });

  if (claimError) {
    console.error(claimError);
    return jsonResponse({ error: "Unable to claim transactional emails" }, 500);
  }

  const claimedDeliveries = (data ?? []) as QueuedEmail[];
  const results: Array<{ id: string; status: "sent" | "failed" }> = [];

  for (const delivery of claimedDeliveries) {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          customer_id,
          email,
          currency,
          subtotal,
          shipping_amount,
          tax_amount,
          duty_amount,
          discount_amount,
          coupon_code,
          total,
          status,
          shipping_method,
          shipping_address,
          paid_at,
          order_items(id,product_name,variant_description,quantity,unit_price,line_total),
          shipments(carrier,service,tracking_number,tracking_url,shipped_at,delivered_at)
        `)
        .eq("id", delivery.order_id)
        .single();

      if (orderError || !orderData) {
        throw new Error(orderError?.message ?? "Order not found");
      }

      const order = orderData as unknown as OrderRecord;
      const content = createEmailContent(delivery.event, order, siteUrl, supportEmail);
      const providerMessageId = await sendWithResend(
        resendApiKey,
        orderEmailFrom,
        supportEmail,
        delivery,
        content,
      );
      const { error: sentUpdateError } = await supabase
        .from("order_email_deliveries")
        .update({
          status: "sent",
          provider_message_id: providerMessageId,
          sent_at: new Date().toISOString(),
          next_attempt_at: null,
          last_error: null,
        })
        .eq("id", delivery.id);

      if (sentUpdateError) {
        throw sentUpdateError;
      }

      results.push({ id: delivery.id, status: "sent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send transactional email";
      console.error(delivery.id, message);
      const { error: failedUpdateError } = await supabase
        .from("order_email_deliveries")
        .update({
          status: "failed",
          next_attempt_at: getRetryTimestamp(delivery.attempt_count),
          last_error: message.slice(0, 1000),
        })
        .eq("id", delivery.id);

      if (failedUpdateError) {
        console.error(failedUpdateError);
      }
      results.push({ id: delivery.id, status: "failed" });
    }
  }

  return jsonResponse({
    claimed: claimedDeliveries.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
  });
});
