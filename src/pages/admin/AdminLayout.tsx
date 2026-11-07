import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { AdminProfile } from "../../services/admin";

interface AdminOutletContext {
  profile: AdminProfile;
}

const navigationItems = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/products", label: "Products & inventory", end: false },
  { to: "/admin/orders", label: "Orders & fulfilment", end: false },
  { to: "/admin/customers", label: "Customers", end: false },
  { to: "/admin/promotions", label: "Promotions", end: false },
  { to: "/admin/newsletter", label: "Newsletter", end: false },
];

function AdminLayout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useOutletContext<AdminOutletContext>();
  const staffName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell min-h-screen bg-[var(--store-canvas)]">
      <header className="sticky top-0 z-50 border-b border-black/15 bg-white/95 backdrop-blur-xl">
        <div className="store-container flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-3" aria-label="UNFAZED admin overview">
            <span className="text-sm font-black tracking-[0.16em] sm:text-lg sm:tracking-[0.2em]">UNFAZED</span>
            <span className="hidden border-l border-black/20 pl-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500 sm:inline">Admin</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/" className="px-1.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-100 sm:px-3 sm:py-2 sm:text-xs sm:tracking-[0.08em]">
              <span className="sm:hidden">Store</span><span className="hidden sm:inline">Storefront</span>
            </Link>
            <Link to="/account" className="hidden px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] hover:bg-neutral-100 sm:block">
              Account
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="border border-black px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.05em] hover:bg-black hover:text-white sm:px-3 sm:py-2 sm:text-xs sm:tracking-[0.08em]"
            >
              <span className="sm:hidden">Exit</span><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="store-container py-6 sm:py-8">
        <section className="border border-black bg-neutral-950 px-5 py-7 text-white sm:px-8 sm:py-9">
          <p className="store-eyebrow text-neutral-400">UNFAZED operations</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">Commerce dashboard</h1>
          <p className="mt-3 text-sm text-neutral-300">
            {staffName ? `${staffName} · ` : ""}{profile.role === "admin" ? "Administrator" : "Staff member"}
          </p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
          <nav className="-mx-4 flex h-fit gap-0 overflow-x-auto border-y border-[var(--store-line)] bg-white px-4 lg:sticky lg:top-20 lg:mx-0 lg:flex-col lg:border lg:px-0" aria-label="Admin navigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.07em] lg:border-b lg:border-l-2 ${isActive ? "border-black bg-black text-white lg:bg-neutral-100 lg:text-black" : "border-transparent hover:bg-neutral-100"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <main className="admin-content min-w-0">
            <Suspense fallback={<AdminContentLoading />}>
              <Outlet context={{ profile }} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminContentLoading() {
  return (
    <div className="store-panel flex min-h-72 items-center justify-center p-8 text-center" role="status" aria-live="polite">
      <div>
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border border-neutral-300 border-t-black" />
        <p className="store-eyebrow mt-5 text-neutral-500">Loading dashboard</p>
      </div>
    </div>
  );
}

export default AdminLayout;
