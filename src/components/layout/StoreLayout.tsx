import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { useStore } from "../../hooks/useStore";
import CartDrawer from "../cart/CartDrawer";
import Footer from "./Footer";
import Navbar from "./Navbar";
import ScrollToTop from "./ScrollToTop";

function StoreLayout() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { accountCommerceError, isAccountCommerceSyncing } = useStore();

  return (
    <>
      <ScrollToTop />
      <Navbar onOpenCart={() => setIsCartOpen(true)} />
      {(accountCommerceError || isAccountCommerceSyncing) && (
        <div className={`fixed inset-x-0 top-16 z-40 px-5 py-2 text-center text-xs font-bold lg:top-[4.25rem] ${accountCommerceError ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-800"}`} role={accountCommerceError ? "alert" : "status"}>
          {accountCommerceError || "Syncing your cart and wishlist..."}
        </div>
      )}
      <main className="min-h-screen bg-white">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 pt-28 text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-950" />
        <p className="mt-4 text-sm font-bold text-neutral-700">Loading storefront...</p>
      </div>
    </div>
  );
}

export default StoreLayout;
