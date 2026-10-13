# Deployment

## Solo player
Deploy the `billion-rush/` Vite project to Vercel or Netlify. The solo game runs locally without Supabase credentials.

## Optional AI question generation
1. Apply SQL migrations in numeric order, including `0016_player_question_generation.sql`.
2. Configure Supabase Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` (optionally `GEMINI_MODEL`).
3. Deploy `generate-player-questions` and `generate-player-lifeline`.
4. Set browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vite deployment environment. Never expose a service-role key or Gemini key in frontend settings.

## Version 1 payments
Version 1 is ad-free. The lifeline shop UI is not a live payment system. Before accepting money, connect a supported provider through a trusted backend, verify each transaction server-side, grant items idempotently, persist entitlements, and define a restore-purchases flow. Current intended prices are NGN 700 for +2 uses of one lifeline and NGN 2,000 for +2 uses of all three purchasable lifelines.

Do not take real payments until the provider, backend verification, refunds, and entitlement persistence have been end-to-end tested.
