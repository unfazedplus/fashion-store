import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import { formatCurrency } from "../../utils/currency";
import CatalogStatus from "../catalog/CatalogStatus";
import StoreIcon from "../ui/StoreIcon";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    catalogError,
    currency,
    isCatalogLoading,
    products,
    removeFromCart,
    updateCartItem,
  } = useStore();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const detailedItems = cartItems.flatMap((cartItem) => {
    const product = products.find((candidate) => candidate.id === cartItem.productId);
    const variant = product?.variants.find((candidate) => candidate.id === cartItem.variantId);
    return product && variant ? [{ cartItem, product, variant }] : [];
  });

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/45" aria-label="Close cart" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[32rem] flex-col bg-white shadow-2xl">
        <div className="flex h-20 items-center justify-between border-b border-black/10 px-5 sm:px-7">
          <div>
            <p className="store-eyebrow text-neutral-500">Your selection</p>
            <h2 id="cart-title" className="mt-1 text-xl font-semibold tracking-tight">Bag ({cartCount})</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center hover:bg-stone-100" aria-label="Close cart">
            <StoreIcon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {isCatalogLoading ? (
            <CatalogStatus title="Loading your bag" description="Checking current prices and inventory." className="flex min-h-80 items-center justify-center text-center" />
          ) : catalogError ? (
            <CatalogStatus title="Bag unavailable" description={catalogError} className="flex min-h-80 items-center justify-center text-center" isError />
          ) : detailedItems.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <p className="text-2xl font-semibold tracking-tight">Your bag is empty</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-500">Choose a product and variant to start building your order.</p>
              <button type="button" onClick={onClose} className="store-button-primary mt-7">Continue shopping</button>
            </div>
          ) : (
            <ul className="divide-y divide-black/10">
              {detailedItems.map(({ cartItem, product, variant }) => (
                <li key={`${product.id}-${variant.id}`} className="flex gap-4 py-5 first:pt-0">
                  <Link to={`/products/${product.slug}`} onClick={onClose} className="w-24 shrink-0 bg-stone-100 sm:w-28">
                    <img src={product.images[0]?.url} alt="" className="aspect-[4/5] h-full w-full object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <div>
                        <Link to={`/products/${product.slug}`} onClick={onClose} className="text-sm font-semibold hover:underline">
                          {product.name}
                        </Link>
                        <p className="mt-1 text-xs text-neutral-500">{variant.color} · {variant.size}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(variant.prices[currency] * cartItem.quantity, currency)}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex h-9 items-center border border-black/20">
                        <button type="button" onClick={() => updateCartItem(product.id, variant.id, cartItem.quantity - 1)} className="h-full px-3 text-lg" aria-label={`Decrease ${product.name} quantity`}>−</button>
                        <span className="min-w-7 text-center text-xs font-bold" aria-label={`Quantity ${cartItem.quantity}`}>{cartItem.quantity}</span>
                        <button type="button" onClick={() => updateCartItem(product.id, variant.id, cartItem.quantity + 1)} disabled={cartItem.quantity >= variant.stock} className="h-full px-3 text-lg disabled:text-neutral-300" aria-label={`Increase ${product.name} quantity`}>+</button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(product.id, variant.id)} className="text-xs font-bold uppercase tracking-[0.08em] text-neutral-500 underline underline-offset-4 hover:text-black">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-black/10 px-5 py-6 sm:px-7">
          <div className="flex justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{formatCurrency(cartSubtotal, currency)}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Shipping and duties are calculated at checkout.</p>
          {cartItems.length > 0 ? (
            <Link to="/cart" onClick={onClose} className="store-button-primary mt-5 w-full">View bag and checkout</Link>
          ) : (
            <button type="button" disabled className="store-button-primary mt-5 w-full">Your bag is empty</button>
          )}
        </div>
      </aside>
    </div>
  );
}

export default CartDrawer;
