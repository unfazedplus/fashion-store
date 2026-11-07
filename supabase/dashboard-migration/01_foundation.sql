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

