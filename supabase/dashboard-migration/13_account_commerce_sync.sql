drop function if exists public.save_account_commerce(text, jsonb, uuid[]);

create or replace function public.save_account_commerce(
  p_expected_user_id uuid,
  p_currency text,
  p_cart_items jsonb default '[]'::jsonb,
  p_wishlist_product_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  account_cart_id uuid;
  account_wishlist_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_expected_user_id is null or current_user_id <> p_expected_user_id then
    raise exception 'Authenticated account changed before commerce data could be saved'
      using errcode = '42501';
  end if;

  if p_currency not in ('NGN', 'USD') then
    raise exception 'Unsupported currency';
  end if;

  if jsonb_typeof(coalesce(p_cart_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Cart items must be an array';
  end if;

  insert into public.carts (user_id, currency)
  values (current_user_id, p_currency)
  on conflict (user_id) where user_id is not null
  do update set currency = excluded.currency
  returning id into account_cart_id;

  delete from public.cart_items
  where cart_id = account_cart_id;

  with requested_items as (
    select item.variant_id, max(item.quantity)::integer as quantity
    from jsonb_to_recordset(coalesce(p_cart_items, '[]'::jsonb))
      as item(variant_id uuid, quantity integer)
    where item.quantity > 0
    group by item.variant_id
  )
  insert into public.cart_items (cart_id, variant_id, quantity)
  select
    account_cart_id,
    requested_items.variant_id,
    least(requested_items.quantity, variant.stock)
  from requested_items
  join public.product_variants variant on variant.id = requested_items.variant_id
  join public.products product on product.id = variant.product_id
  where variant.active = true
    and variant.stock > 0
    and product.status = 'active';

  insert into public.wishlists (user_id)
  values (current_user_id)
  on conflict (user_id) do update set user_id = excluded.user_id
  returning id into account_wishlist_id;

  delete from public.wishlist_items
  where wishlist_id = account_wishlist_id;

  insert into public.wishlist_items (wishlist_id, product_id)
  select account_wishlist_id, product.id
  from public.products product
  where product.id = any(coalesce(p_wishlist_product_ids, '{}'::uuid[]))
    and product.status = 'active';
end;
$$;

revoke all on function public.save_account_commerce(uuid, text, jsonb, uuid[]) from public;
grant execute on function public.save_account_commerce(uuid, text, jsonb, uuid[]) to authenticated;

comment on function public.save_account_commerce(uuid, text, jsonb, uuid[])
  is 'Atomically persists the signed-in user cart, currency, and wishlist after validating live catalogue availability.';
