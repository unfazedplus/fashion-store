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

