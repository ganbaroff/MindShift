# Sprint 1 Audit: Infrastructure & Repository Hygiene

This audit covers repository structure, dependencies, lock file integrity, CI/CD workflow configuration, and local build verification.

## Executive Summary & Score

* **Sprint Confidence Score**: **81 / 100** (Target: ≥85)
* **Status**: **HIGH RISK / DEFERRED** (Handoff blocked by committed Supabase Personal Access Token)

---

## Severity Matrix

| Item | Severity | Evidence | Fix Estimate |
|:---|:---|:---|:---|
| **Committed Supabase Access Token** | **HIGH** | `check-secrets.ps1:L1` contains hardcoded token `***REMOVED***`. | < 10 mins (revoke token, remove file/clean git history) |
| **Missing Dependencies in package.json** | **MEDIUM** | `focus-trap-react` and `workbox-*` packages imported in source but not declared in `package.json`. | 30 mins |
| **README.md Missing Core Sections** | **MEDIUM** | Lacks visual stack diagram, Supabase CLI local setup details, and deployment commands. | 1 hour |
| **Stack Version Discrepancies** | **MEDIUM** | Baseline specified React 18 + Vite 5, but `package.json` contains React 19 + Vite 7. | 2 hours (to verify compatibility or downgrade) |
| **Outdated Packages** | **LOW** | 41 packages are outdated (including core `@supabase/supabase-js`, `zustand`, etc.). | 1-2 hours |

---

## Detailed Findings

### 1. README.md & Local Setup (MEDIUM)
The [README.md](file:///c:/Projects/mindshift/README.md) is not a dummy Vite boilerplate, which is a good baseline, but it lacks several critical production handoff requirements:
* **No Stack Diagram**: It contains a simple text-based Markdown table, but no architectural stack diagram detailing the relationships between the client, Zustand store, Supabase auth/realtime, Edge Functions, and the Vercel hosting.
* **Incomplete Local Setup**: It only lists `npm install` and `npm run dev`. It does not document the Supabase CLI commands required to run database migrations locally, test Edge Functions, or start local storage.
* **No Deployment Commands**: It references Vercel auto-deploys, but lacks instructions for manual Vercel deployment or Supabase Edge Functions deployment command lines.
* **No Complete Env Var List**: It references copying `.env.example` to `.env` but does not explain the variables or document their scopes (e.g. which variables are bundled into client code and which must remain server-side).

### 2. package.json & Dependencies (MEDIUM / LOW)
An analysis of [package.json](file:///c:/Projects/mindshift/package.json) using `depcheck` and `npm outdated` revealed:
* **Missing Direct Dependencies**: 
  * `focus-trap-react` is imported in 10 separate files (e.g. `AgentChatSheet.tsx`, `ContextRestore.tsx`, `MochiChat.tsx`) but is not listed in `package.json`. It resolves during local build due to transient installation, which is a risk for fresh environments (`npm ci`).
  * `workbox-core`, `workbox-precaching`, `workbox-routing`, and `workbox-strategies` are imported in the service worker (`src/sw.ts`) but are missing from `package.json`.
* **Stack Discrepancy**: The project uses **Vite 7.3.1** and **React 19.2.0**, deviating from the Vite 5 + React 18 baseline description.
* **Unused Packages**: `depcheck` lists unused dependencies: `@capacitor/android`, `@capacitor/core`, `autoprefixer`, `postcss`, and `tailwindcss` (Tailwind v4 uses Vite integration directly, making postcss config redundant but the package might still be listed).
* **Outdated Dependencies**: Running `npm outdated` shows that 41 packages are outdated, including `@supabase/supabase-js` (current 2.98.0 vs latest 2.107.0) and `zustand` (current 5.0.11 vs latest 5.0.14).

### 3. Lock File & Vercel Integrations (EXCELLENT)
* **Lock File Integrity**: [package-lock.json](file:///c:/Projects/mindshift/package-lock.json) is committed in the repository, and the working tree is clean. Run `git status` reports zero modifications, meaning the lock file is fully in sync.
* **Vercel Project Association**: The project contains a `.vercel/` folder linking to Project ID `prj_v5V4RKFzXLI9TYndOpjyTZsexDX8` and Org ID `team_NEzhIksuRth4RAPXQGI6lz1T` under project name `mind-shift`. Local configuration maps properly to [vercel.json](file:///c:/Projects/mindshift/vercel.json), enabling preview deployments for pull requests.

### 4. Git History & Secrets Scan (HIGH)
* **Squash Merge Policy**: Recent commit messages show PR references (e.g. `#38`, `#37`, `#36`), confirming a clean squash-and-merge workflow.
* **Committed Secrets**: A severe secret leak was identified in [check-secrets.ps1](file:///c:/Projects/mindshift/check-secrets.ps1):
  ```powershell
  $accessToken = '***REMOVED***'
  ```
  This is a Supabase Personal Access Token (`sbp_` format). It allows full programmatic API access to the Supabase projects linked to that account and must be revoked immediately.

### 5. CI/CD Workflow Audit (EXCELLENT)
The CI configuration in [.github/workflows/ci.yml](file:///c:/Projects/mindshift/.github/workflows/ci.yml) was audited:
* **Node & Caching**: Uses `actions/setup-node@v4` with `node-version: 20` and `cache: 'npm'` (excellent practice).
* **Test Suites**: Runs unit tests (`npm test` which executes **227 Vitest unit tests**) and Playwright E2E tests (`npx playwright test --project=chromium`).
* **Artifact Upload**: The workflow properly uploads the Playwright report on failure via `actions/upload-artifact@v4` if tests fail.
* **Bundle Gate**: Contains a custom step that fails the build if any single generated JS chunk exceeds **400 KB** (protecting against bundle bloat).

---

## Action Plan to Reach Score 100
1. **Revoke the Supabase access token** associated with `***REMOVED***` immediately. Delete [check-secrets.ps1](file:///c:/Projects/mindshift/check-secrets.ps1) from the repository and use BFG Repo-Cleaner or `git-filter-repo` to scrub it from git history.
2. **Explicitly add missing dependencies** to `package.json` (specifically `focus-trap-react` and workbox packages).
3. **Enhance README.md** with a Mermaid visual architecture diagram, clear Supabase CLI setup steps for migrations, and environment variable configuration.
