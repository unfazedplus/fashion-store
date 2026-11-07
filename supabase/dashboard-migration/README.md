# Supabase Dashboard Migration

Use these smaller files when the full migration is too large to paste into the Supabase SQL Editor.

## Run order

Run each file once, in this exact order:

1. `01_foundation.sql`
2. `02_catalog_cart_promotions.sql`
3. `03_orders_triggers_auth.sql`
4. `04_checkout_order_function.sql`
5. `05_payment_inventory_functions.sql`
6. `06_row_level_security.sql`
7. `07_seed_catalog.sql`
8. `08_verify_installation.sql`

After checkout testing succeeds, run `09_schedule_inventory_cleanup.sql` once to release stock from abandoned payments every five minutes.

To bootstrap the first administrator, edit both email placeholders in `10_promote_first_admin.sql`, run it once, and confirm the returned role is `admin`.

After the admin account works, run `11_admin_fulfilment.sql` once to install atomic paid → processing → shipped → delivered transitions and shipment tracking.

Run `12_newsletter_subscription.sql` once to activate validated public newsletter signup and resubscription.

Run `13_account_commerce_sync.sql` once to activate signed-in cross-device cart, wishlist, and currency persistence.

To activate coupon previews, promotion limits, and discounted orders, run these three smaller files once in order:

1. `14_coupon_schema.sql`
2. `15_coupon_validation.sql`
3. `16_coupon_order_workflow.sql`

After file `16` succeeds, redeploy `initialize-payment` from `supabase/dashboard-functions/initialize-payment.ts` so checkout sends the optional coupon code to the new order function.

Run `17_admin_customers.sql` once to install privacy-scoped staff customer directory and customer detail RPCs.

Run `18_transactional_order_emails.sql` once to install the idempotent order-email queue, automatic paid/shipped/delivered triggers, staff delivery visibility, and retry controls.

After deploying the `process-order-emails` Edge Function and configuring its email-provider secrets, open `19_schedule_transactional_email_worker.sql` in the SQL Editor. Replace both placeholders only in the Dashboard editor, then run it once to process queued messages every minute. Never commit or send the secret API key in chat.

For every file:

1. Open Supabase Dashboard → SQL Editor → New query.
2. Copy the complete contents of one file into the query.
3. Click Run and wait for success before moving to the next file.

Do not rerun successful files. If a file fails, stop, note its number, and copy the complete error message before continuing.

## Expected verification result

The final verification file should return:

- `created_table_count`: `19`
- `categories`: `4`
- `products`: `6`
- `product_variants`: `17`
- `variant_prices`: `34`

The cleanup file should return one active Cron job named `release-expired-inventory-reservations` with the schedule `*/5 * * * *`.

Files `01` through `06` are an exact ordered split of `supabase/migrations/202610280001_initial_commerce_schema.sql`. File `07` mirrors `supabase/seed.sql`.
