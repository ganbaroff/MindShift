# MindShift — UX Dead-Ends & Broken Promises Audit

**Date:** 2026-03-13
**Auditor:** Claude (automated code audit of entire `src/` directory)
**Scope:** Every screen, button, store value, and user-facing flow

---

## Methodology

Three parallel deep-dives across every file in `src/features/`, `src/store/`, `src/app/`, and `src/types/`. Each button click traced to its handler; each store value traced from write → read → render. If a value is written but never read, or a button exists with no downstream effect, it's listed below.

---

## TIER 1 — CRITICAL: Broken Promises to the User

These are things the user **interacts with and expects a result**, but gets nothing.

### C-1. Completed tasks vanish forever
- **What user sees:** Completes a task → confetti → 4s undo toast → task disappears
- **Reality:** Task stays in `nowPool`/`nextPool` with `status: 'completed'` but is filtered out by `t.status === 'active'` everywhere. No "Done" tab, no history, no archive screen. `completedTotal` counter increments but individual tasks are invisible.
- **User feels:** "Where did my task go? Did I actually do it?"
- **Files:** `TaskCard.tsx` (completeTask), `TasksScreen.tsx:95-97` (active-only filter)
- **Fix:** Add collapsible "Done recently" section to TasksScreen showing last 7 days of completed tasks. Prune completed tasks older than 30 days on store hydration.

### C-2. AppMode selection (screenshot) does nothing after onboarding
- **What user sees:** "One thing at a time" / "Build daily habits" / "Manage everything" picker on first launch + in Settings
- **Reality:** Sets `appMode` in store. Changes greeting subtitle ("One task at a time" / "Build your routine" / "Everything visible") and seeds sample tasks on first run. **After that, zero behavioral difference.** Changing appMode in Settings doesn't reconfigure pools, limits, visibility, or anything.
- **User feels:** "I picked 'Manage everything' but it looks exactly the same as 'One thing at a time'"
- **Files:** `HomeScreen.tsx:251-254` (greeting only), `OnboardingFlow.tsx:445` (seed tasks only), `SettingsScreen.tsx:305-330` (UI, no logic)
- **Fix:** AppMode must drive: pool visibility (focused = NOW only on home; system = all pools), widget defaults, task limits. Or remove the choice entirely.

### C-3. cognitiveMode "See everything" doesn't show everything
- **What user sees:** Settings → "One at a time" (focused) vs "See everything" (overview)
- **Reality:** Only affects `NowPoolWidget` (shows 1 task vs 3). "See everything" does NOT show NEXT or SOMEDAY pools on HomeScreen. The name is a lie.
- **User feels:** "I chose 'See everything' but I still only see NOW pool"
- **Files:** `NowPoolWidget.tsx:18-20` (only consumer), `SettingsScreen.tsx:339-356`
- **Fix:** Overview mode should show NEXT pool on HomeScreen, or at minimum show all 3 NOW tasks + a link to NEXT.

### C-4. psychotype is derived once, then ignored forever
- **What user sees:** Nothing — psychotype is auto-derived from appMode + cognitiveMode during onboarding
- **Reality:** Drives initial widget layout via `WIDGET_DEFAULTS[psychotype]`. After that, never read again. Changing appMode in Settings re-derives psychotype but doesn't call `resetGridToDefaults()`.
- **User feels:** (No direct impact, but the architecture is a dead branch)
- **Files:** `store/index.ts:168-175` (derivation), `store/index.ts:395-399` (only usage: init)
- **Fix:** Either make psychotype drive ongoing UX (tone, suggestions, widget priorities) or remove it.

### C-5. subscriptionTier / Pro Trial gates zero features
- **What user sees:** "Start 30-day free trial" button in Settings → trial countdown appears
- **Reality:** `isProActive()` exists but is **never checked anywhere**. Free users have full access to all AI features, decompose-task, weekly-insight, everything.
- **User feels:** "Why would I ever pay?"
- **Files:** `store/index.ts:410-423` (isProActive logic), `SettingsScreen.tsx:183-279` (UI only)
- **Fix:** Either gate AI features behind Pro or remove the trial UI entirely until Stripe is ready.

