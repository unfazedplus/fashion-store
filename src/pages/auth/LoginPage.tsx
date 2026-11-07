import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isConfigured, user } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectParam = searchParams.get("redirect");
  const redirect = redirectParam?.startsWith("/") && !redirectParam.startsWith("//")
    ? redirectParam
    : "/account";

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!supabase) {
      setErrorMessage("Supabase authentication is not configured.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    navigate(redirect, { replace: true });
  };

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Sign in"
      description="Access saved addresses, order history, wishlists, and faster checkout."
      footer={<span>New to UNFAZED? <Link to="/register" className="font-bold text-black underline underline-offset-4">Create an account</Link></span>}
    >
      {!isConfigured && (
        <p className="store-notice mb-5 bg-amber-50 text-amber-800">
          Authentication will become available after the Supabase schema is deployed.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput label="Email" name="email" type="email" autoComplete="email" />
        <AuthInput label="Password" name="password" type="password" autoComplete="current-password" />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-bold underline underline-offset-4">Forgot password?</Link>
        </div>
        {errorMessage && <p className="store-notice bg-red-50 text-red-700" role="alert">{errorMessage}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !isConfigured}
          className="store-button-primary w-full"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}

interface AuthInputProps {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
}

export function AuthInput({ label, name, type, autoComplete }: AuthInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="store-field"
      />
    </label>
  );
}

export default LoginPage;
