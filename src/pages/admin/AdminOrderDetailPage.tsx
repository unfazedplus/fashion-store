import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getAdminOrderDetail,
  retryAdminOrderEmail,
  updateAdminOrderFulfilment,
  type AdminOrderDetail,
  type AdminShippingAddress,
  type EmailDeliveryStatus,
  type OrderEmailEvent,
  type OrderStatus,
} from "../../services/admin-orders";
import { formatCurrency } from "../../utils/currency";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface ShipmentDraft {
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl: string;
}

const emptyShipmentDraft: ShipmentDraft = {
  carrier: "",
  service: "",
  trackingNumber: "",
  trackingUrl: "",
};

function getStatusClasses(status: OrderStatus) {
  if (status === "paid" || status === "processing") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "shipped") {
    return "bg-blue-100 text-blue-800";
  }
  if (status === "delivered") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "cancelled" || status === "refunded") {
    return "bg-red-100 text-red-700";
  }
  return "bg-stone-200 text-stone-700";
}

const emailEventLabels: Record<OrderEmailEvent, string> = {
  order_paid: "Order confirmation",
  order_shipped: "Shipment notification",
  order_delivered: "Delivery notification",
};

function getEmailStatusClasses(status: EmailDeliveryStatus) {
  if (status === "sent") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700";
  }
  if (status === "processing") {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-amber-100 text-amber-800";
}

function formatAddress(address: AdminShippingAddress) {
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    address.addressLine1,
    address.addressLine2,
    [address.city, address.region, address.postalCode].filter(Boolean).join(", "),
    address.countryName ?? address.countryCode,
  ].filter(Boolean);
}

