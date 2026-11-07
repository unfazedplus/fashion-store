import { supabase } from "../lib/supabase";
import type { Category } from "../types/category";
import type { PriceBook } from "../types/market";
import type { Product, ProductVariant } from "../types/product";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  position: number;
}

interface ProductImageRow {
  id: string;
  external_url: string | null;
  alt_text: string;
  position: number;
}

interface VariantPriceRow {
  currency: string;
  amount: number;
  compare_at_amount: number | null;
}

interface ProductVariantRow {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  active: boolean;
  variant_prices: VariantPriceRow[];
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: string | null;
  brand: string;
  tags: string[];
  materials: string;
  care_instructions: string;
  featured: boolean;
  status: "draft" | "active" | "archived";
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
}

export interface StorefrontCatalog {
  categories: Category[];
  products: Product[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function mapVariant(variant: ProductVariantRow): ProductVariant | null {
  const ngnPrice = variant.variant_prices.find((price) => price.currency === "NGN");
  const usdPrice = variant.variant_prices.find((price) => price.currency === "USD");

  if (!ngnPrice || !usdPrice) {
    return null;
  }

  const prices: PriceBook = {
    NGN: ngnPrice.amount,
    USD: usdPrice.amount,
  };
  const compareAtPrices: Partial<PriceBook> = {};

  if (ngnPrice.compare_at_amount !== null) {
    compareAtPrices.NGN = ngnPrice.compare_at_amount;
  }
  if (usdPrice.compare_at_amount !== null) {
    compareAtPrices.USD = usdPrice.compare_at_amount;
  }

  return {
    id: variant.id,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    prices,
    compareAtPrices: Object.keys(compareAtPrices).length > 0 ? compareAtPrices : undefined,
    stock: variant.stock,
  };
}

export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  const client = requireSupabase();
  const [categoriesResult, productsResult] = await Promise.all([
    client
      .from("categories")
      .select("id,name,slug,description,image_url,position")
      .eq("is_active", true)
      .order("position", { ascending: true }),
    client
      .from("products")
      .select(`
        id,
        slug,
        name,
        description,
        category_id,
        brand,
        tags,
        materials,
        care_instructions,
        featured,
        status,
        product_images(id,external_url,alt_text,position),
        product_variants(id,sku,size,color,stock,active,variant_prices(currency,amount,compare_at_amount))
      `)
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }
  if (productsResult.error) {
    throw productsResult.error;
  }

  const categories = (categoriesResult.data as CategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image_url ?? "",
  }));

  const products = (productsResult.data as unknown as ProductRow[]).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    categoryId: product.category_id ?? "",
    brand: product.brand,
    images: [...product.product_images]
      .sort((firstImage, secondImage) => firstImage.position - secondImage.position)
      .flatMap((image) => image.external_url
        ? [{ id: image.id, url: image.external_url, alt: image.alt_text }]
        : []),
    variants: product.product_variants
      .filter((variant) => variant.active)
      .flatMap((variant) => {
        const mappedVariant = mapVariant(variant);
        return mappedVariant ? [mappedVariant] : [];
      }),
    tags: product.tags,
    materials: product.materials,
    careInstructions: product.care_instructions,
    featured: product.featured,
    status: product.status,
  }));

  return { categories, products };
}
