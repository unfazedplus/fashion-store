import { supabase } from "../lib/supabase";
import type { CurrencyCode } from "../types/market";
import type { ProductStatus } from "../types/product";

export type StaffRole = "staff" | "admin";

export interface AdminProfile {
  id: string;
  role: "customer" | StaffRole;
  first_name: string | null;
  last_name: string | null;
}

export interface AdminRecentOrder {
  id: string;
  order_number: string;
  email: string;
  status: string;
  total: number;
  currency: CurrencyCode;
  created_at: string;
  shipping_country_code: string;
}

export interface AdminLowStockVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  products: { name: string } | null;
}

export interface AdminDashboardData {
  metrics: {
    products: number;
    activeProducts: number;
    variants: number;
    lowStockVariants: number;
    orders: number;
    awaitingFulfilment: number;
  };
  revenue: Record<CurrencyCode, number>;
  recentOrders: AdminRecentOrder[];
  lowStockVariants: AdminLowStockVariant[];
}

export interface AdminCatalogVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  active: boolean;
  updated_at: string;
}

export interface AdminCatalogProduct {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  featured: boolean;
  updated_at: string;
  categoryName: string;
  variants: AdminCatalogVariant[];
}

interface AdminCatalogProductRow {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  featured: boolean;
  updated_at: string;
  category: { name: string } | null;
  variants: AdminCatalogVariant[];
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export function isStaffRole(role: AdminProfile["role"]): role is StaffRole {
  return role === "staff" || role === "admin";
}

export async function getAdminProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id,role,first_name,last_name")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as AdminProfile;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const client = requireSupabase();
  const [
    productsResult,
    activeProductsResult,
    variantsResult,
    lowStockCountResult,
    ordersResult,
    awaitingFulfilmentResult,
    revenueOrdersResult,
    recentOrdersResult,
    lowStockVariantsResult,
  ] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }),
    client.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    client.from("product_variants").select("id", { count: "exact", head: true }),
    client.from("product_variants").select("id", { count: "exact", head: true }).eq("active", true).lte("stock", 5),
    client.from("orders").select("id", { count: "exact", head: true }),
    client.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "processing"]),
    client.from("orders").select("total,currency").in("status", ["paid", "processing", "shipped", "delivered"]),
    client
      .from("orders")
      .select("id,order_number,email,status,total,currency,created_at,shipping_country_code")
      .order("created_at", { ascending: false })
      .limit(6),
    client
      .from("product_variants")
      .select("id,sku,size,color,stock,products(name)")
      .eq("active", true)
      .lte("stock", 5)
      .order("stock", { ascending: true })
      .limit(6),
  ]);

  const firstError = [
    productsResult.error,
    activeProductsResult.error,
    variantsResult.error,
    lowStockCountResult.error,
    ordersResult.error,
    awaitingFulfilmentResult.error,
    revenueOrdersResult.error,
    recentOrdersResult.error,
    lowStockVariantsResult.error,
  ].find((error) => error !== null);

  if (firstError) {
    throw firstError;
  }

  const revenue: Record<CurrencyCode, number> = { NGN: 0, USD: 0 };
  for (const order of revenueOrdersResult.data ?? []) {
    const currency = order.currency as string;
    if (currency === "NGN" || currency === "USD") {
      revenue[currency] += Number(order.total);
    }
  }

  return {
    metrics: {
      products: productsResult.count ?? 0,
      activeProducts: activeProductsResult.count ?? 0,
      variants: variantsResult.count ?? 0,
      lowStockVariants: lowStockCountResult.count ?? 0,
      orders: ordersResult.count ?? 0,
      awaitingFulfilment: awaitingFulfilmentResult.count ?? 0,
    },
    revenue,
    recentOrders: (recentOrdersResult.data ?? []) as AdminRecentOrder[],
    lowStockVariants: (lowStockVariantsResult.data ?? []) as unknown as AdminLowStockVariant[],
  };
}

export async function getAdminCatalog(): Promise<AdminCatalogProduct[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .select(`
      id,
      name,
      slug,
      status,
      featured,
      updated_at,
      category:categories(name),
      variants:product_variants(id,sku,size,color,stock,active,updated_at)
    `)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as AdminCatalogProductRow[]).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    featured: product.featured,
    updated_at: product.updated_at,
    categoryName: product.category?.name ?? "Uncategorised",
    variants: [...product.variants].sort((firstVariant, secondVariant) =>
      firstVariant.sku.localeCompare(secondVariant.sku),
    ),
  }));
}

