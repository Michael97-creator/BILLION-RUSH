# Billion Rush Store — Paystack integration

## Current product table (NGN)

| Product ID | Price | Inventory grant |
|---|---:|---|
| `fifty_single` | ₦200 | 1 50/50 use |
| `fifty_triple` | ₦500 | 3 50/50 uses |
| `audience_single` | ₦200 | 1 AI Poll Audience use |
| `audience_triple` | ₦500 | 3 AI Poll Audience uses |
| `friend_single` | ₦200 | 1 Call-a-Friend use |
| `friend_triple` | ₦500 | 3 Call-a-Friend uses |
| `extra_time_single` | ₦200 | 1 Extra Time use (+10 seconds) |
| `extra_time_five` | ₦800 | 5 Extra Time uses |
| `second_chance_single` | ₦300 | 1 Second Chance use |
| `second_chance_two` | ₦500 | 2 Second Chance uses |
| `complete_bundle` | ₦2,000 | Retained existing offer: 2 additional uses of each regular lifeline |

The client does not send trusted prices or grant quantities. The Edge Function owns the product/price table and uses the server-only `PAYSTACK_SECRET_KEY` to initialize and verify transactions.

## Server configuration required before testing checkout

Configure these as **Supabase Edge Function secrets**, not Vite variables and not values embedded in the Android APK:

- `PAYSTACK_SECRET_KEY` — use the Paystack **test secret key** during testing. Never place this in frontend code.
- `BR_PUBLIC_APP_URL` — the public HTTPS origin hosting `download.html` and `purchase-return.html`, with no trailing slash.
- Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Edge Function environment.

Apply `supabase/migrations/0018_billion_rush_store.sql` before deploying the four store functions: `paystack-initialize`, `paystack-verify`, `get-store-inventory`, and `consume-store-item`.

## Security and inventory behavior

- The server validates product IDs, amount, NGN currency, Paystack transaction status and reference.
- Purchased inventory is granted only after Paystack verification on the server.
- The database grant function locks the purchase row and grants inventory only once, even if verification is called repeatedly.
- Consuming a purchased use is an atomic server operation. The browser's local inventory is a cache, not proof of ownership.
- Free regular lifeline uses are tracked separately from purchased inventory.
- Checkout is available only from the pre-game shop. The game-over screen never offers checkout.
- The installation ID is an anonymous, random device identifier, not an account. Clearing app data or changing devices may lose the ability to restore that installation's inventory; a cross-device recovery process is not included yet.

## Important release limitation

The repository previously contained only a frontend placeholder (`window.BillionRushPayments`) and no actual Paystack adapter or payment Edge Functions. The current code adds the server-side integration path, but it is **not live until the migration is applied, Edge Functions are deployed, Supabase secrets are configured, and test transactions are verified end to end**. Do not accept real payments before this testing and Paystack's approval for the business model.
