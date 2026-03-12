# Sprint 9 — Design & Accessibility Improvements
## Decision Log & Research Justification

**Date:** 2026-03-12
**Author:** Claude (Cowork session)
**Based on:** neuroinclusive-ux-audit-2026-03-11, 3-axis-audit-2026-03-11, interaction audit 2026-03-12
**Branch:** main @ 4fe6a19 → Sprint 9

---

## Framing: Why these 20 items, in this order

MindShift targets neurodivergent users — primarily ADHD, with overlap into anxiety and sensory
processing differences. This population is **disproportionately harmed** by:

1. Uncontrolled motion (vestibular sensitivity, hyperactivity of visual cortex)
2. Missing error recovery (impulsivity → accidental taps → data loss without undo)
3. Broken trust signals (dead UI, opaque states, no offline feedback)
4. Cognitive overload from missing affordances (hidden interactions, no hints)

The prioritization below weights **trust preservation** and **ADHD-specific harm reduction** above
generic UX improvements.

---

## Batch A — Accessibility Foundation

### A1: Motion system — 4 components + 4 spinners
**Decision:** Wire `useMotion()` into CookieBanner, InstallBanner, LoadingScreen, EnergyCheckin.
Add `motion-reduce:animate-none` to all `animate-spin` instances.

**Justification:**
- WCAG 2.1 SC 2.3.3 (Level AAA) and the de facto AA standard from WCAG 2.2 both address
  animation. For a PWA targeting neurodivergent users, this is non-negotiable.
- Vestibular disorders affect ~35% of adults over 40 and commonly co-occur with ADHD. Spinning
  animations trigger nausea and disorientation in this population even at low intensities.
- MindShift already built `useMotion()` with dual reduced-motion support (OS preference +
  `reducedStimulation` toggle). Four components bypassing it is an **implementation gap**, not a
  design decision.
- The `animate-spin` instances on LoadingScreen, FocusScreen, RecoveryProtocol, and AudioToggle
  run during high-stakes moments (entering focus, recovering after 72h absence) — exactly when
  motion-sensitive users are most vulnerable.

**Research references:** WCAG 2.1 §2.3.3, Vestibular Disorders Association clinical guidelines,
Barkley (2015) ADHD Executive Function, MindShift Research #8 (calm palette, sensory regulation).

---

### A2: Focus rings — keyboard navigation
**Decision:** Add `focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/60
focus-visible:outline-none` to Button.tsx and all interactive elements that lack it.

**Justification:**
- WCAG 2.1 SC 2.4.7 (Level AA): "Any keyboard operable user interface has a mode of operation
  where the keyboard focus indicator is visible."
- Approximately 7% of users navigate primarily via keyboard. ADHD users specifically benefit from
  keyboard shortcuts due to faster execution speed (less context-switching).
- `focus-visible` (not `focus`) ensures the ring only appears for keyboard navigation, not on
  mouse click — preserving the clean visual aesthetic for pointer users.
- Using CSS var ensures calm-mode desaturation applies automatically (no separate override needed).

---

### A3: Skip nav — use CSS variable
**Decision:** Replace inline `#7B72FF` in SkipNav with `var(--color-primary)`.

**Justification:**
- Minor but principled: inline colors bypass calm-mode desaturation. One-line fix.
- Maintains design system integrity (single source of truth via tokens.ts).

---

### A4: Aria-labels — decorative icons and interactive states
**Decision:** Add `aria-hidden="true"` to decorative icons; update ArcTimer aria-label
conditionally based on `disableToggle`; add text labels to energy emoji buttons.

**Justification:**
- WCAG 2.1 SC 1.1.1 (Level A): Non-text content must have text alternatives, or be marked as
  decorative.
- Energy emoji buttons (😴😐😀) communicate meaning through color+emoji only — fails SC 1.4.1
  (Use of Color). Adding visually-hidden text labels fixes this without visual change.
- ArcTimer in flow phase disables the digit toggle but `aria-label` doesn't reflect this. Screen
  reader users get "Tap to show remaining time" even when the tap does nothing.

---

## Batch B — Critical Feature Gaps

### B1: Calendar tab — replace with DueDateScreen
**Decision:** Replace non-functional CalendarScreen with a lightweight DueDateScreen: tasks with
`dueDate` set, sorted chronologically, grouped by Today / Tomorrow / This Week / Later. Uses
existing `dueDate` field on Task type. No new infrastructure.

