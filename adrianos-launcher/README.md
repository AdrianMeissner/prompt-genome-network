# AdrianOS Launcher

Custom Android launcher with AI search, smart profiles, focus mode, gesture system,
quick-actions bar, privacy dashboard, and dynamic wallpapers.

## Install on your phone

1. Go to the **Releases** page of this repo on GitHub.
2. Pick the latest build → tap `adrianos-<n>.apk`.
3. Your phone will prompt "Install from unknown source" — allow it.
4. After install, press the **Home button** → Android asks which launcher to use → pick **AdrianOS**.
5. Grant the permissions when prompted (overlay, usage stats, notifications, location).

## Build locally (optional)

Requires Android Studio Hedgehog (2023.1.1) or newer.

```bash
cd adrianos-launcher
./gradlew assembleDebug
# APK lands in app/build/outputs/apk/debug/app-debug.apk
```

## Architecture

See top-level commit messages and the spec in the repo for feature details.
