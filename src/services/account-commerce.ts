import { supabase } from "../lib/supabase";
import type { CartItem } from "../types/cart";
import type { CurrencyCode } from "../types/market";

interface AccountCartRow {
  currency: CurrencyCode;
  cart_items: Array<{
    variant_id: string;
    quantity: number;
  }>;
}

interface AccountWishlistRow {
  wishlist_items: Array<{
    product_id: string;
  }>;
}

export interface AccountCommerceData {
  currency: CurrencyCode | null;
  cartItems: Array<Pick<CartItem, "variantId" | "quantity">>;
  wishlistProductIds: string[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export async function loadAccountCommerce(userId: string): Promise<AccountCommerceData> {
  const client = requireSupabase();
  const [cartResult, wishlistResult] = await Promise.all([
    client
      .from("carts")
      .select("currency,cart_items(variant_id,quantity)")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("wishlists")
      .select("wishlist_items(product_id)")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (cartResult.error) {
    throw cartResult.error;
  }
  if (wishlistResult.error) {
    throw wishlistResult.error;
  }

  const cart = cartResult.data as unknown as AccountCartRow | null;
  const wishlist = wishlistResult.data as unknown as AccountWishlistRow | null;

  return {
    currency: cart?.currency ?? null,
    cartItems: (cart?.cart_items ?? []).map((item) => ({
      variantId: item.variant_id,
      quantity: item.quantity,
    })),
    wishlistProductIds: (wishlist?.wishlist_items ?? []).map((item) => item.product_id),
  };
}

export async function saveAccountCommerce(
  userId: string,
  currency: CurrencyCode,
  cartItems: CartItem[],
  wishlistProductIds: string[],
) {
  const client = requireSupabase();
  const { error } = await client.rpc("save_account_commerce", {
    p_expected_user_id: userId,
    p_currency: currency,
    p_cart_items: cartItems.map((item) => ({
      variant_id: item.variantId,
      quantity: item.quantity,
    })),
    p_wishlist_product_ids: wishlistProductIds,
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      throw new Error("Run dashboard migration 13_account_commerce_sync.sql to enable account cart syncing.");
    }
    throw error;
  }
}
