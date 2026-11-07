import { supabase } from "../lib/supabase";

export interface AdminNewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

export async function getAdminNewsletterSubscribers() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("newsletter_subscribers")
    .select("id,email,source,subscribed_at,unsubscribed_at")
    .order("subscribed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AdminNewsletterSubscriber[];
}

export async function setAdminNewsletterSubscriberActive(subscriberId: string, active: boolean) {
  const client = requireSupabase();
  const update = active
    ? { unsubscribed_at: null, subscribed_at: new Date().toISOString() }
    : { unsubscribed_at: new Date().toISOString() };
  const { data, error } = await client
    .from("newsletter_subscribers")
    .update(update)
    .eq("id", subscriberId)
    .select("id,email,source,subscribed_at,unsubscribed_at")
    .single();

  if (error) {
    throw error;
  }

  return data as AdminNewsletterSubscriber;
}