### C-6. energy_after is collected post-session but never displayed or analyzed
- **What user sees:** After focus session → NatureBuffer → "How do you feel?" → picks emoji
- **Reality:** Saved to `focus_sessions.energy_after` in DB. Never read, displayed, charted, or used for any recommendation. User provides data into a void.
- **User feels:** "Why do you keep asking how I feel if you never use it?"
- **Files:** `useFocusSession.ts:466-477` (write), nowhere (read)
- **Fix:** Show energy trends on ProgressScreen. Use energy_before vs energy_after delta to recommend session lengths.

---

## TIER 2 — HIGH: Data Collected But Never Used

User explicitly provides information that goes nowhere.

### H-1. sleepQuality — asked but ignored
- **Where:** Settings → Health & Rhythms → "How did you sleep?" (Rough/Okay/Well)
- **Stored:** Zustand session-only (not persisted, lost on reload)
- **Used by:** Nothing
- **Fix:** Either persist and use for energy predictions / session recommendations, or remove the question.

### H-2. chronotype — asked but ignored
- **Where:** Settings → Health & Rhythms → Early bird / Varies / Night owl
- **Stored:** Persisted to localStorage
- **Used by:** Nothing
- **Fix:** Use for peak-window focus suggestions (e.g., "You're a night owl — your best focus window is 8pm-11pm") or remove.

### H-3. medicationTime — asked but ignored
- **Where:** Settings → Health & Rhythms → Medication timing (morning/afternoon/evening)
- **Stored:** Persisted to localStorage
- **Used by:** Nothing
- **Fix:** Use for medication peak overlay (B-12 backlog item) or remove until implemented.

### H-4. seasonalMode — set but behavior not implemented
- **Where:** Settings → Health & Rhythms → Launch/Maintain/Recover/Sandbox
- **Stored:** Persisted, sent as context to edge functions
- **Used by:** Edge function prompts (tone). NOT used for: pool limits, task count caps, difficulty ceilings, UI tone changes, BurnoutAlert thresholds.
- **CLAUDE.md says:** "drives pool limits + AI tone" — but only AI tone part works.
- **Fix:** Implement pool limit overrides per seasonalMode, or at minimum show a banner explaining what the mode changes.

### H-5. energy_before — always NULL
- **Where:** Focus session insert → `energy_before: null` hardcoded
- **Reality:** Field exists in DB schema, but never populated from the energy picker on HomeScreen
- **Fix:** Set `energy_before` from current `energyLevel` store value when starting a session.

---

## TIER 3 — MEDIUM: Confusing UX & Dead-End Flows

### M-1. DueDateScreen is read-only
- Tasks show due date badges (TaskCard), and DueDateScreen groups tasks by Today/Tomorrow/This Week/Later.
- **But:** Clicking a task on DueDateScreen does nothing. No edit, no navigate, no reschedule.
- **Fix:** Make task rows tappable → navigate to task detail or show inline date picker.

### M-2. No way to manually set dueTime
- `dueTime` field exists and works via voice input classification.
- **But:** AddTaskModal has no time picker UI. Only voice can set times.
- **Fix:** Add time picker when dueDate is set.

### M-3. Weekly insight "Get insights" button — one-shot, no refresh
- ProgressScreen shows "Get insights" → fetches from AI → button disappears.
- No way to re-fetch updated insights without full page reload.
- **Fix:** Show "Refresh" button after initial fetch. Or auto-refresh weekly.

### M-4. GDPR delete shows success before confirming
- `handleDelete()` shows success toast before verifying edge function response.
- If Supabase fails silently, user thinks data is deleted but it isn't.
- **Fix:** Await response, check `resp.ok`, only then show success.

### M-5. BurnoutAlert CTA contradicts its message
- Burnout card says "Rest is part of the work" → CTA is "Start with just 5 minutes →" (focus session).
- User reads "rest" but the action is "focus" — contradictory.
- **Fix:** Change CTA for burnout-level to "Take a breath first →" → leads to NatureBuffer-like rest screen, not focus.

### M-6. Energy widget change has no visible downstream effect
- User changes energy via EnergyWidget on HomeScreen → toast "Energy set to X" → nothing visibly changes.
- Tasks don't reorder, difficulty defaults don't shift, no widgets adapt.
- **Fix:** At minimum, show contextual hint: "Low energy? We'll suggest shorter sessions."

