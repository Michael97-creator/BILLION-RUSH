# Billion Rush multi-page build and navigation

This project uses Vite multi-page build entries. Run `npm run build` from this `billion-rush` directory. The production output is `dist/` and must contain:

- `dist/index.html` — authenticated player home (login is required first)
- `dist/login.html` — separate player login/create-account page
- `dist/multiplayer.html` — multiplayer lobby
- `dist/studio.html` — private Question Studio entry

Do not deploy only `dist/index.html`. Deploy the entire contents of `dist/` to the static host. If using Vercel, set the project root to `billion-rush` and output directory to `dist`.

Flow: unauthenticated visit to `/` redirects to `/login.html`; successful login redirects to the requested internal `next` path or `/`; authenticated home shows solo Enter the Rush and Multiplayer buttons. Studio is a separate HTML entry and still enforces role authorization server-side.

Configure `.env.local` in this folder based on `.env.example`, then restart Vite. Never put service-role or Gemini secrets in VITE_ variables.
