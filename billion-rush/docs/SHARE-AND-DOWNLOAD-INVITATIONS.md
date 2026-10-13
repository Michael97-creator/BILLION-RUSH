# Billion Rush score sharing and download invitations

The intended invitation is **download the Android game, install it, and challenge your friend's score**. It must not tell invited friends to play the game in a browser.

- The in-game share action shares the score-card image and invitation text.
- The invitation URL points to `/download.html`, with the shared score encoded in the URL so the download page can show the friend's result.
- The download page must be deployed on the public Billion Rush website.
- Before launch, set `window.BILLION_RUSH_APK_URL` in `public/download-config.js` to the final HTTPS URL for the tested APK. Until then, the page intentionally does not show a fake or non-working download button.
- Configure `VITE_PUBLIC_APP_URL` to the deployed website URL before building the Android app. Do not use localhost URLs in a release build.
- The APK URL and website URL must be public and accessible from another phone for online invitations to work.
