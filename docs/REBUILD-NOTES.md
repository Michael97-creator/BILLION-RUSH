# Targeted update notes

The existing Vite solo game was retained. This revision does not replace the framework or rebuild the game from scratch.

- Preserved the 50-question ladder, 30-second timer, milestone protection, Walk Away, existing three regular lifelines, score card, Share Link, and Android download challenge page.
- Added the agreed regular lifeline package prices: ₦200 for 1 use or ₦500 for 3 uses per lifeline.
- Added Extra Time packages (₦200 for 1, ₦800 for 5; exactly +10 seconds; max five per Rush and once per question).
- Added Second Chance packages (₦300 for 1, ₦500 for 2; no free uses; max two per Rush; replacement question at the same ladder position; no Game Over checkout).
- Retained the existing ₦2,000 Complete Lifeline Bundle rather than silently removing an existing offer.
- Added server-side Paystack initialize/verify functions, an idempotent store ledger, and atomic inventory consumption on the existing Supabase backend. These require migration deployment, server secrets, and end-to-end test transactions before they are usable.
- Active sessions are no longer persisted. App background/lock/switch/navigation during active play voids the run. Lost/completed results are not invalidated merely by leaving the results screen.

Automated rules and static integrity tests pass. The production Vite build, Supabase staging tests, and Android real-device tests remain outstanding because the build dependencies are not installed in this environment and no Android project is present yet.
