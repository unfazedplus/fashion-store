import { useEffect, useMemo, useState } from "react";
import {
  getAdminNewsletterSubscribers,
  setAdminNewsletterSubscriberActive,
  type AdminNewsletterSubscriber,
} from "../../services/admin-newsletter";

type SubscriberFilter = "all" | "active" | "unsubscribed";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<AdminNewsletterSubscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<SubscriberFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getAdminNewsletterSubscribers()
      .then((nextSubscribers) => {
        if (isActive) {
          setSubscribers(nextSubscribers);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load newsletter subscribers.");
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

  const filteredSubscribers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const isActive = subscriber.unsubscribed_at === null;
      if (filter === "active" && !isActive) {
        return false;
      }
      if (filter === "unsubscribed" && isActive) {
        return false;
      }
      return !normalizedSearch || subscriber.email.toLowerCase().includes(normalizedSearch);
    });
  }, [filter, searchTerm, subscribers]);

  const activeSubscribers = subscribers.filter((subscriber) => subscriber.unsubscribed_at === null);

  const handleToggleActive = async (subscriber: AdminNewsletterSubscriber) => {
    const nextActive = subscriber.unsubscribed_at !== null;
    setSavingId(subscriber.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedSubscriber = await setAdminNewsletterSubscriberActive(subscriber.id, nextActive);
      setSubscribers((currentSubscribers) => currentSubscribers.map((candidate) =>
        candidate.id === subscriber.id ? updatedSubscriber : candidate,
      ));
      setSuccessMessage(`${updatedSubscriber.email} is now ${nextActive ? "subscribed" : "unsubscribed"}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the subscriber.");
    } finally {
      setSavingId("");
    }
  };

  const exportActiveSubscribers = () => {
    const rows = [
      ["email", "source", "subscribed_at"],
      ...activeSubscribers.map((subscriber) => [subscriber.email, subscriber.source, subscriber.subscribed_at]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const downloadLink = document.createElement("a");
    downloadLink.href = objectUrl;
    downloadLink.download = `unfazed-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadLink.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Audience</p>
            <h2 className="mt-2 text-3xl font-black">Newsletter subscribers</h2>
            <p className="mt-2 max-w-2xl text-gray-600">Manage consent status and export active subscribers for an email platform.</p>
          </div>
          <button
            type="button"
            onClick={exportActiveSubscribers}
            disabled={activeSubscribers.length === 0}
            className="self-start rounded-full bg-black px-5 py-2.5 font-bold text-white hover:bg-rose-600 disabled:bg-gray-300"
          >
            Export active CSV
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">All records</p>
            <p className="mt-2 text-3xl font-black">{subscribers.length}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Active</p>
            <p className="mt-2 text-3xl font-black">{activeSubscribers.length}</p>
          </article>
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-gray-500">Unsubscribed</p>
            <p className="mt-2 text-3xl font-black">{subscribers.length - activeSubscribers.length}</p>
          </article>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_15rem]">
          <label>
            <span className="mb-2 block text-sm font-bold">Search email</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="subscriber@example.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Consent status</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as SubscriberFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="all">All records</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-500">Showing {filteredSubscribers.length} records</p>
      </section>

      {successMessage && <p className="rounded-2xl bg-emerald-100 p-4 text-sm font-bold text-emerald-800" role="status">{successMessage}</p>}
      {errorMessage && <p className="rounded-2xl bg-red-100 p-4 text-sm font-bold text-red-700" role="alert">{errorMessage}</p>}

      {isLoading ? (
        <div className="rounded-3xl bg-white p-8 font-bold shadow-sm">Loading subscribers...</div>
      ) : filteredSubscribers.length > 0 ? (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {filteredSubscribers.map((subscriber) => {
              const isActive = subscriber.unsubscribed_at === null;
              return (
                <article key={subscriber.id} className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="break-all font-black">{subscriber.email}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-700"}`}>
                        {isActive ? "Active" : "Unsubscribed"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Source: {subscriber.source}</p>
                    <p className="mt-1 text-xs text-gray-400">Subscribed {dateFormatter.format(new Date(subscriber.subscribed_at))}</p>
                    {subscriber.unsubscribed_at && (
                      <p className="mt-1 text-xs text-gray-400">Unsubscribed {dateFormatter.format(new Date(subscriber.unsubscribed_at))}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(subscriber)}
                    disabled={Boolean(savingId)}
                    className={`rounded-xl px-5 py-2.5 font-bold disabled:opacity-50 ${isActive ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-black text-white hover:bg-rose-600"}`}
                  >
                    {savingId === subscriber.id ? "Saving..." : isActive ? "Unsubscribe" : "Resubscribe"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <h3 className="text-2xl font-black">No matching subscribers</h3>
          <p className="mt-3 text-gray-600">New storefront signups will appear here.</p>
        </div>
      )}
    </div>
  );
}

export default AdminNewsletterPage;
