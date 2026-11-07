create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'staff', 'admin');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.order_status as enum ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_pending', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.reservation_status as enum ('active', 'consumed', 'released');
create type public.review_status as enum ('pending', 'published', 'rejected');

create sequence public.order_number_sequence start 1001;

create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'UF-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_sequence')::text, 6, '0');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'customer',
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code text not null check (char_length(country_code) = 2),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  brand text not null default 'UNFAZED',
  description text not null,
  materials text not null default '',
  care_instructions text not null default '',
  tags text[] not null default '{}',
  featured boolean not null default false,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text not null,
  color text not null,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.variant_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  currency text not null check (currency in ('NGN', 'USD')),
  amount integer not null check (amount >= 0),
  compare_at_amount integer check (compare_at_amount is null or compare_at_amount >= amount),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, currency)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  currency text not null default 'NGN' check (currency in ('NGN', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);

create unique index carts_user_id_unique on public.carts(user_id) where user_id is not null;
create unique index carts_session_id_unique on public.carts(session_id) where session_id is not null;

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  currency text check (currency is null or currency in ('NGN', 'USD')),
  minimum_order_amount integer not null default 0,
  maximum_uses integer,
  use_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  customer_id uuid references public.profiles(id) on delete set null,
  email text not null,
  currency text not null check (currency in ('NGN', 'USD')),
  subtotal integer not null default 0 check (subtotal >= 0),
  shipping_amount integer not null default 0 check (shipping_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  duty_amount integer not null default 0 check (duty_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  total integer not null default 0 check (total >= 0),
  status public.order_status not null default 'pending_payment',
  shipping_method text not null,
  shipping_country_code text not null,
  shipping_address jsonb not null,
  billing_address jsonb,
  customer_note text,
  payment_reference text not null unique default encode(gen_random_bytes(18), 'hex'),
  inventory_reserved_until timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  product_name text not null,
  variant_description text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'paystack',
  provider_reference text not null unique,
  provider_transaction_id text,
  currency text not null check (currency in ('NGN', 'USD')),
  amount integer not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  provider_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text,
  service text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index products_category_id_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index order_items_order_id_idx on public.order_items(order_id);
create index orders_customer_id_idx on public.orders(customer_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where status = 'active';

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger variant_prices_set_updated_at before update on public.variant_prices for each row execute function public.set_updated_at();
create trigger carts_set_updated_at before update on public.carts for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items for each row execute function public.set_updated_at();
create trigger coupons_set_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger inventory_reservations_set_updated_at before update on public.inventory_reservations for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_prices enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;

create policy "Public categories are readable" on public.categories for select using (is_active = true);
create policy "Public products are readable" on public.products for select using (status = 'active');
create policy "Public product images are readable" on public.product_images for select using (true);
create policy "Public active variants are readable" on public.product_variants for select using (active = true);
create policy "Public prices are readable" on public.variant_prices for select using (true);
create policy "Published reviews are readable" on public.reviews for select using (status = 'published');

create policy "Users can read their profile" on public.profiles for select using (id = auth.uid());
create policy "Users can update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Users manage their addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their cart" on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage their cart items" on public.cart_items for all using (
  exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
);
create policy "Users manage their wishlist" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users manage wishlist items" on public.wishlist_items for all using (
  exists (select 1 from public.wishlists where wishlists.id = wishlist_items.wishlist_id and wishlists.user_id = auth.uid())
) with check (
  exists (select 1 from public.wishlists where wishlists.id = wishlist_items.wishlist_id and wishlists.user_id = auth.uid())
);
create policy "Users read their orders" on public.orders for select using (customer_id = auth.uid());
create policy "Users read their order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_id = auth.uid())
);
create policy "Users read their payments" on public.payments for select using (
  exists (select 1 from public.orders where orders.id = payments.order_id and orders.customer_id = auth.uid())
);
create policy "Users read their shipments" on public.shipments for select using (
  exists (select 1 from public.orders where orders.id = shipments.order_id and orders.customer_id = auth.uid())
);
create policy "Users create reviews" on public.reviews for insert with check (user_id = auth.uid());
create policy "Users update their pending reviews" on public.reviews for update using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid());

create policy "Staff manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage product images" on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage variants" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage prices" on public.variant_prices for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage shipments" on public.shipments for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff moderate reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage newsletter" on public.newsletter_subscribers for all using (public.is_admin()) with check (public.is_admin());
