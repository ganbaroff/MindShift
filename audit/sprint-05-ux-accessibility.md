# Sprint 5 — UX, Accessibility & «Vibration»

**Auditor:** Antigravity AI  
**Date:** 2026-06-06  
**Files examined:** `OnboardingPage.tsx`, `FocusScreen.tsx`, `PostSessionFlow.tsx`, `RecoveryLock.tsx`, `BreathworkRitual.tsx`, `MochiSessionCompanion.tsx`, `haptic.ts`, `crisisDetection.ts`, `en.json`, `useMotion`, ARIA grep across `src/`

---

## 5.1 ADHD Clinical UX Patterns

### Shame-Free Design

| Pattern | Implementation | Rating |
|---------|---------------|--------|
| Non-punitive recovery lock | Bypass always visible (`keepGoingBypass`), no countdown language | ✅ PASS |
| Non-alarming crisis styling | Warm teal palette — no red/alarming colors | ✅ PASS |
| No negative haptic patterns | `hapticError` is intentionally lighter than OS error patterns; comment justifies ADHD-safe choice | ✅ PASS |
| Hyperfocus bypass always accessible | `FocusHardStop` has `onKeepGoing` | ✅ PASS |
| Post-session crystal removal from vulnerability window | Crystal shop deliberately excluded from `PostSessionFlow` (comment: `Research #10`) | ✅ PASS |

### Energy-Aware Routing

`getSmartDuration(energyLevel)` maps: `≤2 → 5 min`, `3 → 25 min`, `≥4 → 52 min`. Applied on session setup.

**Finding:** The 5-minute ultra-short session for `energyLevel ≤ 2` is the correct ADHD-safe default. ✅

### Emotional Reactivity Adaptive Tone

`PostSessionFlow` → `getClosingMessageKey()` branches across `high`/`steady`/`moderate` + session length + phase. `MochiSessionCompanion` applies `effectiveTone = 'neutral'` when `emotionalReactivity === 'high' && sessionPhase === 'struggle'` — prevents shame amplification.

**Onboarding revisit mode (O-11):** Detects `onboardingCompleted` at mount → pre-fills prior selections from store → navigates back on finish (not to `/`). Functionally correct.

---

## 5.2 Accessibility Audit

### ARIA Coverage Grep Results

Searched `src/**/*.tsx` for `aria-label`, `aria-live`, `role=`:

| Component | Coverage |
|-----------|---------|
| `PostSessionFlow` (NatureBuffer timer) | `role="timer"`, `aria-live="polite"`, `aria-atomic="true"`, `aria-label` with minutes/seconds — WCAG 2.1 AA |
| `RecoveryLock` (recovery timer) | Same `role="timer"` pattern — WCAG compliant |
| `BreathworkRitual` (progress bar) | `role="progressbar"`, `aria-valuenow/min/max`, `aria-label` |
| `MochiSessionCompanion` | `sr-only` live region announces bubbles via `aria-live="polite" aria-atomic="true"` |
| `MochiChat` | `role="dialog"`, `aria-label`, `aria-modal="true"`, `FocusTrap` active |
| `AddTaskModal` | `role="dialog"`, `aria-labelledby`, close button labeled |
| `AgentChatSheet` | `role="log"`, `aria-live="polite"`, `role="alert"` for errors |
| `BottomNav` | `aria-label` on every nav link |
| Onboarding option cards | `aria-pressed` on selected cards |
| Energy picker | `aria-label` per option with `(selected)` suffix |
| Task completion button | `aria-label` with title + done state |

**Finding (MEDIUM):** `OnboardingPage.tsx` step indicator dots (lines 342–356) are animated `motion.div` elements with no `aria-label` or `role`. A screen reader cannot infer progress from these decorative dots. The separate step counter (`aria-live="polite"`) at line 258 compensates — but the dots themselves should be `aria-hidden="true"`.

