# Billion Rush by Jumi Tech

Billion Rush is the existing Vite/JavaScript solo quiz game: 50 questions, 30 seconds per question, a ₦1 billion top-prize identity, country-aware question mixing, hidden difficulty tiers, milestones, Walk Away, 50/50, AI Poll Audience, Call-a-Friend, score sharing, and an ad-free Version 1.

The main player app lives in `billion-rush/`. The existing Supabase backend, staff Studio, multiplayer modules, and older `apps/player` modules remain in this repository; this update does not rebuild the game from scratch.

## Current store plan

- Regular lifelines: ₦200 for 1 use or ₦500 for 3 uses, per lifeline.
- Extra Time: ₦200 for 1 use or ₦800 for 5 uses; each use adds 10 seconds.
- Second Chance: ₦300 for 1 use or ₦500 for 2 uses.
- The existing ₦2,000 Complete Lifeline Bundle remains in the shop so it is not silently removed.
- Purchases are available before a Rush only. Failed or unverified payments must not grant items.
- Server-side Paystack checkout and durable anonymous-install inventory have been added as source code, but they are not live until the migration and Edge Functions are deployed, secrets are configured, and end-to-end test transactions pass.

## Active game protection

An active Rush is never saved or restored. Leaving the app, switching apps, locking the phone, or navigating away while a Rush is active invalidates that session. A lost/results screen can be restored, and leaving a completed results screen does not void it. This discourages switching apps on the same device; it cannot stop someone from using a second device to look up answers.

## Local setup

1. Install a current Node.js LTS release.
2. From the repository root, run `npm install`.
3. Install the web app dependencies with `npm --prefix billion-rush install`.
4. Copy `billion-rush/.env.example` to `billion-rush/.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and the deployed `VITE_PUBLIC_APP_URL` when available.
5. Run `npm run dev` to start the existing Vite app.
6. Run `npm run test:rules` and `npm run verify` for automated checks.
7. Run `npm run build` once dependencies are installed.

## Store deployment

Follow `docs/STORE-SETUP.md`. Apply `supabase/migrations/0018_billion_rush_store.sql`, set the server-only `PAYSTACK_SECRET_KEY` and `BR_PUBLIC_APP_URL` secrets, and deploy `paystack-initialize`, `paystack-verify`, `get-store-inventory`, and `consume-store-item`. Use Paystack test mode first. Do not accept live payments until the end-to-end flow is tested and Paystack approves the business model.

## Android packaging

The project uses Capacitor and Android Studio, but the Android project has not been generated in this source archive yet. After installing dependencies and configuring the website/backend, run `npm run build`, then `npm run android:add` once, `npm run android:sync`, and `npm run android:open`. Test the resulting app on a real Android phone before creating a signed release APK.
