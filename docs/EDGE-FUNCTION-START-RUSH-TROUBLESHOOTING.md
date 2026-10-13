# Start Rush Edge Function troubleshooting (V18 patch)

The player request now sends both required headers to Supabase Edge Functions:
- `apikey: <Supabase publishable/anon key>`
- `Authorization: Bearer <signed-in user's access token>`

It also displays the HTTP status and function response instead of swallowing the error.

## Required deployment

Confirm `start-rush` is deployed to the same Supabase project whose URL and publishable/anon key are entered in the player sign-in page. In Supabase Dashboard → Edge Functions, confirm `start-rush` exists and is deployed.

Deploy from the project root with Supabase CLI linked to the correct project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy start-rush
npx supabase functions deploy get-question
npx supabase functions deploy submit-answer
npx supabase functions deploy timeout-question
npx supabase functions deploy walk-away
```

Do not paste a service-role key into the frontend. Keep `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets only. The browser uses only the public publishable/anon key.

## Read the exact error

After running the app again and pressing Start Rush, V18 displays the function name, HTTP status, and response text. Common meanings:
- `404`: function not deployed to this project, or wrong project URL.
- `401` / `Unauthorized`: expired/missing user session, invalid JWT, or gateway JWT verification issue. Sign out/in and check the deployed function.
- `403`: gateway/RLS/role policy rejection.
- `409` and “approved question bank”: not enough approved questions in one or more difficulty tiers; approve at least 5 each of easy, medium, hard, very_hard.
- `500` or `400`: inspect Supabase Dashboard → Edge Functions → start-rush → Logs; likely database schema/table/column or server secret issue.
- Browser network/CORS failure: verify project URL exactly and check browser DevTools Network/Console.
