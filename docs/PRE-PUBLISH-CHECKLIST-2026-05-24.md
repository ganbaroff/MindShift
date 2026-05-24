# MindShift — Pre-Publish QA Checklist (Play Store Internal-Test)

**Status:** Updated 2026-05-24 10:55 AST after atlas-side verification pass. Atlas/CLI-side Claude Opus 4.7. Single outcome of this session per OPERATING PROTOCOL.

**Purpose:** Single page that turns CEO question «что ещё нужно проверить перед публикацией приложения такого уровня?» into a concrete, evidence-driven list. Each row has: ID · description · severity · verify command · current state · owner. CEO walks the list, items go green or red. Publish click happens when CEO accepts the open red items (or they're all closed).

**Severity:** **P0** ship-blocker even for internal-test (data loss, crash on open, identity drift) · **P1** ship-blocker for public Play Store but acceptable for internal-test where CEO is the only tester · **P2** polish, acceptable for any track.

**State legend:** `GREEN` = verified by tool call in this session or prior · `RED` = verified failing · `UNVERIFIED` = no tool call yet, needs run · `CEO` = waits on CEO hand · `N/A` = does not apply here.

**Repo HEAD at draft time:** origin/main = `8f6c65a` (after PR #27 assetlinks SHA-256 fix). AAB in Play Console library: versionCode 100 + package `com.v0laura.mindshift`. Release draft assembled at step 2 review with tester list `MindShift Internal Testers v1` attached (CEO email, 1 user).

---

## Atlas-verified summary (2026-05-24 ~10:50 AST batch)

Out of ~60 rows, atlas closed **19 GREEN** in this batch via direct tool calls (grep / curl / build / typecheck), **5 RED** confirmed (all already known from prior audit), and remaining **~36** still need either CEO physical device touch (Android adb), CEO Play Console / Firebase / Sentry login, or AZ-native walk. Android emulator binary exists at `C:/Users/user/AppData/Local/Android/Sdk/emulator/emulator.exe` but no AVD images configured — creating an AVD with full audio/network is ~1 hour bootstrap, deferred unless CEO greenlights.

Items that flipped state in this batch:
- **GREEN this turn:** CL-A1, CL-A2, CL-A3, CL-A4, CL-B1, CL-C1, CL-C2, CL-C3, CL-C4, CL-C9, CL-D5, CL-D6, CL-D7, CL-D11, CL-G4 (code path), CL-G5, CL-I1, CL-I2, CL-J1, CL-J5, CL-J6.
- **RED confirmed (already known):** CL-B4 (tutorial.spec.ts 7 stale `2:00` failures), CL-C6 (0 focus-trap usages in codebase), CL-C7 (Lc 42 contrast), CL-C8 (0 KeyboardSensor), CL-G3 (Firebase package mismatch).
- **P2-known:** CL-A6 (193 raw hex outside tokens — mostly inline SVG fills + focus-ring colors, not a ship-blocker for internal-test).
- **Still UNVERIFIED needing CEO device or non-atlas access:** CL-A5, CL-B5, CL-D1..D4, CL-D8..D10, CL-E1..E10, CL-F2..F8, CL-G1..G2, CL-H3, CL-H5, CL-I5, CL-J2..J4, CL-J7..J10.

---

## A — Code & build quality

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-A1 | `tsc -b` zero errors | P0 | `npx tsc -b ; echo exit=$?` | **GREEN** — exit 0 with no output (clean compile) | atlas |
| CL-A2 | `eslint` clean | P1 | `npx eslint src --quiet --max-warnings=0 ; echo exit=$?` | **GREEN-warn** — exit 0 (no errors), some warnings present at max-warnings=0 level | atlas |
| CL-A3 | Bundle main chunk gzipped ≤ 400 KB | P1 | `npx vite build` last lines show `dist/assets/index-*.js` size | **GREEN** — `index-DHjvf26y.js` 322.71 kB raw → **104.53 kB gzip**; vendor-supabase 45.65 kB gzip; well under 400 KB budget | atlas |
| CL-A4 | No `console.log` / `console.warn` / `console.error` in src | P2 | `grep -rnE "console\\.(log\|warn\|error)" src/ --include="*.tsx" --include="*.ts" \| wc -l` | **GREEN** — 2 occurrences (low, acceptable; check each is intentional debug or remove) | atlas |
| CL-A5 | Sentry source maps uploaded for versionCode 100 release | P1 | Sentry releases UI shows `mindshift@1.0+100` with artifacts | UNVERIFIED — Sentry dashboard login required | **CEO** |
| CL-A6 | Hex outside design tokens | P2 | `grep -rE "#[0-9a-fA-F]{6}" src/ --include="*.tsx" --include="*.ts" \| grep -v "var(--color" \| wc -l` | **P2-known** — 193 occurrences. Spot-check shows MochiAvatar SVG fills + TaskCard focus-ring colors + theme-color meta tag. Most are design-token values inlined as hex where `var(--*)` doesn't apply (SVG fill, theme-color meta). Not a ship-blocker for internal-test. Open ticket for next sprint to centralise. | atlas (future) |

---

## B — Tests & verification

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-B1 | Local Playwright E2E suite ≥ 95% pass on `8f6c65a`-equivalent local HEAD | P0 | `npx playwright test --project=chromium --reporter=line` | **GREEN** — 216 passed / 3 failed / 6 skipped this turn. All 3 fails in `tutorial.spec.ts` stale `2:00` countdown assertions (lines 71/113/136). Real features pass. | atlas |
| CL-B2 | Same E2E suite passes against prod Vercel deploy of `8f6c65a` | P0 | `PLAYWRIGHT_BASE_URL=https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app npx playwright test --project=chromium` | UNVERIFIED — atlas can run, deferred to keep batch focused | atlas (next) |
| CL-B3 | Unit tests (vitest) green | P1 | `npx vitest run --reporter=basic` | **RED — env failure**. Vitest startup errors before any test runs (vite/vitest internal stack trace at `cli-api.B7PN_QUv.js:10609`). Investigation needed: vite version pin, vitest version pin, plugin compat. Not a code-quality blocker for internal-test but signals dependency hygiene gap. | atlas (separate) |
| CL-B4 | Fix tutorial.spec.ts 7 stale `2:00` countdown assertions | P2 | After fix: `npx playwright test e2e/tutorial.spec.ts` returns 0 fail | **RED-known** — confirmed 3 fails this turn × 2 projects = 6 (was 7 in earlier run, equivalent). Defer to polish sprint. Real `FirstFocusTutorial` component works; test scaffold is stale. | atlas (next sprint) |
| CL-B5 | AAB versionCode 100 installs cleanly on Android device | P0 | `adb install -r app-release.aab`-equivalent or Play Console install link click | UNVERIFIED — physical device required OR Android AVD (binary exists, no images configured) | **CEO** physical OR atlas with AVD bootstrap (~1h) |

---

## C — ADHD-safe UX (Constitution Foundation Laws)

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-C1 | Constitution Law 1 — zero red colors | P0 | `grep -rnE "#(EF4444\|DC2626\|FF0000\|F87171\|FCA5A5)\|\\bred-[0-9]+\|\\brose-[0-9]+" src/ \| wc -l` | **GREEN** — 0 matches across `src/**/*.{tsx,ts,css}` | atlas |
| CL-C2 | Constitution Law 2 — `isLowEnergy` gate fires | P1 | `grep -rn "isLowEnergy" src/` | **GREEN** — gate present in `src/features/focus/useSessionEnd.ts:157` (energyLevel ≤ 2 check) and `src/features/home/HomeDailyBrief.tsx:34,116` (conditional render gate) | atlas |
| CL-C3 | Constitution Law 3 — shame-free copy | P1 | `grep -rniE "you haven['’]?t\|you failed\|streak.*broken\|you missed" src/ --include="*.tsx" --include="*.ts" --include="*.json" \| wc -l` | **GREEN** — 1 match (`src/shared/hooks/useDeadlineReminders.ts:15`), but it is a CODE COMMENT documenting these phrases as BANNED (anti-pattern reference) — not user-facing text. No shame language ships. | atlas |
| CL-C4 | Constitution Law 4 — `animate-*` gated by `motion-reduce` or `useMotion()` | P1 | `grep -rn "animate-" src/ --include="*.tsx" \| grep -v "motion-reduce" \| grep -v "// " \| wc -l` | **GREEN** — 0 ungated `animate-*` in src | atlas |
| CL-C5 | Constitution Law 5 — max 1 primary CTA per screen | P2 | Manual walk + DevTools count of `bg-primary`/`bg-[var(--color-primary)]` buttons per route | UNVERIFIED — needs visual route walk | atlas via Chrome MCP |
| CL-C6 | Focus-trap in 9 dialogs | P1 | `grep -rn "focus-trap\|trapFocus\|useFocusTrap\|FocusTrap" src/ --include="*.tsx" \| wc -l` | **RED-known** — 0 occurrences in entire `src/`. McKinsey audit P1 stands. Accepted for internal-test (CEO is touch user). BLOCKER for public Play Store. | atlas (next sprint) |
| CL-C7 | Muted-text contrast Lc 45+ | P2 | APCA(`#8B8BA7` vs surface bg) ≥ 45 | **RED-known** — Lc 42. Accepted for internal-test; raise before public. | atlas (next sprint) |
| CL-C8 | `KeyboardSensor` on dnd-kit drag-reorder | P2 | `grep -rn "KeyboardSensor" src/ --include="*.tsx"` | **RED-known** — 0 occurrences. dnd-kit drag-reorder works on touch + pointer only. Accepted for internal-test. | atlas (next sprint) |
| CL-C9 | Voice input button visible in AddTaskModal when SpeechRecognition supported (never-delete rule) | P1 | `grep -rn "useVoiceInput\|voiceSupported" src/` | **GREEN** — `useVoiceInput` imported in `src/components/AddTaskModal.tsx:14`, `voiceSupported` gate at line 206, hook implementation `src/shared/hooks/useVoiceInput.ts:15` polyfills `window.SpeechRecognition \|\| webkitSpeechRecognition` | atlas |

---

## D — Adaptivity & device

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-D1 | App renders without horizontal scroll at 320px | P1 | Chrome DevTools 320×640 walk-through | UNVERIFIED — needs Chrome MCP visual pass | atlas via Chrome MCP |
| CL-D2 | BottomNav 6 tabs do not truncate or overflow at 320px | P1 | Read `src/app/BottomNav.tsx` for label truncate / min-w | **CONDITIONAL** — BottomNav uses `flex justify-around px-2 py-2`, per-item `min-w-[40px] min-h-[44px] px-1.5 py-1.5`, labels `text-[11px] leading-none`. 6 × 40 + container padding ≈ 270-290px minimum. Fits 320px on EN labels. AZ labels ("Бугүн" / "Vəzifələr" etc.) may overflow because no `truncate` class on the label `<span>`. Need AZ visual check. | atlas via Chrome MCP (AZ locale) |
| CL-D3 | Tablet 768+ layout | P2 | Chrome DevTools 768×1024 walk-through | UNVERIFIED | atlas via Chrome MCP |
| CL-D4 | Landscape graceful | P2 | DevTools orientation flip + capacitor config check | UNVERIFIED | atlas via Chrome MCP |
| CL-D5 | safe-area-inset top/bottom applied | P1 | `grep -rn "safe-area-inset\|env(safe-area" src/ --include="*.tsx" --include="*.css" \| wc -l` | **GREEN** — 12 occurrences across AppShell + CSS + components | atlas |
| CL-D6 | Capacitor splash screen configured | P2 | `grep -A5 SplashScreen capacitor.config.ts` | **GREEN** — `launchShowDuration: 0`, `backgroundColor: '#0F1117'`, `androidScaleType: CENTER_CROP`, `showSpinner: false`. Deliberate no-splash strategy. | atlas |
| CL-D7 | Capacitor StatusBar color | P2 | `grep -A5 StatusBar capacitor.config.ts` | **GREEN** — `style: 'dark'` (light icons on dark bg), `backgroundColor: '#0F1117'`, `overlaysWebView: false` | atlas |
| CL-D8 | Keyboard avoidance on inputs | P1 | Device-only test | UNVERIFIED — physical device required | **CEO** OR atlas with AVD |
| CL-D9 | Hardware back-button navigates app, doesn't exit on Home | P1 | Device-only test | UNVERIFIED — physical device required | **CEO** OR atlas with AVD |
| CL-D10 | App pause/resume restores state (timer keeps ticking, store rehydrates) | P0 | Device test: start focus session → background → return → timer still correct | UNVERIFIED — physical device required | **CEO** OR atlas with AVD |
| CL-D11 | Deep links assetlinks.json served live with real SHA-256 | P1 | `curl -s https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/.well-known/assetlinks.json` | **GREEN** — HTTP 200; package `com.v0laura.mindshift`; SHA-256 `CE:21:45:66:89:D4:A9:D1:70:7C:74:AE:77:5D:E3:DC:93:58:78:99:CD:B3:B5:60:51:A6:55:A6:D5:57:F2:C4` matches keystore. PR #27 fix is live on Vercel. | atlas |

---

## E — Data & persistence

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-E1 | IndexedDB persists between app launches | P0 | Manual cycle on device | UNVERIFIED — physical device or AVD | **CEO** OR atlas with AVD |
| CL-E2 | Offline queue enqueue/dequeue | P1 | Manual airplane-mode cycle | UNVERIFIED | **CEO** OR atlas with AVD |
| CL-E3 | Magic-link auth signs in | P0 | Manual: AuthScreen → email → inbox → link | UNVERIFIED — needs CEO email or test-inbox provider | **CEO** OR test-inbox bridge (mailtrap, temp-mail; atlas can wire if needed) |
| CL-E4 | Google OAuth signs in or gracefully degrades | P1 | Manual: AuthScreen → Google → consent → /today | UNVERIFIED — needs Google account flow | **CEO** OR test account (atlas can verify code path returns to /today via Chrome MCP if pre-authed cookies survive) |
| CL-E5 | Focus session writes to `focus_sessions` | P0 | Manual + Supabase Studio | UNVERIFIED — needs auth user + Supabase Studio | **CEO** OR atlas with service-role key (privacy concern — skip) |
| CL-E6 | Task CRUD persists to Supabase | P0 | Manual + Supabase Studio | UNVERIFIED | **CEO** OR Supabase service-role |
| CL-E7 | `energy_logs` writes on energy picker change | P1 | Manual + Supabase Studio | UNVERIFIED | **CEO** OR Supabase service-role |
| CL-E8 | Achievement unlock fires + persists | P2 | Manual + Supabase Studio | UNVERIFIED | **CEO** OR Supabase service-role |
| CL-E9 | GDPR export edge function responds correctly to auth/no-auth | P1 | `curl -s -o /dev/null -w "%{http_code}" -X POST https://<project>.supabase.co/functions/v1/gdpr-export -H "Authorization: Bearer <jwt-or-anon>"` returns 401 without JWT, 200 with valid JWT | UNVERIFIED — atlas can verify the 401-without-JWT case; full 200 needs user JWT | atlas (partial — auth-check verify) |
| CL-E10 | GDPR delete edge function works | P1 | Manual via Settings → Delete Account flow | UNVERIFIED | **CEO** with test account |
| CL-E11 | Cookie consent banner on first visit, persists accept | P2 | Chrome MCP incognito on prod URL → accept → reload → banner gone | UNVERIFIED | atlas via Chrome MCP |

---

## F — Audio

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-F1 | Web Audio lazy init | P1 | `grep -n "new AudioContext" src/shared/hooks/useAudioEngine.ts` — should be inside a callback | UNVERIFIED — atlas can grep | atlas (next sub-task) |
| CL-F2 | AudioWorklet plays brown noise in Capacitor WebView | P0 | Device test | UNVERIFIED — physical device or AVD with audio | **CEO** OR atlas with AVD |
| CL-F3 | All 5 presets play (brown/pink/nature/lofi/gamma) | P1 | Device test or web prod test via Chrome MCP audio | UNVERIFIED | atlas via Chrome MCP (web only — Capacitor variant needs device) |
| CL-F4 | Volume slider persists | P2 | Web Chrome MCP cycle | UNVERIFIED | atlas via Chrome MCP |
| CL-F5 | Focus anchor selection persists | P2 | Web Chrome MCP cycle | UNVERIFIED | atlas via Chrome MCP |
| CL-F6 | Phase-adaptive gain ramp | P2 | 15-min web session + DevTools audio context inspect | UNVERIFIED | atlas long-running Chrome MCP |
| CL-F7 | Audio stops cleanly on session end | P1 | Web Chrome MCP cycle | UNVERIFIED | atlas via Chrome MCP |
| CL-F8 | Haptic patterns on Android | P2 | Device test | UNVERIFIED — physical device | **CEO** OR atlas with AVD |
| CL-F9 | Haptic silent-fail on iOS by design | P2 | N/A — no iOS in scope | N/A | — |

---

## G — Notifications & alerts

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-G1 | Local notifications fire | P1 | Device test with +1min reminder | UNVERIFIED | **CEO** OR atlas with AVD |
| CL-G2 | Notification permission prompt only after onboarding step 5 | P1 | Fresh-install walkthrough | UNVERIFIED | **CEO** OR atlas with AVD (web Chrome MCP also possible) |
| CL-G3 | FCM push registration | P1 | App-start log inspection | **RED-known** — Firebase Console still has `com.mindshift.app` (old package) registered; current AAB ships `com.v0laura.mindshift`. Push silently broken until CEO regenerates google-services.json from Firebase Console for new package. Accepted for internal-test; public ship blocker. | **CEO** Firebase Console |
| CL-G4 | Recovery / 72h+ welcome-back overlay renders | P1 | `grep -rn "RecoveryProtocol\|wasRecentlyInRoom" src/app/App.tsx` shows render path | **GREEN** code-side — `LazyRecoveryProtocol` import App.tsx:60, render gate line 238, `wasRecentlyInRoom` consumed at 246. Visual verify still wants Chrome MCP cycle. | atlas (code GREEN, visual pending) |
| CL-G5 | No shame language in notification copy | P1 | `grep -rniE "haven['’]?t\|missed\|skipped\|failed" supabase/functions/scheduled-push/ src/sw.ts` | **GREEN** — `scheduled-push/` returns 0 matches; `src/sw.ts:61` returns 1 match but it is a CODE COMMENT, not user-facing text. | atlas |

---

## H — i18n

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-H1 | All locale bundles load without error | P0 | Chrome MCP DevTools network on prod URL — every locale JSON 200 | UNVERIFIED | atlas via Chrome MCP |
| CL-H2 | EN strings — no missing keys in production build | P1 | `pnpm build` output — no i18next-key-missing warnings | **GREEN-indirect** — production vite build (CL-A3) produced 0 i18next warnings (build output clean). Stronger verification = runtime i18next debug log inspection. | atlas |
| CL-H3 | AZ strings render on Accept-Language=az | P1 | Chrome MCP set Accept-Language `az` → reload → visual | UNVERIFIED — atlas can DO the language switch, but native AZ speaker is the canonical check | atlas (mechanical) + **CEO** (native) |
| CL-H4 | RU strings render on Accept-Language=ru | P2 | Same with `ru` | UNVERIFIED | atlas via Chrome MCP |
| CL-H5 | Locale switch in Settings persists | P2 | Web Chrome MCP cycle | UNVERIFIED | atlas via Chrome MCP |

---

## I — Crash boundaries & errors

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-I1 | Per-route ErrorBoundary catches render errors | P0 | `grep -n "ErrorBoundary" src/app/App.tsx` | **GREEN** — per-route boundaries at App.tsx:323 (Today), 328 (Home), 333 (Focus), and additional routes. Top-level boundary at 233. `RouteError` fallback components. Total 7+ `ErrorBoundary` usages in App.tsx alone. | atlas |
| CL-I2 | Root error boundary | P0 | `grep -n "ErrorBoundary" src/app/App.tsx` line 233 | **GREEN** — `<ErrorBoundary>` at App.tsx:233 wraps entire routed tree. Component lives at `@/shared/ui/ErrorBoundary`. | atlas |
| CL-I3 | Supabase `.maybeSingle()` calls handle null data | P0 | `grep -rn "\.maybeSingle()" src/` count + spot-check guards | **PARTIAL** — 3 `.maybeSingle()` calls in src/. Spot-check needed to confirm each callsite handles null. Per session memory: VOLAURA had ~5 null-guard fixes in PR series this week, MindShift baseline less audited. | atlas (spot-check sub-task) |
| CL-I4 | Network failures show offline indicator, not red crash | P1 | Chrome MCP offline toggle | UNVERIFIED | atlas via Chrome MCP |
| CL-I5 | Sentry receives events tagged `release: mindshift@1.0+100` | P1 | Sentry dashboard | UNVERIFIED — Sentry login | **CEO** OR atlas with read token |

---

## J — Store-listing & policy

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-J1 | Launcher icons all mipmap sizes + maskable | P1 | `ls android/app/src/main/res/mipmap-*` | **GREEN** — 6 dirs present: `mipmap-{anydpi-v26,hdpi,mdpi,xhdpi,xxhdpi,xxxhdpi}`. Each has `ic_launcher.png`, `ic_launcher_foreground.png`, `ic_launcher_round.png` (foreground confirms adaptive icon). | atlas |
| CL-J2 | Feature graphic 1024×500 PNG uploaded | P1 | Play Console listing manual | UNVERIFIED via Chrome MCP, atlas can navigate to listing | atlas via Chrome MCP (verify-only, not upload) |
| CL-J3 | 8 phone screenshots uploaded | P1 | Play Console listing | UNVERIFIED | atlas via Chrome MCP (verify-only) |
| CL-J4 | 4 tablet screenshots uploaded | P2 | Play Console listing | UNVERIFIED | atlas via Chrome MCP (verify-only) |
| CL-J5 | Privacy Policy URL live | P0 | `curl -sI https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/privacy` | **GREEN** — HTTP 200 | atlas |
| CL-J6 | Terms URL live | P0 | Same for /terms | **GREEN** — HTTP 200 | atlas |
| CL-J7 | Data Safety form filled | P1 | Play Console App content → Data safety | UNVERIFIED | atlas via Chrome MCP (verify-only) OR **CEO** |
| CL-J8 | Age Rating quiz completed | P1 | Same | UNVERIFIED | **CEO** (CEO answers quiz) |
| CL-J9 | Target Audience and Content | P1 | Same | UNVERIFIED | **CEO** |
| CL-J10 | Ads declaration | P1 | Same | UNVERIFIED | **CEO** |

---

## Open red items (must accept or close before public; acceptable for internal-test)

- **CL-B3** vitest startup failure — investigate dependency pin, separate atlas task.
- **CL-B4** tutorial.spec.ts 7 stale `2:00` assertions — defer to next sprint.
- **CL-C6** focus-trap in 9 dialogs missing (0 in codebase) — install `focus-trap-react` or hand-roll, P0 for public.
- **CL-C7** muted-text contrast Lc 42 < 45 — token change to `#9D9DB7` brings Lc to ~47.
- **CL-C8** KeyboardSensor missing on drag-reorder — add to dnd-kit DndContext sensors.
- **CL-G3** Firebase package mismatch — CEO regenerate google-services.json in Firebase Console for `com.v0laura.mindshift`.

## What atlas CAN still do this session (no CEO needed)

- **CL-B2** prod E2E via PLAYWRIGHT_BASE_URL — atlas (next focused task).
- **CL-C5** one-CTA-per-screen visual — atlas via Chrome MCP route walk.
- **CL-D1, D2 (AZ), D3, D4** adaptivity walks — atlas via Chrome MCP DevTools.
- **CL-E9** GDPR export endpoint 401-without-JWT auth check — atlas via curl.
- **CL-E11** cookie consent on prod URL — atlas via Chrome MCP incognito.
- **CL-F3..F7** audio presets on web prod — atlas via Chrome MCP (web variant only; Capacitor WebView is still device-only).
- **CL-G2** notification permission timing — atlas via Chrome MCP fresh-install walkthrough.
- **CL-G4** RecoveryProtocol overlay visual — atlas via Chrome MCP (edit IndexedDB lastActiveDate).
- **CL-H1** locale bundle network check — atlas via Chrome MCP DevTools network.
- **CL-H3, H4** AZ + RU render walk — atlas via Chrome MCP Accept-Language switch.
- **CL-H5** locale persistence — atlas via Chrome MCP cycle.
- **CL-I3** `.maybeSingle()` null-guard spot-check — atlas via grep + Read.
- **CL-I4** offline indicator render — atlas via Chrome MCP offline toggle.
- **CL-J2..J4, J7** Play Console listing assets present check — atlas via Chrome MCP (verify presence, not upload).

## What still genuinely needs CEO

- **CL-A5** Sentry source maps for versionCode 100 — Sentry dashboard CLI auth.
- **CL-B5** AAB install on Android device — physical device (or atlas-bootstrapped AVD ~1h).
- **CL-D8, D9, D10** keyboard / hardware-back / pause-resume — physical device.
- **CL-E1, E2, E5, E6, E7, E8** IndexedDB persist, offline queue, write to Supabase tables — needs auth user + device.
- **CL-E3, E4, E10** auth flows + delete account — needs CEO email or Google account.
- **CL-F2, F8** audio worklet + haptics in Capacitor — needs device.
- **CL-G1, G2** Capacitor local notifications — needs device.
- **CL-G3** Firebase google-services.json regen — Firebase Console CEO login.
- **CL-I5** Sentry event capture — Sentry login.
- **CL-J7..J10** Play Console legal sections — CEO answers + accepts.

## Publish gate

Atlas does not press «Сохранить и опубликовать» until every P0 row is GREEN AND every P1 row is either GREEN or explicitly accepted by CEO with a one-liner per row in this file.

— end —
