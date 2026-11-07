export type ProductStatus = "draft" | "active" | "archived";

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  prices: PriceBook;
  compareAtPrices?: Partial<PriceBook>;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  brand: string;
  images: ProductImage[];
  variants: ProductVariant[];
  tags: string[];
  materials: string;
  careInstructions: string;
  featured: boolean;
  status: ProductStatus;
}
import type { PriceBook } from "./market";
