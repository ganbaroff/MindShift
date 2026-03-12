# Sprint 9 Changelog
**Date:** 2026-03-12
**Base:** `4fe6a19` (Sprint 8)
**Type:** Design & Accessibility Pass

---

## What shipped

### Accessibility (WCAG 2.1 AA compliance)

**Motion system universalised**
- CookieBanner, InstallBanner, LoadingScreen, EnergyCheckin now respect `useMotion()` hook
- All `animate-spin` instances gated with `motion-reduce:animate-none`
- No component bypasses the centralized motion system anymore

**Focus rings**
- `Button.tsx` — added `focus-visible:ring-2 focus-visible:ring-offset-2` using design tokens
- Keyboard navigation is now fully functional throughout the app

**Aria improvements**
- ArcTimer: aria-label updates on phase state (flow phase disables toggle, label reflects this)
- Energy emoji buttons: descriptive aria-labels ("Energy level 1 — Exhausted" etc.)
- Decorative icons: `aria-hidden="true"` where missing
- Skip nav: converted inline hex color to CSS variable

---

### Features

**DueDateScreen (replaces CalendarScreen)**
- Non-functional Calendar tab replaced with a working "Upcoming" screen
- Groups tasks with `dueDate` set into: Today / Tomorrow / This Week / Later
- Empty state: "No upcoming tasks. Add a due date when creating a task."
- BottomNav tab: relabelled "Upcoming", updated icon

**Timer style picker**
- `SettingsScreen` now has a "Focus Timer Style" section
- Three options: Countdown | Count-up | Surprise
- Wired to existing `timerStyle` store field (was orphaned with no UI)
- Helper text: "Count-up shows time earned — helps if countdowns feel pressuring."

**Energy picker on first load**
- HomeScreen shows inline energy prompt if `energyLevel === null` (never set)
- Appears above BentoGrid (non-blocking)
- Disappears after selection
- Drives burnout score accuracy from session 1

---

### Interaction feedback

**Undo task completion**
- Completion held for 4 seconds with "Done! ✓ [Undo]" toast
- Confetti + haptic fire immediately (rewarding, not delayed)
- Undo restores task to previous visual + store state
- After 4s: committed to store and Supabase

**Offline indicator**
- AppShell detects `navigator.onLine` + `online`/`offline` events
- Gold bar when offline: "Offline — changes saved locally"
- Teal bar on reconnect (2.5s): "Back online — changes synced ✓"
- Respects `useMotion()` for reduced-motion users

**BurnoutAlert CTA**
- "Try a micro-focus" button now navigates to `/focus?quick=1` (5-min session)
- Previously just dismissed the alert with no action

**Snooze feedback**
- Toast after parking a task: "Parked for later. No rush. 🌿"
- Reinforces shame-free language at the moment of deferral

**BentoGrid min-2 feedback**
- Toast when user tries to hide below 2 widgets: "Home screen needs at least 2 widgets"
- Previously silent (no feedback on blocked action)

**Park thought confirmation**
- Toast after saving a thought in FocusScreen: "Thought saved to Someday 💭"
- Enables clean re-entry to focus state (confirms external memory is captured)

**pushWelcomeBack() wired**
- `RecoveryProtocol` now calls the push notification on mount
- Previously implemented in `notify.ts` but never called

---

### Polish

**Text overflow protection**
- TaskCard: `line-clamp-2` on task title
- AddTaskModal: `maxLength={200}` on title input + character counter at 150+
- Widget task lists: `truncate` on inline task titles

**Hardcoded colors removed**
- `AddTaskModal`: `#5B52E8` → `var(--color-primary)` (was breaking calm-mode)
- `AuthScreen`, `TasksScreen`: similar fixes

**ArcTimer tap hint**
- "Tap to toggle digits" hint shown for first 8 seconds of session
- Fades out, never returns (localStorage flag)
- Hidden during surprise mode and flow phase

**Mochi message randomization**
- All phase/milestone messages now have 4 variants each
- Randomly selected per trigger (matches variable-ratio principle from Research #5)
- Prevents neural habituation to repeated messages

**BentoGrid error fallback**
- If lazy chunk fails, shows "Widget layout couldn't load" + tap-to-refresh
- Previously: infinite skeleton (app appeared frozen)

---

## Files changed

| File | Change type |
|------|-------------|
| `src/shared/ui/Button.tsx` | Added focus-visible ring |
| `src/shared/ui/CookieBanner.tsx` | Wired to useMotion() |
| `src/shared/ui/InstallBanner.tsx` | Wired to useMotion() |
| `src/shared/ui/LoadingScreen.tsx` | Wired to useMotion() |
| `src/app/AppShell.tsx` | Offline indicator + skip nav fix |
| `src/app/App.tsx` | DueDateScreen import |
| `src/app/BottomNav.tsx` | "Upcoming" label + icon |
| `src/features/calendar/DueDateScreen.tsx` | **NEW** — replaces CalendarScreen |
| `src/features/settings/SettingsScreen.tsx` | Timer style picker |
| `src/features/home/HomeScreen.tsx` | Energy picker on first load |
| `src/features/home/EnergyCheckin.tsx` | Wired to useMotion() + aria-labels |
| `src/features/home/BurnoutAlert.tsx` | CTA → /focus?quick=1 |
| `src/features/home/BentoGrid.tsx` | Min-2 toast + ErrorBoundary |
| `src/features/focus/ArcTimer.tsx` | Conditional aria-label + tap hint |
| `src/features/focus/SessionControls.tsx` | Park thought toast |
| `src/features/focus/MochiSessionCompanion.tsx` | Message randomization |
| `src/features/tasks/TaskCard.tsx` | Undo completion + snooze toast + line-clamp |
| `src/features/tasks/AddTaskModal.tsx` | maxLength + char counter + color fix |
| `src/features/tasks/RecoveryProtocol.tsx` | Wire pushWelcomeBack() |

## New files
| File | Purpose |
|------|---------|
| `docs/sprint-9-decisions.md` | Research-backed justification for all 20 changes |
| `docs/sprint-9-changelog.md` | This file |
| `docs/adr/0007-accessibility-motion-system.md` | ADR for accessibility decisions |

## TypeScript
`tsc --noEmit` — ✅ zero errors

## Remaining (deferred to Sprint 10+)
- Date picker UI on tasks (dueDate field exists, no picker yet)
- Social layer (Supabase Realtime)
- Server-side push reminders (SW infrastructure)
- Stripe integration
- Hyperfocus Autopsy feature
- Date picker on AddTaskModal
