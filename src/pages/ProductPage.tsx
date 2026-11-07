import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import CatalogStatus from "../components/catalog/CatalogStatus";
import ProductCard from "../components/ui/ProductCard";
import StoreIcon from "../components/ui/StoreIcon";
import { useStore } from "../hooks/useStore";
import { formatCurrency } from "../utils/currency";

function ProductPage() {
  const { productSlug } = useParams();
  const {
    addToCart,
    cartItems,
    catalogError,
    categories,
    currency,
    isCatalogLoading,
    isWishlisted,
    products,
    toggleWishlist,
  } = useStore();
  const product = products.find((candidate) => candidate.slug === productSlug && candidate.status === "active");
  const initialVariant = product?.variants.find((variant) => variant.stock > 0) ?? product?.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? "");
  const selectedVariant = product?.variants.find((variant) => variant.id === selectedVariantId) ?? initialVariant;

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading product" description="Checking the latest price and availability." />;
  }

  if (catalogError) {
    return <CatalogStatus title="Product unavailable" description={catalogError} isError />;
  }

  if (!product || !selectedVariant) {
    return (
      <section className="store-page flex min-h-[75vh] items-center justify-center text-center">
        <div className="store-container">
          <p className="store-eyebrow text-neutral-500">Product unavailable</p>
          <h1 className="store-title mt-4">This piece is no longer here.</h1>
          <p className="mt-5 text-neutral-500">Browse the current collection to find something new.</p>
          <Link to="/shop" className="store-button-primary mt-8">Browse the shop</Link>
        </div>
      </section>
    );
  }

  const category = categories.find((candidate) => candidate.id === product.categoryId);
  const cartQuantity = cartItems.find(
    (item) => item.productId === product.id && item.variantId === selectedVariant.id,
  )?.quantity ?? 0;
  const relatedProducts = products
    .filter((candidate) => candidate.id !== product.id && candidate.categoryId === product.categoryId && candidate.status === "active")
    .slice(0, 4);
  const isSaved = isWishlisted(product.id);

  return (
    <>
      <section className="store-page bg-white">
        <div className="store-container">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-neutral-500" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-black">Home</Link>
            <span>/</span>
            <Link to="/shop" className="hover:text-black">Shop</Link>
            {category && (
              <>
                <span>/</span>
                <Link to={`/shop?category=${category.slug}`} className="hover:text-black">{category.name}</Link>
              </>
            )}
            <span>/</span>
            <span className="text-black">{product.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)] lg:gap-12 xl:gap-16">
            <div className="bg-[#f2f1ee]">
              <img src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.name} className="aspect-[4/5] h-full max-h-[56rem] w-full object-cover" />
            </div>

            <div className="lg:sticky lg:top-28 lg:h-fit lg:py-3">
              <p className="store-eyebrow text-neutral-500">{product.brand}</p>
              <div className="mt-3 flex items-start justify-between gap-5">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{product.name}</h1>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-pressed={isSaved}
                  className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/20 transition hover:border-black"
                  aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <StoreIcon name="heart" filled={isSaved} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <p className="text-lg font-semibold">{formatCurrency(selectedVariant.prices[currency], currency)}</p>
                {selectedVariant.compareAtPrices?.[currency] && (
                  <p className="text-sm text-neutral-400 line-through">{formatCurrency(selectedVariant.compareAtPrices[currency], currency)}</p>
                )}
              </div>
              <p className="mt-6 text-sm leading-7 text-neutral-600">{product.description}</p>

              <fieldset className="mt-8">
                <div className="flex items-center justify-between gap-4">
                  <legend className="text-xs font-bold uppercase tracking-[0.1em]">Select colour and size</legend>
                  <span className="text-[11px] text-neutral-500">{selectedVariant.stock} available</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      disabled={variant.stock === 0}
                      className={`min-h-12 border px-3 py-2 text-left text-xs transition ${
                        selectedVariant.id === variant.id
                          ? "border-black bg-black text-white"
                          : "border-black/20 hover:border-black"
                      } disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-stone-100 disabled:text-neutral-400`}
                    >
                      <span className="block font-semibold">{variant.color} · {variant.size}</span>
                      <span className="mt-0.5 block text-[10px] opacity-70">{variant.stock > 0 ? `${variant.stock} in stock` : "Sold out"}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => addToCart(product.id, selectedVariant.id)}
                disabled={selectedVariant.stock === 0 || cartQuantity >= selectedVariant.stock}
                className="store-button-primary mt-5 w-full min-h-14"
              >
                {cartQuantity >= selectedVariant.stock
                  ? "Maximum quantity in bag"
                  : cartQuantity > 0
                    ? `Add another · ${cartQuantity} in bag`
                    : "Add to bag"}
              </button>

              <div className="mt-6 grid grid-cols-2 border-y border-black/15 py-4 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                <span>Secure Paystack checkout</span>
                <span className="text-right">Delivery across Nigeria</span>
              </div>

              <div className="mt-3 divide-y divide-black/15 border-b border-black/15">
                <ProductDetail title="Details">{product.description}</ProductDetail>
                <ProductDetail title="Materials">{product.materials}</ProductDetail>
                <ProductDetail title="Care">{product.careInstructions}</ProductDetail>
                <ProductDetail title="Product code">{selectedVariant.sku}</ProductDetail>
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="store-section bg-[#f4f2ed]">
          <div className="store-container">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="store-eyebrow text-neutral-500">Complete the look</p>
                <h2 className="store-section-title mt-3">You may also like</h2>
              </div>
              <Link to={category ? `/shop?category=${category.slug}` : "/shop"} className="hidden border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.08em] sm:block">
                View category
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-2 gap-y-10 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
              {relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ProductDetail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-[0.08em]">
        {title}
        <span className="text-lg font-normal group-open:rotate-45">+</span>
      </summary>
      <p className="pt-3 text-sm leading-6 text-neutral-600">{children}</p>
    </details>
  );
}

export default ProductPage;
