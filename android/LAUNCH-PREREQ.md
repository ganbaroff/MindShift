# MindShift Android — Launch Prerequisites (CEO-only steps)

These steps must be completed on CEO's machine before `./gradlew bundleRelease` will succeed.
Terminal-Atlas has completed all build plumbing. These are the human-side credentials.

## Step 1 — Generate release keystore (one-time)

```bash
keytool -genkey -v -keystore android/release.keystore -alias mindshift \
  -keyalg RSA -keysize 2048 -validity 10000
```

When prompted, set a keystore password and key password. Store both in your password manager.

Then set these environment variables (add to your shell profile for persistence):
- `MINDSHIFT_KEYSTORE_PASSWORD` — the keystore password you just set
- `MINDSHIFT_KEY_PASSWORD` — the key password you just set
- `MINDSHIFT_KEYSTORE_PATH` — optional, defaults to `../release.keystore`
- `MINDSHIFT_KEY_ALIAS` — optional, defaults to `mindshift`

The keystore file is gitignored. Never commit it. Back it up separately — losing it means you cannot update the app on Play Store.

## Step 2 — Download google-services.json from Firebase

See `android/app/FIREBASE-SETUP.md` for the full Firebase Console walkthrough.

Short version:
1. Firebase Console → Project Settings → Your Android app → Download `google-services.json`
2. Place at `android/app/google-services.json`
3. File is gitignored

## Step 3 — Set JAVA_HOME (if not already set)

If your machine doesn't have JAVA_HOME pointing to JDK 21:

Windows: Control Panel → System → Advanced System Settings → Environment Variables → New
- Variable: `JAVA_HOME`
- Value: path to your JDK 21 install (e.g. `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot`)

## Step 4 — Verify build

After steps 1-3:
```bash
cd android
./gradlew bundleRelease
```

Expected: BUILD SUCCESSFUL. AAB at `android/app/build/outputs/bundle/release/app-release.aab`.

Then verify permissions:
```bash
aapt dump permissions android/app/build/outputs/bundle/release/app-release.aab
```

Expected: all six permissions present (INTERNET, VIBRATE, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, WAKE_LOCK, SCHEDULE_EXACT_ALARM).
