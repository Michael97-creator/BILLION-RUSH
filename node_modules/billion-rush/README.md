# Billion Rush — existing 50-question player app

## Gameplay preserved
- No player sign-up or login is required.
- Country selector; local, regional, and world question mixing.
- 50 questions per Rush, 30 seconds per question, and randomized difficulty that is not shown to players.
- Two free uses each of 50/50, AI Poll Audience, and Call-a-Friend at the start of every new Rush.
- Milestones, Walk Away, results, restart, score-card image, Share Link, and download challenge invitation.
- Ad-free Version 1.

## Store products
- Each regular lifeline (50/50, AI Poll Audience, Call-a-Friend): ₦200 for 1 use or ₦500 for 3 uses.
- Extra Time: ₦200 for 1 use or ₦800 for 5 uses. Each use adds exactly 10 seconds; no free uses; maximum five per Rush and once per question.
- Second Chance: ₦300 for 1 use or ₦500 for 2 uses. No free uses; maximum two per Rush; must be purchased before the Rush. After a loss, it offers a different replacement question at the same ladder position and never opens checkout on the Game Over screen.
- The existing ₦2,000 Complete Lifeline Bundle is retained as an additional offer.
- Purchased inventory is cached locally for display but is authoritative only after server verification through the existing Supabase backend. See `../docs/STORE-SETUP.md`.

## Local setup
1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the existing Supabase project. Set `VITE_PUBLIC_APP_URL` to the public website origin when deployed.
3. From the repository root, run `npm install`, then `npm --prefix billion-rush install`.
4. Run `npm run dev` from the repository root.
5. Run `npm run test:rules`, `npm run verify`, and `npm run build`.

## Payment status
The Paystack source integration is present but not deployed or end-to-end tested. Apply `supabase/migrations/0018_billion_rush_store.sql`, configure `PAYSTACK_SECRET_KEY` and `BR_PUBLIC_APP_URL` as Supabase Edge Function secrets, and deploy the four store functions. Use test keys until successful, failed, cancelled, repeated-callback, and app-return cases pass. Never place the Paystack secret or Supabase service-role key in `.env.local` or frontend code.

## Active-session protection
Active Rush progress is not saved or resumed. Backgrounding, switching apps, locking the phone, or navigating away invalidates an active session. Lost results may be restored; leaving completed results does not invalidate them. This discourages same-device switching but cannot prevent use of a separate device.

## Android
Capacitor dependencies are declared in the root and player packages. The Android project has not been generated in this archive. Once dependencies and backend setup are ready, use the root scripts `npm run build`, `npm run android:add` (first time only), `npm run android:sync`, and `npm run android:open`. A real-device build and lifecycle test are still required.
