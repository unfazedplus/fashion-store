# Supabase and Paystack Setup

This project uses Supabase for PostgreSQL, authentication, row-level security, order storage, inventory reservations, and Edge Functions. Paystack handles hosted payment collection.

## 1. Required accounts

- A Supabase project
- A registered Paystack business in Nigeria
- A deployed storefront URL

Keep Paystack in test mode until the complete order flow has been verified.

## 2. Frontend environment

Copy `.env.example` to `.env.local` and provide the public Supabase values:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Only variables beginning with `VITE_` are included in the browser bundle. The publishable key is intended for browser use with row-level security. Never create a `VITE_PAYSTACK_SECRET_KEY` or expose a Supabase secret key.

## 3. Database schema

The migration is located at:

```text
supabase/migrations/202610280001_initial_commerce_schema.sql
```

It creates:

- Customer profiles and addresses
- Categories, products, images, variants, prices, and inventory
- Persistent carts and wishlists
- Coupons, orders, order items, payments, and shipments
- Reviews and newsletter subscribers
- Row-level security policies
- Atomic pending-order creation
- Thirty-minute inventory reservations
- Payment completion and expired-reservation release functions

Using the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The local environment in this repository does not currently include the Supabase CLI or PostgreSQL client, so the migration has not yet been executed against a live database.

### Android and Termux deployment

The official Supabase CLI currently rejects the Android platform. From this Termux environment, use the smaller Dashboard-ready SQL files in `supabase/dashboard-migration`:

1. Open `supabase/dashboard-migration/README.md`.
2. Open the Supabase project and select **SQL Editor**.
3. Run files `01` through `08` once, in their numbered order, using a new query for each file.
4. Wait for each file to succeed before running the next one.
5. Stop and save the complete error message if any numbered file fails.
6. Confirm that the final verification query reports 19 tables, 4 categories, 6 products, 17 variants, and 34 prices.

Files `01` through `06` exactly reconstruct the canonical migration, file `07` mirrors the seed, and file `08` verifies the installation. Keep the canonical migration and seed files in the repository so the database remains documented and reproducible.

## 4. Seed catalogue

`supabase/seed.sql` contains the same categories, products, SKUs, stock quantities, images, and NGN/USD price books currently used by the frontend.

For local Supabase development, seed data is applied by `supabase db reset`. For the hosted Dashboard workflow above, `supabase/dashboard-migration/07_seed_catalog.sql` is the smaller copy to run after files `01` through `06`.

## 5. Edge Function secrets

Supabase provides `SUPABASE_URL` automatically to deployed Edge Functions. Configure the remaining values from the Dashboard without placing them in frontend files:

1. In Supabase, open **Project Settings → API Keys** and copy a secret key beginning with `sb_secret_`. Do not use the publishable key.
2. In the Paystack Dashboard, use test mode and copy the test secret key beginning with `sk_test_` from the Developers area.
3. In Supabase, open **Edge Functions → Secrets**.
4. Add `UNFAZED_SUPABASE_SECRET_KEY` with the Supabase secret-key value.
5. Add `PAYSTACK_SECRET_KEY` with the Paystack test-secret value.
6. Add `SITE_URL` with `http://localhost:5173` while testing locally.

Never paste these secret values into chat, commit them to the repository, or prefix them with `VITE_`.

For a supported CLI environment, the equivalent command is:

```bash
npx supabase secrets set \
  UNFAZED_SUPABASE_SECRET_KEY=sb_secret_your_key \
  PAYSTACK_SECRET_KEY=sk_test_your_key \
  SITE_URL=http://localhost:5173 \
  --project-ref YOUR_PROJECT_REF
```

Use the Paystack test secret first. Replace it with the live secret only after Paystack activates the business for live payments.

## 6. Deploy Edge Functions

```bash
npx supabase functions deploy initialize-payment --no-verify-jwt --project-ref YOUR_PROJECT_REF
npx supabase functions deploy paystack-webhook --no-verify-jwt --project-ref YOUR_PROJECT_REF
npx supabase functions deploy verify-payment --no-verify-jwt --project-ref YOUR_PROJECT_REF
```

When the CLI is unavailable, use the standalone Dashboard files in `supabase/dashboard-functions`:

1. Open **Edge Functions → Deploy a new function → Via Editor**.
2. Name the function `initialize-payment`, replace the editor contents with `supabase/dashboard-functions/initialize-payment.ts`, disable JWT verification, and deploy.
3. Repeat with the name `paystack-webhook` and `supabase/dashboard-functions/paystack-webhook.ts`.
4. Repeat with the name `verify-payment` and `supabase/dashboard-functions/verify-payment.ts`.
5. Confirm all three functions show as deployed before testing checkout.

