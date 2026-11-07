import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getCustomerOrders, type CustomerOrder } from "../../services/account";
import { formatCurrency } from "../../utils/currency";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let isActive = true;

    getCustomerOrders(user.id)
      .then((customerOrders) => {
        if (isActive) {
          setOrders(customerOrders);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load orders.");
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
  }, [user]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="store-eyebrow text-neutral-500">Purchases</p>
      <h2 className="store-section-title mt-2 text-[2rem]">Order history</h2>
      <p className="store-copy mt-3">Track payments, fulfilment, shipping, and past purchases.</p>

      {errorMessage && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>}
      {isLoading ? (
        <p className="mt-8 font-bold">Loading orders...</p>
      ) : orders.length > 0 ? (
        <div className="mt-8 space-y-5">
          {orders.map((order) => {
            const shipment = order.shipments[0];

            return (
            <article key={order.id} className="rounded-2xl border border-[var(--store-line)] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">{order.order_number}</p>
                  <p className="mt-2 text-sm text-gray-500">{dateFormatter.format(new Date(order.created_at))}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-black">{formatCurrency(order.total, order.currency)}</p>
                  <span className="store-status mt-2 bg-stone-100 capitalize">
                    {order.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="mt-1 text-gray-500">{item.variant_description} · Qty {item.quantity}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(item.line_total, order.currency)}</p>
                  </li>
                ))}
              </ul>
              {order.discount_amount > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-bold">Promotion {order.coupon_code ?? "applied"}</p>
                  <p className="font-black">-{formatCurrency(order.discount_amount, order.currency)}</p>
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500">Shipping method: <span className="font-semibold capitalize">{order.shipping_method}</span></p>
              {shipment && (
                <div className="mt-5 rounded-2xl border border-[var(--store-line)] bg-stone-100 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">Shipment tracking</p>
                    <span className="store-status bg-white capitalize">{shipment.status}</span>
                  </div>
                  <p className="mt-3 text-gray-700">
                    {[shipment.carrier, shipment.service].filter(Boolean).join(" · ") || "Carrier details pending"}
                  </p>
                  {shipment.tracking_number && (
                    <p className="mt-2 font-bold">Tracking number: {shipment.tracking_number}</p>
                  )}
                  {shipment.shipped_at && (
                    <p className="mt-2 text-xs text-gray-500">Shipped {dateFormatter.format(new Date(shipment.shipped_at))}</p>
                  )}
                  {shipment.delivered_at && (
                    <p className="mt-1 text-xs font-bold text-emerald-700">Delivered {dateFormatter.format(new Date(shipment.delivered_at))}</p>
                  )}
                  {shipment.tracking_url && (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex font-bold underline decoration-rose-500 underline-offset-4"
                    >
                      Track with carrier
                    </a>
                  )}
                </div>
              )}
            </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-5 py-12 text-center">
          <h3 className="text-xl font-black">No orders yet</h3>
          <p className="mt-2 text-gray-600">Your completed purchases will appear here.</p>
          <Link to="/shop" className="store-button-primary mt-6">Start shopping</Link>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
