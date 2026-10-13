# Billion Rush architecture

**Solo player:** `billion-rush/` is the existing Vite/JavaScript game. It preserves the 50-question prize ladder, local question bank, country mixing, hidden difficulty, milestones, Walk Away, lifelines, results, score sharing, and the Android download invitation.

**Backend:** the existing Supabase project serves question/lifeline generation, score sharing, and the store endpoints. The new store migration and four Paystack/inventory Edge Functions are source changes only until deployed.

**Store:** the client requests checkout but never supplies trusted prices or grants. Paystack transaction verification and the idempotent inventory ledger run server-side. The local wallet is only a cache. A random anonymous installation ID avoids mandatory accounts, but cross-device/reinstall recovery is not yet provided.

**Anti-cheat:** active sessions remain in memory only. Leaving the active app invalidates the session and removes any legacy active save. Lost results can be restored; completed results are not invalidated when the player leaves the results screen. This discourages same-device app switching but does not prevent use of a second device.

**Android:** Capacitor is configured for `billion-rush/dist`. The Android project is not generated in this archive. Install dependencies, build, add/sync Android, and test lifecycle and payment return on a real device before release.
