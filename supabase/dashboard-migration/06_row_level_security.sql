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
