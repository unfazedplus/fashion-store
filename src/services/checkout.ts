import { supabase, supabasePublishableKey, supabaseUrl } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";

export interface CheckoutAddress {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  countryName?: string;
}

export interface CheckoutItem {
  sku: string;
  quantity: number;
}

export interface InitializeCheckoutPayload {
  email: string;
  currency: CurrencyCode;
  shippingCountryCode: string;
  shippingMethod: "standard" | "express";
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  couponCode?: string;
  items: CheckoutItem[];
}

export interface CouponPreview {
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  totalAfterDiscount: number;
}

interface CouponPreviewRow {
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_amount: number;
  subtotal: number;
  total_after_discount: number;
}

interface InitializeCheckoutResponse {
  authorizationUrl: string;
  reference: string;
  orderId: string;
  orderNumber: string;
}

export interface PaymentVerificationResponse {
  orderNumber: string;
  status: string;
  total: number;
  currency: CurrencyCode;
}

export async function previewCheckoutCoupon(
  code: string,
  currency: CurrencyCode,
  items: CheckoutItem[],
): Promise<CouponPreview> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add the project URL and anonymous key first.");
  }

  const { data, error } = await supabase.rpc("preview_checkout_coupon", {
    p_code: code,
    p_currency: currency,
    p_items: items,
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      throw new Error("Run Dashboard coupon migrations 14 through 16 to enable coupon codes.");
    }
    throw new Error(error.message);
  }

  const preview = data as unknown as CouponPreviewRow | null;
  if (!preview?.code || !Number.isFinite(Number(preview.discount_amount))) {
    throw new Error("The coupon service returned an invalid response.");
  }

  return {
    code: preview.code,
    description: preview.description,
    discountType: preview.discount_type,
    discountValue: Number(preview.discount_value),
    discountAmount: Number(preview.discount_amount),
    subtotal: Number(preview.subtotal),
    totalAfterDiscount: Number(preview.total_after_discount),
  };
}

export async function initializeCheckout(payload: InitializeCheckoutPayload) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add the project URL and anonymous key first.");
  }

  const { data, error } = await supabase.functions.invoke<InitializeCheckoutResponse>(
    "initialize-payment",
    { body: payload },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.authorizationUrl) {
    throw new Error("The payment provider did not return a checkout URL.");
  }

  return data;
}

export async function verifyPayment(reference: string) {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/verify-payment?reference=${encodeURIComponent(reference)}`,
    {
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
    },
  );
  const payload = await response.json() as PaymentVerificationResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to verify payment.");
  }

  return payload;
}
