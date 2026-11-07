create or replace function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record record;
begin
  for reservation_record in
    select * from public.inventory_reservations
    where order_id = p_order_id and status = 'active'
    for update
  loop
    update public.product_variants
    set stock = stock + reservation_record.quantity
    where id = reservation_record.variant_id;

    update public.inventory_reservations
    set status = 'released'
    where id = reservation_record.id;
  end loop;

  update public.orders
  set status = 'cancelled', cancelled_at = now()
  where id = p_order_id and status = 'pending_payment';

  update public.payments
  set status = 'failed'
  where order_id = p_order_id and status = 'pending';
end;
$$;

create or replace function public.mark_order_paid(
  p_reference text,
  p_provider_transaction_id text,
  p_provider_response jsonb,
  p_paid_at timestamptz
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  paid_order public.orders;
begin
  select * into paid_order
  from public.orders
  where payment_reference = p_reference
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if paid_order.status = 'paid' then
    return paid_order;
  end if;

  if paid_order.status <> 'pending_payment' then
    raise exception 'Order is not awaiting payment';
  end if;

  update public.orders
  set status = 'paid', paid_at = p_paid_at, inventory_reserved_until = null
  where id = paid_order.id
  returning * into paid_order;

  update public.payments
  set status = 'succeeded',
      provider_transaction_id = p_provider_transaction_id,
      provider_response = p_provider_response,
      paid_at = p_paid_at
  where order_id = paid_order.id;

  update public.inventory_reservations
  set status = 'consumed'
  where order_id = paid_order.id and status = 'active';

  return paid_order;
end;
$$;

create or replace function public.release_expired_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record record;
  released_count integer := 0;
begin
  for reservation_record in
    select * from public.inventory_reservations
    where status = 'active' and expires_at <= now()
    for update skip locked
  loop
    update public.product_variants
    set stock = stock + reservation_record.quantity
    where id = reservation_record.variant_id;

    update public.inventory_reservations
    set status = 'released'
    where id = reservation_record.id;

    update public.orders
    set status = 'cancelled', cancelled_at = now()
    where id = reservation_record.order_id and status = 'pending_payment';

    update public.payments
    set status = 'failed'
    where order_id = reservation_record.order_id and status = 'pending';

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

revoke all on function public.create_pending_order(text, text, text, text, integer, jsonb, jsonb, jsonb, uuid) from public;
revoke all on function public.cancel_pending_order(uuid) from public;
revoke all on function public.mark_order_paid(text, text, jsonb, timestamptz) from public;
revoke all on function public.release_expired_inventory_reservations() from public;
grant execute on function public.create_pending_order(text, text, text, text, integer, jsonb, jsonb, jsonb, uuid) to service_role;
grant execute on function public.cancel_pending_order(uuid) to service_role;
grant execute on function public.mark_order_paid(text, text, jsonb, timestamptz) to service_role;
grant execute on function public.release_expired_inventory_reservations() to service_role;

