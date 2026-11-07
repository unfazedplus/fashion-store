import { supabase } from "../lib/supabase";

export async function subscribeToNewsletter(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Enter your email address.");
  }
  if (!supabase) {
    throw new Error("Newsletter signup is not configured.");
  }

  const { error } = await supabase.rpc("subscribe_newsletter", {
    p_email: normalizedEmail,
    p_source: "website",
  });

  if (error) {
    if (error.message.includes("Could not find the function")) {
      throw new Error("Newsletter signup is being configured. Please try again shortly.");
    }
    throw error;
  }
}
