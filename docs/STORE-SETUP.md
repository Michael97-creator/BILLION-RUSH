# Billion Rush store setup — step by step

This project keeps the existing Vite/Capacitor app and Supabase backend. It does not need a new service or a player account.

## 1. Configure the public website

Deploy the existing `billion-rush/` site so `index.html`, `download.html`, and `purchase-return.html` are served from the same public HTTPS origin. Set these frontend build variables in the deployment environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL` — the public website origin, with no trailing slash.

The Supabase anon key is public by design. Never place the Supabase service-role key or Paystack secret key in frontend variables.

## 2. Apply the store database migration

Apply `supabase/migrations/0018_billion_rush_store.sql` to the existing Supabase project before deploying the new store functions. It creates a durable installation inventory, a purchase ledger, and atomic database functions for one-time purchase grants and item consumption.

## 3. Configure server-only secrets

In Supabase Edge Function secrets, set:

- `PAYSTACK_SECRET_KEY` — use a **test secret key** while testing.
- `BR_PUBLIC_APP_URL` — the deployed public website origin, with no trailing slash.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to Supabase Edge Functions by the project environment. Do not expose the service-role key in the app.

## 4. Deploy the four Edge Functions

Deploy:

- `paystack-initialize`
- `paystack-verify`
- `get-store-inventory`
- `consume-store-item`

The client can request checkout, but the server decides the product price, calls Paystack, verifies reference/status/amount/currency, and grants inventory only once. Repeated verification must not duplicate a grant.

## 5. Test with Paystack test mode

Test each product and confirm the exact NGN amount. Also test declined/cancelled checkout, closing checkout before completion, repeated callback/verification, app closing before returning, and app foreground inventory refresh. A failed or unverified transaction must never add items.

## 6. Android lifecycle and APK

After installing dependencies, run the existing project build, then Capacitor sync and Android Studio. Test that minimizing the app, switching apps, locking the phone, or navigating away during an active Rush invalidates the session and that no active game is restored after restart. Leaving a completed/lost results screen must not void that result.

## Important limitations

- This is an anonymous installation ID, not an account. Clearing app data or changing devices can lose access to that installation's inventory; cross-device restore is not implemented.
- The new payment path is source code only until the migration, secrets, and Edge Functions are deployed and end-to-end tested.
- Do not switch to Paystack live keys or accept real payments until the test flow works and Paystack confirms the business model is approved.
