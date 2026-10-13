# Billion Rush V9 production hardening

V9 completes the next backend-hardening pass without exposing admin tools to players.

## Included
- Browser app can read Vite `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` while still supporting local setup.
- Solo Rush prevents multiple simultaneous active sessions per player.
- Rush selection prefers unseen questions and then recycles the least-recently-seen questions instead of failing forever when a player exhausts a tier.
- Finish-rush reads answer history with the real `submitted_at` column through the service client.
- Approved-question indexes added.
- Analytics view is no longer publicly readable.
- Daily-best leaderboard helper added.
- Existing staff-only AI → draft → review → approve pipeline remains intact.

## Secrets
Only Edge Functions may hold:
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

The player browser must only receive the Supabase URL and public anon/publishable key.

## Staging order
1. Run migrations 0001 through 0013.
2. Set Edge Function secrets.
3. Deploy functions.
4. Create a test player.
5. Create an admin/reviewer profile using a trusted admin workflow.
6. Generate AI questions and verify they remain drafts.
7. Approve a balanced pool.
8. Run two concurrent Rush starts for one player and verify only one succeeds.
9. Complete correct, wrong, timeout and walk-away paths.
10. Verify daily leaderboard records.
11. Run RLS/security tests before production.
