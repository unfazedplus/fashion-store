import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { verifyPayment, type PaymentVerificationResponse } from "../services/checkout";
import { formatCurrency } from "../utils/currency";

type VerificationState =
  | { status: "loading" }
  | { status: "success"; payment: PaymentVerificationResponse }
  | { status: "error"; message: string };

function PaymentCompletePage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const [verification, setVerification] = useState<VerificationState>(() =>
    reference
      ? { status: "loading" }
      : { status: "error", message: "The payment reference is missing." },
  );
  const { clearCart } = useStore();

  useEffect(() => {
    if (!reference) {
      return;
    }

    let isActive = true;

    verifyPayment(reference)
      .then((payment) => {
        if (!isActive) {
          return;
        }

        if (payment.status === "paid") {
          clearCart();
        }
        setVerification({ status: "success", payment });
      })
      .catch((error: unknown) => {
        if (isActive) {
          setVerification({
            status: "error",
            message: error instanceof Error ? error.message : "Unable to verify payment.",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [clearCart, reference]);

  return (
    <section className="store-page flex min-h-[78vh] items-center bg-[var(--store-canvas)]">
      <div className="store-container flex justify-center">
        <div className="store-panel w-full max-w-2xl px-5 py-10 text-center sm:px-12 sm:py-14">
        {verification.status === "loading" && (
          <>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border border-neutral-300 border-t-black" aria-hidden="true" />
            <p className="store-eyebrow mt-6 text-neutral-500">Payment verification</p>
            <h1 className="store-section-title mt-3">Confirming your order</h1>
            <p className="store-copy mx-auto mt-4 max-w-md">Please wait while Paystack and UNFAZED confirm the transaction.</p>
          </>
        )}

        {verification.status === "success" && (
          <>
            <p className="store-eyebrow text-neutral-500">
              {verification.payment.status === "paid" ? "Payment confirmed" : "Payment status"}
            </p>
            <h1 className="store-section-title mt-3">
              {verification.payment.status === "paid" ? "Thank you for your order" : "Your order is being processed"}
            </h1>
            <dl className="store-panel-muted mx-auto mt-8 max-w-md divide-y divide-[var(--store-line)] px-4 text-left sm:px-6">
              <div className="flex justify-between gap-4 py-4">
                <dt className="text-sm text-neutral-500">Order</dt>
                <dd className="text-sm font-semibold">{verification.payment.orderNumber}</dd>
              </div>
              <div className="flex justify-between gap-4 py-4">
                <dt className="text-sm text-neutral-500">Status</dt>
                <dd className="store-status bg-white capitalize">{verification.payment.status.replaceAll("_", " ")}</dd>
              </div>
              <div className="flex justify-between gap-4 py-4">
                <dt className="text-sm text-neutral-500">Total</dt>
                <dd className="text-sm font-semibold">{formatCurrency(verification.payment.total, verification.payment.currency)}</dd>
              </div>
            </dl>
            <Link to="/shop" className="store-button-primary mt-8">
              Continue shopping
            </Link>
          </>
        )}

        {verification.status === "error" && (
          <>
            <p className="store-eyebrow text-red-700">Verification issue</p>
            <h1 className="store-section-title mt-3">We could not confirm the payment</h1>
            <p className="store-copy mx-auto mt-4 max-w-md">{verification.message}</p>
            <Link to="/cart" className="store-button-primary mt-8">
              Return to cart
            </Link>
          </>
        )}
        </div>
      </div>
    </section>
  );
}

export default PaymentCompletePage;
