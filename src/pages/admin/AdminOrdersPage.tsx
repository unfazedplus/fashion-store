import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOrders, type AdminOrderListItem, type OrderStatus } from "../../services/admin-orders";
import { formatCurrency } from "../../utils/currency";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const orderStatuses: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refund_pending",
  "refunded",
];

type StatusFilter = "all" | OrderStatus;

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

function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getAdminOrders()
      .then((nextOrders) => {
        if (isActive) {
          setOrders(nextOrders);
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
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [order.order_number, order.email, order.shipping_country_code]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [orders, searchTerm, statusFilter]);

  const summary = useMemo(() => ({
    toProcess: orders.filter((order) => order.status === "paid" || order.status === "processing").length,
    inTransit: orders.filter((order) => order.status === "shipped").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
  }), [orders]);

  const refreshOrders = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      setOrders(await getAdminOrders());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Order operations</p>
            <h2 className="mt-2 text-3xl font-black">Orders and fulfilment</h2>
            <p className="mt-2 max-w-2xl text-gray-600">Process paid orders, add shipment tracking, and monitor delivery.</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshOrders()}
            disabled={isLoading}
            className="self-start rounded-full border border-gray-300 bg-white px-5 py-2.5 font-bold hover:border-black disabled:opacity-50"
          >
            Refresh orders
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">To process</p>
            <p className="mt-2 text-3xl font-black">{summary.toProcess}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">In transit</p>
            <p className="mt-2 text-3xl font-black">{summary.inTransit}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Delivered</p>
            <p className="mt-2 text-3xl font-black">{summary.delivered}</p>
          </article>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
          <label>
            <span className="mb-2 block text-sm font-bold">Search orders</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Order number, email, or country"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Order status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 capitalize"
            >
              <option value="all">All statuses</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </p>
      </section>

      {errorMessage && <p className="rounded-2xl bg-red-100 p-4 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading orders...</div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article key={order.id} className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black">{order.order_number}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusClasses(order.status)}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{order.email}</p>
                  <p className="mt-1 text-xs text-gray-500">{dateFormatter.format(new Date(order.created_at))}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-gray-500">Total</p>
                    <p className="mt-1 font-black">{formatCurrency(order.total, order.currency)}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500">Delivery</p>
                    <p className="mt-1 font-black capitalize">{order.shipping_method} · {order.shipping_country_code}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500">Items</p>
                    <p className="mt-1 font-black">{order.itemCount}</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-500">Shipment</p>
                    <p className="mt-1 font-black capitalize">{order.shipmentStatus ?? "Not created"}</p>
                  </div>
                </div>
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="rounded-xl bg-black px-5 py-3 text-center font-bold text-white hover:bg-rose-600"
                >
                  Manage order
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-2xl font-black">No matching orders</h3>
          <p className="mt-3 text-gray-600">Try clearing the search or selecting another status.</p>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage;