**Finding (LOW):** `BreathworkRitual` breathing orb (the animated circle, lines 151–177) has no `aria-hidden="true"`. It is a decorative animation and should be explicitly hidden from the accessibility tree to avoid confusing AT users.

**Finding (LOW):** `MochiChat` fallback text on line 199 (`"I couldn't quite get that thought together..."`) is hardcoded English, not i18n-keyed. This is the error fallback — low impact but inconsistent with full i18n commitment.

### Keyboard Navigation

- All interactive elements: `focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]` consistently applied.
- `FocusTrap` applied in `MochiChat` — prevents focus escape from dialog.
- Back button in `OnboardingPage` (line 255) uses plain `<button>` — keyboard accessible.
- `BreathworkRitual` skip button: `focus-visible:ring-2` present.

**Finding (LOW):** `BreathworkRitual` inner phase label (lines 182–195) transitions with `AnimatePresence`. During the animation, AT may announce stale content. The `aria-live` region is absent here — the `shouldAnimate` short-circuit on reduced motion mitigates this for most users.

### Reduced-Motion Compliance

All animated components import and call `useMotion()` → `shouldAnimate`. `BreathworkRitual` does a hard skip to `onComplete` after 400 ms when `!shouldAnimate` (line 59–61). Verified throughout codebase: `initial={shouldAnimate ? ... : false}` pattern is consistent.

---

## 5.3 Haptic «Vibration» System Audit

### Architecture

`haptic.ts` uses a **getter injection pattern** to avoid circular dependency (`store → taskSlice → notify → haptic → store`). Store registers itself via `_registerHapticsGetter()`. All functions are wrapped in `try/catch` — fail silently.

### Pattern Correctness (ADHD-Safe)

| Pattern | Duration | LRA Compliance | Use |
|---------|----------|---------------|-----|
| `hapticTap` | 10 ms | ✅ Minimum | Button press |
| `hapticDone` | [15, 50, 25] ms | ✅ 50 ms gap | Task complete |
| `hapticWow` | [25, 60, 25, 70, 80] ms | ✅ ≥60 ms gaps | Achievement |
| `hapticWarning` | [20, 40, 20, 40, 20] ms | ⚠️ 40 ms gaps | Warning |
| `hapticPhase` | [8, 60, 8] ms | ✅ 60 ms gap | Phase transition |
| `hapticStart` | [30, 100, 20] ms | ✅ 100 ms gap | Session start |
| `hapticEnd` | [18, 60, 18, 60, 60] ms | ✅ ≥60 ms gaps | Session end |
| `hapticBreathe` | 15 ms | ✅ Single pulse | Breathwork sync |
| `hapticPark` | [8, 50, 8] ms | ✅ 50 ms gap | Park thought |
| `hapticAdd` | [8, 50, 12] ms | ✅ 50 ms gap | Add task |
| `hapticError` | [10, 20, 10] ms | ⚠️ 20 ms gap | Soft error |

**Finding (LOW):** `hapticWarning` (40 ms gaps) and `hapticError` (20 ms gap) fall below the LRA decay threshold mentioned in the code's own comments (≥50 ms). The comment on `hapticDone` explicitly states "LRA actuator needs ≥50ms to decay." These sub-threshold patterns may fuse into a single buzz on LRA actuators, which is noted elsewhere as "unpleasant for ADHD." Since these are rare events (warning/error), impact is low.

### Breathwork Haptic Sync

`BreathworkRitual` calls `hapticBreathe()` on both inhale and exhale phase starts. AudioContext cue (`playInhaleCue`/`playExhaleCue`) is called in parallel. Pattern is correct — multimodal (haptic + audio + visual) reinforcement.

### iOS Note

`haptic.ts` comment correctly documents: `navigator.vibrate()` silently does nothing on iOS/WebKit. Settings UI (`AppearanceSection`) uses `hapticFeedbackHint` with "(Android only)." All locales carry this annotation. ✅

---

