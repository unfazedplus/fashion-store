import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  listAdminCustomers,
  type AdminCustomerListResponse,
} from "../../services/admin-customers";
import { formatCurrency } from "../../utils/currency";

const PAGE_SIZE = 25;
const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function AdminCustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [result, setResult] = useState<AdminCustomerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    listAdminCustomers(activeSearch, PAGE_SIZE, page * PAGE_SIZE)
      .then((nextResult) => {
        if (isActive) {
          setResult(nextResult);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setResult(null);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load customers.");
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
  }, [activeSearch, page, requestVersion]);

  const beginLoad = () => {
    setIsLoading(true);
    setErrorMessage("");
    setRequestVersion((currentVersion) => currentVersion + 1);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    beginLoad();
    setPage(0);
    setActiveSearch(searchInput.trim());
  };

  const clearSearch = () => {
    beginLoad();
    setSearchInput("");
    setActiveSearch("");
    setPage(0);
  };

  const changePage = (nextPage: number) => {
    beginLoad();
    setPage(Math.max(0, nextPage));
  };

  const total = result?.total ?? 0;
  const firstVisible = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastVisible = Math.min((page + 1) * PAGE_SIZE, total);
  const hasPreviousPage = page > 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Customers</p>
        <h2 className="mt-2 text-3xl font-black">Customer directory</h2>
        <p className="mt-2 max-w-3xl text-gray-600">
          Review registered customer contact details, order activity, saved-address counts, and lifetime value without exposing authentication controls.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Matching customers" value={total.toLocaleString("en-NG")} />
          <MetricCard label="Customers with orders" value={(result?.metrics.with_orders ?? 0).toLocaleString("en-NG")} />
          <MetricCard label="Paid NGN value" value={formatCurrency(result?.metrics.lifetime_spend_ngn ?? 0, "NGN")} />
          <MetricCard label="Paid USD value" value={formatCurrency(result?.metrics.lifetime_spend_usd ?? 0, "USD")} />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="mb-2 block text-sm font-bold">Search customers</span>
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email, or phone"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-rose-600"
            >
              Search
            </button>
            {(activeSearch || searchInput) && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-xl border border-gray-300 px-5 py-3 font-bold hover:border-black"
              >
                Clear
              </button>
            )}
          </div>
        </form>
        {activeSearch && (
          <p className="mt-4 text-sm text-gray-500">Showing results for “{activeSearch}”.</p>
        )}
      </section>

      {errorMessage && (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading customers...</div>
      ) : result && result.customers.length > 0 ? (
        <section className="space-y-4">
          {result.customers.map((customer) => {
            const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");

            return (
              <article key={customer.id} className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
                <div className="grid gap-6 xl:grid-cols-[1.2fr_1.4fr_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="truncate text-xl font-black">{customerName || "Unnamed customer"}</h3>
                      {customer.role !== "customer" && (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold capitalize text-violet-800">
                          {customer.role}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 break-all text-sm font-semibold text-gray-700">{customer.email}</p>
                    <p className="mt-1 text-sm text-gray-500">{customer.phone || "No profile phone"}</p>
                    <p className="mt-3 text-xs text-gray-400">
                      Joined {dateFormatter.format(new Date(customer.created_at))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
                    <CustomerStat label="Orders" value={customer.order_count.toLocaleString("en-NG")} />
                    <CustomerStat label="Addresses" value={customer.address_count.toLocaleString("en-NG")} />
                    <CustomerStat label="NGN value" value={formatCurrency(customer.lifetime_spend_ngn, "NGN")} />
                    <CustomerStat label="USD value" value={formatCurrency(customer.lifetime_spend_usd, "USD")} />
                  </div>

                  <div className="xl:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Last order</p>
                    <p className="mt-1 text-sm font-bold">
                      {customer.last_order_at
                        ? dateFormatter.format(new Date(customer.last_order_at))
                        : "No orders yet"}
                    </p>
                    <Link
                      to={`/admin/customers/${customer.id}`}
                      className="mt-4 inline-flex rounded-xl bg-black px-5 py-3 font-bold text-white hover:bg-rose-600"
                    >
                      View customer
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
            <p className="text-sm font-semibold text-gray-600">
              Showing {firstVisible}–{lastVisible} of {total.toLocaleString("en-NG")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={!hasPreviousPage}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={!hasNextPage}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-2xl font-black">No matching customers</h3>
          <p className="mt-3 text-gray-600">Try another name, email address, or phone number.</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

function CustomerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-gray-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

export default AdminCustomersPage;
