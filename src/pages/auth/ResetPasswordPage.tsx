import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import { supabase } from "../../lib/supabase";
import { AuthInput } from "./LoginPage";

function ResetPasswordPage() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("Your password has been updated. You can continue to your account.");
    setIsSubmitting(false);
  };

  return (
    <AuthCard
      eyebrow="Secure update"
      title="Choose a new password"
      description="Set a strong new password for your UNFAZED account."
      footer={<Link to="/account" className="font-bold text-black underline underline-offset-4">Continue to account</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput label="New password" name="password" type="password" autoComplete="new-password" />
        <AuthInput label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" />
        {errorMessage && <p className="store-notice bg-red-50 text-red-700" role="alert">{errorMessage}</p>}
        {message && <p className="store-notice bg-emerald-50 text-emerald-800" role="status">{message}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !supabase}
          className="store-button-primary w-full"
        >
          {isSubmitting ? "Updating password..." : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}

export default ResetPasswordPage;
