# Online score sharing

Billion Rush sharing uses the native Android share sheet to attach the generated score-card PNG and include the invitation text. On the website, supported browsers can share the image directly; other browsers show WhatsApp, Facebook, Telegram, copy-invitation, and download-image actions.

## Required before APK release

1. Deploy the complete `billion-rush/` website to a public HTTPS domain. The deployed site must include `index.html`, `result.html`, `share-preview.png`, and the built assets.
2. Set `VITE_PUBLIC_APP_URL` to that exact public website origin (for example, `https://play.example.com`, without a trailing slash) before building the Android app. Do not leave the example placeholder.
3. Rebuild and sync the Android project so APK score links point to the public website rather than `https://localhost`.
4. Test on an Android phone: finish a Rush, tap **Share My Score**, select WhatsApp, and confirm the PNG card is attached with invitation text and a working online link. Repeat with Facebook and Telegram where available.

The result page includes a generic Open Graph/Twitter preview image for social platforms that generate link previews. Some platforms do not render a custom preview immediately and may cache old previews. The actual player score card is attached as an image through the native Android share sheet.

## Important

Do not publish a fake URL or use the Capacitor app origin (`https://localhost`) in public shares. A working online link requires a deployed website. Score links using the portable payload are player-shared results, not verified leaderboard records.
