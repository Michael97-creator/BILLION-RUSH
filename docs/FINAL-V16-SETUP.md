# Billion Rush V16 final setup

## 1. Player frontend
Inside `billion-rush`, copy `.env.example` to `.env.local` and put only:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY (or publishable key)

Restart Vite after changing `.env.local`.

## 2. Supabase
Apply all migrations, including `0015_multiplayer_production.sql`.
Deploy all functions under `supabase/functions`.
Keep `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` only in Supabase Edge Function secrets.

## 3. Multiplayer
- Quick Match finds/creates a 1v1 room.
- Private Room creates a 6-character code.
- Join With Code joins a waiting room.
- Both players must Ready Up.
- Host starts the match.
- The server selects 20 approved questions (5 per difficulty when enough are available).
- The server controls the 30-second deadline.
- Answers are locked server-side and revealed only after both players answer or time expires.
- Scores are calculated from server-side answers.
- After question 20, the result screen compares both players.

## 4. Question Studio
`/studio.html` is separate from the player home. It requires an authenticated profile with role `admin` or `reviewer`.
