import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import { supabase } from "../../lib/supabase";
import { AuthInput } from "./LoginPage";

function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage("Supabase authentication is not configured.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setErrorMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(formData.get("email") ?? "").trim(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setMessage("If an account exists for that email, a password-reset link has been sent.");
    setIsSubmitting(false);
  };

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email and we will send a secure recovery link."
      footer={<Link to="/login" className="font-bold text-black underline underline-offset-4">Return to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput label="Email" name="email" type="email" autoComplete="email" />
        {errorMessage && <p className="store-notice bg-red-50 text-red-700" role="alert">{errorMessage}</p>}
        {message && <p className="store-notice bg-emerald-50 text-emerald-800" role="status">{message}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !supabase}
          className="store-button-primary w-full"
        >
          {isSubmitting ? "Sending link..." : "Send recovery link"}
        </button>
      </form>
    </AuthCard>
  );
}

export default ForgotPasswordPage;
