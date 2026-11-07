import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getShippingOptions, shippingCountries } from "../Data/shipping";
import CatalogStatus from "../components/catalog/CatalogStatus";
import { useStore } from "../hooks/useStore";
import { isSupabaseConfigured } from "../lib/supabase";
import { initializeCheckout, previewCheckoutCoupon, type CouponPreview } from "../services/checkout";
import { formatCurrency } from "../utils/currency";

function CheckoutPage() {
  const { cartItems, cartSubtotal, catalogError, currency, isCatalogLoading, products } = useStore();
  const [countryCode, setCountryCode] = useState("NG");
  const [customCountry, setCustomCountry] = useState("");
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    preview: CouponPreview;
    cartSignature: string;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponMessageType, setCouponMessageType] = useState<"success" | "error" | "">("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const shippingOptions = getShippingOptions(countryCode);
  const selectedShipping = shippingOptions.find((option) => option.id === selectedShippingId) ?? shippingOptions[0];
  const detailedItems = cartItems.flatMap((cartItem) => {
    const product = products.find((candidate) => candidate.id === cartItem.productId);
    const variant = product?.variants.find((candidate) => candidate.id === cartItem.variantId);
    return product && variant ? [{ cartItem, product, variant }] : [];
  });
  const checkoutItems = detailedItems.map(({ cartItem, variant }) => ({
    sku: variant.sku,
    quantity: cartItem.quantity,
  }));
  const couponCartSignature = `${currency}:${cartSubtotal}:${checkoutItems
    .map((item) => `${item.sku}:${item.quantity}`)
    .sort()
    .join("|")}`;
  const activeCoupon = appliedCoupon?.cartSignature === couponCartSignature
    ? appliedCoupon.preview
    : null;
  const couponNeedsReapply = Boolean(appliedCoupon && !activeCoupon);
  const shippingTotal = selectedShipping?.prices[currency] ?? 0;
  const couponDiscount = activeCoupon?.discountAmount ?? 0;
  const orderTotal = Math.max(0, cartSubtotal + shippingTotal - couponDiscount);

  const handleCouponCodeChange = (value: string) => {
    setCouponCode(value.toUpperCase());
    setCouponMessage("");
    setCouponMessageType("");

    if (appliedCoupon && value.trim().toUpperCase() !== appliedCoupon.preview.code) {
      setAppliedCoupon(null);
    }
  };

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!normalizedCode) {
      setCouponMessage("Enter a coupon code first.");
      setCouponMessageType("error");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponMessage("");
    setCouponMessageType("");

    try {
      const preview = await previewCheckoutCoupon(normalizedCode, currency, checkoutItems);
      setCouponCode(preview.code);
      setAppliedCoupon({ preview, cartSignature: couponCartSignature });
      setCouponMessage(preview.description || `${preview.code} was applied to this order.`);
      setCouponMessageType("success");
    } catch (error) {
      setAppliedCoupon(null);
      setCouponMessage(error instanceof Error ? error.message : "Unable to apply this coupon.");
      setCouponMessageType("error");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponMessageType("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!isSupabaseConfigured) {
      setSubmissionMessage(
        "Checkout is ready, but Supabase and Paystack credentials have not been connected yet. No payment was attempted.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage("");

    try {
      const checkout = await initializeCheckout({
        email: String(formData.get("email") ?? ""),
        currency,
        shippingCountryCode: countryCode,
        shippingMethod: selectedShipping.id as "standard" | "express",
        shippingAddress: {
          firstName: String(formData.get("firstName") ?? ""),
          lastName: String(formData.get("lastName") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          addressLine1: String(formData.get("addressLine1") ?? ""),
          addressLine2: String(formData.get("addressLine2") ?? ""),
          city: String(formData.get("city") ?? ""),
          region: String(formData.get("region") ?? ""),
          postalCode: String(formData.get("postalCode") ?? ""),
          countryCode,
          countryName: countryCode === "ZZ" ? customCountry : undefined,
        },
        couponCode: activeCoupon?.code,
        items: checkoutItems,
      });

      window.location.assign(checkout.authorizationUrl);
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : "Unable to start payment.");
      setIsSubmitting(false);
    }
  };

  if (isCatalogLoading) {
    return <CatalogStatus title="Preparing checkout" description="Checking current prices and available inventory." />;
  }

  if (catalogError) {
    return <CatalogStatus title="Checkout unavailable" description={catalogError} isError />;
  }

  if (detailedItems.length === 0) {
    return (
      <section className="store-page flex min-h-[75vh] items-center justify-center text-center">
        <div>
          <h1 className="store-title">Your bag is empty</h1>
          <p className="mt-4 text-neutral-500">Add products before starting checkout.</p>
          <Link to="/shop" className="store-button-primary mt-7">Browse products</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="store-page bg-white">
      <div className="store-container">
        <div className="mb-9 border-b border-black/15 pb-7">
          <p className="store-eyebrow text-neutral-500">Nigeria to the world</p>
          <h1 className="store-title mt-3">Secure checkout</h1>
          <p className="store-copy mt-4 max-w-2xl">
            Enter the delivery destination to calculate an estimated international shipping total.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] xl:gap-16">
          <div className="space-y-5">
            <section className="border border-black/15 p-5 sm:p-7">
              <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <CheckoutField label="First name" name="firstName" autoComplete="given-name" required />
                <CheckoutField label="Last name" name="lastName" autoComplete="family-name" required />
                <CheckoutField label="Email" name="email" type="email" autoComplete="email" required className="sm:col-span-2" />
                <CheckoutField label="Phone number" name="phone" type="tel" autoComplete="tel" required className="sm:col-span-2" />
              </div>
            </section>

            <section className="border border-black/15 p-5 sm:p-7">
              <h2 className="text-xl font-semibold tracking-tight">Delivery address</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">Country or region</span>
                  <select
                    name="countryCode"
                    value={countryCode}
                    onChange={(event) => {
                      setCountryCode(event.target.value);
                      setSelectedShippingId("");
                      setSubmissionMessage("");
                    }}
                    className="store-field"
                    required
                  >
                    {shippingCountries.map((country) => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </label>
                {countryCode === "ZZ" && (
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">Country name</span>
                    <input
                      name="customCountry"
                      value={customCountry}
                      onChange={(event) => setCustomCountry(event.target.value)}
                      className="store-field"
                      required
                    />
                  </label>
                )}
                <CheckoutField label="Address" name="addressLine1" autoComplete="address-line1" required className="sm:col-span-2" />
                <CheckoutField label="Apartment, suite, etc. (optional)" name="addressLine2" autoComplete="address-line2" className="sm:col-span-2" />
                <CheckoutField label="City" name="city" autoComplete="address-level2" required />
                <CheckoutField label="State / province / region" name="region" autoComplete="address-level1" required />
                <CheckoutField label="Postal code" name="postalCode" autoComplete="postal-code" required className="sm:col-span-2" />
              </div>
            </section>

            <section className="border border-black/15 p-5 sm:p-7">
              <h2 className="text-xl font-semibold tracking-tight">Shipping method</h2>
              <div className="mt-6 space-y-3">
                {shippingOptions.map((shippingOption) => (
                  <label
                    key={shippingOption.id}
                    className={`flex cursor-pointer justify-between gap-5 border p-4 ${
                      selectedShipping.id === shippingOption.id ? "border-black bg-[#f4f2ed]" : "border-black/15"
                    }`}
                  >
                    <span className="flex gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={shippingOption.id}
                        checked={selectedShipping.id === shippingOption.id}
                        onChange={() => setSelectedShippingId(shippingOption.id)}
                      />
                      <span>
                        <span className="block font-bold">{shippingOption.name}</span>
                        <span className="mt-1 block text-sm text-neutral-500">{shippingOption.description}</span>
                        <span className="mt-1 block text-xs font-semibold text-neutral-500">{shippingOption.estimatedDelivery}</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-bold">{formatCurrency(shippingOption.prices[currency], currency)}</span>
                  </label>
                ))}
              </div>
              {countryCode !== "NG" && (
                <p className="mt-4 text-sm leading-6 text-amber-700">
                  Import duties and local taxes are not included in this estimate and may be collected by the destination country.
                </p>
              )}
            </section>
          </div>

          <aside className="h-fit bg-[#f4f2ed] p-5 text-black sm:p-7 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold tracking-tight">Order summary</h2>
            <ul className="mt-6 space-y-4">
              {detailedItems.map(({ cartItem, product, variant }) => (
                <li key={`${product.id}-${variant.id}`} className="flex gap-3">
                  <img src={product.images[0]?.url} alt="" className="h-20 w-16 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{variant.color} · {variant.size} · Qty {cartItem.quantity}</p>
                  </div>
                  <p className="text-sm font-bold">
                    {formatCurrency(variant.prices[currency] * cartItem.quantity, currency)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-black/15 pt-5">
              <label htmlFor="coupon-code" className="block text-xs font-bold uppercase tracking-[0.08em]">Promotion code</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="coupon-code"
                  type="text"
                  value={couponCode}
                  onChange={(event) => handleCouponCodeChange(event.target.value)}
                  placeholder="ENTER CODE"
                  autoComplete="off"
                  disabled={isApplyingCoupon || isSubmitting}
                  className="store-field min-w-0 flex-1 font-bold uppercase"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={isApplyingCoupon || isSubmitting || !couponCode.trim()}
                  className="store-button-primary shrink-0 px-4 disabled:cursor-not-allowed"
                >
                  {isApplyingCoupon ? "Checking..." : "Apply"}
                </button>
              </div>
              {activeCoupon && (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  disabled={isSubmitting}
                  className="mt-3 text-xs font-bold underline underline-offset-4"
                >
                  Remove {activeCoupon.code}
                </button>
              )}
              {(couponMessage || couponNeedsReapply) && (
                <p
                  className={`mt-3 border p-3 text-xs leading-5 ${
                    couponNeedsReapply
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : couponMessageType === "success"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-red-300 bg-red-50 text-red-700"
                  }`}
                  role={couponMessageType === "error" ? "alert" : "status"}
                >
                  {couponNeedsReapply
                    ? "Your cart or currency changed. Apply the coupon again."
                    : couponMessage}
                </p>
              )}
            </div>

            <dl className="mt-6 space-y-4 border-t border-black/15 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Subtotal</dt>
                <dd className="font-bold">{formatCurrency(cartSubtotal, currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500">Shipping</dt>
                <dd className="font-bold">{formatCurrency(shippingTotal, currency)}</dd>
              </div>
              {activeCoupon && (
                <div className="flex justify-between gap-4 text-emerald-700">
                  <dt>Discount · {activeCoupon.code}</dt>
                  <dd className="font-bold">-{formatCurrency(couponDiscount, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-black/15 pt-4 text-lg">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">{formatCurrency(orderTotal, currency)}</dd>
              </div>
            </dl>

            <label className="mt-6 flex gap-3 text-xs leading-5 text-neutral-600">
              <input type="checkbox" required className="mt-1" />
              <span>I confirm that my delivery details are correct and accept the store policies.</span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting || isApplyingCoupon}
              className="store-button-primary mt-6 min-h-14 w-full disabled:cursor-wait"
            >
              {isSubmitting ? "Connecting to Paystack..." : "Continue to secure payment"}
            </button>
            <p className="mt-4 text-xs leading-5 text-neutral-500">
              No card details are collected by this page. Payment is initialized securely by the backend.
            </p>
            {submissionMessage && <p className="mt-4 border border-black/15 bg-white p-3 text-sm leading-6" role="status">{submissionMessage}</p>}
          </aside>
        </form>
      </div>
    </section>
  );
}

interface CheckoutFieldProps {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}

function CheckoutField({ label, name, type = "text", autoComplete, required, className = "" }: CheckoutFieldProps) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="store-field"
      />
    </label>
  );
}

export default CheckoutPage;
