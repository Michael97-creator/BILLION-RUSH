# Capacitor setup on Windows

This repository already has a Capacitor configuration. It uses `capacitor.config.json` to avoid TypeScript config parsing errors.

## First-time setup

1. Install a current Node.js LTS release and Android Studio.
2. Open PowerShell or the VS Code terminal in this repository root (the folder containing this file's parent `package.json`).
3. Run `npm install` once. The root npm workspace installs the root Capacitor tools and the Vite web-app dependencies together.
4. Run `npm run build`. The web build should be created at `billion-rush/dist`, matching `webDir` in `capacitor.config.json`.
5. If an `android` folder does not exist yet, run `npm run android:add` exactly once.
6. Run `npm run android:sync`.
7. Run `npm run android:open` to open the project in Android Studio.
8. Once Android Studio has downloaded/configured the Android SDK and Gradle components, run `npm run android:build:debug:windows` to create a debug APK.

## Important

- Do not run `npx cap cap init`; that is not the correct command.
- `npx cap init` is only for initializing a project that has no Capacitor configuration. This project is already initialized, so do not run it again.
- Do not run commands from inside `billion-rush/`; run them from the repository root.
- If `npm install` fails, resolve the npm/network error before running Capacitor commands.
- A debug APK is for testing. Test on a real Android phone before preparing a release APK.
