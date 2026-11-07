select count(*) as created_table_count
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'addresses',
    'categories',
    'products',
    'product_images',
    'product_variants',
    'variant_prices',
    'carts',
    'cart_items',
    'wishlists',
    'wishlist_items',
    'coupons',
    'orders',
    'order_items',
    'inventory_reservations',
    'payments',
    'shipments',
    'reviews',
    'newsletter_subscribers'
  );

select
  (select count(*) from public.categories) as categories,
  (select count(*) from public.products) as products,
  (select count(*) from public.product_variants) as product_variants,
  (select count(*) from public.variant_prices) as variant_prices;
