import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";
import StoreIcon from "./StoreIcon";

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  const firstAvailableVariant = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailableVariant?.id ?? "");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { addToCart, cartItems, currency, isWishlisted, toggleWishlist } = useStore();
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const isSaved = isWishlisted(product.id);
  const cartQuantity = cartItems.find(
    (item) => item.productId === product.id && item.variantId === selectedVariantId,
  )?.quantity;
  const colorCount = useMemo(
    () => new Set(product.variants.map((variant) => variant.color)).size,
    [product.variants],
  );

  const handleAddToCart = () => {
    if (!selectedVariant) {
      return;
    }
    addToCart(product.id, selectedVariant.id);
    setIsQuickAddOpen(false);
  };

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-200">
        <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="block h-full">
          <img
            src={product.images[0]?.url}
            alt={product.images[0]?.alt ?? product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.025]"
          />
        </Link>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center bg-white/92 text-black backdrop-blur transition hover:bg-white sm:right-3 sm:top-3"
          aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={isSaved}
        >
          <StoreIcon name="heart" className="h-[18px] w-[18px]" filled={isSaved} />
        </button>
        {selectedVariant?.compareAtPrices?.[currency] && (
          <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black sm:left-3 sm:top-3">
            Sale
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsQuickAddOpen((currentValue) => !currentValue)}
          className="absolute inset-x-3 bottom-3 hidden min-h-11 translate-y-[calc(100%+1rem)] items-center justify-center bg-white px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-black transition duration-300 group-hover:translate-y-0 group-focus-within:translate-y-0 lg:flex"
          aria-expanded={isQuickAddOpen}
        >
          {isQuickAddOpen ? "Close options" : "Quick add"}
        </button>
      </div>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold sm:text-sm">
              <Link to={`/products/${product.slug}`} className="hover:underline">{product.name}</Link>
            </h3>
            <p className="mt-1 text-[11px] text-neutral-500 sm:text-xs">
              {colorCount} {colorCount === 1 ? "colour" : "colours"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[13px] font-semibold sm:text-sm">
              {selectedVariant ? formatCurrency(selectedVariant.prices[currency], currency) : "Unavailable"}
            </p>
            {selectedVariant?.compareAtPrices?.[currency] && (
              <p className="mt-1 text-[10px] text-neutral-400 line-through sm:text-xs">
                {formatCurrency(selectedVariant.compareAtPrices[currency], currency)}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsQuickAddOpen((currentValue) => !currentValue)}
          className="mt-3 border-b border-black pb-0.5 text-[10px] font-bold uppercase tracking-[0.1em] lg:hidden"
          aria-expanded={isQuickAddOpen}
        >
          {isQuickAddOpen ? "Close options" : "Quick add"}
        </button>

        {isQuickAddOpen && (
          <div className="mt-3 border-t border-black/15 pt-3">
            <label className="sr-only" htmlFor={`variant-${product.id}`}>Size and colour</label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="store-field min-h-10 py-2 text-xs"
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={variant.stock === 0}>
                  {variant.color} / {variant.size} {variant.stock === 0 ? "— Sold out" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock === 0 || cartQuantity === selectedVariant.stock}
              className="store-button-primary mt-2 min-h-10 w-full py-2 text-[10px]"
            >
              {!selectedVariant || selectedVariant.stock === 0
                ? "Sold out"
                : cartQuantity === selectedVariant.stock
                  ? "Maximum in bag"
                  : cartQuantity
                    ? `Add another · ${cartQuantity} in bag`
                    : "Add to bag"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
