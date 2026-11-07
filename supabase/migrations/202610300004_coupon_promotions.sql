update public.coupons
set code = upper(trim(code));

create unique index if not exists coupons_normalized_code_unique
  on public.coupons (upper(code));

alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null;

alter table public.orders
  add column if not exists coupon_code text;

create index if not exists orders_coupon_id_idx
  on public.orders(coupon_id)
  where coupon_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coupons_code_format_check'
  ) then
    alter table public.coupons
      add constraint coupons_code_format_check
      check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_percentage_value_check'
  ) then
    alter table public.coupons
      add constraint coupons_percentage_value_check
      check (discount_type <> 'percentage' or discount_value <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_fixed_currency_check'
  ) then
    alter table public.coupons
      add constraint coupons_fixed_currency_check
      check (discount_type <> 'fixed' or currency is not null);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_global_minimum_check'
  ) then
    alter table public.coupons
      add constraint coupons_global_minimum_check
      check (currency is not null or minimum_order_amount = 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_minimum_order_check'
  ) then
    alter table public.coupons
      add constraint coupons_minimum_order_check
      check (minimum_order_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_maximum_uses_check'
  ) then
    alter table public.coupons
      add constraint coupons_maximum_uses_check
      check (maximum_uses is null or maximum_uses > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_use_count_check'
  ) then
    alter table public.coupons
      add constraint coupons_use_count_check
      check (use_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coupons_date_window_check'
  ) then
    alter table public.coupons
      add constraint coupons_date_window_check
      check (starts_at is null or ends_at is null or starts_at < ends_at);
  end if;
end
$$;

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

drop function if exists public.create_pending_order(
  text,
  text,
  text,
  text,
  integer,
  jsonb,
  jsonb,
  jsonb,
  uuid
);

create or replace function public.create_pending_order(
  p_email text,
  p_currency text,
  p_shipping_country_code text,
  p_shipping_method text,
  p_shipping_amount integer,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_items jsonb,
  p_customer_id uuid,
  p_coupon_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_order public.orders;
  item_record record;
  selected_variant record;
  calculated_subtotal integer := 0;
  selected_coupon_id uuid := null;
  selected_coupon_code text := null;
  calculated_discount integer := 0;
begin
  if p_currency not in ('NGN', 'USD') then
    raise exception 'Unsupported currency';
  end if;

  if length(trim(p_email)) < 3 or position('@' in p_email) = 0 then
    raise exception 'Invalid customer email';
  end if;

  if p_shipping_method not in ('standard', 'express') then
    raise exception 'Unsupported shipping method';
  end if;

  if p_shipping_amount < 0 then
    raise exception 'Invalid shipping amount';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.profiles where id = p_customer_id
  ) then
    raise exception 'Invalid customer';
  end if;

  insert into public.orders (
    customer_id,
    email,
    currency,
    shipping_amount,
    shipping_method,
    shipping_country_code,
    shipping_address,
    billing_address,
    inventory_reserved_until
  ) values (
    p_customer_id,
    lower(trim(p_email)),
    p_currency,
    p_shipping_amount,
    p_shipping_method,
    upper(p_shipping_country_code),
    p_shipping_address,
    p_billing_address,
    now() + interval '30 minutes'
  ) returning * into created_order;

  for item_record in
    select item.sku, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(sku text, quantity integer)
    group by item.sku
  loop
    if item_record.quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    select
      variant.id,
      variant.sku,
      variant.size,
      variant.color,
      variant.stock,
      product.id as product_id,
      product.name as product_name,
      image.external_url as image_url,
      price.amount as unit_price
    into selected_variant
    from public.product_variants variant
    join public.products product on product.id = variant.product_id
    join public.variant_prices price on price.variant_id = variant.id and price.currency = p_currency
    left join lateral (
      select product_images.external_url
      from public.product_images
      where product_images.product_id = product.id
      order by product_images.position, product_images.created_at
      limit 1
    ) image on true
    where variant.sku = item_record.sku
      and variant.active = true
      and product.status = 'active'
    for update of variant;

    if not found then
      raise exception 'Product variant is unavailable';
    end if;

    if selected_variant.stock < item_record.quantity then
      raise exception 'Insufficient stock for SKU %', selected_variant.sku;
    end if;

    update public.product_variants
    set stock = stock - item_record.quantity
    where id = selected_variant.id;

    insert into public.inventory_reservations (order_id, variant_id, quantity, expires_at)
    values (created_order.id, selected_variant.id, item_record.quantity, created_order.inventory_reserved_until);

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      sku,
      product_name,
      variant_description,
      unit_price,
      quantity,
      line_total,
      image_url
    ) values (
      created_order.id,
      selected_variant.product_id,
      selected_variant.id,
      selected_variant.sku,
      selected_variant.product_name,
      selected_variant.color || ' · ' || selected_variant.size,
      selected_variant.unit_price,
      item_record.quantity,
      selected_variant.unit_price * item_record.quantity,
      selected_variant.image_url
    );

    calculated_subtotal := calculated_subtotal + (selected_variant.unit_price * item_record.quantity);
  end loop;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    select
      coupon.coupon_id,
      coupon.coupon_code,
      coupon.discount_amount
    into
      selected_coupon_id,
      selected_coupon_code,
      calculated_discount
    from public.resolve_checkout_coupon(
      p_coupon_code,
      p_currency,
      calculated_subtotal,
      true
    ) coupon;
  end if;

  update public.orders
  set subtotal = calculated_subtotal,
      coupon_id = selected_coupon_id,
      coupon_code = selected_coupon_code,
      discount_amount = calculated_discount,
      total = calculated_subtotal + shipping_amount - calculated_discount + tax_amount + duty_amount
  where id = created_order.id
  returning * into created_order;

  insert into public.payments (
    order_id,
    provider_reference,
    currency,
    amount
  ) values (
    created_order.id,
    created_order.payment_reference,
    created_order.currency,
    created_order.total
  );

  return created_order;
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

  if paid_order.status in ('paid', 'processing', 'shipped', 'delivered', 'refund_pending', 'refunded') then
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

  if paid_order.coupon_id is not null then
    update public.coupons
    set use_count = use_count + 1
    where id = paid_order.coupon_id;
  end if;

  return paid_order;
end;
$$;

revoke all on function public.resolve_checkout_coupon(text, text, integer, boolean) from public;
revoke all on function public.preview_checkout_coupon(text, text, jsonb) from public;
revoke all on function public.create_pending_order(text, text, text, text, integer, jsonb, jsonb, jsonb, uuid, text) from public;

grant execute on function public.preview_checkout_coupon(text, text, jsonb) to anon, authenticated;
grant execute on function public.create_pending_order(text, text, text, text, integer, jsonb, jsonb, jsonb, uuid, text) to service_role;

comment on function public.preview_checkout_coupon(text, text, jsonb)
  is 'Validates a checkout coupon against live catalogue prices and returns a server-calculated discount preview.';

comment on function public.create_pending_order(text, text, text, text, integer, jsonb, jsonb, jsonb, uuid, text)
  is 'Creates an inventory-reserved pending order with optional atomic coupon validation and discount calculation.';
