insert into public.categories (id, name, slug, description, image_url, position, is_active) values
  ('10000000-0000-4000-8000-000000000001', 'Men', 'men', 'Modern essentials and elevated everyday pieces.', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600', 1, true),
  ('10000000-0000-4000-8000-000000000002', 'Women', 'women', 'Confident silhouettes designed for every occasion.', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600', 2, true),
  ('10000000-0000-4000-8000-000000000003', 'Accessories', 'accessories', 'Finishing touches that make every look your own.', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600', 3, true),
  ('10000000-0000-4000-8000-000000000004', 'Footwear', 'footwear', 'Statement footwear built for comfort and movement.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', 4, true)
on conflict (id) do nothing;

insert into public.products (
  id, category_id, name, slug, brand, description, materials, care_instructions, tags, featured, status
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Classic Hoodie',
    'classic-hoodie',
    'UNFAZED',
    'A heavyweight everyday hoodie with a relaxed, structured fit.',
    '80% cotton, 20% recycled polyester',
    'Machine wash cold with similar colours.',
    array['hoodie', 'casual', 'new'],
    true,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Leather Jacket',
    'leather-jacket',
    'UNFAZED',
    'A clean-cut vegan leather jacket with polished metal hardware.',
    'Vegan leather shell with recycled polyester lining',
    'Wipe clean with a soft damp cloth.',
    array['jacket', 'outerwear', 'bestseller'],
    true,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'Street Sneakers',
    'street-sneakers',
    'UNFAZED',
    'Low-profile sneakers with a cushioned sole for all-day wear.',
    'Textile upper with rubber sole',
    'Spot clean and air dry.',
    array['sneakers', 'footwear', 'streetwear'],
    true,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000003',
    'Crossbody Bag',
    'crossbody-bag',
    'UNFAZED',
    'A compact everyday bag with adjustable straps and secure storage.',
    'Recycled nylon with metal hardware',
    'Wipe clean only.',
    array['bag', 'accessories', 'everyday'],
    true,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    'Relaxed Jeans',
    'relaxed-jeans',
    'UNFAZED',
    'Mid-rise denim with a relaxed leg and vintage-inspired wash.',
    '100% cotton denim',
    'Wash inside out on a cold cycle.',
    array['denim', 'jeans', 'casual'],
    true,
    'active'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    'Essential T-Shirt',
    'essential-tee',
    'UNFAZED',
    'A soft premium-weight tee cut for an easy unisex fit.',
    '100% combed cotton',
    'Machine wash cold and tumble dry low.',
    array['t-shirt', 'basics', 'sale'],
    true,
    'active'
  )
on conflict (id) do nothing;

insert into public.product_images (id, product_id, external_url, alt_text, position) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900', 'Model wearing the UNFAZED Classic Hoodie', 1),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=900', 'Black UNFAZED Leather Jacket', 1),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900', 'Red UNFAZED Street Sneakers', 1),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900', 'Black UNFAZED Crossbody Bag', 1),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=900', 'Blue UNFAZED Relaxed Jeans', 1),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900', 'White UNFAZED Essential T-Shirt', 1)
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, sku, size, color, stock, active) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'UF-HOOD-BLK-S', 'S', 'Black', 8, true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'UF-HOOD-BLK-M', 'M', 'Black', 12, true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'UF-HOOD-BLK-L', 'L', 'Black', 6, true),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'UF-JACK-BLK-M', 'M', 'Black', 4, true),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'UF-JACK-BLK-L', 'L', 'Black', 3, true),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'UF-JACK-BRN-L', 'L', 'Brown', 2, true),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'UF-SNKR-RED-40', '40', 'Red', 5, true),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'UF-SNKR-RED-42', '42', 'Red', 9, true),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'UF-SNKR-RED-44', '44', 'Red', 3, true),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000004', 'UF-BAG-BLK-OS', 'One size', 'Black', 11, true),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000004', 'UF-BAG-TAN-OS', 'One size', 'Tan', 7, true),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000005', 'UF-JEAN-BLU-26', '26', 'Blue', 6, true),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000005', 'UF-JEAN-BLU-28', '28', 'Blue', 10, true),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000005', 'UF-JEAN-BLU-30', '30', 'Blue', 5, true),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000006', 'UF-TEE-WHT-S', 'S', 'White', 14, true),
  ('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000006', 'UF-TEE-WHT-M', 'M', 'White', 18, true),
  ('30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000006', 'UF-TEE-WHT-L', 'L', 'White', 8, true)
on conflict (id) do nothing;

insert into public.variant_prices (variant_id, currency, amount, compare_at_amount) values
  ('30000000-0000-4000-8000-000000000001', 'NGN', 7500000, null),
  ('30000000-0000-4000-8000-000000000001', 'USD', 4500, null),
  ('30000000-0000-4000-8000-000000000002', 'NGN', 7500000, null),
  ('30000000-0000-4000-8000-000000000002', 'USD', 4500, null),
  ('30000000-0000-4000-8000-000000000003', 'NGN', 7500000, null),
  ('30000000-0000-4000-8000-000000000003', 'USD', 4500, null),
  ('30000000-0000-4000-8000-000000000004', 'NGN', 20000000, null),
  ('30000000-0000-4000-8000-000000000004', 'USD', 12000, null),
  ('30000000-0000-4000-8000-000000000005', 'NGN', 20000000, null),
  ('30000000-0000-4000-8000-000000000005', 'USD', 12000, null),
  ('30000000-0000-4000-8000-000000000006', 'NGN', 20000000, null),
  ('30000000-0000-4000-8000-000000000006', 'USD', 12000, null),
  ('30000000-0000-4000-8000-000000000007', 'NGN', 13500000, null),
  ('30000000-0000-4000-8000-000000000007', 'USD', 8000, null),
  ('30000000-0000-4000-8000-000000000008', 'NGN', 13500000, null),
  ('30000000-0000-4000-8000-000000000008', 'USD', 8000, null),
  ('30000000-0000-4000-8000-000000000009', 'NGN', 13500000, null),
  ('30000000-0000-4000-8000-000000000009', 'USD', 8000, null),
  ('30000000-0000-4000-8000-000000000010', 'NGN', 10000000, null),
  ('30000000-0000-4000-8000-000000000010', 'USD', 6000, null),
  ('30000000-0000-4000-8000-000000000011', 'NGN', 10000000, null),
  ('30000000-0000-4000-8000-000000000011', 'USD', 6000, null),
  ('30000000-0000-4000-8000-000000000012', 'NGN', 9000000, null),
  ('30000000-0000-4000-8000-000000000012', 'USD', 5500, null),
  ('30000000-0000-4000-8000-000000000013', 'NGN', 9000000, null),
  ('30000000-0000-4000-8000-000000000013', 'USD', 5500, null),
  ('30000000-0000-4000-8000-000000000014', 'NGN', 9000000, null),
  ('30000000-0000-4000-8000-000000000014', 'USD', 5500, null),
  ('30000000-0000-4000-8000-000000000015', 'NGN', 5000000, 5800000),
  ('30000000-0000-4000-8000-000000000015', 'USD', 3000, 3500),
  ('30000000-0000-4000-8000-000000000016', 'NGN', 5000000, 5800000),
  ('30000000-0000-4000-8000-000000000016', 'USD', 3000, 3500),
  ('30000000-0000-4000-8000-000000000017', 'NGN', 5000000, 5800000),
  ('30000000-0000-4000-8000-000000000017', 'USD', 3000, 3500)
on conflict (variant_id, currency) do nothing;
