import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import {
  createAdminProductVariant,
  deleteAdminUnsoldProduct,
  getAdminProductEditorData,
  updateAdminPrimaryProductImage,
  updateAdminProductDetails,
  updateAdminVariantPrices,
  type AdminEditableProduct,
  type AdminEditableVariant,
  type AdminProductEditorData,
} from "../../services/admin";
import type { CurrencyCode } from "../../types/market";
import type { ProductStatus } from "../../types/product";
import { formatCurrency } from "../../utils/currency";

type Notice =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

interface ProductDetailsDraft {
  categoryId: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  materials: string;
  careInstructions: string;
  tags: string;
  featured: boolean;
  status: ProductStatus;
}

interface ProductImageDraft {
  externalUrl: string;
  altText: string;
}

interface PriceFields {
  amount: string;
  compareAtAmount: string;
}

type VariantPriceDraft = Record<CurrencyCode, PriceFields>;

interface NewVariantDraft {
  sku: string;
  size: string;
  color: string;
  stock: string;
  active: boolean;
  prices: VariantPriceDraft;
}

const productStatuses: ProductStatus[] = ["draft", "active", "archived"];
const currencies: CurrencyCode[] = ["NGN", "USD"];

function createEmptyVariantDraft(): NewVariantDraft {
  return {
    sku: "",
    size: "",
    color: "",
    stock: "0",
    active: true,
    prices: {
      NGN: { amount: "", compareAtAmount: "" },
      USD: { amount: "", compareAtAmount: "" },
    },
  };
}

function createDetailsDraft(product: AdminEditableProduct): ProductDetailsDraft {
  return {
    categoryId: product.category_id ?? "",
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    materials: product.materials,
    careInstructions: product.care_instructions,
    tags: product.tags.join(", "),
    featured: product.featured,
    status: product.status,
  };
}

function createImageDraft(product: AdminEditableProduct): ProductImageDraft {
  const primaryImage = product.images[0];
  return {
    externalUrl: primaryImage?.external_url ?? "",
    altText: primaryImage?.alt_text ?? product.name,
  };
}

function amountToInput(amount: number | null | undefined) {
  return amount === null || amount === undefined ? "" : String(amount / 100);
}

function createVariantPriceDraft(variant: AdminEditableVariant): VariantPriceDraft {
  const ngnPrice = variant.prices.find((price) => price.currency === "NGN");
  const usdPrice = variant.prices.find((price) => price.currency === "USD");

  return {
    NGN: {
      amount: amountToInput(ngnPrice?.amount),
      compareAtAmount: amountToInput(ngnPrice?.compare_at_amount),
    },
    USD: {
      amount: amountToInput(usdPrice?.amount),
      compareAtAmount: amountToInput(usdPrice?.compare_at_amount),
    },
  };
}

function createPriceDrafts(product: AdminEditableProduct) {
  return Object.fromEntries(
    product.variants.map((variant) => [variant.id, createVariantPriceDraft(variant)]),
  ) as Record<string, VariantPriceDraft>;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseMoneyInput(value: string, label: string) {
  const normalizedValue = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) {
    throw new Error(`${label} must be a valid amount with no more than two decimal places.`);
  }

  const [wholePart, decimalPart = ""] = normalizedValue.split(".");
  const minorUnits = Number(wholePart) * 100 + Number(decimalPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error(`${label} is too large.`);
  }

  return minorUnits;
}