### M-7. QuickSetupCard silently rearranges widgets
- When user picks app mode on first visit, `resetGridToDefaults()` rearranges BentoGrid.
- No toast, no animation, no explanation of what changed.
- **Fix:** Add brief toast: "Layout updated for [mode name]"

### M-8. FirstTaskPrompt dismissed permanently
- Empty NOW pool shows "What's one thing on your mind?" prompt.
- User dismisses → prompt never returns, even if NOW pool is empty again.
- **Fix:** Re-show prompt when `nowPool.length === 0 && !firstTaskDismissed` (reset `firstTaskDismissed` when pool empties).

### M-9. Carry-over badge is not actionable
- Tasks >24h old show amber carry-over badge.
- Clicking badge does nothing. No reschedule, no snooze, no "Move to NEXT" shortcut.
- **Fix:** Make badge tappable → show quick actions (snooze 1 day / move to NEXT / park).

### M-10. BurnoutNudge 48h cooldown is silent
- User dismisses burnout nudge → won't see it again for 48h.
- No explanation like "We'll check in again later."
- **Fix:** Add copy: "No worries — we'll check back in a couple of days."

### M-11. Flexible Pause (rest mode) — no HomeScreen indicator
- User enables 24h rest mode in Settings → returns to Home → no banner, badge, or indicator.
- **Fix:** Show gentle banner on HomeScreen: "Rest mode active until [time]. Take it easy."

### M-12. taskType (task/idea/reminder) never displayed
- Voice classification can set taskType, but TaskCard never shows the type.
- Ideas and reminders look identical to tasks.
- **Fix:** Show subtle badge or icon per type on TaskCard.

### M-13. Widget visibility toggle missing post-onboarding
- BentoGrid supports hiding widgets (store tracks `visible` flag), but no UI to toggle visibility.
- **Fix:** Add edit mode to BentoGrid with show/hide per widget (min 2 enforced).

---

## TIER 4 — Architectural / Store Hygiene

### A-1. Completed tasks accumulate in localStorage forever
- Completed tasks stay in `nowPool`/`nextPool` with `status: 'completed'`, growing unbounded.
- **Fix:** Prune tasks with `status === 'completed'` older than 30 days on store hydration.

### A-2. difficulty vs difficultyLevel redundancy
- `difficulty` (1-3 for XP calc) and `difficultyLevel` ('easy'/'medium'/'hard' for display) coexist.
- **Fix:** Unify to one field with a display mapper.

### A-3. focusAnchor — unclear purpose and UX
- Persisted audio preset identifier. Achievement "sonic_anchor" exists for setting it.
- No clear UI explanation of what "focus anchor" means or how to use it.
- **Fix:** Add tooltip or CoachMark on first use.

### A-4. Audio route orphaned from BottomNav
- `/audio` route exists but is not in BottomNav. Accessible only by direct URL.
- **Fix:** Either add to nav or remove route.

---

## Summary by Severity

| Severity | Count | Key Theme |
|----------|-------|-----------|
| CRITICAL | 6 | Core choices (appMode, cognitiveMode) don't work; tasks vanish; data never used |
| HIGH | 5 | Health data collected but ignored (sleep, chronotype, medication, season, energy_before) |
| MEDIUM | 13 | Dead-end flows, missing feedback, silent behaviors |
| Architectural | 4 | Store hygiene, redundancy, orphaned routes |
| **Total** | **28** | |

---

## Recommended Priority Order for Fixes

**Sprint A — "Nothing should lie" (CRITICAL fixes):**
1. C-1: Completed tasks history ("Done recently" section)
2. C-2 + C-3: Make appMode/cognitiveMode actually work OR simplify to one real choice
3. C-6: Display energy trends (energy_after already saved)
4. C-5: Remove Pro trial UI until Stripe is ready (don't show what you can't sell)

**Sprint B — "Don't ask what you won't use" (HIGH fixes):**
5. H-1 through H-5: Either implement downstream logic for health data OR remove the UI. Do not ask users questions you'll ignore.
6. M-4: Fix GDPR delete confirmation
7. M-5: Fix burnout CTA contradiction

**Sprint C — "Polish & feedback loops" (MEDIUM fixes):**
8. All M-* items: add missing feedback, fix dead-end flows, make badges actionable
9. All A-* items: store cleanup, dedup, orphan removal
