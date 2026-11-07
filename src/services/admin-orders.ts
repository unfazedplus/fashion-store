import { supabase } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  email: string;
  status: OrderStatus;
  total: number;
  currency: CurrencyCode;
  created_at: string;
  paid_at: string | null;
  shipping_method: string;
  shipping_country_code: string;
  itemCount: number;
  shipmentStatus: string | null;
}

export interface AdminOrderItem {
  id: string;
  sku: string;
  product_name: string;
  variant_description: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string | null;
}

export interface AdminOrderPayment {
  id: string;
  provider: string;
  provider_reference: string;
  provider_transaction_id: string | null;
  amount: number;
  currency: CurrencyCode;
  status: string;
  paid_at: string | null;
}

export interface AdminOrderShipment {
  id: string;
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export type OrderEmailEvent = "order_paid" | "order_shipped" | "order_delivered";
export type EmailDeliveryStatus = "pending" | "processing" | "sent" | "failed";

export interface AdminOrderEmailDelivery {
  id: string;
  event: OrderEmailEvent;
  recipient_email: string;
  status: EmailDeliveryStatus;
  provider: string;
  provider_message_id: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminShippingAddress {
  firstName?: string;
  lastName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  countryName?: string;
}

export interface AdminOrderDetail {
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
  status: OrderStatus;
  shipping_method: string;
  shipping_country_code: string;
  shipping_address: AdminShippingAddress;
  customer_note: string | null;
  payment_reference: string;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  order_items: AdminOrderItem[];
  payments: AdminOrderPayment[];
  shipments: AdminOrderShipment[];
  order_email_deliveries: AdminOrderEmailDelivery[];
}

interface AdminOrderListRow extends Omit<AdminOrderListItem, "itemCount" | "shipmentStatus"> {
  order_items: Array<{ id: string; quantity: number }>;
  shipments: Array<{ status: string }>;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select(`
      id,
      order_number,
      email,
      status,
      total,
      currency,
      created_at,
      paid_at,
      shipping_method,
      shipping_country_code,
      order_items(id,quantity),
      shipments(status)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as AdminOrderListRow[]).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    email: order.email,
    status: order.status,
    total: order.total,
    currency: order.currency,
    created_at: order.created_at,
    paid_at: order.paid_at,
    shipping_method: order.shipping_method,
    shipping_country_code: order.shipping_country_code,
    itemCount: order.order_items.reduce((total, item) => total + item.quantity, 0),
    shipmentStatus: order.shipments[0]?.status ?? null,
  }));
}

export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail> {
  const client = requireSupabase();
  const { data, error } = await client
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
      shipping_country_code,
      shipping_address,
      customer_note,
      payment_reference,
      paid_at,
      cancelled_at,
      created_at,
      updated_at,
      order_items(id,sku,product_name,variant_description,unit_price,quantity,line_total,image_url),
      payments(id,provider,provider_reference,provider_transaction_id,amount,currency,status,paid_at),
      shipments(id,carrier,service,tracking_number,tracking_url,status,shipped_at,delivered_at),
      order_email_deliveries(id,event,recipient_email,status,provider,provider_message_id,attempt_count,last_attempt_at,next_attempt_at,sent_at,last_error,created_at,updated_at)
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    if (error.message.includes("order_email_deliveries")) {
      throw new Error("Run dashboard migration 18_transactional_order_emails.sql before viewing notification delivery status.");
    }
    throw error;
  }

  return data as unknown as AdminOrderDetail;
}

export interface FulfilmentUpdate {
  nextStatus: "processing" | "shipped" | "delivered";
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export async function updateAdminOrderFulfilment(orderId: string, update: FulfilmentUpdate) {
  const carrier = update.carrier?.trim() ?? "";
  const service = update.service?.trim() ?? "";
  const trackingNumber = update.trackingNumber?.trim() ?? "";
  const trackingUrl = update.trackingUrl?.trim() ?? "";

  if (update.nextStatus === "shipped") {
    if (!carrier || !trackingNumber) {
      throw new Error("Carrier and tracking number are required before shipping.");
    }
    if (trackingUrl) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(trackingUrl);
      } catch {
        throw new Error("Enter a valid tracking URL.");
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Tracking URLs must use HTTP or HTTPS.");
      }
    }
  }

  const client = requireSupabase();
  const { error } = await client.rpc("admin_update_order_fulfilment", {
    p_order_id: orderId,
    p_next_status: update.nextStatus,
    p_carrier: carrier || null,
    p_service: service || null,
    p_tracking_number: trackingNumber || null,
    p_tracking_url: trackingUrl || null,
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      throw new Error("Run dashboard migration 11_admin_fulfilment.sql in Supabase before updating orders.");
    }
    throw error;
  }
}

export async function retryAdminOrderEmail(deliveryId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_retry_order_email", {
    p_delivery_id: deliveryId,
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      throw new Error("Run dashboard migration 18_transactional_order_emails.sql before retrying notifications.");
    }
    throw error;
  }
}
