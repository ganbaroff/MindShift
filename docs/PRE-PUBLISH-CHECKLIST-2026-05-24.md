# MindShift — Pre-Publish QA Checklist (Play Store Internal-Test)

**Status:** Draft 2026-05-24 09:30 AST. Atlas/CLI-side instance. Single outcome of one session per OPERATING PROTOCOL.

**Purpose:** Single page that turns CEO question «что ещё нужно проверить перед публикацией приложения такого уровня?» into a concrete, evidence-driven list. Each row has: ID · description · severity · verify command · current state · owner. CEO walks the list, items go green or red. Publish click happens when CEO accepts the open red items (or they're all closed).

**Severity:** **P0** ship-blocker even for internal-test (data loss, crash on open, identity drift) · **P1** ship-blocker for public Play Store but acceptable for internal-test where CEO is the only tester · **P2** polish, acceptable for any track.

**State legend:** `GREEN` = verified by tool call in this session or prior · `RED` = verified failing · `UNVERIFIED` = no tool call yet, needs run · `CEO` = waits on CEO hand · `N/A` = does not apply here.

**Repo HEAD at draft time:** origin/main = `8f6c65a` (after PR #27 assetlinks SHA-256 fix). AAB in Play Console library: versionCode 100 + package `com.v0laura.mindshift`. Release draft assembled at step 2 review with tester list `MindShift Internal Testers v1` attached (CEO email, 1 user).

---

## A — Code & build quality

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-A1 | `tsc -b` zero errors on `8f6c65a` | P0 | `cd C:/Projects/mindshift && pnpm --filter apps/web typecheck` (or root if monorepo flat) | UNVERIFIED | atlas |
| CL-A2 | `eslint` clean | P1 | `cd C:/Projects/mindshift && pnpm lint` | UNVERIFIED | atlas |
| CL-A3 | Bundle main chunk gzipped ≤ 400 KB | P1 | `cd C:/Projects/mindshift && pnpm build && du -sb dist/assets/index-*.js \| awk '{print $1}'` (compare against `vite.config.ts` budget) | UNVERIFIED | atlas |
| CL-A4 | No `console.log` / `console.error` left in production build | P2 | `grep -rn "console\\.\\(log\\|error\\|warn\\)" src/ --include="*.tsx" --include="*.ts" \| wc -l` (compare to baseline) | UNVERIFIED | atlas |
| CL-A5 | Sentry source maps uploaded for versionCode 100 release | P1 | Sentry releases UI shows `mindshift@1.0+100` with artifacts | UNVERIFIED | CEO |
| CL-A6 | No raw hex outside design tokens (palette discipline) | P1 | `grep -rE "#[0-9a-fA-F]{6}" src/ --include="*.tsx" \| grep -v "var(--color" \| wc -l` | UNVERIFIED | atlas |

---

## B — Tests & verification

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-B1 | Local Playwright E2E suite ≥ 95% pass | P0 | `cd C:/Projects/mindshift && npx playwright test --reporter=line` | GREEN — 431/450 pass on `45e9e4a` last run; 7 fails all in `e2e/tutorial.spec.ts` stale countdown assertions, non-blocking | atlas |
| CL-B2 | Same E2E suite passes against production Vercel deploy of `8f6c65a` | P0 | `PLAYWRIGHT_BASE_URL=https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app npx playwright test` | UNVERIFIED | atlas |
| CL-B3 | Unit tests (vitest) green | P1 | `cd C:/Projects/mindshift && npx vitest run` | UNVERIFIED | atlas |
| CL-B4 | Fix tutorial.spec.ts 7 stale `2:00` countdown assertions | P2 | After fix: `npx playwright test e2e/tutorial.spec.ts` returns 0 fail | RED — stale, deferred next sprint | atlas |
| CL-B5 | AAB versionCode 100 installs cleanly on CEO Android device via `adb install` | P0 | `adb install -r mindshift-v1.0-100.apk` (or AAB) returns Success; app opens; onboarding completes | UNVERIFIED | CEO |

---

## C — ADHD-safe UX (Constitution Foundation Laws)

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-C1 | Constitution Law 1 — zero red colors anywhere | P0 | `grep -rnE "#(EF4444\|DC2626\|FF0000)\|red-[0-9]+" src/ --include="*.tsx" --include="*.ts" --include="*.css"` returns 0 | UNVERIFIED | atlas |
| CL-C2 | Constitution Law 2 — energy adaptation fires `isLowEnergy = energyLevel <= 2 \|\| burnoutScore > 60` | P1 | `grep -n "isLowEnergy" src/features/home/HomePage.tsx` returns gate logic + grep for `1 NOW task` rendering | UNVERIFIED | atlas |
| CL-C3 | Constitution Law 3 — shame-free copy, no "haven't"/"failed"/"missed"/"streak broken" in user-facing strings | P1 | `grep -rniE "you haven['’]?t\|you failed\|streak.*broken\|you missed" src/ --include="*.tsx" --include="*.ts" --include="*.json"` returns 0 | UNVERIFIED | atlas |
| CL-C4 | Constitution Law 4 — every `animate-*` class behind `motion-reduce:animate-none` or `useMotion()` gate | P1 | `grep -rn "animate-" src/ --include="*.tsx" \| grep -v "motion-reduce" \| wc -l` returns 0 | UNVERIFIED | atlas |
| CL-C5 | Constitution Law 5 — max 1 primary CTA per screen | P2 | Manual walk on prod URL (Home, Focus, Tasks, Progress, Community, Settings, Onboarding) — count primary buttons each | UNVERIFIED | atlas |
| CL-C6 | Focus-trap in 9 dialogs (McKinsey audit P1) | P1 | `grep -rn "focus-trap\|trapFocus\|useFocusTrap" src/features --include="*.tsx"` count ≥ 9 dialogs; manual Tab+Tab walk in browser | RED — accepted for internal-test (CEO touch user); blocker for public | atlas |
| CL-C7 | Contrast Lc 45+ on muted text token | P2 | APCA on `#8B8BA7` vs surface bg returns Lc ≥ 45 | RED — Lc 42, accepted for internal-test, public must raise | atlas |
| CL-C8 | `KeyboardSensor` enabled in dnd-kit drag-reorder | P2 | `grep -n "KeyboardSensor" src/features/tasks/TasksPage.tsx` | UNVERIFIED, likely RED | atlas |
| CL-C9 | Never-delete: voice input button visible in AddTaskModal when SpeechRecognition supported | P1 | `grep -n "SpeechRecognition\|webkitSpeechRecognition" src/features/tasks/AddTaskModal.tsx` returns positive + voiceSupported gate | UNVERIFIED | atlas |

---

## D — Adaptivity & device

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-D1 | App renders without horizontal scroll at 320px (smallest modern Android) | P1 | DevTools responsive 320×640 walk-through, screenshot per screen | UNVERIFIED | atlas |
| CL-D2 | BottomNav 6 tabs do not truncate or overflow at 320px width | P1 | Manual at 320px, check `Today / Tasks / Focus / Community / Calendar / Settings` labels render | UNVERIFIED, likely RED | atlas |
| CL-D3 | Tablet 768+ layout uses safe-area + sidebar nav (not BottomNav) | P2 | DevTools 768×1024 walk-through | UNVERIFIED | atlas |
| CL-D4 | Landscape: orientation lock OR graceful re-layout | P2 | Capacitor `screenOrientation` setting OR responsive CSS check | UNVERIFIED | atlas |
| CL-D5 | `safe-area-inset-top` + `safe-area-inset-bottom` applied to AppShell | P1 | `grep -n "safe-area-inset\|env(safe-area-inset" src/app/AppShell.tsx src/styles/*.css` | UNVERIFIED | atlas |
| CL-D6 | Capacitor splash screen configured + auto-hide on app ready | P2 | `cat capacitor.config.ts \| grep -A5 SplashScreen` shows config + `SplashScreen.hide()` call in App.tsx mount | UNVERIFIED | atlas |
| CL-D7 | Capacitor StatusBar color matches surface token | P2 | `grep -n "StatusBar" capacitor.config.ts src/shared/lib/native.ts` shows backgroundColor configured + dark style | UNVERIFIED | atlas |
| CL-D8 | Keyboard avoidance: input doesn't overlap with on-screen keyboard | P1 | Manual on Android device | UNVERIFIED | CEO |
| CL-D9 | Hardware back-button: navigates app history, doesn't exit app on Home | P1 | Manual on Android device | UNVERIFIED | CEO |
| CL-D10 | App pause/resume lifecycle: state restores correctly after backgrounding | P0 | Manual on Android device (start focus session, background app, return, timer still ticks) | UNVERIFIED | CEO |
| CL-D11 | Deep links: assetlinks.json served live with real SHA-256 (PR #27 fix) | P1 | `curl -s https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/.well-known/assetlinks.json \| jq` shows `CE:21:45:...` fingerprint not placeholder | UNVERIFIED | atlas |

---

## E — Data & persistence

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-E1 | IndexedDB store persists between app launches (Capacitor WebView) | P0 | Manual: create task → close app → reopen → task still there | UNVERIFIED | CEO |
| CL-E2 | Offline queue: enqueue when offline, dequeue on reconnect | P1 | Manual: airplane mode → create task → reconnect → task syncs to Supabase | UNVERIFIED | CEO |
| CL-E3 | Magic-link auth signs in (or guest mode unblocks app) | P0 | Manual: AuthScreen → enter email → check inbox → click link → arrive on /today | UNVERIFIED | CEO |
| CL-E4 | Google OAuth signs in (or gracefully degrades if disabled) | P1 | Manual: AuthScreen → "Continue with Google" → Google consent → arrive on /today | UNVERIFIED | CEO |
| CL-E5 | Focus session writes to `focus_sessions` table (auth user only) | P0 | After focus session, Supabase Studio shows row with user_id, duration, energy_before/after | UNVERIFIED | CEO |
| CL-E6 | Task CRUD persists to Supabase | P0 | Manual: create task → check Supabase `tasks` table → row exists with same id | UNVERIFIED | CEO |
| CL-E7 | `energy_logs` writes on energy picker change | P1 | Manual: energy picker tap → Supabase `energy_logs` row | UNVERIFIED | CEO |
| CL-E8 | Achievement unlock fires + persists | P2 | Manual: complete 1 task → `first_seed` achievement unlocks → row in `achievements` | UNVERIFIED | CEO |
| CL-E9 | GDPR export edge function returns 200 with user data | P1 | `curl -X POST <fn-url>/gdpr-export -H "Authorization: Bearer <jwt>"` returns 200 + JSON | UNVERIFIED | atlas |
| CL-E10 | GDPR delete edge function returns 200 + actually removes user rows | P1 | Manual via Settings → Delete Account → re-login fails | UNVERIFIED | CEO |
| CL-E11 | Cookie consent banner shows on first visit + accept persists | P2 | First incognito load on prod URL → banner shows → accept → reload → banner does not show | UNVERIFIED | atlas |

---

## F — Audio

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-F1 | Web Audio lazy init (only on first session start) | P1 | `grep -n "new AudioContext\|new (window.AudioContext" src/shared/hooks/useAudioEngine.ts` shows init inside callback not module-level | UNVERIFIED | atlas |
| CL-F2 | AudioWorklet (brown noise) loads inside Capacitor WebView | P0 | Manual on Android: start focus session with brown preset → audio plays | UNVERIFIED | CEO |
| CL-F3 | All 5 presets play (brown / pink / nature / lofi / gamma) | P1 | Manual: Settings → Sound → preview each preset | UNVERIFIED | CEO |
| CL-F4 | Volume slider persists across app launches | P2 | Manual: set volume 50% → close + reopen → volume still 50% | UNVERIFIED | CEO |
| CL-F5 | Focus anchor selection persists + auto-plays next session | P2 | Manual: lock pink as anchor → close → start new session → pink plays | UNVERIFIED | CEO |
| CL-F6 | Phase-adaptive audio: gain 100% → 80% → 60% across struggle/release/flow with 1.5s ramp | P2 | DevTools audio context inspect during 15+ min session, OR manual ear test | UNVERIFIED | CEO |
| CL-F7 | Audio stops cleanly on session end (no leak) | P1 | Manual: end session → audio stops, no orphan playback | UNVERIFIED | CEO |
| CL-F8 | Haptic patterns fire on Android (Web Vibration API) | P2 | Manual on Android: task complete → device vibrates with `done` pattern | UNVERIFIED | CEO |
| CL-F9 | Haptic patterns silently fail on iOS (Capacitor iOS bridge not wired) | P2 | iOS device test if available; otherwise accepted as design | N/A — no iOS in scope | — |

---

## G — Notifications & alerts

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-G1 | Local notifications (scheduled task reminders) work | P1 | Manual: set task reminder for +1 min → wait → notification fires | UNVERIFIED | CEO |
| CL-G2 | Notification permission prompt only after onboarding step 5 (not on first paint) | P1 | Manual: fresh install → no permission prompt until step 5 | UNVERIFIED | CEO |
| CL-G3 | FCM push registration succeeds OR gracefully degrades | P1 | Console log on app start: no fatal error from `firebase/messaging` | RED — google-services.json was patched locally for new package `com.v0laura.mindshift` but Firebase Console still has old `com.mindshift.app` registered. Push silently broken. Acceptable for internal-test; CEO must re-register in Firebase before public ship | CEO |
| CL-G4 | Recovery / 72h+ welcome-back message renders if app last opened >72h ago | P1 | Manual: edit IndexedDB `lastActiveDate` to 4 days ago → reload → RecoveryProtocol overlay shows | UNVERIFIED | atlas |
| CL-G5 | No shame language in any notification copy ("you haven't…") | P1 | `grep -rn "haven['’]?t\|missed\|skipped\|failed" supabase/functions/scheduled-push/ src/sw.ts` returns 0 | UNVERIFIED | atlas |

---

## H — i18n

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-H1 | All locale bundles load without error in dev + prod build | P0 | DevTools network tab on first paint: every locale JSON returns 200 | UNVERIFIED | atlas |
| CL-H2 | EN strings — no missing keys (fallback path empty in production) | P1 | `pnpm --filter apps/web build` shows no i18next-key-missing warnings | UNVERIFIED | atlas |
| CL-H3 | AZ strings render on `navigator.language=az` (no English bleed) | P1 | DevTools → set Accept-Language `az` → reload → all visible copy AZ | UNVERIFIED | CEO native walk |
| CL-H4 | RU strings render on `navigator.language=ru` | P2 | Same as H3 with `ru` | UNVERIFIED | atlas |
| CL-H5 | Locale switch in Settings persists across app launches | P2 | Manual: switch to AZ → close + reopen → still AZ | UNVERIFIED | CEO |

---

## I — Crash boundaries & errors

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-I1 | Per-route ErrorBoundary catches render errors without white screen | P0 | Devtools: throw inside lazy component → ErrorBoundary fallback renders + Sentry captures | UNVERIFIED | atlas |
| CL-I2 | Root error boundary catches React tree crash | P0 | `grep -n "ErrorBoundary\|componentDidCatch" src/app/App.tsx` shows top-level boundary | UNVERIFIED | atlas |
| CL-I3 | All Supabase calls handle null `.data` (no `Cannot read of null`) | P0 | `grep -rn "\\.maybeSingle()\|\\.single()" src/ --include="*.ts" \| wc -l` matched against null-guard count | UNVERIFIED | atlas |
| CL-I4 | Network failures show a calm offline indicator, not red crash overlay | P1 | DevTools offline → trigger Supabase write → AppShell gold offline bar shows, no red | UNVERIFIED | atlas |
| CL-I5 | Sentry receives events tagged with `release: mindshift@1.0+100` | P1 | Throw test error → Sentry dashboard shows event within 1 min | UNVERIFIED | CEO |

---

## J — Store-listing & policy

| ID | Item | Severity | Verify | State | Owner |
|---|---|---|---|---|---|
| CL-J1 | App label "MindShift" + maskable launcher icon | P1 | Manifest, Capacitor android `res/mipmap-*` paths show 48/72/96/144/192/512 icons + maskable | UNVERIFIED | atlas |
| CL-J2 | Feature graphic 1024×500 PNG uploaded to listing | P1 | Play Console listing → Main store listing → feature graphic shows | UNVERIFIED | CEO |
| CL-J3 | 8 phone screenshots uploaded (16:9 or per Play spec) | P1 | Play Console → screenshots → 8 phone | UNVERIFIED | CEO |
| CL-J4 | 4 tablet screenshots uploaded | P2 | Play Console → screenshots → 4 tablet (7" or 10") | UNVERIFIED | CEO |
| CL-J5 | Privacy Policy URL live and reachable | P0 | `curl -sI https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app/privacy` returns 200 | UNVERIFIED | atlas |
| CL-J6 | Terms URL live and reachable | P0 | Same for /terms | UNVERIFIED | atlas |
| CL-J7 | Data Safety form filled (Play Console "App content → Data safety") | P1 | Play Console section shows green checkmark | UNVERIFIED | CEO |
| CL-J8 | Age Rating quiz completed | P1 | Play Console section shows green | UNVERIFIED | CEO |
| CL-J9 | Target Audience and Content set | P1 | Same | UNVERIFIED | CEO |
| CL-J10 | Ads declaration: "No, my app does not contain ads" | P1 | Same | UNVERIFIED | CEO |

---

## Open red items summary

- `CL-B4` tutorial.spec.ts 7 stale `2:00` assertions — defer next sprint.
- `CL-C6` focus-trap missing in 9 dialogs — accepted internal-test, blocker public.
- `CL-C7` muted-text contrast Lc 42 — accepted internal-test, raise for public.
- `CL-C8` KeyboardSensor missing on drag-reorder — accepted internal-test.
- `CL-D2` BottomNav 6 tabs may truncate at 320px — verify, then accept or fix.
- `CL-G3` FCM push broken due to Firebase Console package mismatch — accepted internal-test, CEO must re-register Firebase before public.

## Owner totals

- **atlas executable now (mostly grep + curl):** CL-A1..A6, CL-B1..B4, CL-C1..C9, CL-D1..D7 + D11, CL-E9 + E11, CL-F1, CL-G4 + G5, CL-H1..H4, CL-I1..I4, CL-J5..J6.
- **CEO hand required (Android device, Firebase, Play Console, Sentry):** CL-A5, CL-B5, CL-D8..D10, CL-E1..E8 + E10, CL-F2..F8, CL-G1..G3, CL-H3 + H5, CL-I5, CL-J1..J4 + J7..J10.

## Publish gate

Atlas does not press «Сохранить и опубликовать» until every P0 row is GREEN AND every P1 row is either GREEN or explicitly accepted by CEO with a one-liner per row in this file.

— end —
