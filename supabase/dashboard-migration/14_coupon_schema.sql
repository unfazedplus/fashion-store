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
