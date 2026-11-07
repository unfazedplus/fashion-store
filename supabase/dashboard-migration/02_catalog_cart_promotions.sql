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

