# Firebase setup for MindShift Android

## One-time setup (CEO)

1. Go to https://console.firebase.google.com/
2. Create project "MindShift" (or use existing if one exists)
3. Add Android app:
   - Package name: `com.mindshift.app`
   - App nickname: MindShift (optional)
   - SHA-1: paste the SHA-1 from `keytool -list -v -keystore release.keystore -alias mindshift`
4. Download the generated `google-services.json`
5. Place at `android/app/google-services.json`
6. Do NOT commit the file — it is in `.gitignore`

## Build verification

After placing the file:

```bash
cd android
./gradlew bundleRelease
```

If the file is missing, release builds fail with a clear error message pointing back to this document.