**Justification:**
- Nielsen Heuristic #1 (Visibility of system status) + #4 (Consistency and standards): a nav tab
  that does nothing is a broken affordance. Users encountering non-functional UI rate the app as
  significantly less trustworthy (Nielsen Norman Group, 2020).
- The `dueDate` and `dueTime` fields already exist on the Task type. The data model supports this.
- CalendarScreen.tsx currently renders a placeholder. Zero risk of regression — we're replacing
  dead code with live code.
- A full calendar widget (FullCalendar, etc.) would be a separate sprint. This MVP provides
  immediate value with ~2h of work.

**Out of scope:** Date picker UI on tasks (separate sprint), .ics export, recurring tasks.

---

### B2: Timer style picker in Settings
**Decision:** Add countdown / count-up / surprise picker to SettingsScreen, wired to existing
`timerStyle` store field.

**Justification:**
- Russell Barkley's research on ADHD and time blindness (2015, 2020) identifies two distinct
  anxiety profiles: "time pressure anxiety" (worsened by countdown) and "time opacity anxiety"
  (worsened by no timer at all). Count-up mode directly addresses the former.
- The `timerStyle` field was added to the store in Sprint 7 specifically for this UI — it was
  marked as "set in onboarding screen 3.5" but the onboarding screen was never built.
- Adding it to Settings (rather than onboarding) is lower-friction and allows users to change it
  after onboarding.
- The ArcTimer already supports all 3 modes. This is pure UI surface work.

---

### B3: Energy picker on first HomeScreen load
**Decision:** If `energyLevel === null` (never set), show an inline energy prompt on HomeScreen
above the BentoGrid. Disappears after first selection.

**Justification:**
- Burnout score (`computeBurnoutScore()`) uses energy level as one of 4 signals. Without it, the
  score is inaccurate for all new users.
- The EnergyCheckin component already exists. The fix is a conditional render.
- Progressive disclosure principle: asking for energy at the moment of first use is more natural
  than a settings screen, and captures a real signal.
- ADHD-friendly framing: "How's your energy right now?" is a low-stakes, self-compassionate
  check-in, not a form field.

---

## Batch C — Interaction Feedback

### C1: Undo task completion
**Decision:** Add a 4-second "Undo" toast after task completion. Completion is optimistic in UI
but held in a `pendingCompletion` ref. If undo is tapped within 4s, task is restored. After 4s,
completion is committed to store and DB.

**Justification:**
- Nielsen Heuristic #3 (User control and freedom): "Users often choose system functions by
  mistake and will need a clearly marked 'emergency exit'."
- ADHD impulsivity makes accidental task completion more likely than in neurotypical users. This
  is not a minor edge case — it's a predictable behavior pattern for the target audience.
- 4 seconds is chosen based on research on toast duration: 3s is minimum for users to read and
  react; 5s is considered intrusive. 4s is the WCAG-recommended minimum for reading a short
  message at normal reading speed.
- Confetti + haptic still fire immediately (rewarding the action) — undo is available but not
  pushed in the user's face.

---

### C2: Offline status indicator
**Decision:** Add a subtle fixed indicator in AppShell that appears when `navigator.onLine ===
false` and disappears 2s after reconnection. Non-blocking, informational only.

**Justification:**
- Nielsen Heuristic #1 (Visibility of system status): users must know the state of the system.
- For a task management app, the question "did my thought get saved?" is anxiety-inducing for
  ADHD users who rely on the app as external working memory (Barkley's "extended phenotype" model
  of ADHD management tools).
- The offline queue already works correctly. This is purely a visibility layer — no logic changes.
- Design: non-intrusive, uses existing gold token (warning color, never red).

---

### C3: BurnoutAlert CTA → actual action
**Decision:** BurnoutAlert "Try a micro-focus" button navigates to `/focus?quick=1` instead of
just dismissing the alert.

**Justification:**
- The alert currently identifies a problem (burnout signal) and offers a CTA that does nothing
  actionable. This is a "false affordance" — it implies action but delivers dismissal.
- `/focus?quick=1` already exists and auto-starts a 5-minute session. It is the exact intervention
  appropriate for burnout recovery (micro-dosing focus).
- Behavioural activation theory (BA — validated CBT approach for ADHD/depression): the smallest
  possible action reduces activation energy. "Try a micro-focus" + immediate navigation is BA.

---

### C4: Snooze / Park feedback toast
**Decision:** Show a brief toast "Parked for later. No rush." after snoozing a task.