function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft>(emptyShipmentDraft);
  const [savingAction, setSavingAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isActive = true;

    getAdminOrderDetail(orderId)
      .then((nextOrder) => {
        if (!isActive) {
          return;
        }

        setOrder(nextOrder);
        const shipment = nextOrder.shipments[0];
        if (shipment) {
          setShipmentDraft({
            carrier: shipment.carrier ?? "",
            service: shipment.service ?? "",
            trackingNumber: shipment.tracking_number ?? "",
            trackingUrl: shipment.tracking_url ?? "",
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the order.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [orderId]);

  const reloadOrder = async () => {
    if (!orderId) {
      return;
    }
    const nextOrder = await getAdminOrderDetail(orderId);
    setOrder(nextOrder);
    const shipment = nextOrder.shipments[0];
    if (shipment) {
      setShipmentDraft({
        carrier: shipment.carrier ?? "",
        service: shipment.service ?? "",
        trackingNumber: shipment.tracking_number ?? "",
        trackingUrl: shipment.tracking_url ?? "",
      });
    }
  };

  const handleAdvance = async (nextStatus: "processing" | "delivered") => {
    if (!order) {
      return;
    }

    setSavingAction(nextStatus);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateAdminOrderFulfilment(order.id, { nextStatus });
      await reloadOrder();
      setSuccessMessage(
        nextStatus === "processing"
          ? "The order is now being processed."
          : "The order has been marked as delivered.",
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update fulfilment.");
    } finally {
      setSavingAction("");
    }
  };

  const handleShip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order) {
      return;
    }

    setSavingAction("shipped");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateAdminOrderFulfilment(order.id, {
        nextStatus: "shipped",
        carrier: shipmentDraft.carrier,
        service: shipmentDraft.service,
        trackingNumber: shipmentDraft.trackingNumber,
        trackingUrl: shipmentDraft.trackingUrl,
      });
      await reloadOrder();
      setSuccessMessage("The order was marked shipped and tracking details were saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to ship the order.");
    } finally {
      setSavingAction("");
    }
  };

  const handleRetryEmail = async (deliveryId: string) => {
    setSavingAction(`email-${deliveryId}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await retryAdminOrderEmail(deliveryId);
      await reloadOrder();
      setSuccessMessage("The customer notification was queued for another delivery attempt.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to retry the customer notification.");
    } finally {
      setSavingAction("");
    }
  };

  if (!orderId) {
    return <div className="rounded-3xl bg-white p-8 text-red-700 shadow-sm" role="alert">Missing order ID.</div>;
  }

  if (errorMessage && !order) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm" role="alert">
        <p className="font-bold text-red-700">{errorMessage}</p>
        <Link to="/admin/orders" className="mt-5 inline-flex rounded-full bg-black px-5 py-2.5 font-bold text-white">
          Return to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading order...</div>;
  }

  const addressLines = formatAddress(order.shipping_address);
  const payment = order.payments[0];
  const shipment = order.shipments[0];
  const isSaving = Boolean(savingAction);
  const emailDeliveries = [...order.order_email_deliveries].sort(
    (firstDelivery, secondDelivery) => firstDelivery.created_at.localeCompare(secondDelivery.created_at),
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link to="/admin/orders" className="text-sm font-bold underline decoration-rose-500 underline-offset-4">
            ← Orders and fulfilment
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-black">{order.order_number}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusClasses(order.status)}`}>
              {order.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-2 text-gray-600">Placed {dateFormatter.format(new Date(order.created_at))} by {order.email}</p>
        </div>
        <p className="text-3xl font-black">{formatCurrency(order.total, order.currency)}</p>
      </section>

      {successMessage && <p className="rounded-2xl bg-emerald-100 p-4 text-sm font-bold text-emerald-800" role="status">{successMessage}</p>}
      {errorMessage && <p className="rounded-2xl bg-red-100 p-4 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}

      <div className="grid gap-8 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Order items</h3>
            <div className="mt-5 divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <article key={item.id} className="flex gap-4 py-5">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="font-black">{item.product_name}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.variant_description}</p>
                      <p className="mt-1 text-xs text-gray-400">{item.sku} · Qty {item.quantity}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-black">{formatCurrency(item.line_total, order.currency)}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatCurrency(item.unit_price, order.currency)} each</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Fulfilment</h3>
            <p className="mt-2 text-gray-600">Advance paid orders through processing, shipment, and delivery.</p>

            {order.status === "paid" && (
              <button
                type="button"
                onClick={() => void handleAdvance("processing")}
                disabled={isSaving}
                className="mt-6 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:bg-gray-300"
              >
                {savingAction === "processing" ? "Starting processing..." : "Start processing"}
              </button>
            )}

            {order.status === "processing" && (
              <form onSubmit={handleShip} className="mt-6 grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-bold">Carrier</span>
                  <input
                    value={shipmentDraft.carrier}
                    onChange={(event) => setShipmentDraft({ ...shipmentDraft, carrier: event.target.value })}
                    placeholder="DHL, UPS, FedEx..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">Service</span>
                  <input
                    value={shipmentDraft.service}
                    onChange={(event) => setShipmentDraft({ ...shipmentDraft, service: event.target.value })}
                    placeholder="Express delivery"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">Tracking number</span>
                  <input
                    value={shipmentDraft.trackingNumber}
                    onChange={(event) => setShipmentDraft({ ...shipmentDraft, trackingNumber: event.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                    required
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-bold">Tracking URL</span>
                  <input
                    type="url"
                    value={shipmentDraft.trackingUrl}
                    onChange={(event) => setShipmentDraft({ ...shipmentDraft, trackingUrl: event.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:bg-gray-300 sm:col-span-2 sm:justify-self-start"
                >
                  {savingAction === "shipped" ? "Saving shipment..." : "Mark as shipped"}
                </button>
              </form>
            )}

            {order.status === "shipped" && (
              <div className="mt-6">
                <p className="font-bold">This order is in transit.</p>
                <button
                  type="button"
                  onClick={() => void handleAdvance("delivered")}
                  disabled={isSaving}
                  className="mt-4 rounded-xl bg-black px-6 py-3 font-bold text-white hover:bg-rose-600 disabled:bg-gray-300"
                >
                  {savingAction === "delivered" ? "Marking delivered..." : "Mark as delivered"}
                </button>
              </div>
            )}

            {order.status === "delivered" && (
              <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Fulfilment is complete.</p>
            )}

            {!["paid", "processing", "shipped", "delivered"].includes(order.status) && (
              <p className="mt-6 rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-gray-700">
                This status is read-only in the fulfilment workflow. Cancellation and refunds require separate payment-safe actions.
              </p>
            )}
          </section>

          {shipment && (
            <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <h3 className="text-2xl font-black">Shipment tracking</h3>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><dt className="text-sm font-bold text-gray-500">Carrier</dt><dd className="mt-1 font-black">{shipment.carrier ?? "—"}</dd></div>
                <div><dt className="text-sm font-bold text-gray-500">Service</dt><dd className="mt-1 font-black">{shipment.service ?? "—"}</dd></div>
                <div><dt className="text-sm font-bold text-gray-500">Tracking number</dt><dd className="mt-1 font-black">{shipment.tracking_number ?? "—"}</dd></div>
                <div><dt className="text-sm font-bold text-gray-500">Shipment status</dt><dd className="mt-1 font-black capitalize">{shipment.status}</dd></div>
                <div><dt className="text-sm font-bold text-gray-500">Shipped at</dt><dd className="mt-1 font-black">{shipment.shipped_at ? dateFormatter.format(new Date(shipment.shipped_at)) : "—"}</dd></div>
                <div><dt className="text-sm font-bold text-gray-500">Delivered at</dt><dd className="mt-1 font-black">{shipment.delivered_at ? dateFormatter.format(new Date(shipment.delivered_at)) : "—"}</dd></div>
              </dl>
              {shipment.tracking_url && (
                <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex font-bold underline decoration-rose-500 underline-offset-4">
                  Open carrier tracking
                </a>
              )}
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Delivery</h3>
            <p className="mt-4 font-bold capitalize">{order.shipping_method} shipping</p>
            <div className="mt-4 space-y-1 text-sm leading-6 text-gray-600">
              {addressLines.map((line) => <p key={line}>{line}</p>)}
            </div>
            {order.shipping_address.phone && <p className="mt-4 text-sm font-bold">{order.shipping_address.phone}</p>}
            <p className="mt-2 text-sm text-gray-500">{order.email}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Payment</h3>
            {payment ? (
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Provider</dt><dd className="font-bold capitalize">{payment.provider}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd className="font-bold capitalize">{payment.status}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Reference</dt><dd className="break-all text-right font-bold">{payment.provider_reference}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Paid</dt><dd className="font-bold">{payment.paid_at ? dateFormatter.format(new Date(payment.paid_at)) : "—"}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 text-gray-600">No payment record found.</p>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Customer notifications</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Confirmation, shipment, and delivery emails are queued automatically when the order status changes.
            </p>
            {emailDeliveries.length > 0 ? (
              <div className="mt-5 space-y-4">
                {emailDeliveries.map((delivery) => (
                  <article key={delivery.id} className="rounded-2xl border border-stone-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{emailEventLabels[delivery.event]}</p>
                        <p className="mt-1 break-all text-xs text-gray-500">{delivery.recipient_email}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getEmailStatusClasses(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2 text-xs text-gray-600">
                      <div className="flex justify-between gap-4">
                        <dt>Attempts</dt>
                        <dd className="font-bold text-gray-900">{delivery.attempt_count}</dd>
                      </div>
                      {delivery.sent_at && (
                        <div className="flex justify-between gap-4">
                          <dt>Sent</dt>
                          <dd className="text-right font-bold text-gray-900">{dateFormatter.format(new Date(delivery.sent_at))}</dd>
                        </div>
                      )}
                      {delivery.status === "failed" && delivery.next_attempt_at && (
                        <div className="flex justify-between gap-4">
                          <dt>Next automatic attempt</dt>
                          <dd className="text-right font-bold text-gray-900">{dateFormatter.format(new Date(delivery.next_attempt_at))}</dd>
                        </div>
                      )}
                    </dl>
                    {delivery.last_error && (
                      <p className="mt-3 break-words rounded-xl bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700">
                        {delivery.last_error}
                      </p>
                    )}
                    {delivery.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => void handleRetryEmail(delivery.id)}
                        disabled={isSaving}
                        className="mt-4 rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 disabled:bg-gray-300"
                      >
                        {savingAction === `email-${delivery.id}` ? "Queuing..." : "Retry now"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-gray-700">
                No transactional emails were queued for this order. Existing orders are not emailed retroactively.
              </p>
            )}
          </section>

          <section className="rounded-3xl bg-neutral-950 p-6 text-white shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Order total</h3>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-neutral-400">Subtotal</dt><dd className="font-bold">{formatCurrency(order.subtotal, order.currency)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-neutral-400">Shipping</dt><dd className="font-bold">{formatCurrency(order.shipping_amount, order.currency)}</dd></div>
              {order.tax_amount > 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-400">Tax</dt><dd className="font-bold">{formatCurrency(order.tax_amount, order.currency)}</dd></div>}
              {order.duty_amount > 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-400">Duties</dt><dd className="font-bold">{formatCurrency(order.duty_amount, order.currency)}</dd></div>}
              {order.discount_amount > 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-400">Discount{order.coupon_code ? ` · ${order.coupon_code}` : ""}</dt><dd className="font-bold">-{formatCurrency(order.discount_amount, order.currency)}</dd></div>}
              <div className="flex justify-between gap-4 border-t border-white/20 pt-4 text-lg"><dt className="font-black">Total</dt><dd className="font-black">{formatCurrency(order.total, order.currency)}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminOrderDetailPage;