The standalone files contain their shared helpers, so each function requires only one pasted file. JWT verification remains disabled because checkout permits guests; `initialize-payment` validates an optional signed-in customer token inside the function.

The functions perform these jobs:

- `initialize-payment`: validates signed-in customer tokens, links authenticated orders to the customer profile, calculates shipping on the server, rebuilds totals from database prices, reserves inventory, creates the order, and initializes Paystack. Requests without a bearer token remain guest orders.
- `paystack-webhook`: validates Paystack's SHA-512 signature, verifies the transaction, compares amount and currency, and marks the order paid.
- `verify-payment`: supports the browser return page while preserving webhook idempotency.

## 7. Paystack webhook

Configure this webhook URL in the Paystack dashboard:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

Do not use the storefront callback page as the payment source of truth. The signed webhook and Paystack transaction verification determine whether an order is paid.

## 8. International payments

The storefront supports explicit NGN and USD price books. USD checkout will only work after Paystack enables international payments and USD processing for the Nigerian business. If USD is not approved, remove USD from `src/config/commerce.ts` until approval is complete.

## 9. Inventory reservation cleanup

Pending orders reserve inventory for thirty minutes. Run `supabase/dashboard-migration/09_schedule_inventory_cleanup.sql` once in the Supabase SQL Editor after checkout testing succeeds.

The script enables Supabase Cron, schedules `public.release_expired_inventory_reservations()` every five minutes, and returns the active job for verification. The cleanup function releases stock and cancels unpaid orders after their reservation expires.

## 10. Bootstrap the first administrator

The admin dashboard is protected by the `profiles.role` field and the database staff policies. To promote the first account:

1. Open `supabase/dashboard-migration/10_promote_first_admin.sql`.
2. Replace both email placeholders with the email used for the signed-in account.
3. Run the file once in the Supabase SQL Editor.
4. Confirm the result reports the role `admin`.
5. Open `http://localhost:5173/admin` while signed in.

Do not expose role updates through the public storefront. Additional staff accounts should be promoted deliberately by an existing administrator or a secure server-side workflow.

## 11. Admin fulfilment workflow

Run `supabase/dashboard-migration/11_admin_fulfilment.sql` once in the Supabase SQL Editor after administrator access is confirmed.

The script installs one atomic staff-only workflow for:

- Moving paid orders to processing
- Requiring carrier and tracking details before shipment
- Creating or updating the shipment record while marking the order shipped
- Marking shipped orders delivered
- Preventing invalid or backwards fulfilment transitions

After the query succeeds, open `http://localhost:5173/admin/orders` while signed in as an administrator. Cancellation and refunds are intentionally excluded because they require separate inventory and payment-provider handling.

## 12. Newsletter subscription

Run `supabase/dashboard-migration/12_newsletter_subscription.sql` once in the Supabase SQL Editor.

The function validates and normalizes public signup emails, prevents duplicate records, and safely resubscribes previously unsubscribed addresses without opening direct public table access. Staff can review, export, unsubscribe, and resubscribe records at `http://localhost:5173/admin/newsletter`.

Add CAPTCHA or rate limiting before a high-traffic production launch.

## 13. Account cart and wishlist sync

Run `supabase/dashboard-migration/13_account_commerce_sync.sql` once in the Supabase SQL Editor, then refresh the storefront.

The account commerce function atomically saves the signed-in customer's cart, selected currency, and wishlist after validating that products and variants are still active and in stock. Guest shopping data stays in browser storage. On sign-in, valid guest items merge with the account data; cart quantities use the larger value and wishlists use a union.

The browser tags signed-in shopping data to its account owner, clears it immediately on sign-out or account switching, serializes updates to prevent stale saves, and rejects a delayed save if the authenticated account changes before the request reaches the database.

Verify the feature while signed in:

1. Add one product to the cart and one product to the wishlist.
2. Refresh and confirm both remain.
3. Sign out and confirm the local cart and wishlist are empty.
4. Sign back in and confirm both items return.
5. Change the quantity and wishlist selection, refresh again, and confirm the latest state remains.

## 14. Coupon promotions

Run these Dashboard SQL files once, in order:

1. `supabase/dashboard-migration/14_coupon_schema.sql`
2. `supabase/dashboard-migration/15_coupon_validation.sql`
3. `supabase/dashboard-migration/16_coupon_order_workflow.sql`

The split keeps each query small enough for the Dashboard editor. Supported CLI environments receive the same combined change from `supabase/migrations/202610300004_coupon_promotions.sql`.

