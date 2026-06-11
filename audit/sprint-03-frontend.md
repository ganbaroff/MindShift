# Sprint 3 Audit: Frontend Architecture & Performance

This audit reviews frontend build output, PWA installability, AudioWorklet generator mechanisms, Zustand state structure, routing, and timers.

## Executive Summary & Score

* **Sprint Confidence Score**: **84 / 100** (Target: ≥85)
* **Status**: **DEFERRED** (Slightly below target due to uncommitted Lighthouse CI configuration)

---

## Severity Matrix

| Item | Severity | Evidence | Fix Estimate |
|:---|:---|:---|:---|
| **Lighthouse CI & axe-core Unconfigured** | **HIGH** | No `.lighthouserc.json` or axe-core testing scripts exist in the repository to automate budget verification. | 2 hours (to configure + commit) |
| **Zustand DevTools Disabled** | **MEDIUM** | [src/store/index.ts](file:///c:/Projects/mindshift/src/store/index.ts) does not import or wrap the store in `devtools` middleware, blocking standard Redux DevTools debugging. | 15 mins |
| **Circular Static/Dynamic Imports** | **MEDIUM** | Vite build outputs warnings regarding `supabase.ts`, `useTaskSync.ts`, and `volaura-bridge.ts`. Circular static/dynamic paths block module code-splitting. | 1-2 hours |
| **Increased Initial Gzip Size** | **LOW** | Initial page load weight is ~233 kB gzip, which is higher than the baseline 150.69 kB gzip target. | 2-3 hours (optimize splitting) |

---

## Detailed Findings

### 1. Bundle Analysis & Code Splitting (MEDIUM / LOW)
The production bundle was compiled successfully via `npm run build` using **Vite 7.3.2**:
* **Initial Page Load Weight**: **~233.46 kB gzip** (Calculated from: `index` (104.80 kB) + `vendor-supabase` (45.65 kB) + `vendor-motion` (40.53 kB) + `vendor-i18n` (15.62 kB) + `vendor-react` (14.57 kB) + `vendor-ui` (12.29 kB)). This exceeds the baseline target of **150.69 kB gzip**.
* **Vite Code-Splitting Warnings**: During the build, Vite outputs three circular static/dynamic dependency warnings:
  * `supabase.ts` is dynamically imported in store slices but statically imported in `App.tsx` and 30 other files.
  * `useTaskSync.ts` is dynamically imported in `taskSlice.ts` but statically imported in `App.tsx`.
  * `volaura-bridge.ts` is dynamically imported in `taskSlice.ts` but statically imported in `App.tsx` and 4 other files.
  * *Impact*: These circular imports prevent Vite from moving these modules out of the main bundle into separate dynamic chunks, inflating the initial bundle size.
* **Framer Motion Consistency (EXCELLENT)**: The project uses the newer package `"motion": "^12.35.1"` and imports elements consistently from `'motion/react'` across all files. There are **zero** imports from the older `'framer-motion'` package in the source tree, resolving animation library desyncs.

### 2. Zustand State Management (MEDIUM)
The state structure in [src/store/index.ts](file:///c:/Projects/mindshift/src/store/index.ts) was audited:
* **IndexedDB Middleware**: Uses `createJSONStorage(() => idbStorage)` to store state in IndexedDB (via `idb-keyval`), which is significantly more robust than `localStorage` under iOS/Android memory pressure.
* **No DevTools**: The store does not use Zustand's `devtools` middleware, which makes troubleshooting and debugging state changes via browser extensions impossible for a new engineering team.
* **Circular Dependencies Resolved**: The store correctly resolves a circular dependency between `store → taskSlice → notify → haptic → store` by registering a haptics getter (`_registerHapticsGetter`) at bootstrap instead of static imports.

### 3. PWA Manifest & Service Worker (EXCELLENT)
* **Manifest**: [public/manifest.json](file:///c:/Projects/mindshift/public/manifest.json) is fully configured for mobile installability. It includes narrow screenshots (`/screenshots/playstore/`), shortcuts (`Start Focus`, `Quick Start`, `My Tasks`, `My Progress`), and Android adaptive icons (`maskable` purpose).
* **Service Worker**: [src/sw.ts](file:///c:/Projects/mindshift/src/sw.ts) implements:
  * `NetworkFirst` cache strategy for navigation routes.
  * Caching offline page `/offline.html` on SW installation.
  * `CacheFirst` for images and fonts.
  * `NetworkOnly` for Supabase and Anthropic API paths.
  * Safety validations on notification clicks to prevent open-redirect exploits.

### 4. AudioWorklet Noise Generator (EXCELLENT)
* **Safari Mobile Compatibility**: The brown noise processor inside [brown-noise-processor.js](file:///c:/Projects/mindshift/public/audio-worklets/brown-noise-processor.js) is self-contained. It generates pure 1/f² brown noise programmatically using a mathematical leaky integrator (`y[n] = (y[n-1] + 0.02 * white) / 1.02`).
* **Zero Assets**: It has no external file dependencies, meaning it loads instantly and works offline.
* **Fallback Buffer**: `useAudioEngine.ts` implements a fallback generator buffer in case the user's browser (e.g. older mobile Safari versions) does not support AudioWorklet, preventing audio crashes.

### 5. Focus Timer Hooks & Backgrounding (EXCELLENT)
* **Visibility Handler**: [useSessionTimer.ts](file:///c:/Projects/mindshift/src/features/focus/useSessionTimer.ts) listens for `visibilitychange` events. When the tab transitions back to `visible`, it calculates the elapsed and remaining time against high-resolution timestamps:
  ```typescript
  const netElapsedMs = Date.now() - startTimeRef.current - pausedMsRef.current
  const elapsed = Math.floor(netElapsedMs / 1000)
  ```
  This guarantees the timer does not lag or pause when the phone screen is locked or the browser is suspended.
* **Tab Close Guard**: Saves in-progress session data under `'ms_pending_session'` in `localStorage` inside a `beforeunload` event handler so sessions can be restored on reload if the app is accidentally closed.

### 6. Routing & Auth Flow (EXCELLENT)
* **Deferred Login**: Evaluated in [useAuthInit.ts](file:///c:/Projects/mindshift/src/app/useAuthInit.ts). If Supabase auth does not resolve within **2 seconds**, it falls back to a locally generated guest user (`guest_<UUID>`). This permits instant offline loads.
* **Auth Guard**: [AuthGuard.tsx](file:///c:/Projects/mindshift/src/app/AuthGuard.tsx) is a simple pass-through outlet, enabling guests to access all features.

---

## Action Plan to Reach Score 100
1. **Commit Lighthouse CI configuration**: Create and commit a `.lighthouserc.json` file defining performance budgets (>90 for all categories) and configure Lighthouse CI / axe audits in GitHub Actions workflows.
2. **Enable Zustand DevTools**: Wrap the store creation function in `devtools` middleware inside `store/index.ts`.
3. **Resolve Circular Imports**: Refactor the imports of `supabase.ts`, `useTaskSync.ts`, and `volaura-bridge.ts` to remove static-dynamic mixing, allowing proper Vite code-splitting and shrinking initial chunks.
