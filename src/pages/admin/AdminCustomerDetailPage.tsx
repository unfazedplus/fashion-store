import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getAdminCustomer,
  type AdminCustomerDetail,
} from "../../services/admin-customers";
import type { OrderStatus } from "../../services/admin-orders";
import { formatCurrency } from "../../utils/currency";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusClasses: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-violet-100 text-violet-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-700",
  refund_pending: "bg-orange-100 text-orange-800",
  refunded: "bg-red-100 text-red-800",
};

function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!customerId) {
      return;
    }

    let isActive = true;

    getAdminCustomer(customerId)
      .then((nextDetail) => {
        if (isActive) {
          setDetail(nextDetail);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load this customer.");
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
  }, [customerId]);

  if (!customerId) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="font-bold text-red-700" role="alert">Customer ID is missing.</p>
        <Link to="/admin/customers" className="mt-6 inline-flex rounded-full bg-black px-5 py-2.5 font-bold text-white">
          Return to customers
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading customer...</div>;
  }

  if (errorMessage || !detail) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <p className="font-bold text-red-700" role="alert">{errorMessage || "Customer not found."}</p>
        <Link to="/admin/customers" className="mt-6 inline-flex rounded-full bg-black px-5 py-2.5 font-bold text-white">
          Return to customers
        </Link>
      </div>
    );
  }

  const { customer, addresses, orders } = detail;
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <Link to="/admin/customers" className="text-sm font-bold text-rose-600 hover:text-rose-700">
          ← Customer directory
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Customer profile</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black sm:text-4xl">{customerName || "Unnamed customer"}</h2>
              {customer.role !== "customer" && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold capitalize text-violet-800">
                  {customer.role}
                </span>
              )}
            </div>
            <p className="mt-3 break-all font-semibold text-gray-700">{customer.email}</p>
            <p className="mt-1 text-sm text-gray-500">Joined {dateFormatter.format(new Date(customer.created_at))}</p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-5 py-4 text-sm lg:text-right">
            <p className="font-bold text-gray-500">Last order</p>
            <p className="mt-1 font-black">
              {customer.last_order_at
                ? dateFormatter.format(new Date(customer.last_order_at))
                : "No orders yet"}
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="All orders" value={customer.order_count.toLocaleString("en-NG")} />
          <MetricCard label="Paid orders" value={customer.paid_order_count.toLocaleString("en-NG")} />
          <MetricCard label="Saved addresses" value={customer.address_count.toLocaleString("en-NG")} />
          <MetricCard label="NGN lifetime value" value={formatCurrency(customer.lifetime_spend_ngn, "NGN")} />
          <MetricCard label="USD lifetime value" value={formatCurrency(customer.lifetime_spend_usd, "USD")} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Contact</h3>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="font-bold text-gray-500">Email</dt>
                <dd className="mt-1 break-all font-black">{customer.email}</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-500">Profile phone</dt>
                <dd className="mt-1 font-black">{customer.phone || "Not provided"}</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-500">Customer ID</dt>
                <dd className="mt-1 break-all font-mono text-xs">{customer.id}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-2xl font-black">Saved addresses</h3>
            {addresses.length > 0 ? (
              <div className="mt-6 space-y-4">
                {addresses.map((address) => {
                  const addressLines = [
                    `${address.first_name} ${address.last_name}`.trim(),
                    address.address_line_1,
                    address.address_line_2,
                    [address.city, address.region, address.postal_code].filter(Boolean).join(", "),
                    address.country_code,
                  ].filter(Boolean);

                  return (
                    <article key={address.id} className="rounded-2xl border border-gray-200 p-5 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black">{address.label || "Saved address"}</p>
                        {address.is_default && (
                          <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">Default</span>
                        )}
                      </div>
                      <div className="mt-4 space-y-1 leading-6 text-gray-600">
                        {addressLines.map((line) => <p key={line}>{line}</p>)}
                      </div>
                      <p className="mt-4 font-bold">{address.phone}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No saved addresses.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-2xl font-black">Order history</h3>
          <p className="mt-2 text-sm text-gray-600">Registered-account orders only; guest orders are not attached retroactively.</p>

          {orders.length > 0 ? (
            <div className="mt-6 divide-y divide-gray-100">
              {orders.map((order) => (
                <article key={order.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-black">{order.order_number}</h4>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses[order.status]}`}>
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">{dateFormatter.format(new Date(order.created_at))}</p>
                    </div>
                    <p className="text-lg font-black">{formatCurrency(order.total, order.currency)}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <OrderStat label="Items" value={String(order.item_count)} />
                    <OrderStat label="Shipping" value={order.shipping_method} />
                    <OrderStat label="Destination" value={order.shipping_country_code} />
                    <OrderStat label="Promotion" value={order.coupon_code ?? "None"} />
                  </div>

                  {order.discount_amount > 0 && (
                    <p className="mt-4 text-sm font-bold text-emerald-700">
                      Discount: -{formatCurrency(order.discount_amount, order.currency)}
                    </p>
                  )}

                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="mt-5 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-600"
                  >
                    Manage order
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
              This customer has no linked orders yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-stone-100 p-5">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}

function OrderStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-gray-500">{label}</p>
      <p className="mt-1 font-black capitalize">{value}</p>
    </div>
  );
}

export default AdminCustomerDetailPage;
