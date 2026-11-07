create or replace function public.subscribe_newsletter(
  p_email text,
  p_source text default 'website'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(p_email));
  normalized_source text := left(coalesce(nullif(trim(p_source), ''), 'website'), 50);
begin
  if length(normalized_email) > 320
     or normalized_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$' then
    raise exception 'Enter a valid email address';
  end if;

  insert into public.newsletter_subscribers (
    email,
    source,
    subscribed_at,
    unsubscribed_at
  ) values (
    normalized_email,
    normalized_source,
    now(),
    null
  )
  on conflict (email) do update
  set source = excluded.source,
      subscribed_at = case
        when public.newsletter_subscribers.unsubscribed_at is not null then now()
        else public.newsletter_subscribers.subscribed_at
      end,
      unsubscribed_at = null;
end;
$$;

revoke all on function public.subscribe_newsletter(text, text) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;

comment on function public.subscribe_newsletter(text, text)
  is 'Validates, normalizes, and safely subscribes or resubscribes a newsletter email.';
