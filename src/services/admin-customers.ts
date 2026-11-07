import { supabase } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";
import type { OrderStatus } from "./admin-orders";

export interface AdminCustomerSummary {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin";
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  address_count: number;
  order_count: number;
  paid_order_count: number;
  lifetime_spend_ngn: number;
  lifetime_spend_usd: number;
  last_order_at: string | null;
}

export interface AdminCustomerListResponse {
  customers: AdminCustomerSummary[];
  total: number;
  metrics: {
    with_orders: number;
    lifetime_spend_ngn: number;
    lifetime_spend_usd: number;
  };
}

export interface AdminCustomerAddress {
  id: string;
  label: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCustomerOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: CurrencyCode;
  discount_amount: number;
  coupon_code: string | null;
  shipping_method: string;
  shipping_country_code: string;
  paid_at: string | null;
  created_at: string;
  item_count: number;
}

export interface AdminCustomerDetail {
  customer: AdminCustomerSummary;
  addresses: AdminCustomerAddress[];
  orders: AdminCustomerOrder[];
}

interface CustomerListPayload {
  customers?: Array<Record<string, unknown>>;
  total?: number;
  metrics?: Record<string, unknown>;
}

interface CustomerDetailPayload {
  customer?: Record<string, unknown>;
  addresses?: Array<Record<string, unknown>>;
  orders?: Array<Record<string, unknown>>;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function throwCustomerRpcError(error: { message: string }): never {
  if (error.message.includes("Could not find the function")) {
    throw new Error("Run dashboard migration 17_admin_customers.sql to enable customer management.");
  }

  throw new Error(error.message);
}

function mapCustomer(value: Record<string, unknown>): AdminCustomerSummary {
  return {
    id: String(value.id ?? ""),
    email: String(value.email ?? ""),
    role: String(value.role ?? "customer") as AdminCustomerSummary["role"],
    first_name: typeof value.first_name === "string" ? value.first_name : null,
    last_name: typeof value.last_name === "string" ? value.last_name : null,
    phone: typeof value.phone === "string" ? value.phone : null,
    created_at: String(value.created_at ?? ""),
    updated_at: String(value.updated_at ?? ""),
    address_count: Number(value.address_count ?? 0),
    order_count: Number(value.order_count ?? 0),
    paid_order_count: Number(value.paid_order_count ?? 0),
    lifetime_spend_ngn: Number(value.lifetime_spend_ngn ?? 0),
    lifetime_spend_usd: Number(value.lifetime_spend_usd ?? 0),
    last_order_at: typeof value.last_order_at === "string" ? value.last_order_at : null,
  };
}

export async function listAdminCustomers(
  search = "",
  limit = 25,
  offset = 0,
): Promise<AdminCustomerListResponse> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_list_customers", {
    p_search: search.trim() || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throwCustomerRpcError(error);
  }

  const payload = (data ?? {}) as CustomerListPayload;
  const metrics = payload.metrics ?? {};

  return {
    customers: (payload.customers ?? []).map(mapCustomer),
    total: Number(payload.total ?? 0),
    metrics: {
      with_orders: Number(metrics.with_orders ?? 0),
      lifetime_spend_ngn: Number(metrics.lifetime_spend_ngn ?? 0),
      lifetime_spend_usd: Number(metrics.lifetime_spend_usd ?? 0),
    },
  };
}

export async function getAdminCustomer(customerId: string): Promise<AdminCustomerDetail> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("admin_get_customer", {
    p_customer_id: customerId,
  });

  if (error) {
    throwCustomerRpcError(error);
  }

  const payload = (data ?? {}) as CustomerDetailPayload;
  if (!payload.customer) {
    throw new Error("Customer not found.");
  }

  return {
    customer: mapCustomer(payload.customer),
    addresses: (payload.addresses ?? []).map((address) => ({
      id: String(address.id ?? ""),
      label: typeof address.label === "string" ? address.label : null,
      first_name: String(address.first_name ?? ""),
      last_name: String(address.last_name ?? ""),
      phone: String(address.phone ?? ""),
      address_line_1: String(address.address_line_1 ?? ""),
      address_line_2: typeof address.address_line_2 === "string" ? address.address_line_2 : null,
      city: String(address.city ?? ""),
      region: String(address.region ?? ""),
      postal_code: String(address.postal_code ?? ""),
      country_code: String(address.country_code ?? ""),
      is_default: Boolean(address.is_default),
      created_at: String(address.created_at ?? ""),
      updated_at: String(address.updated_at ?? ""),
    })),
    orders: (payload.orders ?? []).map((order) => ({
      id: String(order.id ?? ""),
      order_number: String(order.order_number ?? ""),
      status: String(order.status ?? "pending_payment") as OrderStatus,
      total: Number(order.total ?? 0),
      currency: String(order.currency ?? "NGN") as CurrencyCode,
      discount_amount: Number(order.discount_amount ?? 0),
      coupon_code: typeof order.coupon_code === "string" ? order.coupon_code : null,
      shipping_method: String(order.shipping_method ?? ""),
      shipping_country_code: String(order.shipping_country_code ?? ""),
      paid_at: typeof order.paid_at === "string" ? order.paid_at : null,
      created_at: String(order.created_at ?? ""),
      item_count: Number(order.item_count ?? 0),
    })),
  };
}
