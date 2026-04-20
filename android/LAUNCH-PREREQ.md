# Android Release — Launch Prerequisites

**Updated:** 2026-04-21 by Atlas (Sonnet 4.6, mega-sprint-122 Track 1)
**Branch audited:** `release/mindshift-v1.0` (post PR #18 merge commit 45c60f7)
**Status at time of writing:** ✅ Build pipeline complete. CEO manual steps define the critical path.

---

## Current state summary

| Component | Status | Notes |
|-----------|--------|-------|
| `signingConfigs.release` in build.gradle | ✅ in release branch | Reads env vars, falls back to `../release.keystore` |
| `android/app/build.gradle` permissions | ✅ in release branch | 6 explicit permissions including POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK |
| `android/app/google-services.json` | ✅ local, untracked | CEO downloaded from Firebase. **Do NOT commit.** |
| `android/release.keystore` | ✅ local, untracked | Alias: mindshift, valid 2026-2053. **Do NOT commit.** |
| `MINDSHIFT_KEYSTORE_PASSWORD` env var | ✅ set | Verified present in shell env |
| `MINDSHIFT_KEY_PASSWORD` env var | ✅ set | Same value as KEYSTORE_PASSWORD |
| `MINDSHIFT_KEY_ALIAS` env var | not set | Defaults to `mindshift` in build.gradle — OK |
| Java version | ✅ JDK 21 | `openjdk version "21.0.10"` |
| Android SDK | ✅ present | `C:\Users\user\AppData\Local\Android\Sdk` |
| `dist/` build output | ✅ 26 files | Capacitor assets synced to `android/app/src/main/assets/public/` |
| Monochrome icon | ✅ in release branch | `drawable/ic_launcher_monochrome.xml` |
| PR #18 | ✅ merged 2026-04-19 | Signing + permissions + monochrome icon |
| PR #19 | 🔲 open, CLEAN | Capybara icon + recaptured screenshots. Merge when ready. |

---

## Steps to produce AAB

Run these in order from the `mindshift/` root directory.

### Step 1 — Confirm env vars (30 seconds)
```powershell
echo $env:MINDSHIFT_KEYSTORE_PASSWORD
echo $env:MINDSHIFT_KEY_PASSWORD
```
Both must print a value. If blank, set them:
```powershell
$env:MINDSHIFT_KEYSTORE_PASSWORD = "your-keystore-password"
$env:MINDSHIFT_KEY_PASSWORD = "your-key-password"
```

### Step 2 — Confirm files are in place (10 seconds)
```powershell
Test-Path android/release.keystore       # must return True
Test-Path android/app/google-services.json  # must return True
```

### Step 3 — Merge PR #19 on GitHub (2 minutes)
Navigate to: https://github.com/ganbaroff/MindShift/pull/19

Click "Merge pull request". This adds the capybara icon to `release/mindshift-v1.0`.

### Step 4 — Pull latest release branch (1 minute)
```bash
git fetch origin
git checkout release/mindshift-v1.0
git pull origin release/mindshift-v1.0
```

### Step 5 — Rebuild web assets (2 minutes)
```bash
pnpm run build
npx cap sync android
```

### Step 6 — Run bundleRelease (5-10 minutes)
```bash
cd android
./gradlew bundleRelease
```

Expected output:
```
BUILD SUCCESSFUL in Xs
```

Output file: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 7 — Upload to Play Console
1. Go to https://play.google.com/console
2. Select MindShift app (or create new app if not exists)
3. Release → Internal testing → Create new release
4. Upload `app-release.aab`
5. Add release notes from `docs/play-store-listing.md` section 4
6. Save and review

---

## Known risks

**Risk 1 — First-time Play Console app creation**
If MindShift does not have a Play Console app entry yet, you must:
- Create app in Play Console with package name `com.mindshift.app`
- Complete the App Content questionnaire (content rating, target audience, data safety)
- Use `docs/play-store-listing.md` for all listing copy

**Risk 2 — google-services.json mismatch**
`google-services.json` must have `package_name: "com.mindshift.app"`. Verified: it does.

**Risk 3 — Signing mismatch on re-upload**
If a previous build with a different keystore was ever uploaded to Play Console, this keystore must match. Keystore: `CN=Yusif Ganbarov, OU=Founder, O=Volaura inc`.

**Risk 4 — Play Console app not created yet**
Based on session history, Play Console submission has not been completed. The entire Play Console app content setup takes ~30 minutes on first submission. Build the AAB first, then start Console setup.

---

## Play Store listing source of truth

All listing copy lives in `docs/play-store-listing.md`. Feature accuracy verified 2026-04-21:
- Focus Rooms — ✅ in code (`src/shared/hooks/useFocusRoom.ts`, Supabase Realtime presence)
- Ambient Orbit — ✅ in code (`src/shared/hooks/useAmbientOrbit.ts`, live count from `focus_sessions`)
- Voice input — ✅ in code (task capture)
- Mochi AI — ✅ in code
- Energy modes — ✅ in code
- Sound presets — ✅ in code

No listing inaccuracies found. All claimed features ship in the build.

---

## What ONLY CEO can do

1. Run `bundleRelease` on their local machine (keystore lives there, not in CI)
2. Submit to Play Console (requires Google account with developer access)
3. Complete Play Console app content questionnaire (requires human review decisions)
4. First-time Internal Testing release (manual approval step in Play Console)

No technical blockers remain on the code side. Ship path is clear.
