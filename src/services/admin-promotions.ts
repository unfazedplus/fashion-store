import { supabase } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";

export type CouponDiscountType = "percentage" | "fixed";

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  currency: CurrencyCode | null;
  minimum_order_amount: number;
  maximum_uses: number | null;
  use_count: number;
  pendingUses: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminCouponInput {
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  currency: CurrencyCode | null;
  minimum_order_amount: number;
  maximum_uses: number | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

interface AdminCouponRow extends Omit<AdminCoupon, "pendingUses"> {
  orders: Array<{ id: string; status: string }>;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function normalizeCouponInput(input: AdminCouponInput): AdminCouponInput {
  const code = input.code.trim().toUpperCase();
  const description = input.description?.trim() || null;

  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
    throw new Error("Use 3–32 uppercase letters, numbers, hyphens, or underscores for the code.");
  }

  if (!Number.isSafeInteger(input.discount_value) || input.discount_value <= 0) {
    throw new Error("Discount value must be greater than zero.");
  }

  if (input.discount_type === "percentage" && input.discount_value > 100) {
    throw new Error("Percentage discounts cannot exceed 100%.");
  }

  if (input.discount_type === "fixed" && !input.currency) {
    throw new Error("Fixed discounts require a currency.");
  }

  if (!Number.isSafeInteger(input.minimum_order_amount) || input.minimum_order_amount < 0) {
    throw new Error("Minimum order amount must be zero or more.");
  }

  if (!input.currency && input.minimum_order_amount !== 0) {
    throw new Error("Global percentage coupons cannot have a currency-specific minimum order amount.");
  }

  if (
    input.maximum_uses !== null &&
    (!Number.isSafeInteger(input.maximum_uses) || input.maximum_uses <= 0)
  ) {
    throw new Error("Maximum uses must be a positive whole number.");
  }

  if (input.starts_at && Number.isNaN(Date.parse(input.starts_at))) {
    throw new Error("Enter a valid promotion start date.");
  }

  if (input.ends_at && Number.isNaN(Date.parse(input.ends_at))) {
    throw new Error("Enter a valid promotion end date.");
  }

  if (
    input.starts_at &&
    input.ends_at &&
    new Date(input.starts_at).getTime() >= new Date(input.ends_at).getTime()
  ) {
    throw new Error("The promotion end date must be after its start date.");
  }

  return {
    ...input,
    code,
    description,
    minimum_order_amount: input.currency ? input.minimum_order_amount : 0,
  };
}

function throwAdminCouponError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new Error("A promotion with this code already exists.");
  }

  throw new Error(error.message);
}

export async function getAdminCoupons(): Promise<AdminCoupon[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("coupons")
    .select(`
      id,
      code,
      description,
      discount_type,
      discount_value,
      currency,
      minimum_order_amount,
      maximum_uses,
      use_count,
      starts_at,
      ends_at,
      active,
      created_at,
      updated_at,
      orders(id,status)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throwAdminCouponError(error);
  }

  return ((data ?? []) as unknown as AdminCouponRow[]).map(({ orders, ...coupon }) => ({
    ...coupon,
    pendingUses: (orders ?? []).filter((order) => order.status === "pending_payment").length,
  }));
}

export async function createAdminCoupon(input: AdminCouponInput) {
  const client = requireSupabase();
  const normalizedInput = normalizeCouponInput(input);
  const { error } = await client.from("coupons").insert(normalizedInput);

  if (error) {
    throwAdminCouponError(error);
  }
}

export async function updateAdminCoupon(couponId: string, input: AdminCouponInput) {
  const client = requireSupabase();
  const normalizedInput = normalizeCouponInput(input);
  const { error } = await client
    .from("coupons")
    .update(normalizedInput)
    .eq("id", couponId);

  if (error) {
    throwAdminCouponError(error);
  }
}

export async function setAdminCouponActive(couponId: string, active: boolean) {
  const client = requireSupabase();
  const { error } = await client
    .from("coupons")
    .update({ active })
    .eq("id", couponId);

  if (error) {
    throwAdminCouponError(error);
  }
}
