# Player Profile, Settings and Audio Update

This is a targeted update to the existing Billion Rush project, not a rebuild.

## Implemented in source
- First-run local player profile with exactly two required fields: display name and country.
- No email, password, or account creation.
- Profile persistence in `billionRush.profile.v4`, with compatibility copies for the existing display-name and country keys.
- Home-screen profile summary and an Edit Profile action.
- Settings screen for display name, country, sound effects, background music, vibration, privacy information, and resetting local statistics.
- Resetting personal statistics does not clear the purchased inventory key or server-side payment records.
- Audio module reads the same persisted preferences as Settings.
- Background music can be stopped or restarted according to the music preference.
- Button, answer, correct/wrong answer, milestone, lifeline, Walk Away, victory and game-over sound cues are wired into the existing audio module.
- Vibration follows the user's preference.
- Score sharing uses the saved display name.
- The existing `VIEW LAST RESULT` action now only reopens a saved loss/results screen; it does not restart an active game.

## Verification performed
- `node --check billion-rush/src/main.js` passed.
- `node --check billion-rush/src/audio.js` passed.
- `npm run test:rules` passed all 8 existing rule tests.
- `npm run verify` passed the project's static integrity checks.

## Not yet verified
- The production Vite build could not be run because dependencies were not installed. An `npm install` attempt timed out in this environment.
- Profile creation, settings persistence, audio playback, and native Android lifecycle behavior have not been exercised in a real browser/device session.
- Android APK build and real-device QA remain required before release.
