# Execution Plan — MindShift

**Purpose:** What comes next and why. Read before starting any new sprint.
**Updated:** After each sprint or major milestone decision.

---

## Current Status (2026-03-29)

**Phase:** Feature-complete pre-launch. Pending Google Play account verification.
**Last shipped:** Sprint CF + fixes (VOLAURA bridge, In-App Review, 192/192 E2E)
**Tests:** 192/192 E2E passing (Playwright), `tsc -b` clean
**Deploy:** Auto-deploys to Vercel on every push to `main`

**Major features live:** TodayPage (smart daily view), MochiChat (AI chat), Google Calendar sync, Telegram integration, server-side push (Sprint CE), first-focus tutorial (Sprint CD), Mochi i18n all 6 locales (Sprint CC), VOLAURA bridge (Sprint CF).

---

## Immediate Queue (ordered by impact)

### 1. SettingsPage decomposition (868 lines — 2× over guardrail)
**Why now:** `src/features/settings/SettingsPage.tsx` at 868 lines is the largest guardrail violation. Hard to maintain, slow to load.
**Effort:** ~2h | **Risk:** Low | **Impact:** Code health, maintainability

Scope:
- Extract `SettingsSections/AudioSection.tsx` (audio presets, volume)
- Extract `SettingsSections/NotificationsSection.tsx` (reminders, push)
- Extract `SettingsSections/IntegrationsSection.tsx` (Calendar, Telegram)
- Main `SettingsPage.tsx` becomes thin orchestrator with section imports
- Target: main file ≤ 400 lines, each section ≤ 250 lines

### 2. useFocusSession decomposition (627 lines — 1.5× over guardrail)
**Why:** `src/features/focus/useFocusSession.ts` at 627 lines. Hook mixes FSM logic, timer, phase detection, session save, energy delta.
**Effort:** ~3h | **Risk:** Medium (core session logic) | **Impact:** Code health

Scope:
- Extract `useSessionTimer.ts` (countdown/countup/surprise timer mechanics)
- Extract `useSessionPhase.ts` (phase detection: struggle/release/flow)
- `useFocusSession.ts` becomes orchestrator calling both hooks + session save

### 3. Sprint CE CEO actions (Push infra activation)
**Why:** Push infra is code-complete but not activated in production.
**CEO actions required:**
1. Supabase Dashboard → Extensions → enable `pg_cron`
2. `supabase db push` for migrations 010 + 011
3. Set VAPID keys in edge function env vars (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CONTACT_EMAIL`)

---

## Pre-Launch Blockers (Google Play)

| Item | Owner | Status |
|------|-------|--------|
| Feature graphic 1024x500 | Yusif (design) | ❌ |
| 8 phone + 4 tablet screenshots | Yusif (capture) | ❌ |
| Google Play account verification | Yusif | ⏳ |
| Android AAB build (Capacitor) | After account | ❌ |
| In-App Review API | Code done (CF) | ✅ |

---

## Post-Launch Roadmap (30-day window)

| Sprint | Feature | Rationale |
|--------|---------|-----------|
| CG | Stripe integration | Monetization. Store has `subscriptionTier`, no payment logic. Restore ProBanner when ready. |
| CH | Home screen widget (Android) | Session start without opening app. High retention value. |
| CI | Picture-in-Picture timer | Focus while using other apps. iOS 15+ / Android support. |
| CJ | More languages (ES, DE) | Growth. ES = largest non-EN ADHD community. |
| CK | Google OAuth activation | Code ready (Sprint AA). Needs Supabase Dashboard config. Lower friction auth. |

---

## VOLAURA Ecosystem Integration

MindShift is part of the VOLAURA ecosystem. The bridge (Sprint CF) is live.

**What the bridge does today:**
- Fires `focus_session_complete` → VOLAURA character XP
- Fires `task_done` → VOLAURA skill credit
- Fires `streak_milestone` → VOLAURA achievement

**What's planned:**
- Show VOLAURA AURA score in MindShift ProgressPage (read-only badge)
- Deep-link from MindShift assessment invite to VOLAURA onboarding
- Shared session → VOLAURA verification (a volunteer focuses on a competency task)

---

## Technical Debt (non-blocking)

| Debt | Location | Priority |
|------|----------|----------|
| `cognitiveMode` dead field in store | `src/store/index.ts` | P3 — only remove when localStorage migration period ends |
| Audio engine AudioWorklet browser support | `useAudioEngine.ts` | P3 — fallback to oscillator already exists |
| `useSessionHistory` → React Query dedup | `src/shared/hooks/useSessionHistory.ts` | ✅ Done (Sprint BC) |
| FocusScreen over 400 lines | `src/features/focus/FocusScreen.tsx` | ✅ Done (Sprint BC) |
| MochiSessionCompanion over 400 lines | `src/features/focus/MochiSessionCompanion.tsx` | ⚠️ Sprint CC will fix |

---

## Decisions Frozen (don't revisit without strong reason)

- Supabase over Firebase — RLS, Postgres, Edge Functions in one
- Zustand over Redux — see `docs/DECISIONS.md`
- Gemini 2.5 Flash over GPT-4o — cost + speed
- No red in palette — Research #8, non-negotiable
- Skip button always visible — ADHD safety, non-negotiable
