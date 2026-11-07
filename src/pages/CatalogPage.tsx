import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CatalogStatus from "../components/catalog/CatalogStatus";
import ProductCard from "../components/ui/ProductCard";
import StoreIcon from "../components/ui/StoreIcon";
import { useStore } from "../hooks/useStore";
import { getLowestVariantPrice, isProductInStock } from "../utils/products";

function CatalogPage() {
  const { catalogError, categories, currency, isCatalogLoading, products } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchQuery = searchParams.get("q") ?? "";
  const categorySlug = searchParams.get("category") ?? "";
  const selectedSize = searchParams.get("size") ?? "";
  const selectedColor = searchParams.get("color") ?? "";
  const selectedAvailability = searchParams.get("availability") ?? "";
  const sortOrder = searchParams.get("sort") ?? "featured";

  const activeProducts = useMemo(
    () => products.filter((product) => product.status === "active"),
    [products],
  );
  const availableSizes = useMemo(
    () => Array.from(new Set(activeProducts.flatMap((product) => product.variants.map((variant) => variant.size)))).sort(),
    [activeProducts],
  );
  const availableColors = useMemo(
    () => Array.from(new Set(activeProducts.flatMap((product) => product.variants.map((variant) => variant.color)))).sort(),
    [activeProducts],
  );
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingProducts = activeProducts.filter((product) => {
      const searchableText = [product.name, product.description, product.brand, ...product.tags].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory.id;
      const matchesSize = !selectedSize || product.variants.some((variant) => variant.size === selectedSize);
      const matchesColor = !selectedColor || product.variants.some((variant) => variant.color === selectedColor);
      const matchesAvailability = selectedAvailability !== "in-stock" || isProductInStock(product);
      return matchesQuery && matchesCategory && matchesSize && matchesColor && matchesAvailability;
    });

    return matchingProducts.sort((firstProduct, secondProduct) => {
      switch (sortOrder) {
        case "price-low":
          return getLowestVariantPrice(firstProduct, currency) - getLowestVariantPrice(secondProduct, currency);
        case "price-high":
          return getLowestVariantPrice(secondProduct, currency) - getLowestVariantPrice(firstProduct, currency);
        case "name":
          return firstProduct.name.localeCompare(secondProduct.name);
        default:
          return Number(secondProduct.featured) - Number(firstProduct.featured);
      }
    });
  }, [activeProducts, currency, searchQuery, selectedAvailability, selectedCategory, selectedColor, selectedSize, sortOrder]);

  const updateSearchParam = (name: string, value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (value) {
      nextSearchParams.set(name, value);
    } else {
      nextSearchParams.delete(name);
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const clearFilters = () => {
    const nextSearchParams = new URLSearchParams();
    if (sortOrder !== "featured") {
      nextSearchParams.set("sort", sortOrder);
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const hasActiveFilters = Boolean(searchQuery || categorySlug || selectedSize || selectedColor || selectedAvailability);

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading the collection" description="Fetching current products, prices, and inventory." />;
  }

  if (catalogError) {
    return <CatalogStatus title="Catalogue unavailable" description={catalogError} isError />;
  }

  return (
    <section className="store-page bg-white">
      <div className="store-container">
        <div className="flex flex-col justify-between gap-6 border-b border-black/15 pb-8 lg:flex-row lg:items-end">
          <div>
            <p className="store-eyebrow text-neutral-500">UNFAZED catalogue</p>
            <h1 className="store-title mt-3">{selectedCategory?.name ?? "New arrivals"}</h1>
          </div>
          <p className="store-copy max-w-lg text-sm lg:text-right">
            Modern essentials and statement pieces selected for everyday confidence.
          </p>
        </div>

        <div className="-mx-4 overflow-x-auto border-b border-black/15 px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-7 py-4 text-xs font-bold uppercase tracking-[0.08em]">
            <button type="button" onClick={() => updateSearchParam("category", "")} className={!categorySlug ? "border-b border-black pb-1" : "pb-1 text-neutral-500 hover:text-black"}>All</button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => updateSearchParam("category", category.slug)}
                className={categorySlug === category.slug ? "border-b border-black pb-1" : "pb-1 text-neutral-500 hover:text-black"}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-6 flex items-center border-b border-black/30 focus-within:border-black">
          <StoreIcon name="search" className="h-5 w-5 shrink-0 text-neutral-500" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => updateSearchParam("q", event.target.value)}
            placeholder="Search the collection"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => updateSearchParam("q", "")} className="text-[10px] font-bold uppercase tracking-[0.08em]">Clear</button>
          )}
        </label>

        <div className="mt-6 flex items-center justify-between gap-4 border-b border-black/15 pb-4">
          <p className="text-xs text-neutral-500">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] lg:hidden"
              aria-expanded={isFilterOpen}
            >
              Filter
              <StoreIcon name="chevron" className={`h-4 w-4 transition ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
              <span className="hidden sm:inline">Sort</span>
              <select value={sortOrder} onChange={(event) => updateSearchParam("sort", event.target.value)} className="border-0 bg-transparent py-1 text-xs outline-none">
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <aside className={`${isFilterOpen ? "block" : "hidden"} border-b border-black/15 pb-7 lg:block lg:border-b-0 lg:pb-0`}>
            <div className="grid gap-5 sm:grid-cols-3 lg:sticky lg:top-28 lg:grid-cols-1">
              <FilterSelect label="Size" value={selectedSize} onChange={(value) => updateSearchParam("size", value)}>
                <option value="">All sizes</option>
                {availableSizes.map((size) => <option key={size} value={size}>{size}</option>)}
              </FilterSelect>
              <FilterSelect label="Colour" value={selectedColor} onChange={(value) => updateSearchParam("color", value)}>
                <option value="">All colours</option>
                {availableColors.map((color) => <option key={color} value={color}>{color}</option>)}
              </FilterSelect>
              <FilterSelect label="Availability" value={selectedAvailability} onChange={(value) => updateSearchParam("availability", value)}>
                <option value="">All products</option>
                <option value="in-stock">In stock</option>
              </FilterSelect>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="w-fit border-b border-black pb-1 text-[11px] font-bold uppercase tracking-[0.08em]">
                  Clear filters
                </button>
              )}
            </div>
          </aside>

          <div>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 md:grid-cols-3 xl:gap-x-5 2xl:grid-cols-4">
                {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center border border-dashed border-black/20 px-6 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">No products match those filters</h2>
                <p className="mt-3 text-sm text-neutral-500">Try removing a filter or searching for a broader term.</p>
                <button type="button" onClick={clearFilters} className="store-button-primary mt-7">Reset catalogue</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  return (
    <label>
      <span className="store-eyebrow mb-2 block text-neutral-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="store-field min-h-11 py-2.5 text-sm">
        {children}
      </select>
    </label>
  );
}

export default CatalogPage;
