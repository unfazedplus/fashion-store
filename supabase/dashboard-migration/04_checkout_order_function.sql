create or replace function public.create_pending_order(
  p_email text,
  p_currency text,
  p_shipping_country_code text,
  p_shipping_method text,
  p_shipping_amount integer,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_items jsonb,
  p_customer_id uuid
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

  if jsonb_array_length(p_items) = 0 then
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
    select * from jsonb_to_recordset(p_items) as item(sku text, quantity integer)
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

  update public.orders
  set subtotal = calculated_subtotal,
      total = calculated_subtotal + shipping_amount - discount_amount + tax_amount + duty_amount
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

