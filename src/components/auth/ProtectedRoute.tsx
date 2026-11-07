import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function ProtectedRoute() {
  const { isConfigured, isLoading, user } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return (
      <section className="store-page flex min-h-[70vh] items-center text-center">
        <div className="store-container">
        <div className="mx-auto max-w-xl">
          <p className="store-eyebrow text-red-700">Account issue</p>
          <h1 className="store-section-title mt-3">Account service is not configured</h1>
          <p className="store-copy mt-4">Connect the Supabase project before using customer accounts.</p>
        </div>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="store-page flex min-h-[70vh] items-center text-center">
        <div className="store-container">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border border-neutral-300 border-t-black" aria-hidden="true" />
          <p className="store-eyebrow mt-5 text-neutral-500">Loading your account</p>
        </div>
      </section>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
