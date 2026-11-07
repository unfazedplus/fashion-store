import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createAdminCoupon,
  getAdminCoupons,
  setAdminCouponActive,
  updateAdminCoupon,
  type AdminCoupon,
  type AdminCouponInput,
  type CouponDiscountType,
} from "../../services/admin-promotions";
import type { CurrencyCode } from "../../types/market";
import { formatCurrency } from "../../utils/currency";

type PromotionStatus = "active" | "scheduled" | "expired" | "exhausted" | "inactive";

interface CouponDraft {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  currency: "" | CurrencyCode;
  minimumOrderAmount: string;
  maximumUses: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const emptyDraft: CouponDraft = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "10",
  currency: "",
  minimumOrderAmount: "0",
  maximumUses: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

const statusStyles: Record<PromotionStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-blue-100 text-blue-800",
  expired: "bg-stone-200 text-stone-700",
  exhausted: "bg-amber-100 text-amber-800",
  inactive: "bg-red-100 text-red-800",
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function amountInputFromMinorUnits(amount: number) {
  return (amount / 100).toFixed(2).replace(/\.00$/, "");
}

function amountInMinorUnits(value: string, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be zero or more.`);
  }

  return Math.round(amount * 100);
}

function couponToDraft(coupon: AdminCoupon): CouponDraft {
  return {
    code: coupon.code,
    description: coupon.description ?? "",
    discountType: coupon.discount_type,
    discountValue: coupon.discount_type === "percentage"
      ? String(coupon.discount_value)
      : amountInputFromMinorUnits(coupon.discount_value),
    currency: coupon.currency ?? "",
    minimumOrderAmount: amountInputFromMinorUnits(coupon.minimum_order_amount),
    maximumUses: coupon.maximum_uses === null ? "" : String(coupon.maximum_uses),
    startsAt: toDateTimeLocal(coupon.starts_at),
    endsAt: toDateTimeLocal(coupon.ends_at),
    active: coupon.active,
  };
}

function getPromotionStatus(coupon: AdminCoupon): PromotionStatus {
  const now = Date.now();
  const reservedOrUsed = coupon.use_count + coupon.pendingUses;

  if (!coupon.active) {
    return "inactive";
  }
  if (coupon.maximum_uses !== null && reservedOrUsed >= coupon.maximum_uses) {
    return "exhausted";
  }
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return "scheduled";
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() <= now) {
    return "expired";
  }
  return "active";
}

function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    getAdminCoupons()
      .then((nextCoupons) => {
        if (isActive) {
          setCoupons(nextCoupons);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load promotions.");
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

  const metrics = useMemo(() => {
    const statuses = coupons.map(getPromotionStatus);
    return {
      total: coupons.length,
      active: statuses.filter((status) => status === "active").length,
      scheduled: statuses.filter((status) => status === "scheduled").length,
      paidUses: coupons.reduce((total, coupon) => total + coupon.use_count, 0),
    };
  }, [coupons]);

  const refreshCoupons = async () => {
    const nextCoupons = await getAdminCoupons();
    setCoupons(nextCoupons);
  };

  const resetEditor = () => {
    setEditingCouponId(null);
    setDraft(emptyDraft);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingKey("form");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const currency = draft.currency || null;
      const percentageValue = Number(draft.discountValue);
      const maximumUses = draft.maximumUses.trim() ? Number(draft.maximumUses) : null;
      const input: AdminCouponInput = {
        code: draft.code,
        description: draft.description || null,
        discount_type: draft.discountType,
        discount_value: draft.discountType === "percentage"
          ? percentageValue
          : amountInMinorUnits(draft.discountValue, "Fixed discount"),
        currency,
        minimum_order_amount: currency
          ? amountInMinorUnits(draft.minimumOrderAmount, "Minimum order amount")
          : 0,
        maximum_uses: maximumUses,
        starts_at: toIsoDate(draft.startsAt),
        ends_at: toIsoDate(draft.endsAt),
        active: draft.active,
      };

      if (draft.discountType === "percentage" && !Number.isSafeInteger(percentageValue)) {
        throw new Error("Percentage discount must be a whole number.");
      }
      if (maximumUses !== null && !Number.isSafeInteger(maximumUses)) {
        throw new Error("Maximum uses must be a whole number.");
      }

      const editingCoupon = coupons.find((coupon) => coupon.id === editingCouponId);
      if (
        editingCoupon &&
        maximumUses !== null &&
        maximumUses < editingCoupon.use_count + editingCoupon.pendingUses
      ) {
        throw new Error("Maximum uses cannot be lower than paid uses plus pending reservations.");
      }

      if (editingCouponId) {
        await updateAdminCoupon(editingCouponId, input);
        setSuccessMessage(`${input.code.trim().toUpperCase()} was updated.`);
      } else {
        await createAdminCoupon(input);
        setSuccessMessage(`${input.code.trim().toUpperCase()} was created.`);
      }

      await refreshCoupons();
      resetEditor();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save this promotion.");
    } finally {
      setSavingKey("");
    }
  };

  const handleEdit = (coupon: AdminCoupon) => {
    setEditingCouponId(coupon.id);
    setDraft(couponToDraft(coupon));
    setErrorMessage("");
    setSuccessMessage("");
    document.getElementById("promotion-editor")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleActive = async (coupon: AdminCoupon) => {
    const nextActive = !coupon.active;
    setSavingKey(`active:${coupon.id}`);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await setAdminCouponActive(coupon.id, nextActive);
      await refreshCoupons();
      setSuccessMessage(`${coupon.code} is now ${nextActive ? "active" : "inactive"}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this promotion.");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Promotions</p>
        <h2 className="mt-2 text-3xl font-black">Coupon management</h2>
        <p className="mt-2 max-w-3xl text-gray-600">
          Create scheduled percentage or fixed discounts with currency, minimum-order, and usage-limit safeguards.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="All coupons" value={metrics.total} />
          <MetricCard label="Active now" value={metrics.active} />
          <MetricCard label="Scheduled" value={metrics.scheduled} />
          <MetricCard label="Paid redemptions" value={metrics.paidUses} />
        </div>
      </section>

      {(errorMessage || successMessage) && (
        <p
          className={`rounded-2xl p-4 text-sm font-bold ${
            errorMessage ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
          }`}
          role={errorMessage ? "alert" : "status"}
        >
          {errorMessage || successMessage}
        </p>
      )}

      <section id="promotion-editor" className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-2xl font-black">
              {editingCouponId ? "Edit promotion" : "Create promotion"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Discounts apply to merchandise subtotal only; shipping remains unchanged.
            </p>
          </div>
          {editingCouponId && (
            <button
              type="button"
              onClick={resetEditor}
              disabled={Boolean(savingKey)}
              className="self-start rounded-full border border-gray-300 px-5 py-2.5 font-bold hover:border-black"
            >
              Cancel editing
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-2 block text-sm font-bold">Coupon code</span>
            <input
              type="text"
              value={draft.code}
              onChange={(event) => setDraft((current) => ({
                ...current,
                code: event.target.value.toUpperCase(),
              }))}
              placeholder="WELCOME10"
              required
              minLength={3}
              maxLength={32}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 font-bold uppercase"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">Description</span>
            <input
              type="text"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))}
              placeholder="New customer welcome offer"
              maxLength={200}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">Discount type</span>
            <select
              value={draft.discountType}
              onChange={(event) => {
                const discountType = event.target.value as CouponDiscountType;
                setDraft((current) => ({
                  ...current,
                  discountType,
                  currency: discountType === "fixed" && !current.currency ? "NGN" : current.currency,
                }));
              }}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">Currency availability</span>
            <select
              value={draft.currency}
              onChange={(event) => setDraft((current) => ({
                ...current,
                currency: event.target.value as "" | CurrencyCode,
                minimumOrderAmount: event.target.value ? current.minimumOrderAmount : "0",
              }))}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:bg-gray-100"
            >
              {draft.discountType === "percentage" && <option value="">All currencies</option>}
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              {draft.discountType === "percentage"
                ? "Percentage discount"
                : `Fixed discount (${draft.currency})`}
            </span>
            <input
              type="number"
              min={draft.discountType === "percentage" ? "1" : "0.01"}
              max={draft.discountType === "percentage" ? "100" : undefined}
              step={draft.discountType === "percentage" ? "1" : "0.01"}
              value={draft.discountValue}
              onChange={(event) => setDraft((current) => ({
                ...current,
                discountValue: event.target.value,
              }))}
              required
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Minimum order {draft.currency ? `(${draft.currency})` : ""}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.minimumOrderAmount}
              onChange={(event) => setDraft((current) => ({
                ...current,
                minimumOrderAmount: event.target.value,
              }))}
              disabled={Boolean(savingKey) || !draft.currency}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 disabled:bg-gray-100"
            />
            {!draft.currency && (
              <span className="mt-2 block text-xs text-gray-500">Global percentage coupons use no currency-specific minimum.</span>
            )}
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">Maximum uses</span>
            <input
              type="number"
              min="1"
              step="1"
              value={draft.maximumUses}
              onChange={(event) => setDraft((current) => ({
                ...current,
                maximumUses: event.target.value,
              }))}
              placeholder="Unlimited"
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <div className="hidden sm:block" />

