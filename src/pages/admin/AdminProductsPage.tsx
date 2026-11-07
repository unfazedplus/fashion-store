import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import {
  getAdminCatalog,
  updateAdminProductStatus,
  updateAdminVariantInventory,
  type AdminCatalogProduct,
  type AdminCatalogVariant,
} from "../../services/admin";
import type { ProductStatus } from "../../types/product";

type StatusFilter = "all" | ProductStatus;

type Notice =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

interface VariantDraft {
  stock: string;
  active: boolean;
}

const productStatuses: ProductStatus[] = ["draft", "active", "archived"];

function createProductStatusDrafts(products: AdminCatalogProduct[]) {
  return Object.fromEntries(products.map((product) => [product.id, product.status])) as Record<string, ProductStatus>;
}

function createVariantDrafts(products: AdminCatalogProduct[]) {
  return Object.fromEntries(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.id, { stock: String(variant.stock), active: variant.active }]),
    ),
  ) as Record<string, VariantDraft>;
}

function getStatusClasses(status: ProductStatus) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "draft") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-stone-200 text-stone-700";
}

function AdminProductsPage() {
  const { refreshCatalog } = useStore();
  const [products, setProducts] = useState<AdminCatalogProduct[]>([]);
  const [productStatusDrafts, setProductStatusDrafts] = useState<Record<string, ProductStatus>>({});
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const loadCatalog = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextProducts = await getAdminCatalog();
      setProducts(nextProducts);
      setProductStatusDrafts(createProductStatusDrafts(nextProducts));
      setVariantDrafts(createVariantDrafts(nextProducts));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load the admin catalogue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    getAdminCatalog()
      .then((nextProducts) => {
        if (!isActive) {
          return;
        }

        setProducts(nextProducts);
        setProductStatusDrafts(createProductStatusDrafts(nextProducts));
        setVariantDrafts(createVariantDrafts(nextProducts));
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the admin catalogue.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        product.name,
        product.slug,
        product.categoryName,
        ...product.variants.flatMap((variant) => [variant.sku, variant.size, variant.color]),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [products, searchTerm, statusFilter]);

  const inventorySummary = useMemo(() => {
    const variants = products.flatMap((product) => product.variants);
    return {
      activeProducts: products.filter((product) => product.status === "active").length,
      variants: variants.length,
      lowStock: variants.filter((variant) => variant.active && variant.stock <= 5).length,
    };
  }, [products]);

  const handleSaveProductStatus = async (product: AdminCatalogProduct) => {
    const nextStatus = productStatusDrafts[product.id] ?? product.status;
    const key = `product:${product.id}`;
    setSavingKey(key);
    setNotice(null);

    try {
      const updatedProduct = await updateAdminProductStatus(product.id, nextStatus);
      setProducts((currentProducts) => currentProducts.map((candidate) =>
        candidate.id === product.id
          ? { ...candidate, status: updatedProduct.status, updated_at: updatedProduct.updated_at }
          : candidate,
      ));
      setProductStatusDrafts((currentDrafts) => ({ ...currentDrafts, [product.id]: updatedProduct.status }));
      await refreshCatalog();
      setNotice({
        type: "success",
        message: `${product.name} is now ${updatedProduct.status}. The storefront catalogue has been refreshed.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to update product status.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const handleSaveVariant = async (product: AdminCatalogProduct, variant: AdminCatalogVariant) => {
    const draft = variantDrafts[variant.id] ?? { stock: String(variant.stock), active: variant.active };
    const normalizedStock = draft.stock.trim();
    const stock = Number(normalizedStock);

    if (!normalizedStock || !Number.isSafeInteger(stock) || stock < 0) {
      setNotice({ type: "error", message: `${variant.sku}: stock must be a whole number of zero or more.` });
      return;
    }

    const key = `variant:${variant.id}`;
    setSavingKey(key);
    setNotice(null);

    try {
      const updatedVariant = await updateAdminVariantInventory(variant.id, { stock, active: draft.active });
      setProducts((currentProducts) => currentProducts.map((candidate) =>
        candidate.id === product.id
          ? {
              ...candidate,
              variants: candidate.variants.map((candidateVariant) =>
                candidateVariant.id === variant.id ? updatedVariant : candidateVariant,
              ),
            }
          : candidate,
      ));
      setVariantDrafts((currentDrafts) => ({
        ...currentDrafts,
        [variant.id]: { stock: String(updatedVariant.stock), active: updatedVariant.active },
      }));
      await refreshCatalog();
      setNotice({
        type: "success",
        message: `${updatedVariant.sku} inventory was saved and the storefront catalogue was refreshed.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to update variant inventory.",
      });
    } finally {
      setSavingKey("");
    }
  };

  if (isLoading) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading catalogue controls...</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm" role="alert">
        <p className="font-bold text-red-700">{loadError}</p>
        <button type="button" onClick={() => void loadCatalog()} className="mt-5 rounded-full bg-black px-5 py-2.5 font-bold text-white">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Catalogue operations</p>
            <h2 className="mt-2 text-3xl font-black">Products and inventory</h2>
            <p className="mt-2 max-w-2xl text-gray-600">
              Control storefront visibility, stock quantities, and variant availability from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 self-start">
            <Link to="/admin/products/new" className="rounded-full bg-black px-5 py-2.5 font-bold text-white hover:bg-rose-600">
              Add product
            </Link>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={Boolean(savingKey)}
              className="rounded-full border border-gray-300 bg-white px-5 py-2.5 font-bold hover:border-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh data
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Active products</p>
            <p className="mt-2 text-3xl font-black">{inventorySummary.activeProducts}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Total variants</p>
            <p className="mt-2 text-3xl font-black">{inventorySummary.variants}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Low stock</p>
            <p className="mt-2 text-3xl font-black">{inventorySummary.lowStock}</p>
          </article>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_14rem]">
          <label>
            <span className="mb-2 block text-sm font-bold">Search catalogue</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Product, SKU, size, or colour"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Product status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="all">All statuses</option>
              {productStatuses.map((status) => <option key={status} value={status} className="capitalize">{status}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-500">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </section>

      {notice && (
        <p
          className={`rounded-2xl p-4 text-sm font-bold ${notice.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}
          role={notice.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {notice.message}
        </p>
      )}

      {filteredProducts.length > 0 ? (
        <div className="space-y-6">
          {filteredProducts.map((product) => {
            const statusDraft = productStatusDrafts[product.id] ?? product.status;
            const productSaveKey = `product:${product.id}`;

            return (
              <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="border-b border-gray-100 p-6 sm:p-8">
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black">{product.name}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusClasses(product.status)}`}>
                          {product.status}
                        </span>
                        {product.featured && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">Featured</span>}
                      </div>
                      <p className="mt-2 text-sm text-gray-500">{product.categoryName} · /products/{product.slug}</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <Link
                        to={`/admin/products/${product.id}`}
                        className="rounded-xl border border-gray-300 px-5 py-2.5 text-center font-bold hover:border-black"
                      >
                        Edit details & prices
                      </Link>
                      <label>
                        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Storefront status</span>
                        <select
                          value={statusDraft}
                          onChange={(event) => setProductStatusDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [product.id]: event.target.value as ProductStatus,
                          }))}
                          disabled={Boolean(savingKey)}
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 capitalize sm:w-40"
                        >
                          {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => void handleSaveProductStatus(product)}
                        disabled={Boolean(savingKey) || statusDraft === product.status}
                        className="rounded-xl bg-black px-5 py-2.5 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {savingKey === productSaveKey ? "Saving..." : "Save status"}
                      </button>
                    </div>
                  </div>
                </div>

                {product.variants.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {product.variants.map((variant) => {
                      const draft = variantDrafts[variant.id] ?? { stock: String(variant.stock), active: variant.active };
                      const parsedStock = draft.stock.trim() ? Number(draft.stock) : Number.NaN;
                      const hasChanges = parsedStock !== variant.stock || draft.active !== variant.active;
                      const variantSaveKey = `variant:${variant.id}`;

                      return (
                        <div key={variant.id} className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_9rem_10rem_auto] lg:items-end">
                          <div>
                            <p className="font-black">{variant.color} · {variant.size}</p>
                            <p className="mt-1 text-sm text-gray-500">{variant.sku}</p>
                            {variant.active && variant.stock <= 5 && (
                              <p className={`mt-2 text-xs font-black ${variant.stock === 0 ? "text-red-700" : "text-amber-700"}`}>
                                {variant.stock === 0 ? "Out of stock" : `Low stock · ${variant.stock} remaining`}
                              </p>
                            )}
                          </div>

                          <label>
                            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Stock</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={draft.stock}
                              onChange={(event) => setVariantDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [variant.id]: { ...draft, stock: event.target.value },
                              }))}
                              disabled={Boolean(savingKey)}
                              className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
                              aria-label={`Stock for ${variant.sku}`}
                            />
                          </label>

                          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={draft.active}
                              onChange={(event) => setVariantDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [variant.id]: { ...draft, active: event.target.checked },
                              }))}
                              disabled={Boolean(savingKey)}
                              className="h-5 w-5 accent-black"
                            />
                            <span className="text-sm font-bold">Available in store</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => void handleSaveVariant(product, variant)}
                            disabled={Boolean(savingKey) || !hasChanges}
                            className="rounded-xl bg-black px-5 py-2.5 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                          >
                            {savingKey === variantSaveKey ? "Saving..." : "Save variant"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-8 text-center text-gray-600">This product has no variants yet.</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-2xl font-black">No matching products</h3>
          <p className="mt-3 text-gray-600">Clear the search or choose another status.</p>
        </div>
      )}
    </div>
  );
}

export default AdminProductsPage;
