# MindShift Project Handover - AI to AI Report

## Project Overview
- **Type:** Hybrid Mobile App (Capacitor + React 19)
- **Domain:** Mental Health / ADHD-safe Tooling
- **Core Stack:** Vite, React 19, Zustand, TanStack Query, Supabase, Tailwind CSS 4.
- **Mobile Foundation:** Capacitor 8.3.0 (Android 15 / SDK 35).

## Actions Taken by Previous AI (Atlas)

### 1. Security & Privacy (Privacy by Design)
- **Action:** Disabled `android:allowBackup` in `AndroidManifest.xml`.
- **Reason:** Prevent sensitive mental health data from being uploaded to unencrypted cloud backups.
- **Implementation:** Added `data_extraction_rules.xml` and `backup_rules.xml` to exclude shared preferences, databases, and files from cloud and device transfers.

### 2. Android Infrastructure Stability
- **Action:** Downgraded `targetSdkVersion` and `compileSdkVersion` from 36 (Preview) to 35 (Stable Android 15).
- **Action:** Removed hardcoded `org.gradle.java.home` from `gradle.properties`.
- **Reason:** SDK 36 is not yet suitable for production; hardcoded paths break builds on different machines/CI.

### 3. Native Layer & UX Synchronization
- **Action:** Added missing permissions to `AndroidManifest.xml`:
    - `VIBRATE` (for Haptics/ADHD feedback)
    - `POST_NOTIFICATIONS` (for Android 13+ Push)
    - `SCHEDULE_EXACT_ALARM` & `RECEIVE_BOOT_COMPLETED` (for reliable reminders).
- **Action:** Created `res/values/colors.xml` with `#0F1117` background.
- **Reason:** Sync native layer with web layer to prevent "white flash" during app startup.

## Critical Findings & Remaining Issues

### 1. Localization Desync
- **Finding:** The React app supports `en, ru, az, tr, de, es`, but the Android native layer (`strings.xml`) is English-only.
- **Impact:** System-level UI (app name under icon, permission dialogs) will not match the user's language.
- **Recommendation:** Implement `res/values-ru/`, `res/values-az/`, etc.

### 2. Missing Notification Assets
- **Finding:** `capacitor.config.ts` references `smallIcon: 'ic_stat_mindshift'`, but this resource does not exist in `res/drawable`.
- **Impact:** Push notifications will show a generic white square.

### 3. Persistence Risk (Supabase)
- **Finding:** Currently uses standard browser storage in WebView.
- **Risk:** WebView storage can be cleared by Android under low memory conditions.
- **Recommendation:** Migrate Supabase session storage to `@capacitor/preferences` or `Capacitor Cookies`.

### 4. PWA vs Native Conflict
- **Finding:** Project contains `sw.ts` (Service Worker) via `vite-plugin-pwa`.
- **Note:** Service workers in Capacitor can cause cache invalidation loops. Ensure `sw` is disabled or handled differently for native builds.

## Technical Debt to Address
- **Sentry:** Currently only handles JS errors. Recommend adding Sentry Android SDK for native crashes.
- **MainActivity:** Remains pure Java. If native bridge logic is needed, consider migrating to Kotlin.
- **Keystore:** `release.keystore` is present in the project tree. **Check if it's in .gitignore; if not, it is a security breach.**

## How to Proceed
1.  **Sync Localizations:** Create native `strings.xml` for all supported languages.
2.  **Generate Notification Icons:** Create `ic_stat_mindshift.png` in various densities.
3.  **Fix Haptics Dependency:** Ensure `@capacitor/haptics` is actually installed in `package.json` (currently missing in deps).
