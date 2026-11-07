create unique index if not exists shipments_order_id_unique
  on public.shipments(order_id);

create or replace function public.admin_update_order_fulfilment(
  p_order_id uuid,
  p_next_status public.order_status,
  p_carrier text default null,
  p_service text default null,
  p_tracking_number text default null,
  p_tracking_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order public.orders;
  current_shipment public.shipments;
begin
  if not public.is_admin() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select * into current_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_next_status = 'processing' then
    if current_order.status <> 'paid' then
      raise exception 'Only paid orders can move to processing';
    end if;
  elsif p_next_status = 'shipped' then
    if current_order.status not in ('paid', 'processing') then
      raise exception 'Only paid or processing orders can be shipped';
    end if;
    if nullif(trim(p_carrier), '') is null then
      raise exception 'Carrier is required before shipping';
    end if;
    if nullif(trim(p_tracking_number), '') is null then
      raise exception 'Tracking number is required before shipping';
    end if;

    select * into current_shipment
    from public.shipments
    where order_id = p_order_id
    for update;

    if found then
      update public.shipments
      set carrier = trim(p_carrier),
          service = nullif(trim(p_service), ''),
          tracking_number = trim(p_tracking_number),
          tracking_url = nullif(trim(p_tracking_url), ''),
          status = 'shipped',
          shipped_at = coalesce(shipped_at, now()),
          delivered_at = null
      where id = current_shipment.id;
    else
      insert into public.shipments (
        order_id,
        carrier,
        service,
        tracking_number,
        tracking_url,
        status,
        shipped_at
      ) values (
        p_order_id,
        trim(p_carrier),
        nullif(trim(p_service), ''),
        trim(p_tracking_number),
        nullif(trim(p_tracking_url), ''),
        'shipped',
        now()
      );
    end if;
  elsif p_next_status = 'delivered' then
    if current_order.status <> 'shipped' then
      raise exception 'Only shipped orders can be marked delivered';
    end if;

    select * into current_shipment
    from public.shipments
    where order_id = p_order_id
    for update;

    if not found then
      raise exception 'Shipment record not found';
    end if;

    update public.shipments
    set status = 'delivered',
        delivered_at = coalesce(delivered_at, now())
    where id = current_shipment.id;
  else
    raise exception 'Unsupported fulfilment status';
  end if;

  update public.orders
  set status = p_next_status
  where id = p_order_id
  returning * into current_order;

  return current_order;
end;
$$;

revoke all on function public.admin_update_order_fulfilment(uuid, public.order_status, text, text, text, text) from public;
grant execute on function public.admin_update_order_fulfilment(uuid, public.order_status, text, text, text, text) to authenticated;

comment on function public.admin_update_order_fulfilment(uuid, public.order_status, text, text, text, text)
  is 'Atomically advances staff-managed fulfilment and shipment tracking for paid orders.';
