import { Link } from "react-router-dom";
import CatalogStatus from "../components/catalog/CatalogStatus";
import { useStore } from "../hooks/useStore";
import { formatCurrency } from "../utils/currency";

function CartPage() {
  const {
    cartItems,
    cartSubtotal,
    catalogError,
    currency,
    isCatalogLoading,
    products,
    removeFromCart,
    updateCartItem,
  } = useStore();
  const detailedItems = cartItems.flatMap((cartItem) => {
    const product = products.find((candidate) => candidate.id === cartItem.productId);
    const variant = product?.variants.find((candidate) => candidate.id === cartItem.variantId);
    return product && variant ? [{ cartItem, product, variant }] : [];
  });
  const freeShippingThreshold = currency === "NGN" ? 15000000 : 10000;
  const standardShipping = currency === "NGN" ? 500000 : 1000;
  const estimatedShipping = cartSubtotal === 0 || cartSubtotal >= freeShippingThreshold ? 0 : standardShipping;
  const estimatedTotal = cartSubtotal + estimatedShipping;
  const amountUntilFreeShipping = Math.max(freeShippingThreshold - cartSubtotal, 0);
  const shippingProgress = Math.min((cartSubtotal / freeShippingThreshold) * 100, 100);

  if (isCatalogLoading) {
    return <CatalogStatus title="Loading your bag" description="Checking current prices and inventory." />;
  }

  if (catalogError) {
    return <CatalogStatus title="Bag unavailable" description={catalogError} isError />;
  }

  return (
    <section className="store-page bg-white">
      <div className="store-container">
        <div className="flex items-end justify-between gap-5 border-b border-black/15 pb-7">
          <div>
            <p className="store-eyebrow text-neutral-500">Your selection</p>
            <h1 className="store-title mt-3">Bag <span className="text-neutral-400">({detailedItems.length})</span></h1>
          </div>
          <Link to="/shop" className="hidden border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.08em] sm:block">Continue shopping</Link>
        </div>

        {detailedItems.length === 0 ? (
          <div className="flex min-h-[28rem] flex-col items-center justify-center border-b border-black/15 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Your bag is empty</h2>
            <p className="mt-3 text-sm text-neutral-500">Explore the collection and choose your next piece.</p>
            <Link to="/shop" className="store-button-primary mt-7">Shop new arrivals</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-20">
            <div>
              <div className="mb-7 border border-black/15 p-4">
                <div className="flex justify-between gap-4 text-xs font-semibold">
                  <span>{amountUntilFreeShipping > 0 ? `${formatCurrency(amountUntilFreeShipping, currency)} away from free delivery` : "You qualify for free delivery"}</span>
                  <span>{Math.round(shippingProgress)}%</span>
                </div>
                <div className="mt-3 h-1 bg-stone-200"><div className="h-full bg-black transition-all" style={{ width: `${shippingProgress}%` }} /></div>
              </div>

              <ul className="divide-y divide-black/15 border-y border-black/15">
                {detailedItems.map(({ cartItem, product, variant }) => (
                  <li key={`${product.id}-${variant.id}`} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6 sm:py-7">
                    <Link to={`/products/${product.slug}`} className="bg-stone-100">
                      <img src={product.images[0]?.url} alt="" className="aspect-[4/5] h-full w-full object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link to={`/products/${product.slug}`} className="font-semibold hover:underline">{product.name}</Link>
                          <p className="mt-1 text-xs text-neutral-500">{variant.color} · {variant.size}</p>
                          <p className="mt-1 hidden text-[10px] uppercase tracking-[0.08em] text-neutral-400 sm:block">{variant.sku}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{formatCurrency(variant.prices[currency] * cartItem.quantity, currency)}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex h-10 items-center border border-black/20">
                          <button type="button" onClick={() => updateCartItem(product.id, variant.id, cartItem.quantity - 1)} className="h-full px-3 text-lg" aria-label={`Decrease ${product.name} quantity`}>−</button>
                          <span className="min-w-8 text-center text-xs font-bold">{cartItem.quantity}</span>
                          <button type="button" onClick={() => updateCartItem(product.id, variant.id, cartItem.quantity + 1)} disabled={cartItem.quantity >= variant.stock} className="h-full px-3 text-lg disabled:text-neutral-300" aria-label={`Increase ${product.name} quantity`}>+</button>
                        </div>
                        <button type="button" onClick={() => removeFromCart(product.id, variant.id)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500 underline underline-offset-4 hover:text-black">
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="h-fit bg-[#f4f2ed] p-5 sm:p-7 lg:sticky lg:top-28">
              <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Subtotal</dt><dd className="font-semibold">{formatCurrency(cartSubtotal, currency)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-neutral-500">Estimated delivery</dt><dd className="font-semibold">{estimatedShipping === 0 ? "Free" : formatCurrency(estimatedShipping, currency)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-black/15 pt-4 text-base"><dt className="font-semibold">Estimated total</dt><dd className="font-semibold">{formatCurrency(estimatedTotal, currency)}</dd></div>
              </dl>
              <Link to="/checkout" className="store-button-primary mt-6 w-full min-h-14">Checkout securely</Link>
              <p className="mt-4 text-xs leading-5 text-neutral-500">Final delivery cost is calculated from your destination and selected service.</p>
              <div className="mt-6 border-t border-black/15 pt-5 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                Secure Paystack checkout · NGN and USD
              </div>
            </aside>
          </div>
        )}

        <Link to="/shop" className="store-button-secondary mt-8 w-full sm:hidden">Continue shopping</Link>
      </div>
    </section>
  );
}

export default CartPage;
