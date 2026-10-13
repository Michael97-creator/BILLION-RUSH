# Billion Rush V8 production changes

## Player experience
- Start Rush goes directly into Question 1. There is no mode-selection screen.
- Each Rush is a fresh shuffled set of 20 questions: 5 easy, 5 medium, 5 hard, 5 very hard.
- The player sees only the focused question UI, options, timer, lifelines and Walk Away while deciding.
- The prize ladder remains hidden until a correct answer is submitted. Correct answers reveal the ladder and animate the newly reached rung; wrong answers highlight the chosen option red and the correct option green.
- The player-facing app no longer contains a Question Studio or local custom-question creator.

## Question governance
- Approved questions are the only questions eligible for live Rushes.
- Question Studio is a separate private app protected by the `admin` / `reviewer` role.
- AI-generated questions are stored as `draft` records. They are never published automatically.
- Reviewers can approve, request changes, or reject drafts.
- Added `very_hard` as a first-class database difficulty level.

## AI Question Factory
The `generate-questions` Edge Function requires these server-only secrets:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

The browser must never receive the provider key. The function generates drafts, validates the basic structure, skips duplicate candidates, and inserts them as `draft` records. Human review remains mandatory.

## Backend hardening
- `start-rush` now enforces the 5/5/5/5 difficulty mix and refuses to start if the approved bank is short in any tier.
- Question retrieval uses the authoritative `question_sequence` on the session instead of a non-existent client-readable current-question column.
- Lifeline functions use the authoritative current question ID derived from the server session.

## Migration
Apply `supabase/migrations/0012_billion_rush_mixed_difficulty.sql` after the existing migrations.

## Important
A real production launch still requires configuring Supabase, deploying Edge Functions, setting server secrets, creating admin/reviewer accounts, loading and reviewing a sufficiently large approved question bank, and running end-to-end mobile/security tests.
