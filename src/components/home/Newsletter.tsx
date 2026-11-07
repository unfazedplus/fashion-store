import { useState, type FormEvent } from "react";
import { subscribeToNewsletter } from "../../services/newsletter";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await subscribeToNewsletter(email);
      setEmail("");
      setSuccessMessage("You’re subscribed. Watch your inbox for the next UNFAZED release.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to subscribe right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="newsletter" className="bg-neutral-950 text-white">
      <div className="store-container grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-end lg:gap-20">
        <div>
          <p className="store-eyebrow text-white/45">Private access</p>
          <h2 className="store-section-title mt-3 max-w-xl">New drops, considered edits, no noise.</h2>
        </div>

        <div>
          <p className="max-w-xl text-sm leading-7 text-white/60">
            Receive collection announcements, styling notes, and selected offers from UNFAZED.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex border-b border-white/40 focus-within:border-white">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSuccessMessage("");
                setErrorMessage("");
              }}
              placeholder="Email address"
              autoComplete="email"
              required
              className="min-w-0 flex-1 border-0 bg-transparent py-4 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" disabled={isSubmitting} className="px-2 text-xs font-bold uppercase tracking-[0.12em] disabled:text-white/35">
              {isSubmitting ? "Joining..." : "Subscribe"}
            </button>
          </form>
          {successMessage && <p className="mt-4 text-sm font-semibold text-emerald-300" role="status">{successMessage}</p>}
          {errorMessage && <p className="mt-4 text-sm font-semibold text-red-300" role="alert">{errorMessage}</p>}
        </div>
      </div>
    </section>
  );
}

export default Newsletter;