          <label>
            <span className="mb-2 block text-sm font-bold">Starts at</span>
            <input
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) => setDraft((current) => ({
                ...current,
                startsAt: event.target.value,
              }))}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">Ends at</span>
            <input
              type="datetime-local"
              value={draft.endsAt}
              onChange={(event) => setDraft((current) => ({
                ...current,
                endsAt: event.target.value,
              }))}
              disabled={Boolean(savingKey)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft((current) => ({
                ...current,
                active: event.target.checked,
              }))}
              disabled={Boolean(savingKey)}
              className="h-5 w-5 accent-black"
            />
            <span className="font-bold">Allow this coupon when its schedule and limits permit</span>
          </label>

          <button
            type="submit"
            disabled={Boolean(savingKey)}
            className="rounded-xl bg-black px-6 py-3.5 font-bold text-white hover:bg-rose-600 disabled:bg-gray-300 sm:col-span-2"
          >
            {savingKey === "form"
              ? "Saving promotion..."
              : editingCouponId
                ? "Save promotion changes"
                : "Create promotion"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="text-2xl font-black">Promotion catalogue</h3>
          <p className="mt-2 text-sm text-gray-600">Pending checkouts reserve limited-use coupons until payment or expiry.</p>
        </div>

        {isLoading ? (
          <p className="mt-8 font-bold">Loading promotions...</p>
        ) : coupons.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center">
            <h4 className="text-xl font-black">No coupons yet</h4>
            <p className="mt-2 text-gray-600">Create the first promotion using the editor above.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {coupons.map((coupon) => {
              const status = getPromotionStatus(coupon);
              const activeToggleKey = `active:${coupon.id}`;
              const discountLabel = coupon.discount_type === "percentage"
                ? `${coupon.discount_value}% off`
                : `${formatCurrency(coupon.discount_value, coupon.currency as CurrencyCode)} off`;
              const usageLabel = coupon.maximum_uses === null
                ? `${coupon.use_count} paid · ${coupon.pendingUses} pending · unlimited`
                : `${coupon.use_count} paid · ${coupon.pendingUses} pending · ${coupon.maximum_uses} maximum`;

              return (
                <article key={coupon.id} className="rounded-2xl border border-gray-200 p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-xl font-black">{coupon.code}</h4>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyles[status]}`}>
                          {status}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-600">{coupon.description || "No description"}</p>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <p><span className="font-bold">Discount:</span> {discountLabel}</p>
                        <p><span className="font-bold">Currency:</span> {coupon.currency ?? "All currencies"}</p>
                        {coupon.minimum_order_amount > 0 && coupon.currency && (
                          <p>
                            <span className="font-bold">Minimum:</span>{" "}
                            {formatCurrency(coupon.minimum_order_amount, coupon.currency)}
                          </p>
                        )}
                        <p><span className="font-bold">Usage:</span> {usageLabel}</p>
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        {coupon.starts_at
                          ? `Starts ${dateFormatter.format(new Date(coupon.starts_at))}`
                          : "Starts immediately"}
                        {" · "}
                        {coupon.ends_at
                          ? `Ends ${dateFormatter.format(new Date(coupon.ends_at))}`
                          : "No end date"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(coupon)}
                        disabled={Boolean(savingKey)}
                        className="rounded-full border border-gray-300 px-4 py-2 text-sm font-bold hover:border-black"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(coupon)}
                        disabled={Boolean(savingKey)}
                        className={`rounded-full px-4 py-2 text-sm font-bold text-white ${
                          coupon.active ? "bg-red-700 hover:bg-red-600" : "bg-black hover:bg-rose-600"
                        } disabled:bg-gray-300`}
                      >
                        {savingKey === activeToggleKey
                          ? "Saving..."
                          : coupon.active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}

export default AdminPromotionsPage;
