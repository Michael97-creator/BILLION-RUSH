# Billion Rush V12 — Production Readiness

## Completed
- Player authentication with Supabase Auth.
- Server-authoritative 20-question Rush.
- Exactly 30 seconds per question enforced by the Edge Function deadline.
- Mixed difficulty: 5 easy, 5 medium, 5 hard, 5 very hard, shuffled per run.
- Approved-question-only live pool.
- Correct answers are not returned by `get-question`.
- Answer submission is server validated.
- One-answer-per-question database uniqueness hardening.
- Timeout now closes the server session instead of only changing the browser UI.
- Walk-away is server recorded.
- Finished Rushes are sent to leaderboard finalization.
- Gemini is server-side only through `GEMINI_API_KEY`.
- AI-generated questions enter `draft` and require staff approval.
- Question Studio functions enforce `admin`/`reviewer` roles server-side.
- AI Audience and Call-a-Friend have graceful fallback engines when Gemini is unavailable.
- Sensitive answer, lifeline, and question-history tables are revoked from direct client access.
- Player question-history `times_seen` increments instead of being reset.

## Required Supabase action for V12
Run migration:

`supabase/migrations/0014_final_hardening.sql`

Then deploy the changed Edge Functions:

- `submit-answer`
- `timeout-question`
- `finalize-leaderboard`
- `walk-away`
- `get-question`
- `start-rush`
- `ask-audience`
- `call-friend`
- `generate-questions`
- `review-question`

## Secrets
Server-side only:
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional; defaults to `gemini-2.5-flash-lite`)
- Supabase service-role secret supplied automatically by Supabase Edge Functions.

Never put any server secret in Vite environment variables or static frontend files.

## Question bank
The live Rush requires at least 5 approved questions in each difficulty tier for every run. For a strong launch pool, create and human-review at least 50 approved questions per tier (200 total). AI generation creates **drafts only**; it does not bypass review.

## Final launch test
1. Create player account.
2. Start Rush.
3. Verify question 1 has no correct answer in browser network payload.
4. Submit correct answer and verify next question is issued by server.
5. Let a question expire and verify server marks the session `lost`.
6. Try double-submitting an answer and verify only one answer row exists.
7. Use all three lifelines.
8. Walk away and verify the server status is `walked_away`.
9. Complete a run and verify the leaderboard entry appears.
10. Log in as ordinary player and verify Question Studio actions return 403.
11. Log in as reviewer/admin and verify draft generation and approval work.
12. Temporarily remove Gemini secret and verify Audience/Friend fallback works and Question Studio reports the AI configuration error without exposing a secret.