export async function updateAdminProductStatus(productId: string, status: ProductStatus) {
  if (status === "active") {
    await assertAdminProductReadyForActivation(productId);
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .update({ status })
    .eq("id", productId)
    .select("id,status,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; status: ProductStatus; updated_at: string };
}

interface VariantInventoryUpdate {
  stock: number;
  active: boolean;
}

export async function updateAdminVariantInventory(variantId: string, update: VariantInventoryUpdate) {
  if (!Number.isSafeInteger(update.stock) || update.stock < 0) {
    throw new Error("Stock must be a whole number of zero or more.");
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("product_variants")
    .update({ stock: update.stock, active: update.active })
    .eq("id", variantId)
    .select("id,sku,size,color,stock,active,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as AdminCatalogVariant;
}

export interface AdminCategoryOption {
  id: string;
  name: string;
  is_active: boolean;
}

export interface AdminProductImage {
  id: string;
  external_url: string | null;
  alt_text: string;
  position: number;
}

export interface AdminVariantPrice {
  id: string;
  currency: CurrencyCode;
  amount: number;
  compare_at_amount: number | null;
}

export interface AdminEditableVariant extends AdminCatalogVariant {
  prices: AdminVariantPrice[];
}

export interface AdminEditableProduct {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  brand: string;
  description: string;
  materials: string;
  care_instructions: string;
  tags: string[];
  featured: boolean;
  status: ProductStatus;
  updated_at: string;
  images: AdminProductImage[];
  variants: AdminEditableVariant[];
}

export interface AdminProductEditorData {
  product: AdminEditableProduct;
  categories: AdminCategoryOption[];
}

interface AdminEditableProductRow extends Omit<AdminEditableProduct, "images" | "variants"> {
  images: AdminProductImage[];
  variants: AdminEditableVariant[];
}

export async function getAdminProductEditorData(productId: string): Promise<AdminProductEditorData> {
  const client = requireSupabase();
  const [productResult, categoriesResult] = await Promise.all([
    client
      .from("products")
      .select(`
        id,
        category_id,
        name,
        slug,
        brand,
        description,
        materials,
        care_instructions,
        tags,
        featured,
        status,
        updated_at,
        images:product_images(id,external_url,alt_text,position),
        variants:product_variants(
          id,
          sku,
          size,
          color,
          stock,
          active,
          updated_at,
          prices:variant_prices(id,currency,amount,compare_at_amount)
        )
      `)
      .eq("id", productId)
      .single(),
    client
      .from("categories")
      .select("id,name,is_active")
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (productResult.error) {
    throw productResult.error;
  }
  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  const product = productResult.data as unknown as AdminEditableProductRow;

  return {
    product: {
      ...product,
      images: [...product.images].sort((firstImage, secondImage) => firstImage.position - secondImage.position),
      variants: [...product.variants]
        .map((variant) => ({
          ...variant,
          prices: [...variant.prices].sort((firstPrice, secondPrice) =>
            firstPrice.currency.localeCompare(secondPrice.currency),
          ),
        }))
        .sort((firstVariant, secondVariant) => firstVariant.sku.localeCompare(secondVariant.sku)),
    },
    categories: (categoriesResult.data ?? []) as AdminCategoryOption[],
  };
}

export interface AdminProductDetailsUpdate {
  categoryId: string | null;
  name: string;
  slug: string;
  brand: string;
  description: string;
  materials: string;
  careInstructions: string;
  tags: string[];
  featured: boolean;
  status: ProductStatus;
}

export async function updateAdminProductDetails(productId: string, update: AdminProductDetailsUpdate) {
  const name = update.name.trim();
  const slug = update.slug.trim().toLowerCase();
  const brand = update.brand.trim();

  if (!name || !brand) {
    throw new Error("Product name and brand are required.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("The product slug can only contain lowercase letters, numbers, and single hyphens.");
  }
  if (update.status === "active") {
    await assertAdminProductReadyForActivation(productId, {
      categoryId: update.categoryId,
      description: update.description,
    });
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .update({
      category_id: update.categoryId || null,
      name,
      slug,
      brand,
      description: update.description.trim(),
      materials: update.materials.trim(),
      care_instructions: update.careInstructions.trim(),
      tags: [...new Set(update.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
      featured: update.featured,
      status: update.status,
    })
    .eq("id", productId)
    .select("id,category_id,name,slug,brand,description,materials,care_instructions,tags,featured,status,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data as Omit<AdminEditableProduct, "images" | "variants">;
}

export async function updateAdminPrimaryProductImage(
  productId: string,
  imageId: string | null,
  externalUrl: string,
  altText: string,
) {
  const normalizedUrl = externalUrl.trim();
  const normalizedAltText = altText.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    throw new Error("Enter a valid product image URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Product images must use an HTTP or HTTPS URL.");
  }

  const client = requireSupabase();

  if (imageId) {
    const { data, error } = await client
      .from("product_images")
      .update({ external_url: normalizedUrl, storage_path: null, alt_text: normalizedAltText })
      .eq("id", imageId)
      .eq("product_id", productId)
      .select("id,external_url,alt_text,position")
      .single();

    if (error) {
      throw error;
    }

    return data as AdminProductImage;
  }

  const { data, error } = await client
    .from("product_images")
    .insert({ product_id: productId, external_url: normalizedUrl, alt_text: normalizedAltText, position: 0 })
    .select("id,external_url,alt_text,position")
    .single();

  if (error) {
    throw error;
  }

  return data as AdminProductImage;
}

export interface AdminVariantPriceUpdate {
  currency: CurrencyCode;
  amount: number;
  compareAtAmount: number | null;
}

export async function updateAdminVariantPrices(variantId: string, updates: AdminVariantPriceUpdate[]) {
  if (updates.length !== 2 || !updates.some((price) => price.currency === "NGN") || !updates.some((price) => price.currency === "USD")) {
    throw new Error("Both NGN and USD prices are required.");
  }

  for (const price of updates) {
    if (!Number.isSafeInteger(price.amount) || price.amount < 0) {
      throw new Error(`${price.currency} price must be zero or more.`);
    }
    if (
      price.compareAtAmount !== null &&
      (!Number.isSafeInteger(price.compareAtAmount) || price.compareAtAmount < price.amount)
    ) {
      throw new Error(`${price.currency} compare-at price must be greater than or equal to the selling price.`);
    }
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("variant_prices")
    .upsert(
      updates.map((price) => ({
        variant_id: variantId,
        currency: price.currency,
        amount: price.amount,
        compare_at_amount: price.compareAtAmount,
      })),
      { onConflict: "variant_id,currency" },
    )
    .select("id,currency,amount,compare_at_amount");

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminVariantPrice[];
}

export async function getAdminCategoryOptions() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("categories")
    .select("id,name,is_active")
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminCategoryOption[];
}

export interface AdminCreateProductInput {
  categoryId: string | null;
  name: string;
  slug: string;
  brand: string;
  description: string;
}

export async function createAdminDraftProduct(input: AdminCreateProductInput) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const brand = input.brand.trim();

  if (!name || !brand) {
    throw new Error("Product name and brand are required.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("The product slug can only contain lowercase letters, numbers, and single hyphens.");
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .insert({
      category_id: input.categoryId || null,
      name,
      slug,
      brand,
      description: input.description.trim(),
      status: "draft",
    })
    .select("id,category_id,name,slug,brand,description,materials,care_instructions,tags,featured,status,updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("That product URL slug is already in use. Choose a different slug.");
    }
    throw error;
  }

  return data as Omit<AdminEditableProduct, "images" | "variants">;
}

export interface AdminCreateVariantInput {
  sku: string;
  size: string;
  color: string;
  stock: number;
  active: boolean;
  prices: AdminVariantPriceUpdate[];
}

export async function createAdminProductVariant(productId: string, input: AdminCreateVariantInput) {
  const sku = input.sku.trim().toUpperCase();
  const size = input.size.trim();
  const color = input.color.trim();

  if (!sku || !size || !color) {
    throw new Error("SKU, size, and colour are required.");
  }
  if (!Number.isSafeInteger(input.stock) || input.stock < 0) {
    throw new Error("Stock must be a whole number of zero or more.");
  }
  if (
    input.prices.length !== 2 ||
    !input.prices.some((price) => price.currency === "NGN") ||
    !input.prices.some((price) => price.currency === "USD")
  ) {
    throw new Error("Both NGN and USD prices are required.");
  }
  for (const price of input.prices) {
    if (!Number.isSafeInteger(price.amount) || price.amount < 0) {
      throw new Error(`${price.currency} price must be zero or more.`);
    }
    if (
      price.compareAtAmount !== null &&
      (!Number.isSafeInteger(price.compareAtAmount) || price.compareAtAmount < price.amount)
    ) {
      throw new Error(`${price.currency} compare-at price must be greater than or equal to the selling price.`);
    }
  }

  const client = requireSupabase();
  const variantResult = await client
    .from("product_variants")
    .insert({ product_id: productId, sku, size, color, stock: input.stock, active: input.active })
    .select("id,sku,size,color,stock,active,updated_at")
    .single();

  if (variantResult.error) {
    if (variantResult.error.code === "23505") {
      throw new Error("That SKU is already in use. Every variant must have a unique SKU.");
    }
    throw variantResult.error;
  }

  try {
    const prices = await updateAdminVariantPrices(variantResult.data.id, input.prices);
    return { ...variantResult.data, prices } as AdminEditableVariant;
  } catch (error) {
    const rollbackResult = await client.from("product_variants").delete().eq("id", variantResult.data.id);
    if (rollbackResult.error) {
      throw new Error(
        "The variant was created but its prices failed to save. Archive the variant and contact support before retrying.",
        { cause: error },
      );
    }
    throw error;
  }
}

interface PendingActivationDetails {
  categoryId: string | null;
  description: string;
}

interface ActivationVariantRow {
  id: string;
  prices: { currency: string }[];
}

async function assertAdminProductReadyForActivation(
  productId: string,
  pendingDetails?: PendingActivationDetails,
) {
  const client = requireSupabase();
  let details = pendingDetails;

  if (!details) {
    const detailsResult = await client
      .from("products")
      .select("category_id,description")
      .eq("id", productId)
      .single();

    if (detailsResult.error) {
      throw detailsResult.error;
    }

    details = {
      categoryId: detailsResult.data.category_id,
      description: detailsResult.data.description,
    };
  }

  if (!details.categoryId) {
    throw new Error("Choose a category before activating this product.");
  }
  if (!details.description.trim()) {
    throw new Error("Add a product description before activating this product.");
  }

  const [imagesResult, variantsResult] = await Promise.all([
    client
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .not("external_url", "is", null),
    client
      .from("product_variants")
      .select("id,prices:variant_prices(currency)")
      .eq("product_id", productId)
      .eq("active", true),
  ]);

  if (imagesResult.error) {
    throw imagesResult.error;
  }
  if (variantsResult.error) {
    throw variantsResult.error;
  }
  if (!imagesResult.count) {
    throw new Error("Add a primary product image before activating this product.");
  }

  const activeVariants = (variantsResult.data ?? []) as unknown as ActivationVariantRow[];
  if (activeVariants.length === 0) {
    throw new Error("Add at least one available variant before activating this product.");
  }

  const hasIncompletePriceBook = activeVariants.some((variant) => {
    const currencies = new Set(variant.prices.map((price) => price.currency));
    return !currencies.has("NGN") || !currencies.has("USD");
  });

  if (hasIncompletePriceBook) {
    throw new Error("Every available variant needs both NGN and USD prices before activation.");
  }
}

export async function deleteAdminUnsoldProduct(productId: string) {
  const client = requireSupabase();
  const [productResult, orderItemsResult] = await Promise.all([
    client.from("products").select("id,name,status").eq("id", productId).single(),
    client.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", productId),
  ]);

  if (productResult.error) {
    throw productResult.error;
  }
  if (orderItemsResult.error) {
    throw orderItemsResult.error;
  }
  if (productResult.data.status === "active") {
    throw new Error("Active products cannot be deleted. Change the product to draft or archived first.");
  }
  if ((orderItemsResult.count ?? 0) > 0) {
    throw new Error("Products included in an order cannot be deleted. Archive this product instead.");
  }

  const { error } = await client.from("products").delete().eq("id", productId);
  if (error) {
    throw error;
  }

  return { id: productResult.data.id, name: productResult.data.name };
}