## 5.4 Voice Hints & Micro-copy Tone Audit

### i18n Completeness

6 locale files: `en`, `ru`, `az`, `de`, `es`, `tr`. All carry `hapticFeedback` and `hapticFeedbackHint` keys. Verified via grep.

**Finding (MEDIUM):** `PHASE_LABELS` in `useFocusSession.ts` (lines 50–55) are **hardcoded English strings**:
```ts
struggle: 'Getting into it... 💪',
release:  'Finding your flow... 🌊',
flow:     'Deep flow 🌊',
recovery: 'Rest time. You did it! 🌟',
```
These labels are rendered on the active session screen for all users (`FocusScreen.tsx` line 207). Non-English users will see English phase labels during their focus session — the most-used screen in the product.

**Finding (LOW):** Welcome messages in `MochiChat.tsx` (lines 91–99) — `FIRST_TIME_GREETS` and `RETURN_GREETS` arrays — are hardcoded English strings, not i18n-keyed. These are rendered in a UI that supports 6 locales.

### UiTone System

`MochiSessionCompanion` reads `uiTone` from store → routes message pool: `gen_z`, `millennial`, `gen_x`, or `neutral`. Fallback chain: tone-specific → psychotype-specific → neutral pool. Correct implementation.

---

## 5.5 Crisis Detection Safety Net

`crisisDetection.ts` implements:
- EN + RU keyword lists (9 EN, 8 RU phrases)
- `normalizeForDetection()`: NFKD, Cyrillic homoglyphs, leet-speak digits, punctuation collapse
- Dual-path matching: raw lowercase AND normalized (prevents normalization false negatives for genuine Cyrillic)
- On match: **does not send to AI**, shows warm-tone crisis resources + locale-aware hotlines
- No alarming colors — teal styling per design spec

**Finding (LOW):** `crisisDetection.ts` covers EN and RU keywords. Turkish (`tr`), German (`de`), Spanish (`es`), and Azerbaijani (`az`) crisis keywords are absent. If a user types a crisis phrase in their native language, it will not be detected. This is a known gap — `crisisHotlines.ts` has locale-aware numbers but the keyword detection is EN/RU only.

**Finding (LOW):** `detectCrisis` import is at the bottom of `crisisDetection.ts` (line 76 — `import { countryFromLocale... }` after the export). This is a "reverse import" style that may confuse tools that require imports at the top. Not a runtime issue in ESM but non-standard.

---

## 5.6 Summary of Findings

| ID | Severity | Description |
|----|----------|-------------|
| S5-01 | **MEDIUM** | `PHASE_LABELS` in `useFocusSession.ts` are hardcoded English — visible on session screen for all locales |
| S5-02 | **MEDIUM** | Onboarding step-indicator dots lack `aria-hidden="true"` — decorative elements exposed to AT |
| S5-03 | **LOW** | MochiChat welcome/return greet arrays are hardcoded English, not i18n-keyed |
| S5-04 | **LOW** | `hapticWarning` (40 ms) and `hapticError` (20 ms) gaps below LRA decay threshold in own spec |
| S5-05 | **LOW** | BreathworkRitual breathing orb animation lacks `aria-hidden="true"` |
| S5-06 | **LOW** | Crisis keyword detection covers EN/RU only — 4 supported locales not covered |
| S5-07 | **LOW** | MochiChat error fallback message (line 199) is hardcoded English |
| S5-08 | **LOW** | `crisisDetection.ts` import order non-standard (import mid-file after export) |

### Sprint 5 Verdict: **PASS WITH ADVISORY**

The ADHD clinical design patterns are the strongest aspect of this codebase — shame-free recovery, energy-aware routing, emotional reactivity tone adaptation, and the haptic engine are all production-grade. Accessibility coverage across dialogs, timers, and live regions is excellent for a mobile PWA. The i18n gaps (hardcoded phase labels, Mochi greetings) are the main addressable items before handover.
