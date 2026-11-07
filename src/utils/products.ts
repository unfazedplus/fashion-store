import type { Product } from "../types/product";
import type { CurrencyCode } from "../types/market";

export function getLowestVariantPrice(product: Product, currency: CurrencyCode) {
  return Math.min(...product.variants.map((variant) => variant.prices[currency]));
}

export function getHighestVariantPrice(product: Product, currency: CurrencyCode) {
  return Math.max(...product.variants.map((variant) => variant.prices[currency]));
}

export function isProductInStock(product: Product) {
  return product.variants.some((variant) => variant.stock > 0);
}
