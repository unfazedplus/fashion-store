# UNFAZED Fashion Store

UNFAZED is a React, TypeScript, Supabase, and Paystack fashion-commerce project. The current implementation provides a responsive global storefront, customer accounts, protected account pages, server-authoritative checkout foundations, and a Nigeria-based merchant configuration with NGN and USD pricing.

## Current stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- ESLint
- Supabase PostgreSQL, Auth, and Edge Functions
- Paystack hosted checkout

## Available commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run check
npm run preview
```

## Implemented in Phase 1

- Responsive homepage navigation and mobile menu
- Typed categories, products, images, and product variants
- Variant-level price, SKU, size, colour, and inventory data
- Product cards with variant selection and stock limits
- Persistent guest cart using local storage
- Cart quantity updates, removal, subtotal, and cart drawer
- Persistent wishlist selections
- Accessible labels, focus states, and keyboard-close behavior
- Responsive category, product, newsletter, and footer sections
- Honest local-only newsletter interest capture pending backend integration

## Implemented in Phase 2

- React Router application structure and shared storefront layout
- Home, catalogue, product details, wishlist, cart, and not-found pages
- URL-backed product search, category, size, colour, and availability filters
- Product sorting by featured status, name, and price
- Product breadcrumbs, stock-aware variant selection, and related products
- Dedicated wishlist results and empty state
- Full cart page with quantity controls and estimated order summary
- Route-aware navigation across desktop and mobile layouts

## Implemented in Phase 3

- Nigeria-based merchant configuration with NGN as the base currency
- Explicit NGN and USD product price books
- Persistent desktop and mobile currency selection
- Destination-based global shipping zones and methods
- International checkout address and delivery forms
- Supabase client integration with safe unconfigured fallback behavior
- PostgreSQL ecommerce schema with row-level security
- Server-authoritative order totals and thirty-minute stock reservations
- Secure Paystack initialization, webhook verification, and return verification functions
- Payment completion page that clears the cart only after a paid order
- Seed data matching every frontend SKU, stock level, image, and price
- Supabase authentication, registration, password recovery, and reset flows
- Protected customer profile, saved addresses, sign-out, and order history
- Authenticated order ownership with guest-checkout support
- Route-level code splitting with a persistent storefront shell
- Role-protected staff dashboard with live catalogue, revenue, order, and low-stock metrics

## Implemented in Phase 4

- Staff catalogue creation, editing, publish safeguards, inventory, images, and NGN/USD prices
- Staff order processing, shipment tracking, and delivery timestamps
- Persistent newsletter signup with staff consent management and CSV export
- Signed-in cross-device cart, wishlist, and currency synchronization
- Immediate account-data clearing on sign-out and safe account switching
- Server-authoritative coupon previews, schedules, currency rules, minimums, and usage limits
- Staff promotion creation, editing, activation, and redemption visibility
- Privacy-scoped staff customer directory, lifetime value, addresses, and linked order history
- Discount audit details on customer and staff order views

## Implemented in Phase 5

- Transaction-safe paid, shipped, and delivered email queue
- Branded HTML and plain-text transactional order templates
- Scheduled email delivery with bounded automatic retries
- Provider idempotency keys to reduce duplicate sends
- Staff delivery status, provider audit details, errors, and manual retry controls

## Current routes

- `/`
- `/shop`
- `/products/:productSlug`
- `/wishlist`
- `/cart`
- `/checkout`
- `/checkout/complete`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/account`
- `/account/addresses`
- `/account/orders`
- `/admin` (staff and administrators only)
- `/admin/products`
- `/admin/orders`
- `/admin/customers`
- `/admin/promotions`
- `/admin/newsletter`

## Next phases

1. Add payment-safe cancellation, returns, refunds, and inventory restoration.
2. Add verified-purchase product reviews and staff moderation workflows.
3. Add automated tests, rate limiting, CAPTCHA, analytics, SEO, and monitoring.
4. Complete production deployment, backups, legal policies, and courier integrations.

## Local storage keys

- `unfazed-cart-v1`
- `unfazed-wishlist-v1`
- `unfazed-currency-v1`
- `unfazed-commerce-owner-v1`

Guest cart, wishlist, and currency preferences use browser storage. Signed-in cart and wishlist data synchronize with Supabase, while catalogue prices, stock, discounts, orders, authentication, and payment state remain server-authoritative.

Backend deployment instructions are in `docs/backend-setup.md`.
