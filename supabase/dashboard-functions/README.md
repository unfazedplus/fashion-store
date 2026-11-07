# Dashboard Edge Functions

These standalone files are generated for the Supabase Dashboard editor. Each file contains its shared helpers, so only one file needs to be pasted when creating a function.

Deploy them with these exact function names:

1. `initialize-payment` from `initialize-payment.ts`
2. `paystack-webhook` from `paystack-webhook.ts`
3. `verify-payment` from `verify-payment.ts`
4. `process-order-emails` from `process-order-emails.ts`

Disable JWT verification for all four functions. The checkout function validates an optional signed-in user token internally so guest checkout remains available. The email worker accepts only the secret API key supplied by the scheduled database job.

Before deployment, configure these Edge Function secrets in Supabase:

- `UNFAZED_SUPABASE_SECRET_KEY`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `ORDER_EMAIL_FROM` using a sender authorized by the configured email provider
- `SUPPORT_EMAIL` for customer replies
- `SITE_URL` set to `http://localhost:5173` during local testing

Never place those secret values in frontend environment files or commit them to this repository.

Regenerate these standalone files after changing canonical function or shared-helper code:

```bash
LD_LIBRARY_PATH=/data/data/com.termux/files/usr/lib node scripts/generate-dashboard-functions.mjs
```
