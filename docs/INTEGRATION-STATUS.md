# Billion Rush integration status — October 2026

## Existing features preserved
- No required player account; country selection and country/region/world question mixing.
- 50 questions, 30 seconds per question, and the 50-step ladder ending at ₦1 billion.
- Protected milestones at RUSH 10/20/30/40 and Walk Away.
- 2 free uses each of 50/50, AI Poll Audience and Call-a-Friend at the start of every genuinely new Rush.
- 12 selectable Call-a-Friend characters, score card generation, score sharing and download challenge page.
- Ad-free Version 1.

## Targeted changes in this source revision
- Regular lifeline shop options at ₦200 for 1 use and ₦500 for 3 uses.
- Extra Time at ₦200 for 1 or ₦800 for 5; each activation adds 10 seconds, maximum 5 per game and once per question.
- Second Chance at ₦300 for 1 or ₦500 for 2; no free uses, maximum 2 per game, purchased before the Rush, and replacement question at the same ladder position.
- Server-side Paystack initialization and verification, durable anonymous-install inventory, idempotent grants, and atomic item consumption added to the existing Supabase backend.
- Active sessions are no longer saved or resumed. Backgrounding, locking, switching apps, or leaving the active game invalidates that session. A loss/results screen may be restored; completed results are not invalidated on leaving.
- No purchase or checkout prompt during active gameplay or after a loss.

## Still required before a production APK / live payments
- Apply migration `0018_billion_rush_store.sql` to the configured Supabase project.
- Set Supabase Edge Function secrets `PAYSTACK_SECRET_KEY` (test key first) and `BR_PUBLIC_APP_URL`.
- Deploy and test `paystack-initialize`, `paystack-verify`, `get-store-inventory`, and `consume-store-item`.
- Install the new Capacitor dependencies, sync the Android project, and test app background/lock events and payment return on a real device.
- Run the Vite production build, browser tests, and Android release build. This environment has not yet run a complete production build or device QA.
- Confirm Paystack approves this game's digital purchases before live mode.

The source has no Paystack keys, no deployed backend state, and no generated Android project included. Those are deployment/build steps, not completed claims.
