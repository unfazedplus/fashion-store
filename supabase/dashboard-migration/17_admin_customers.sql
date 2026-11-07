create or replace function public.admin_list_customers(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(lower(trim(coalesce(p_search, ''))), '');
  safe_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  safe_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if not public.is_admin() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  return (
    with customer_rows as (
      select
        profile.id,
        auth_user.email,
        profile.role,
        profile.first_name,
        profile.last_name,
        profile.phone,
        profile.created_at,
        profile.updated_at,
        coalesce(address_summary.address_count, 0)::integer as address_count,
        coalesce(order_summary.order_count, 0)::integer as order_count,
        coalesce(order_summary.paid_order_count, 0)::integer as paid_order_count,
        coalesce(order_summary.lifetime_spend_ngn, 0)::bigint as lifetime_spend_ngn,
        coalesce(order_summary.lifetime_spend_usd, 0)::bigint as lifetime_spend_usd,
        order_summary.last_order_at
      from public.profiles profile
      join auth.users auth_user on auth_user.id = profile.id
      left join lateral (
        select count(*)::integer as address_count
        from public.addresses address
        where address.user_id = profile.id
      ) address_summary on true
      left join lateral (
        select
          count(*)::integer as order_count,
          count(*) filter (
            where customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
          )::integer as paid_order_count,
          coalesce(sum(customer_order.total) filter (
            where customer_order.currency = 'NGN'
              and customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
          ), 0)::bigint as lifetime_spend_ngn,
          coalesce(sum(customer_order.total) filter (
            where customer_order.currency = 'USD'
              and customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
          ), 0)::bigint as lifetime_spend_usd,
          max(customer_order.created_at) as last_order_at
        from public.orders customer_order
        where customer_order.customer_id = profile.id
      ) order_summary on true
      where (
          normalized_search is null
          or lower(coalesce(auth_user.email, '')) like '%' || normalized_search || '%'
          or lower(coalesce(profile.first_name, '')) like '%' || normalized_search || '%'
          or lower(coalesce(profile.last_name, '')) like '%' || normalized_search || '%'
          or lower(coalesce(profile.phone, '')) like '%' || normalized_search || '%'
        )
    ),
    paged_customers as (
      select *
      from customer_rows
      order by last_order_at desc nulls last, created_at desc
      limit safe_limit
      offset safe_offset
    )
    select jsonb_build_object(
      'customers', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', customer.id,
            'email', customer.email,
            'role', customer.role,
            'first_name', customer.first_name,
            'last_name', customer.last_name,
            'phone', customer.phone,
            'created_at', customer.created_at,
            'updated_at', customer.updated_at,
            'address_count', customer.address_count,
            'order_count', customer.order_count,
            'paid_order_count', customer.paid_order_count,
            'lifetime_spend_ngn', customer.lifetime_spend_ngn,
            'lifetime_spend_usd', customer.lifetime_spend_usd,
            'last_order_at', customer.last_order_at
          )
          order by customer.last_order_at desc nulls last, customer.created_at desc
        )
        from paged_customers customer
      ), '[]'::jsonb),
      'total', (select count(*) from customer_rows),
      'metrics', jsonb_build_object(
        'with_orders', (select count(*) from customer_rows where order_count > 0),
        'lifetime_spend_ngn', (select coalesce(sum(lifetime_spend_ngn), 0) from customer_rows),
        'lifetime_spend_usd', (select coalesce(sum(lifetime_spend_usd), 0) from customer_rows)
      )
    )
  );
end;
$$;

create or replace function public.admin_get_customer(
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_record jsonb;
  customer_addresses jsonb;
  customer_orders jsonb;
begin
  if not public.is_admin() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', profile.id,
    'email', auth_user.email,
    'role', profile.role,
    'first_name', profile.first_name,
    'last_name', profile.last_name,
    'phone', profile.phone,
    'created_at', profile.created_at,
    'updated_at', profile.updated_at,
    'address_count', coalesce(address_summary.address_count, 0),
    'order_count', coalesce(order_summary.order_count, 0),
    'paid_order_count', coalesce(order_summary.paid_order_count, 0),
    'lifetime_spend_ngn', coalesce(order_summary.lifetime_spend_ngn, 0),
    'lifetime_spend_usd', coalesce(order_summary.lifetime_spend_usd, 0),
    'last_order_at', order_summary.last_order_at
  ) into customer_record
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  left join lateral (
    select count(*)::integer as address_count
    from public.addresses address
    where address.user_id = profile.id
  ) address_summary on true
  left join lateral (
    select
      count(*)::integer as order_count,
      count(*) filter (
        where customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
      )::integer as paid_order_count,
      coalesce(sum(customer_order.total) filter (
        where customer_order.currency = 'NGN'
          and customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
      ), 0)::bigint as lifetime_spend_ngn,
      coalesce(sum(customer_order.total) filter (
        where customer_order.currency = 'USD'
          and customer_order.status in ('paid', 'processing', 'shipped', 'delivered')
      ), 0)::bigint as lifetime_spend_usd,
      max(customer_order.created_at) as last_order_at
    from public.orders customer_order
    where customer_order.customer_id = profile.id
  ) order_summary on true
  where profile.id = p_customer_id;

  if customer_record is null then
    raise exception 'Customer not found';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', address.id,
      'label', address.label,
      'first_name', address.first_name,
      'last_name', address.last_name,
      'phone', address.phone,
      'address_line_1', address.address_line_1,
      'address_line_2', address.address_line_2,
      'city', address.city,
      'region', address.region,
      'postal_code', address.postal_code,
      'country_code', address.country_code,
      'is_default', address.is_default,
      'created_at', address.created_at,
      'updated_at', address.updated_at
    )
    order by address.is_default desc, address.created_at desc
  ), '[]'::jsonb) into customer_addresses
  from public.addresses address
  where address.user_id = p_customer_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', customer_order.id,
      'order_number', customer_order.order_number,
      'status', customer_order.status,
      'total', customer_order.total,
      'currency', customer_order.currency,
      'discount_amount', customer_order.discount_amount,
      'coupon_code', customer_order.coupon_code,
      'shipping_method', customer_order.shipping_method,
      'shipping_country_code', customer_order.shipping_country_code,
      'paid_at', customer_order.paid_at,
      'created_at', customer_order.created_at,
      'item_count', coalesce(item_summary.item_count, 0)
    )
    order by customer_order.created_at desc
  ), '[]'::jsonb) into customer_orders
  from public.orders customer_order
  left join lateral (
    select coalesce(sum(order_item.quantity), 0)::integer as item_count
    from public.order_items order_item
    where order_item.order_id = customer_order.id
  ) item_summary on true
  where customer_order.customer_id = p_customer_id;

  return jsonb_build_object(
    'customer', customer_record,
    'addresses', customer_addresses,
    'orders', customer_orders
  );
end;
$$;

revoke all on function public.admin_list_customers(text, integer, integer) from public;
revoke all on function public.admin_get_customer(uuid) from public;

grant execute on function public.admin_list_customers(text, integer, integer) to authenticated;
grant execute on function public.admin_get_customer(uuid) to authenticated;

comment on function public.admin_list_customers(text, integer, integer)
  is 'Returns a privacy-scoped, paginated customer directory for verified staff accounts.';

comment on function public.admin_get_customer(uuid)
  is 'Returns one customer profile, saved addresses, and order summaries for verified staff accounts.';