After all three queries succeed, redeploy only the `initialize-payment` Edge Function using the updated `supabase/dashboard-functions/initialize-payment.ts`. The webhook and verification functions do not need redeployment for this phase.

Staff can then manage promotions at `http://localhost:5173/admin/promotions`. Coupons support:

- Percentage discounts for one currency or both currencies
- Currency-specific fixed discounts
- Optional minimum order amounts
- Optional start and end dates
- Optional maximum-use limits
- Immediate activation and deactivation
- Paid and pending-use visibility

Checkout previews are calculated from live database prices. Final coupon validation, usage-limit reservation, discount calculation, inventory reservation, and order creation occur together in the database. Pending orders reserve limited-use coupons for the same thirty-minute payment window as inventory. Cancelled or expired pending orders release that coupon capacity, while successful payment increments the paid use count exactly once.

For the first test, create an active NGN percentage coupon such as `TEST10` with a value of `10`, no minimum, and a maximum of `5`. Apply it during checkout, confirm the discounted total, complete a Paystack test payment, and verify the order plus paid-use count in the admin dashboard.

Add rate limiting to public coupon previews before a high-traffic production launch.

## 15. Staff customer management

Run `supabase/dashboard-migration/17_admin_customers.sql` once in the Supabase SQL Editor.

The migration installs two staff-only security-definer RPCs instead of broad profile and address policies. Verified staff can access only the customer fields needed for support and commerce operations, while authentication controls and private auth metadata remain inaccessible.

After the query succeeds, refresh `http://localhost:5173/admin/customers`. The directory provides:

- Search by customer name, email, or phone
- Paginated registered-customer results
- Linked order and saved-address counts
- Separate NGN and USD lifetime value
- Last-order visibility
- Read-only customer detail pages with saved addresses
- Linked order summaries that open the existing order-management workflow

Guest orders remain separate because no account identity exists to attach them safely. Orders created while signed in appear automatically under the matching customer.

## 16. Transactional order emails

Run `supabase/dashboard-migration/18_transactional_order_emails.sql` once in the Supabase SQL Editor. This installs a private, idempotent queue that automatically records one message when an order first becomes paid, shipped, or delivered. Existing orders are not queued retroactively.

Create an account with the configured transactional-email provider and authorize the sender address or domain you will use. In Supabase Dashboard → Edge Functions → Secrets, add these values without sharing them in chat or placing them in frontend environment files:

- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM`, for example `UNFAZED <orders@your-authorized-domain.com>`
- `SUPPORT_EMAIL`, using an inbox monitored by the store team

Keep the existing `UNFAZED_SUPABASE_SECRET_KEY` and `SITE_URL` secrets. During local testing, `SITE_URL` can remain `http://localhost:5173`; replace it with the public HTTPS storefront URL before production.

Create and deploy a function named `process-order-emails` using `supabase/dashboard-functions/process-order-emails.ts`. Disable JWT verification for this function. It still rejects public requests because it compares the incoming API key with `UNFAZED_SUPABASE_SECRET_KEY` before claiming any queued work.

Next, open `supabase/dashboard-migration/19_schedule_transactional_email_worker.sql` in the SQL Editor. Replace these placeholders only in the Dashboard editor:

- `https://YOUR_PROJECT_REF.supabase.co` with the project URL
- `YOUR_UNFAZED_SUPABASE_SECRET_KEY` with the same secret key already configured for the Edge Functions

Run the edited query once. It stores both values in Supabase Vault and creates an active Cron job named `process-order-email-queue` that invokes the worker every minute. Never commit the edited query or send the secret key in chat.

Validate the flow with a new test order because old orders are intentionally not emailed retroactively:

1. Complete a Paystack test payment and wait up to two minutes for the confirmation email.
2. Open the order in the staff dashboard and confirm **Customer notifications** shows the order confirmation as `sent`.
3. Mark the order processing, then shipped with test tracking details, and wait for the shipment email.
4. Mark the order delivered and confirm the delivery email arrives.
5. If the provider rejects a message, inspect the error in the order dashboard. The worker retries with increasing delays up to eight attempts, and staff can use **Retry now** after correcting the configuration.

## 17. Production checklist

- Replace estimated shipping tables with contracted courier rates.
- Add rate limiting or CAPTCHA to guest checkout initialization.
- Test successful, failed, abandoned, duplicate, and delayed webhook payments.
- Verify inventory restoration after expired and failed transactions.
- Add legal store policies before accepting live orders.
- Enable database backups and error monitoring.
