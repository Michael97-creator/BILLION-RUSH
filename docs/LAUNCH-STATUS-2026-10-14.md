# Billion Rush — launch status (14 October 2026)

This file distinguishes local source checks from tasks that require the owner's computer, Android SDK, or connected Supabase/Paystack accounts.

## Verified in the source bundle
- `capacitor.config.json` is valid JSON and uses `com.jumitech.billionrush`, app name `Billion Rush`, and `billion-rush/dist` as `webDir`.
- The duplicate/incorrect `npx cap cap init` command is not needed. This project is already initialized; do not reinitialize it.
- 17 Node automated tests pass.
- `npm run verify` passes. This is a static integrity check, not a production build.
- The source archive passes ZIP integrity validation.

## Not yet verified / must not be claimed complete
- Vite production build: not run successfully because npm dependencies could not be downloaded in the build environment.
- Android platform folder and debug APK: not generated or tested here.
- Real Android device QA: not performed.
- Supabase migration `0019_community_leaderboards.sql` and leaderboard Edge Functions: not deployed to the owner's project.
- Paystack live approval and real transaction tests: not confirmed. Do not enable live purchases until Paystack approves the product and all server-side checks pass.
- Solo leaderboard scores are community-reported, not cheat-proof. Do not market them as verified or prize-eligible.

## Windows build sequence
Run these from the repository root (the folder with the root `package.json`):

1. `node -v` — use Node.js 22 or newer for this Capacitor 8 project.
2. `npm install`
3. `npm run doctor`
4. `node --test tests/*.test.mjs`
5. `npm run verify`
6. `npm run build`
7. If there is no `android` folder: `npm run android:add` (once only).
8. `npm run android:sync`
9. `npm run android:open`
10. In Android Studio, wait for Gradle sync and SDK setup to finish, then build a debug APK. Alternatively, from PowerShell at the repository root run `npm run android:build:debug:windows`.

The APK normally appears at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Supabase and release gate
- Review and apply migrations in order to the intended Supabase project; do not blindly apply to production before reviewing.
- Deploy `submit-leaderboard-score` and `get-community-leaderboard` after migration `0019` is applied.
- Set only the Supabase URL and public anon key in `billion-rush/.env.local` for the frontend build. Never put the Supabase service-role key or Paystack secret key in frontend files.
- Run leaderboard tests with at least two separate devices and test UTC day/week/month/year boundaries.
- Test payment success, failure, cancellation, duplicate callbacks, inventory persistence, and use limits in Paystack test mode first.
- Verify privacy information, support contact, offline/error states, orientation/responsive layouts, and app background/return behavior on a real phone.
- Only then prepare the public download page and distribute the APK.
