# MindShift Project Handover — AI-to-AI Blueprint (2026-06-24)

Welcome, incoming agent. This document serves as the absolute source of truth for the MindShift project. It explains the project's real architecture, the history of iterations (including previous stack hallucinations), exact changes made, how to verify them, and outstanding items for release.

---

## 1. Project Context & Stack Grounding

> [!IMPORTANT]
> **Avoid Legacy Hallucinations:** Previous agents hallucinated a stack consisting of Next.js, Clerk, Turso, Prisma, and LemonSqueezy. This was cleared in a "Reality Reset." Do NOT search for or attempt to use these packages.

### The Real Tech Stack:
* **Frontend:** React 19 + TypeScript + Vite (`src/main.tsx`, `vite.config.ts`)
* **State Management:** Zustand v5 + idbStorage (`src/store/index.ts`)
* **Routing:** React Router v7 (`src/app/App.tsx`)
* **Styling:** Tailwind CSS v4 + Vanilla CSS custom variables (`src/index.css`)
* **Backend & Auth:** Supabase Client (`src/shared/lib/supabase.ts`)
* **Edge Functions:** Deno runtime in `supabase/functions/`
* **Mobile Shell:** Capacitor v8.3.0 (`capacitor.config.ts`, `android/` project wrapper)
* **Testing:** Vitest (unit/integration) + Playwright (E2E)

---

## 2. History of Iterations & Path Resets

1. **The Hallucination Phase (Legacy):** Previous agents designed plans assuming a web-centric Next.js app with Clerk authentication.
2. **The Reality Reset (June 2026):** The owner mandated a strict realignment to the real codebase at `C:\Projects\mindshift` which is a hybrid React PWA packaged via Capacitor for mobile deployment.
3. **The Release Audit:** An audit of release readiness identified native gaps:
   * A missing native notification icon referenced in `capacitor.config.ts`, causing blank white square notification issues on Android 13+.
   - Missing native localization folders, leaving launcher titles and system prompts in default English regardless of user locale.
   * Gitignore tracking flaws that kept all Android resources hidden from Git.
4. **The Block Resolution (BATCH-2026-06-24-A & B):** We resolved all gitignore tracking issues and verified the native build configurations.

---

## 3. What Was Done & Why

### A. Notification Icon Asset Creation
* **File:** `android/app/src/main/res/drawable/ic_stat_mindshift.xml`
* **Why:** The configuration `capacitor.config.ts` pointed to `ic_stat_mindshift`. Without this XML vector drawable, the Android OS fell back to displaying a generic white box for incoming push notifications.
* **Detail:** Created a monochrome white vector drawable asset (24dp x 24dp design boundary, concentric circles path) complying with Android notification design criteria.

### B. Native Localizations Implementation
* **Files:** `android/app/src/main/res/values-*/strings.xml` for `ru` (Russian), `az` (Azerbaijani), `tr` (Turkish), `de` (German), and `es` (Spanish).
* **Why:** Allows the native Android layer (launcher title, system permission popups, system app details) to match the translation setup of the React i18n web view.
* **Detail:** Created these resource files. The values for `app_name` and `title_activity_main` are intentionally set to `"MindShift"` across all locales because "MindShift" is a registered brand/trademark name and must remain untranslated.

### C. Gitignore Reconstruction
* **Files:** `.gitignore` (root) and `android/.gitignore`
* **Why:** 
  1. The root `.gitignore` had a blanket `android/` rule. While 56 files had been force-added historically, new native resource files were silently ignored and failed to stage, meaning localizations would never ship to production.
  2. The `android/.gitignore` file had the `release/` output directory commented out, exposing generated build metadata to Git.
* **Fix:**
  - Replaced the blanket `android/` ignore rule in the root `.gitignore` with granular subfolder rules (`android/.idea/`, `android/.gradle/`, `android/app/build/`, etc.). This preserves the standard exclusions while allowing native resource source paths to be tracked by Git.
  - Uncommented `release/` in `android/.gitignore` to ignore release build-type logs and metadata (e.g., `output-metadata.json`).
  - Staged and committed all resources to the `main` branch.

---

## 4. Verification Checkpoints

Run these commands inside the `C:\Projects\mindshift` directory to verify the state of the repository:

1. **Verify Git Tracking:**
   ```bash
   git ls-files android/app/src/main/res/drawable/ic_stat_mindshift.xml android/app/src/main/res/values-ru/strings.xml
   ```
   *Expected Output:* Both paths are returned, confirming they are tracked by Git.

2. **Verify Ignores are Intact:**
   ```bash
   git check-ignore -v android/local.properties android/app/build/ android/app/release/output-metadata.json
   ```
   *Expected Output:* Confirms that local properties, Gradle build caches, and release metadata remain securely ignored.

3. **Verify Code Integrity:**
   ```bash
   npx tsc -b
   npm run test
   ```
   *Expected Output:* 0 TypeScript compilation errors and 227 unit tests passing successfully.

---

## 5. Remaining Steps for Release

1. **Google Play Store Verification:** (Owner-only) Await final verification of the developer account.
2. **Supabase Push Cron Setup:** (Owner-only) `pg_cron` needs to be enabled manually inside the Supabase Dashboard to drive notification schedules.
3. **Native Production Build:** Once verification is complete, execute a production release compilation via Android Studio or the Capacitor CLI to produce the signed `.aab`/`.apk` bundles.
