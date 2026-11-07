import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supportedCurrencies } from "../../config/commerce";
import { useAuth } from "../../hooks/useAuth";
import { useStore } from "../../hooks/useStore";
import type { CurrencyCode } from "../../types/market";
import StoreIcon from "../ui/StoreIcon";

interface NavbarProps {
  onOpenCart: () => void;
}

const navigationItems = [
  { label: "New in", to: "/shop" },
  { label: "Women", to: "/shop?category=women" },
  { label: "Men", to: "/shop?category=men" },
  { label: "Accessories", to: "/shop?category=accessories" },
];

function Navbar({ onOpenCart }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const { cartCount, currency, setCurrency, wishlistProductIds } = useStore();
  const accountPath = user ? "/account" : "/login";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white">
      <div className="border-b border-black/10 bg-white/95 backdrop-blur-xl">
        <div className="store-container grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[4.25rem]">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              className="-ml-2 flex h-10 w-10 items-center justify-center lg:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            >
              <StoreIcon name={isMenuOpen ? "close" : "menu"} />
            </button>

            <nav className="hidden items-center gap-7 text-[12px] font-bold uppercase tracking-[0.08em] lg:flex" aria-label="Primary navigation">
              {navigationItems.map((item) => (
                <Link key={item.to} to={item.to} className="border-b border-transparent py-2 transition hover:border-black">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link
            to="/"
            className="text-lg font-black tracking-[0.24em] sm:text-xl"
            aria-label="UNFAZED home"
          >
            UNFAZED
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <label className="hidden md:block">
              <span className="sr-only">Shopping currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className="h-9 border-0 bg-transparent px-2 text-[11px] font-bold uppercase tracking-[0.08em] outline-none"
                aria-label="Shopping currency"
              >
                {supportedCurrencies.map((currencyOption) => (
                  <option key={currencyOption.code} value={currencyOption.code}>
                    {currencyOption.code}
                  </option>
                ))}
              </select>
            </label>

            <HeaderAction to="/shop" label="Search products" icon="search" />
            <HeaderAction
              to="/wishlist"
              label={`Wishlist with ${wishlistProductIds.length} products`}
              icon="heart"
              count={wishlistProductIds.length}
              className="hidden sm:flex"
            />
            <HeaderAction
              to={accountPath}
              label={user ? "Open account" : "Sign in"}
              icon="account"
              className="hidden lg:flex"
            />
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex h-10 w-10 items-center justify-center transition hover:bg-stone-100"
              aria-label={`Open cart with ${cartCount} items`}
            >
              <StoreIcon name="bag" />
              {cartCount > 0 && <CountBadge count={cartCount} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-navigation"
          className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-[#f4f2ed] px-4 py-8 lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex min-h-full max-w-xl flex-col">
            <div className="divide-y divide-black/15 border-y border-black/15">
              {navigationItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between py-5 text-2xl font-semibold tracking-tight"
                >
                  {item.label}
                  <StoreIcon name="arrow" className="h-5 w-5" />
                </Link>
              ))}
              <Link to="/shop?category=footwear" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-5 text-2xl font-semibold tracking-tight">
                Footwear
                <StoreIcon name="arrow" className="h-5 w-5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-px bg-black/15 mt-8 border border-black/15">
              <Link to={accountPath} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 bg-[#f4f2ed] p-4 text-sm font-bold">
                <StoreIcon name="account" />
                {user ? "My account" : "Sign in"}
              </Link>
              <Link to="/wishlist" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 bg-[#f4f2ed] p-4 text-sm font-bold">
                <StoreIcon name="heart" />
                Wishlist ({wishlistProductIds.length})
              </Link>
            </div>

            <label className="mt-auto pt-10 text-xs font-bold uppercase tracking-[0.12em]">
              <span className="mb-3 block">Shopping currency</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                className="store-field bg-transparent"
              >
                {supportedCurrencies.map((currencyOption) => (
                  <option key={currencyOption.code} value={currencyOption.code}>
                    {currencyOption.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </nav>
      )}
    </header>
  );
}

interface HeaderActionProps {
  to: string;
  label: string;
  icon: "account" | "heart" | "search";
  count?: number;
  className?: string;
}

function HeaderAction({ to, label, icon, count = 0, className = "flex" }: HeaderActionProps) {
  return (
    <Link
      to={to}
      className={`relative h-10 w-10 items-center justify-center transition hover:bg-stone-100 ${className}`}
      aria-label={label}
    >
      <StoreIcon name={icon} />
      {count > 0 && <CountBadge count={count} />}
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[9px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default Navbar;
