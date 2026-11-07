import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function AccountLayout() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const displayName = [user?.user_metadata.first_name, user?.user_metadata.last_name]
    .filter(Boolean)
    .join(" ");

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <section className="account-shell store-page bg-[var(--store-canvas)]">
      <div className="store-container">
        <div className="flex flex-col justify-between gap-5 border-b border-black pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="store-eyebrow text-neutral-500">Customer account</p>
            <h1 className="store-title mt-3">
              {displayName ? `Hello, ${displayName}` : "Your UNFAZED account"}
            </h1>
            <p className="mt-3 text-sm text-neutral-600">{user?.email}</p>
          </div>
          <button type="button" onClick={handleSignOut} className="store-button-secondary self-start">
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[13rem_1fr] lg:gap-10">
          <nav className="-mx-4 flex h-fit gap-0 overflow-x-auto border-y border-[var(--store-line)] bg-white px-4 lg:mx-0 lg:flex-col lg:border" aria-label="Account navigation">
            {[
              { to: "/account", label: "Profile", end: true },
              { to: "/account/addresses", label: "Addresses", end: false },
              { to: "/account/orders", label: "Orders", end: false },
              { to: "/wishlist", label: "Wishlist", end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] lg:border-b lg:border-l-2 ${isActive ? "border-black bg-black text-white lg:bg-neutral-100 lg:text-black" : "border-transparent hover:bg-neutral-100"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </section>
  );
}

export default AccountLayout;
