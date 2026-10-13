# Billion Rush community leaderboards

## Included
- Daily, weekly (Monday start), monthly and yearly periods, calculated on UTC boundaries.
- Global and selected-country views.
- Two ranking modes: highest single completed prize and total prize amounts across completed Rushes.
- A stable anonymous installation ID; no account or email/password required.
- Idempotent run submissions by run ID; a Second Chance continuation updates the same run record instead of double-counting it.
- Top 100 display and the local player's rank when the player falls outside the top 100.

## Deployment required
1. Apply `supabase/migrations/0019_community_leaderboards.sql` to the existing Supabase project.
2. Deploy Edge Functions `submit-leaderboard-score` and `get-community-leaderboard`. `supabase/config.toml` marks these public endpoints `verify_jwt = false`; the functions validate inputs and only write through the service role.
3. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the app build.
4. Build and test the app, then run multiple test devices to confirm scores are shared and all four period boundaries behave as expected.

## Integrity note
The current solo game runs on the player's device. These endpoints validate field ranges and deduplicate a run ID, but a modified client can still submit a fabricated score. The UI calls these **community scores** and explains this limitation. Do not describe this leaderboard as verified or prize-eligible until the solo gameplay and answer evaluation are server-authoritative and abuse controls are added.

Total winnings are the sum of the prize kept/reached at the end of each submitted run, not a payout and not real money.
