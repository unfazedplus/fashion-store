import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AdminRoute from "./components/admin/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import StoreLayout from "./components/layout/StoreLayout";

const AccountLayout = lazy(() => import("./pages/account/AccountLayout"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersPage"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/AdminCustomerDetailPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminProductEditorPage = lazy(() => import("./pages/admin/AdminProductEditorPage"));
const AdminPromotionsPage = lazy(() => import("./pages/admin/AdminPromotionsPage"));
const AdminNewProductPage = lazy(() => import("./pages/admin/AdminNewProductPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/AdminOrderDetailPage"));
const AdminNewsletterPage = lazy(() => import("./pages/admin/AdminNewsletterPage"));
const AddressesPage = lazy(() => import("./pages/account/AddressesPage"));
const OrdersPage = lazy(() => import("./pages/account/OrdersPage"));
const ProfilePage = lazy(() => import("./pages/account/ProfilePage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PaymentCompletePage = lazy(() => import("./pages/PaymentCompletePage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));

function App() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<CatalogPage />} />
          <Route path="products/:productSlug" element={<ProductPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/complete" element={<PaymentCompletePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="orders" element={<OrdersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="products/new" element={<AdminNewProductPage />} />
              <Route path="products/:productId" element={<AdminProductEditorPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="customers/:customerId" element={<AdminCustomerDetailPage />} />
              <Route path="promotions" element={<AdminPromotionsPage />} />
              <Route path="newsletter" element={<AdminNewsletterPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function AppLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--store-canvas)] px-5 text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto block h-9 w-9 animate-spin rounded-full border border-neutral-300 border-t-neutral-950" />
        <p className="store-eyebrow mt-5 text-neutral-500">Loading UNFAZED</p>
      </div>
    </div>
  );
}

export default App;