**Justification:**
- Currently the snooze button moves a task with zero feedback. Users may not notice the task
  disappeared from NOW pool, increasing anxiety.
- The specific copy "No rush." is intentional: it directly counters the shame response that can
  accompany deferral in ADHD ("I'm failing by not doing this now").
- Toast duration: 2.5s (shorter than undo — purely informational, no action needed).

---

### C5: BentoGrid "min 2 widgets" feedback
**Decision:** When user tries to hide a widget that would drop count below 2, show toast:
"Need at least 2 widgets to keep the home screen useful."

**Justification:**
- Currently the toggle silently does nothing — the user doesn't understand why their tap had no
  effect. Silence on a user action violates Nielsen Heuristic #1.
- The explanation ("useful") validates the constraint rather than just asserting it.

---

### C6: Park thought confirmation
**Decision:** After saving a park-a-thought note in FocusScreen, show toast "Thought saved to
Someday 💭 — back to focus."

**Justification:**
- The current flow closes the input with no confirmation. For ADHD users who park thoughts to
  free working memory, confirmation that the capture succeeded is critical — without it, the
  thought stays in working memory "just in case."
- The second part ("back to focus") provides an explicit re-entry cue to the focus state.

---

### C7: Wire pushWelcomeBack()
**Decision:** Call `pushWelcomeBack(userName)` in RecoveryProtocol on mount, after the AI
recovery message has loaded.

**Justification:**
- The function is fully implemented in `notify.ts`. The call site is missing.
- Push notifications for re-engagement are especially valuable for ADHD users who forget to open
  apps. Research #7 (RSD spiral at 72h+ absence) makes proactive outreach a clinical-level
  intervention.

---

## Batch D — Polish

### D1: Text overflow protection
**Decision:** Add `line-clamp-2` to task titles in TaskCard. Add `maxLength={200}` to title
input in AddTaskModal. Add `truncate` to widget task lists.

**Justification:** Defensive UX. Long text breaks layouts and increases cognitive load by forcing
the eye to track across an unusually long line. 200 chars = ~3 lines of text — sufficient for any
real task description.

### D2: Hardcoded color fix (AddTaskModal)
**Decision:** Replace `#5B52E8` with `var(--color-primary)`.

**Justification:** Breaks calm-mode desaturation. One character change.

### D3: ArcTimer tap hint
**Decision:** Show "tap to toggle digits" hint text below the timer for the first 8 seconds of a
session, then fade out permanently. Only on first session (localStorage flag).

**Justification:** Hidden affordances (invisible tap targets) violate Nielsen Heuristic #6
(Recognition rather than recall). The timer's tap-to-toggle is a key feature that users may never
discover.

### D4: Mochi bubble randomization
**Decision:** Replace hardcoded single strings with arrays of 3-4 variants per trigger point
(phase transition, 7m, 15m, 30m, 60m). Randomly selected on each trigger.

**Justification:** Repetition reduces salience — the brain habituates to repeated stimuli (neural
adaptation). Variable messages maintain engagement and feel more alive. This mirrors the variable
ratio schedule already used in XP.

### D5: Error fallback for BentoGrid lazy chunk
**Decision:** Wrap BentoGrid lazy import in ErrorBoundary with fallback that shows static widget
list (non-draggable) instead of infinite skeleton.

**Justification:** Current failure mode: chunk fails to load → skeleton shows forever → user
thinks app is broken. Static fallback maintains functionality while clearly indicating the
drag feature is temporarily unavailable.

---

## Summary: What is NOT in Sprint 9

These items require architecture decisions or external dependencies and are deferred:

- **Social layer** (S-2/S-3/S-4): Requires Supabase Realtime design
- **Server-side reminders**: Requires Service Worker push infrastructure
- **Stripe integration**: Requires Stripe account setup
- **Date picker on tasks**: Requires UI component selection (date picker library)
- **Progressive profiling (Day 30+)**: Requires usage pattern pipeline
- **Hyperfocus Autopsy**: Requires session analysis logic

---

## Test plan

After each batch:
1. `tsc --noEmit` — no TypeScript errors
2. `vitest` — 82/82 tests pass
3. Manual: test with `prefers-reduced-motion: reduce` in Chrome DevTools
4. Manual: test keyboard navigation (Tab through all interactive elements)
5. Manual: test offline mode (Chrome DevTools → Network → Offline)
