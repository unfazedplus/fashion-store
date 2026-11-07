create type public.order_email_event as enum (
  'order_paid',
  'order_shipped',
  'order_delivered'
);

create type public.email_delivery_status as enum (
  'pending',
  'processing',
  'sent',
  'failed'
);

create table public.order_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event public.order_email_event not null,
  recipient_email text not null check (char_length(trim(recipient_email)) > 3),
  status public.email_delivery_status not null default 'pending',
  provider text not null default 'resend',
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, event)
);

create index order_email_deliveries_ready_idx
  on public.order_email_deliveries(status, next_attempt_at, created_at);

create index order_email_deliveries_order_id_idx
  on public.order_email_deliveries(order_id, created_at);

create trigger order_email_deliveries_set_updated_at
  before update on public.order_email_deliveries
  for each row execute function public.set_updated_at();

create or replace function public.queue_order_status_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_event public.order_email_event;
begin
  if new.status = 'paid' then
    queued_event := 'order_paid';
  elsif new.status = 'shipped' then
    queued_event := 'order_shipped';
  elsif new.status = 'delivered' then
    queued_event := 'order_delivered';
  else
    return new;
  end if;

  insert into public.order_email_deliveries (
    order_id,
    event,
    recipient_email
  ) values (
    new.id,
    queued_event,
    lower(trim(new.email))
  )
  on conflict (order_id, event) do nothing;

  return new;
end;
$$;

create trigger orders_queue_status_email
  after update of status on public.orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.queue_order_status_email();

create or replace function public.claim_order_email_deliveries(
  p_limit integer default 10
)
returns setof public.order_email_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select delivery.id
    from public.order_email_deliveries delivery
    where delivery.attempt_count < 8
      and (
        (
          delivery.status in ('pending', 'failed')
          and delivery.next_attempt_at is not null
          and delivery.next_attempt_at <= now()
        )
        or (
          delivery.status = 'processing'
          and delivery.updated_at < now() - interval '15 minutes'
        )
      )
    order by delivery.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 25)
  )
  update public.order_email_deliveries delivery
  set status = 'processing',
      attempt_count = delivery.attempt_count + 1,
      last_attempt_at = now()
  from candidates
  where delivery.id = candidates.id
  returning delivery.*;
end;
$$;

create or replace function public.admin_retry_order_email(
  p_delivery_id uuid
)
returns public.order_email_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  retried_delivery public.order_email_deliveries;
begin
  if not public.is_admin() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select * into retried_delivery
  from public.order_email_deliveries
  where id = p_delivery_id
  for update;

  if not found then
    raise exception 'Email delivery not found';
  end if;

  if retried_delivery.status = 'sent' then
    raise exception 'This email was already delivered';
  end if;

  if retried_delivery.status = 'processing'
    and retried_delivery.updated_at >= now() - interval '15 minutes' then
    raise exception 'This email is currently being processed';
  end if;

  update public.order_email_deliveries
  set status = 'pending',
      attempt_count = 0,
      next_attempt_at = now(),
      last_error = null
  where id = p_delivery_id
  returning * into retried_delivery;

  return retried_delivery;
end;
$$;

alter table public.order_email_deliveries enable row level security;

create policy "Staff view order email deliveries"
  on public.order_email_deliveries
  for select
  to authenticated
  using (public.is_admin());

revoke all on table public.order_email_deliveries from anon;
grant select on table public.order_email_deliveries to authenticated;
grant all on table public.order_email_deliveries to service_role;

revoke all on function public.queue_order_status_email() from public;
revoke all on function public.claim_order_email_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_order_email_deliveries(integer) to service_role;
revoke all on function public.admin_retry_order_email(uuid) from public;
grant execute on function public.admin_retry_order_email(uuid) to authenticated;

comment on table public.order_email_deliveries
  is 'Idempotent transactional order-email queue with retry and provider delivery audit fields.';

comment on function public.claim_order_email_deliveries(integer)
  is 'Claims due transactional emails with row locking so concurrent workers cannot send the same queue item.';

comment on function public.admin_retry_order_email(uuid)
  is 'Allows verified staff to retry a failed or stale transactional email without resending a delivered message.';
