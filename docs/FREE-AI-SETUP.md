# Billion Rush — Free AI setup

Billion Rush uses Google Gemini's free API tier for AI Question Studio, AI Audience and AI Call a Friend. OpenAI is not required.

## 1. Create a Gemini API key
Use Google AI Studio and create an API key. Do not put this key in the browser or in VITE_ variables.

## 2. Add the Supabase Edge Function secrets
In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

- `GEMINI_API_KEY` = your Gemini API key
- `GEMINI_MODEL` = `gemini-2.5-flash-lite`

The default model is already `gemini-2.5-flash-lite`, so the second secret is optional.

## 3. Deploy the functions
From the project root:

```bash
supabase functions deploy generate-questions
supabase functions deploy ask-audience
supabase functions deploy call-friend
```

If your Supabase CLI uses a project link, make sure the project is linked first.

## 4. Important billing rule
Do not enable a paid Gemini billing plan while testing if you want to stay on the free tier. Free-tier requests are limited by Google's current quotas. When the free quota is exhausted, the AI request should fail rather than silently becoming an OpenAI charge.

Billion Rush also has fallback audience/friend behavior, so a temporary AI quota error does not destroy the game.

## 5. Production note
The free tier is for development/testing and has usage/data terms and quotas. Before a large commercial launch, review Google's current Gemini terms and pricing and move to a paid production setup if required.
