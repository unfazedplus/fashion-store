create or replace function public.resolve_checkout_coupon(
  p_code text,
  p_currency text,
  p_subtotal integer,
  p_lock_coupon boolean default false
)
returns table (
  coupon_id uuid,
  coupon_code text,
  coupon_description text,
  coupon_discount_type text,
  coupon_discount_value integer,
  discount_amount integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(trim(coalesce(p_code, '')));
  selected_coupon public.coupons;
  reserved_use_count bigint := 0;
  calculated_discount integer := 0;
begin
  if p_currency not in ('NGN', 'USD') then
    raise exception 'Unsupported currency';
  end if;

  if p_subtotal < 0 then
    raise exception 'Invalid order subtotal';
  end if;

  if normalized_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
    raise exception 'Enter a valid coupon code';
  end if;

  if p_lock_coupon then
    select coupon.* into selected_coupon
    from public.coupons coupon
    where coupon.code = normalized_code
    for update;
  else
    select coupon.* into selected_coupon
    from public.coupons coupon
    where coupon.code = normalized_code;
  end if;

  if not found then
    raise exception 'Coupon code was not found';
  end if;

  if not selected_coupon.active then
    raise exception 'This coupon is inactive';
  end if;

  if selected_coupon.starts_at is not null and selected_coupon.starts_at > now() then
    raise exception 'This coupon is not active yet';
  end if;

  if selected_coupon.ends_at is not null and selected_coupon.ends_at <= now() then
    raise exception 'This coupon has expired';
  end if;

  if selected_coupon.currency is not null and selected_coupon.currency <> p_currency then
    raise exception 'This coupon is not available for the selected currency';
  end if;

  if p_subtotal < selected_coupon.minimum_order_amount then
    raise exception 'Your cart does not meet this coupon''s minimum order amount';
  end if;

  if selected_coupon.maximum_uses is not null then
    select count(*) into reserved_use_count
    from public.orders checkout_order
    where checkout_order.coupon_id = selected_coupon.id
      and checkout_order.status <> 'cancelled';

    if reserved_use_count >= selected_coupon.maximum_uses then
      raise exception 'This coupon has reached its usage limit';
    end if;
  end if;

  calculated_discount := case selected_coupon.discount_type
    when 'percentage' then floor(
      (p_subtotal::numeric * selected_coupon.discount_value::numeric) / 100
    )::integer
    else selected_coupon.discount_value
  end;
  calculated_discount := least(p_subtotal, greatest(0, calculated_discount));

  return query
  select
    selected_coupon.id,
    selected_coupon.code,
    selected_coupon.description,
    selected_coupon.discount_type,
    selected_coupon.discount_value,
    calculated_discount;
end;
$$;

create or replace function public.preview_checkout_coupon(
  p_code text,
  p_currency text,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_record record;
  selected_variant record;
  resolved_coupon record;
  calculated_subtotal integer := 0;
begin
  if p_currency not in ('NGN', 'USD') then
    raise exception 'Unsupported currency';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Add products before applying a coupon';
  end if;

  for item_record in
    select item.sku, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb))
      as item(sku text, quantity integer)
    group by item.sku
  loop
    if item_record.quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    select variant.stock, price.amount as unit_price
    into selected_variant
    from public.product_variants variant
    join public.products product on product.id = variant.product_id
    join public.variant_prices price
      on price.variant_id = variant.id and price.currency = p_currency
    where variant.sku = item_record.sku
      and variant.active = true
      and product.status = 'active';

    if not found then
      raise exception 'A product in your cart is unavailable';
    end if;

    if selected_variant.stock < item_record.quantity then
      raise exception 'A product in your cart no longer has enough stock';
    end if;

    calculated_subtotal := calculated_subtotal + (selected_variant.unit_price * item_record.quantity);
  end loop;

  select * into resolved_coupon
  from public.resolve_checkout_coupon(
    p_code,
    p_currency,
    calculated_subtotal,
    false
  );

  return jsonb_build_object(
    'code', resolved_coupon.coupon_code,
    'description', resolved_coupon.coupon_description,
    'discount_type', resolved_coupon.coupon_discount_type,
    'discount_value', resolved_coupon.coupon_discount_value,
    'discount_amount', resolved_coupon.discount_amount,
    'subtotal', calculated_subtotal,
    'total_after_discount', calculated_subtotal - resolved_coupon.discount_amount
  );
end;
$$;

revoke all on function public.resolve_checkout_coupon(text, text, integer, boolean) from public;
revoke all on function public.preview_checkout_coupon(text, text, jsonb) from public;

grant execute on function public.preview_checkout_coupon(text, text, jsonb) to anon, authenticated;

comment on function public.preview_checkout_coupon(text, text, jsonb)
  is 'Validates a checkout coupon against live catalogue prices and returns a server-calculated discount preview.';
