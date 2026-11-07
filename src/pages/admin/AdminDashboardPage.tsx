import { useEffect, useState } from "react";
import { getAdminDashboardData, type AdminDashboardData } from "../../services/admin";
import { formatCurrency } from "../../utils/currency";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getAdminDashboardData()
      .then((data) => {
        if (isActive) {
          setDashboard(data);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load admin dashboard.");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (errorMessage) {
    return <div className="rounded-3xl bg-white p-8 text-red-700 shadow-sm" role="alert">{errorMessage}</div>;
  }

  if (!dashboard) {
    return <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading commerce metrics...</div>;
  }

  const metricCards = [
    { label: "Products", value: dashboard.metrics.products, detail: `${dashboard.metrics.activeProducts} active` },
    { label: "Variants", value: dashboard.metrics.variants, detail: "Sellable SKUs" },
    { label: "Low stock", value: dashboard.metrics.lowStockVariants, detail: "Five units or fewer" },
    { label: "Orders", value: dashboard.metrics.orders, detail: "All recorded orders" },
    { label: "To fulfil", value: dashboard.metrics.awaitingFulfilment, detail: "Paid or processing" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-black">Store overview</h2>
            <p className="mt-2 text-gray-600">Live catalogue, inventory, order, and revenue signals.</p>
          </div>
          <p className="text-sm font-semibold text-gray-500">Updates when this page is loaded</p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((metric) => (
            <article key={metric.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-500">{metric.label}</p>
              <p className="mt-3 text-4xl font-black">{metric.value.toLocaleString("en-NG")}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{metric.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl bg-neutral-950 p-6 text-white shadow-sm">
          <p className="text-sm font-bold text-neutral-400">Recorded NGN revenue</p>
          <p className="mt-3 text-4xl font-black">{formatCurrency(dashboard.revenue.NGN, "NGN")}</p>
          <p className="mt-2 text-xs text-neutral-400">Paid, processing, shipped, and delivered orders</p>
        </article>
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-gray-500">Recorded USD revenue</p>
          <p className="mt-3 text-4xl font-black">{formatCurrency(dashboard.revenue.USD, "USD")}</p>
          <p className="mt-2 text-xs text-gray-500">Separate reporting for the USD price book</p>
        </article>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">Recent orders</h2>
          <p className="mt-2 text-gray-600">Latest checkout activity across guest and customer orders.</p>
          {dashboard.recentOrders.length > 0 ? (
            <div className="mt-6 divide-y divide-gray-100">
              {dashboard.recentOrders.map((order) => (
                <article key={order.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-black">{order.order_number}</p>
                    <p className="mt-1 text-sm text-gray-500">{order.email} · {order.shipping_country_code}</p>
                    <p className="mt-1 text-xs text-gray-400">{dateFormatter.format(new Date(order.created_at))}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-black">{formatCurrency(order.total, order.currency)}</p>
                    <span className="mt-2 inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-bold capitalize">
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">No orders yet.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black">Low-stock variants</h2>
          <p className="mt-2 text-gray-600">Active SKUs with five units or fewer.</p>
          {dashboard.lowStockVariants.length > 0 ? (
            <div className="mt-6 divide-y divide-gray-100">
              {dashboard.lowStockVariants.map((variant) => (
                <article key={variant.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-black">{variant.products?.name ?? variant.sku}</p>
                    <p className="mt-1 text-xs text-gray-500">{variant.sku} · {variant.color} · {variant.size}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-black ${variant.stock <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {variant.stock}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">Inventory levels look healthy.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
