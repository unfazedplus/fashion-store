import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAdminDraftProduct,
  getAdminCategoryOptions,
  type AdminCategoryOption,
} from "../../services/admin";

interface NewProductDraft {
  categoryId: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
}

const initialDraft: NewProductDraft = {
  categoryId: "",
  name: "",
  slug: "",
  brand: "UNFAZED",
  description: "",
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminNewProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);
  const [draft, setDraft] = useState<NewProductDraft>(initialDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getAdminCategoryOptions()
      .then((nextCategories) => {
        if (isActive) {
          setCategories(nextCategories);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load product categories.");
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      const product = await createAdminDraftProduct({
        categoryId: draft.categoryId || null,
        name: draft.name,
        slug: draft.slug,
        brand: draft.brand,
        description: draft.description,
      });
      navigate(`/admin/products/${product.id}`, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create the draft product.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Preparing the product form...</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <Link to="/admin/products" className="text-sm font-bold underline decoration-rose-500 underline-offset-4">
          ← Products and inventory
        </Link>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Draft workflow</p>
        <h2 className="mt-2 text-3xl font-black">Create a new product</h2>
        <p className="mt-2 max-w-2xl text-gray-600">
          This creates a hidden draft. Add its image, variants, and prices in the editor before publishing it.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold">Product name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({
                ...draft,
                name: event.target.value,
                slug: draft.slug ? draft.slug : slugify(event.target.value),
              })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
              autoFocus
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Brand</span>
            <input
              value={draft.brand}
              onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              required
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">URL slug</span>
            <div className="flex gap-2">
              <input
                value={draft.slug}
                onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })}
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                placeholder="new-product-name"
                required
              />
              <button
                type="button"
                onClick={() => setDraft({ ...draft, slug: slugify(draft.name) })}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold hover:border-black"
              >
                Generate
              </button>
            </div>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Category</span>
            <select
              value={draft.categoryId}
              onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">Choose later</option>
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
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Describe the fit, style, and key product details. You can finish this later."
            />
          </label>
        </div>

        {errorMessage && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>}

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSaving ? "Creating draft..." : "Create draft and continue"}
          </button>
          <Link to="/admin/products" className="rounded-xl border border-gray-300 px-6 py-3 font-bold hover:border-black">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default AdminNewProductPage;
