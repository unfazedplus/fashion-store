import { supabase } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";

export interface CustomerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface CustomerAddress {
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
}

export interface CustomerOrderItem {
  id: string;
  product_name: string;
  variant_description: string;
  quantity: number;
  line_total: number;
}

export interface CustomerOrderShipment {
  id: string;
  carrier: string | null;
  service: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: CurrencyCode;
  coupon_code: string | null;
  discount_amount: number;
  created_at: string;
  shipping_method: string;
  order_items: CustomerOrderItem[];
  shipments: CustomerOrderShipment[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export async function getCustomerProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id,first_name,last_name,phone")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as CustomerProfile;
}

export async function updateCustomerProfile(
  userId: string,
  profile: Pick<CustomerProfile, "first_name" | "last_name" | "phone">,
) {
  const client = requireSupabase();
  const { error } = await client.from("profiles").update(profile).eq("id", userId);

  if (error) {
    throw error;
  }

  const { error: userError } = await client.auth.updateUser({
    data: {
      first_name: profile.first_name,
      last_name: profile.last_name,
    },
  });

  if (userError) {
    throw userError;
  }
}

export async function getCustomerAddresses(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("addresses")
    .select("id,label,first_name,last_name,phone,address_line_1,address_line_2,city,region,postal_code,country_code,is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as CustomerAddress[];
}

export async function createCustomerAddress(
  userId: string,
  address: Omit<CustomerAddress, "id" | "is_default"> & { is_default?: boolean },
) {
  const client = requireSupabase();

  if (address.is_default) {
    const { error: clearError } = await client
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);

    if (clearError) {
      throw clearError;
    }
  }

  const { error } = await client.from("addresses").insert({
    user_id: userId,
    ...address,
    is_default: address.is_default ?? false,
  });

  if (error) {
    throw error;
  }
}

export async function deleteCustomerAddress(addressId: string) {
  const client = requireSupabase();
  const { error } = await client.from("addresses").delete().eq("id", addressId);

  if (error) {
    throw error;
  }
}

export async function setDefaultCustomerAddress(userId: string, addressId: string) {
  const client = requireSupabase();
  const { error: clearError } = await client
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (clearError) {
    throw clearError;
  }

  const { error } = await client
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getCustomerOrders(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      currency,
      coupon_code,
      discount_amount,
      created_at,
      shipping_method,
      order_items(id,product_name,variant_description,quantity,line_total),
      shipments(id,carrier,service,tracking_number,tracking_url,status,shipped_at,delivered_at)
    `)
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as CustomerOrder[];
}