function parseOptionalMoneyInput(value: string, label: string) {
  return value.trim() ? parseMoneyInput(value, label) : null;
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

function AdminProductEditorPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { refreshCatalog } = useStore();
  const [editorData, setEditorData] = useState<AdminProductEditorData | null>(null);
  const [detailsDraft, setDetailsDraft] = useState<ProductDetailsDraft | null>(null);
  const [imageDraft, setImageDraft] = useState<ProductImageDraft | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, VariantPriceDraft>>({});
  const [newVariantDraft, setNewVariantDraft] = useState<NewVariantDraft>(createEmptyVariantDraft);
  const [savingKey, setSavingKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }

    let isActive = true;

    getAdminProductEditorData(productId)
      .then((data) => {
        if (!isActive) {
          return;
        }

        setEditorData(data);
        setDetailsDraft(createDetailsDraft(data.product));
        setImageDraft(createImageDraft(data.product));
        setPriceDrafts(createPriceDrafts(data.product));
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the product editor.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [productId]);

  const handleSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorData || !detailsDraft) {
      return;
    }

    setSavingKey("details");
    setNotice(null);

    try {
      const updatedProduct = await updateAdminProductDetails(editorData.product.id, {
        categoryId: detailsDraft.categoryId || null,
        name: detailsDraft.name,
        slug: detailsDraft.slug,
        brand: detailsDraft.brand,
        description: detailsDraft.description,
        materials: detailsDraft.materials,
        careInstructions: detailsDraft.careInstructions,
        tags: detailsDraft.tags.split(","),
        featured: detailsDraft.featured,
        status: detailsDraft.status,
      });
      const nextProduct = { ...editorData.product, ...updatedProduct };
      setEditorData((currentData) => currentData ? { ...currentData, product: nextProduct } : currentData);
      setDetailsDraft(createDetailsDraft(nextProduct));
      await refreshCatalog();
      setNotice({ type: "success", message: "Product details were saved and the storefront catalogue was refreshed." });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save product details.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const handleSaveImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorData || !imageDraft) {
      return;
    }

    setSavingKey("image");
    setNotice(null);

    try {
      const primaryImage = editorData.product.images[0];
      const updatedImage = await updateAdminPrimaryProductImage(
        editorData.product.id,
        primaryImage?.id ?? null,
        imageDraft.externalUrl,
        imageDraft.altText,
      );
      setEditorData((currentData) => currentData
        ? {
            ...currentData,
            product: {
              ...currentData.product,
              images: [updatedImage, ...currentData.product.images.filter((image) => image.id !== updatedImage.id)],
            },
          }
        : currentData,
      );
      setImageDraft({ externalUrl: updatedImage.external_url ?? "", altText: updatedImage.alt_text });
      await refreshCatalog();
      setNotice({ type: "success", message: "The primary product image was saved and refreshed on the storefront." });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save the product image.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const handleSavePrices = async (variant: AdminEditableVariant) => {
    const draft = priceDrafts[variant.id];
    if (!draft) {
      return;
    }

    setSavingKey(`prices:${variant.id}`);
    setNotice(null);

    try {
      const updates = currencies.map((currency) => ({
        currency,
        amount: parseMoneyInput(draft[currency].amount, `${currency} selling price`),
        compareAtAmount: parseOptionalMoneyInput(draft[currency].compareAtAmount, `${currency} compare-at price`),
      }));
      const updatedPrices = await updateAdminVariantPrices(variant.id, updates);
      setEditorData((currentData) => currentData
        ? {
            ...currentData,
            product: {
              ...currentData.product,
              variants: currentData.product.variants.map((candidate) =>
                candidate.id === variant.id ? { ...candidate, prices: updatedPrices } : candidate,
              ),
            },
          }
        : currentData,
      );
      setPriceDrafts((currentDrafts) => ({
        ...currentDrafts,
        [variant.id]: {
          NGN: {
            amount: amountToInput(updatedPrices.find((price) => price.currency === "NGN")?.amount),
            compareAtAmount: amountToInput(updatedPrices.find((price) => price.currency === "NGN")?.compare_at_amount),
          },
          USD: {
            amount: amountToInput(updatedPrices.find((price) => price.currency === "USD")?.amount),
            compareAtAmount: amountToInput(updatedPrices.find((price) => price.currency === "USD")?.compare_at_amount),
          },
        },
      }));
      await refreshCatalog();
      setNotice({ type: "success", message: `${variant.sku} prices were saved in NGN and USD.` });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to save variant prices.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const handleCreateVariant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorData) {
      return;
    }

    const normalizedStock = newVariantDraft.stock.trim();
    const stock = Number(normalizedStock);
    if (!normalizedStock || !Number.isSafeInteger(stock) || stock < 0) {
      setNotice({ type: "error", message: "Stock must be a whole number of zero or more." });
      return;
    }

    setSavingKey("new-variant");
    setNotice(null);

    try {
      const prices = currencies.map((currency) => ({
        currency,
        amount: parseMoneyInput(newVariantDraft.prices[currency].amount, `${currency} selling price`),
        compareAtAmount: parseOptionalMoneyInput(
          newVariantDraft.prices[currency].compareAtAmount,
          `${currency} compare-at price`,
        ),
      }));
      const newVariant = await createAdminProductVariant(editorData.product.id, {
        sku: newVariantDraft.sku,
        size: newVariantDraft.size,
        color: newVariantDraft.color,
        stock,
        active: newVariantDraft.active,
        prices,
      });
      setEditorData((currentData) => currentData
        ? {
            ...currentData,
            product: {
              ...currentData.product,
              variants: [...currentData.product.variants, newVariant].sort((firstVariant, secondVariant) =>
                firstVariant.sku.localeCompare(secondVariant.sku),
              ),
            },
          }
        : currentData,
      );
      setPriceDrafts((currentDrafts) => ({
        ...currentDrafts,
        [newVariant.id]: createVariantPriceDraft(newVariant),
      }));
      setNewVariantDraft(createEmptyVariantDraft());
      await refreshCatalog();
      setNotice({ type: "success", message: `${newVariant.sku} was created with NGN and USD prices.` });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to create the product variant.",
      });
    } finally {
      setSavingKey("");
    }
  };

  const handleDeleteProduct = async () => {
    if (!editorData || editorData.product.status === "active") {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${editorData.product.name}? Its images, variants, and prices will also be removed.`,
    );
    if (!confirmed) {
      return;
    }

    setSavingKey("delete-product");
    setNotice(null);

    try {
      await deleteAdminUnsoldProduct(editorData.product.id);
      await refreshCatalog();
      navigate("/admin/products", { replace: true });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to delete the product.",
      });
      setSavingKey("");
    }
  };

  if (!productId) {
    return <div className="rounded-3xl bg-white p-8 text-red-700 shadow-sm" role="alert">Missing product ID.</div>;
  }

  if (errorMessage) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm" role="alert">
        <p className="font-bold text-red-700">{errorMessage}</p>
        <Link to="/admin/products" className="mt-5 inline-flex rounded-full bg-black px-5 py-2.5 font-bold text-white">
          Return to products
        </Link>
      </div>
    );
  }

  if (!editorData || !detailsDraft || !imageDraft) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading product editor...</div>;
  }

  const { product, categories } = editorData;
  const primaryImage = product.images[0];
  const isSaving = Boolean(savingKey);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link to="/admin/products" className="text-sm font-bold underline decoration-rose-500 underline-offset-4">
            ← Products and inventory
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black">{product.name}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusClasses(product.status)}`}>
              {product.status}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Edit catalogue content and international price books.</p>
        </div>
        {product.status === "active" && (
          <Link
            to={`/products/${product.slug}`}
            className="self-start rounded-full border border-gray-300 bg-white px-5 py-2.5 font-bold hover:border-black"
          >
            View product
          </Link>
        )}
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

      <form onSubmit={handleSaveDetails} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="text-2xl font-black">Product details</h3>
          <p className="mt-2 text-gray-600">Core information shown on product cards and the product page.</p>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold">Product name</span>
            <input
              value={detailsDraft.name}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, name: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Brand</span>
            <input
              value={detailsDraft.brand}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, brand: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">URL slug</span>
            <div className="flex gap-2">
              <input
                value={detailsDraft.slug}
                onChange={(event) => setDetailsDraft({ ...detailsDraft, slug: event.target.value.toLowerCase() })}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                required
              />
              <button
                type="button"
                onClick={() => setDetailsDraft({ ...detailsDraft, slug: slugify(detailsDraft.name) })}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold hover:border-black"
              >
                Generate
              </button>
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Category</span>
            <select
              value={detailsDraft.categoryId}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, categoryId: event.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.is_active ? "" : " — inactive"}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Description</span>
            <textarea
              value={detailsDraft.description}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, description: event.target.value })}
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Materials</span>
            <textarea
              value={detailsDraft.materials}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, materials: event.target.value })}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Care instructions</span>
            <textarea
              value={detailsDraft.careInstructions}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, careInstructions: event.target.value })}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Tags</span>
            <input
              value={detailsDraft.tags}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, tags: event.target.value })}
              placeholder="hoodie, streetwear, unisex"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
            <span className="mt-2 block text-xs text-gray-500">Separate tags with commas.</span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Storefront status</span>
            <select
              value={detailsDraft.status}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, status: event.target.value as ProductStatus })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 capitalize"
            >
              {productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-3 self-end rounded-xl border border-gray-200 px-4 py-3">
            <input
              type="checkbox"
              checked={detailsDraft.featured}
              onChange={(event) => setDetailsDraft({ ...detailsDraft, featured: event.target.checked })}
              className="h-5 w-5 accent-black"
            />
            <span className="font-bold">Feature on the homepage</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-7 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {savingKey === "details" ? "Saving details..." : "Save product details"}
        </button>
      </form>

      <form onSubmit={handleSaveImage} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="text-2xl font-black">Primary product image</h3>
          <p className="mt-2 text-gray-600">Use a direct HTTPS image URL. Media uploads will be added in a later step.</p>
        </div>

        <div className="mt-7 grid gap-7 lg:grid-cols-[16rem_1fr]">
          <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-stone-100">
            {imageDraft.externalUrl ? (
              <img src={imageDraft.externalUrl} alt={imageDraft.altText || product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm font-bold text-gray-500">No image URL</div>
            )}
          </div>
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Image URL</span>
              <input
                type="url"
                value={imageDraft.externalUrl}
                onChange={(event) => setImageDraft({ ...imageDraft, externalUrl: event.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Alternative text</span>
              <input
                value={imageDraft.altText}
                onChange={(event) => setImageDraft({ ...imageDraft, altText: event.target.value })}
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                placeholder={`Describe the image of ${product.name}`}
              />
            </label>
            <p className="text-xs leading-5 text-gray-500">
              Current image record: {primaryImage ? "existing image" : "a new image will be created"}.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {savingKey === "image" ? "Saving image..." : "Save primary image"}
            </button>
          </div>
        </div>
      </form>

      <form onSubmit={handleCreateVariant} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="text-2xl font-black">Add a product variant</h3>
          <p className="mt-2 text-gray-600">Create a sellable size and colour with stock and both international prices.</p>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="mb-2 block text-sm font-bold">SKU</span>
            <input
              value={newVariantDraft.sku}
              onChange={(event) => setNewVariantDraft({ ...newVariantDraft, sku: event.target.value.toUpperCase() })}
              placeholder="UF-PROD-COL-S"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Size</span>
            <input
              value={newVariantDraft.size}
              onChange={(event) => setNewVariantDraft({ ...newVariantDraft, size: event.target.value })}
              placeholder="S, 42, or One size"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Colour</span>
            <input
              value={newVariantDraft.color}
              onChange={(event) => setNewVariantDraft({ ...newVariantDraft, color: event.target.value })}
              placeholder="Black"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Opening stock</span>
            <input
              type="number"
              min="0"
              step="1"
              value={newVariantDraft.stock}
              onChange={(event) => setNewVariantDraft({ ...newVariantDraft, stock: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {currencies.map((currency) => (
            <div key={currency} className="rounded-2xl border border-gray-200 p-5">
              <p className="font-black">{currency} price book</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-bold">Selling price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariantDraft.prices[currency].amount}
                    onChange={(event) => setNewVariantDraft({
                      ...newVariantDraft,
                      prices: {
                        ...newVariantDraft.prices,
                        [currency]: { ...newVariantDraft.prices[currency], amount: event.target.value },
                      },
                    })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">Compare-at price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newVariantDraft.prices[currency].compareAtAmount}
                    onChange={(event) => setNewVariantDraft({
                      ...newVariantDraft,
                      prices: {
                        ...newVariantDraft.prices,
                        [currency]: { ...newVariantDraft.prices[currency], compareAtAmount: event.target.value },
                      },
                    })}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 sm:w-fit">
          <input
            type="checkbox"
            checked={newVariantDraft.active}
            onChange={(event) => setNewVariantDraft({ ...newVariantDraft, active: event.target.checked })}
            className="h-5 w-5 accent-black"
          />
          <span className="font-bold">Available when the product is published</span>
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {savingKey === "new-variant" ? "Creating variant..." : "Add variant"}
        </button>
      </form>

      <section className="space-y-5">
        <div>
          <h3 className="text-2xl font-black">Variant prices</h3>
          <p className="mt-2 text-gray-600">
            Enter normal currency amounts—for example, enter 75000 for {formatCurrency(7500000, "NGN")}.
          </p>
        </div>

        {product.variants.length > 0 ? product.variants.map((variant) => {
          const draft = priceDrafts[variant.id] ?? createVariantPriceDraft(variant);
          const priceSaveKey = `prices:${variant.id}`;

          return (
            <article key={variant.id} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h4 className="text-xl font-black">{variant.color} · {variant.size}</h4>
                  <p className="mt-1 text-sm text-gray-500">{variant.sku}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className={`rounded-full px-3 py-1 ${variant.active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}>
                    {variant.active ? "Available" : "Disabled"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">Stock {variant.stock}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {currencies.map((currency) => (
                  <div key={currency} className="rounded-2xl border border-gray-200 p-5">
                    <p className="font-black">{currency} price book</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-sm font-bold">Selling price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft[currency].amount}
                          onChange={(event) => setPriceDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [variant.id]: {
                              ...draft,
                              [currency]: { ...draft[currency], amount: event.target.value },
                            },
                          }))}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3"
                          required
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm font-bold">Compare-at price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft[currency].compareAtAmount}
                          onChange={(event) => setPriceDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [variant.id]: {
                              ...draft,
                              [currency]: { ...draft[currency], compareAtAmount: event.target.value },
                            },
                          }))}
                          placeholder="Optional"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleSavePrices(variant)}
                disabled={isSaving}
                className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {savingKey === priceSaveKey ? "Saving prices..." : "Save variant prices"}
              </button>
            </article>
          );
        }) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
            This product has no variants to price yet.
          </div>
        )}
      </section>

      {product.status !== "active" && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8">
          <h3 className="text-2xl font-black text-red-900">Delete product</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-red-800">
            Only unsold draft or archived products can be deleted. This permanently removes their images, variants, and prices.
          </p>
          <button
            type="button"
            onClick={() => void handleDeleteProduct()}
            disabled={isSaving}
            className="mt-5 rounded-xl bg-red-700 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {savingKey === "delete-product" ? "Deleting product..." : "Delete this product"}
          </button>
        </section>
      )}
    </div>
  );
}

export default AdminProductEditorPage;
