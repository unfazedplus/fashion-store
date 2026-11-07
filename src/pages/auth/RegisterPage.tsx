import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { AuthInput } from "./LoginPage";

function RegisterPage() {
  const navigate = useNavigate();
  const { isConfigured, user } = useAuth();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/account" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!supabase) {
      setErrorMessage("Supabase authentication is not configured.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: String(formData.get("email") ?? "").trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: {
          first_name: String(formData.get("firstName") ?? "").trim(),
          last_name: String(formData.get("lastName") ?? "").trim(),
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      navigate("/account", { replace: true });
      return;
    }

    form.reset();
    setMessage("Account created. Check your email to confirm your address before signing in.");
    setIsSubmitting(false);
  };

  return (
    <AuthCard
      eyebrow="Join UNFAZED"
      title="Create account"
      description="Save favourites, manage addresses, and follow every order from payment to delivery."
      footer={<span>Already registered? <Link to="/login" className="font-bold text-black underline underline-offset-4">Sign in</Link></span>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthInput label="First name" name="firstName" type="text" autoComplete="given-name" />
          <AuthInput label="Last name" name="lastName" type="text" autoComplete="family-name" />
        </div>
        <AuthInput label="Email" name="email" type="email" autoComplete="email" />
        <AuthInput label="Password" name="password" type="password" autoComplete="new-password" />
        <AuthInput label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" />
        <p className="text-xs leading-5 text-neutral-500">Use at least eight characters. A confirmation email may be required.</p>
        {errorMessage && <p className="store-notice bg-red-50 text-red-700" role="alert">{errorMessage}</p>}
        {message && <p className="store-notice bg-emerald-50 text-emerald-800" role="status">{message}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !isConfigured}
          className="store-button-primary w-full"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

export default RegisterPage;
