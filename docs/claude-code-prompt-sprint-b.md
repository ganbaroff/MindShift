# Claude Code Prompt — Sprint B: "Finish What You Started"

> **Context:** Read `CLAUDE.md` first — it has the full project context, stack, store structure, and file map.
> Then read `docs/ux-dead-ends-audit-2026-03-13.md` for the original 28-item audit.
> Sprint A fixed 18 of 28. This sprint closes the remaining 10.
>
> **Rules:**
> - `tsc --noEmit` after every file change
> - Don't break existing e2e tests (`e2e/*.spec.ts`)
> - Update e2e tests if UI copy changes
> - Commit after each fix passes type check
> - Push to `origin/main` when all fixes pass

---

## Overview of remaining 10 items

| ID | Severity | Issue | Fix approach |
|----|----------|-------|-------------|
| C-3 | CRITICAL | cognitiveMode "See everything" broken | Remove cognitiveMode from UI. appMode already covers this. |
| C-4 | CRITICAL | psychotype unused at runtime | Make psychotype drive Mochi personality + reset grid on appMode change |
| H-4 | HIGH | seasonalMode not enforced | Wire seasonalMode to NOW pool limits |
| M-1 | MEDIUM | DueDateScreen read-only | Make task rows tappable → navigate to task |
| M-2 | MEDIUM | No dueTime picker in AddTaskModal | Add time input when dueDate is set |
| M-8 | MEDIUM | FirstTaskPrompt dismissed forever | Reset `firstTaskDismissed` when NOW pool empties |
| M-9 | MEDIUM | Carry-over badge not actionable | Make badge tappable → quick action menu |
| M-12 | MEDIUM | taskType never displayed | Show type badge on TaskCard |
| A-2 | ARCH | difficulty/difficultyLevel redundancy | Unify to one system |
| A-4 | ARCH | Audio route orphaned | Remove orphaned route |

---

## Fix 1 — Remove cognitiveMode from UI (C-3)

**Problem:** cognitiveMode ("focused" vs "overview") was a separate toggle in Settings that overlapped with appMode. Sprint A made appMode drive pool visibility, making cognitiveMode redundant. But cognitiveMode still exists as a store field and is referenced in a few places.

**What to do:**

### SettingsScreen.tsx
- Find and remove the "Focus style" or "One at a time" / "See everything" toggle section (the ChipGroup for cognitiveMode)
- This section should already be gone or minimal after Sprint A. If any remnant exists, remove it.
- Keep the appMode picker (minimal/habit/system) as the single mode control

### NowPoolWidget.tsx
- Verify it uses `appMode` (not `cognitiveMode`) for display logic
- `appMode === 'minimal'` → show 1 task
- `appMode === 'habit'` or `'system'` → show up to `APP_MODE_CONFIG[appMode].nowPoolMax` tasks

### store/index.ts
- Keep `cognitiveMode` in the store type and partialize for backward compat (existing users have it in localStorage)
- Remove the setter from SettingsScreen (user can't change it anymore)
- It will be silently ignored going forward
- Add comment: `// DEPRECATED: cognitiveMode replaced by appMode (Sprint B). Kept for localStorage compat.`

### e2e/settings.spec.ts
- Remove any test that references "cognitive mode", "focused", or "overview" toggle
- If there's a test like `'focus style shows 2 cognitive modes'`, delete it

---

## Fix 2 — Make psychotype useful (C-4)

**Problem:** psychotype (achiever/explorer/connector/planner) is derived from onboarding and persisted, but never affects runtime behavior after the initial widget layout.

**What to do:**

### MochiSessionCompanion.tsx
- Import `psychotype` from store
- Add personality flavor to Mochi's messages based on psychotype:
  - `achiever`: goal-oriented ("You're crushing it!", "Another one down!")
  - `explorer`: curiosity-based ("What will you discover?", "Follow that thread!")
  - `connector`: community-oriented ("Your work helps others", "Someone will appreciate this")
  - `planner`: structure-based ("Right on track", "Just as planned")
- This is a low-risk change — just varying message copy, not logic

### HomeScreen.tsx — Re-derive grid on appMode change
- When user changes appMode in QuickSetupCard (or Settings), call `resetGridToDefaults()` after setting the new mode
- This ensures psychotype-driven widget layout updates when the user switches modes
- Currently the mode change sets psychotype but doesn't refresh the grid

### Optional (if time): ProgressScreen.tsx
- Add psychotype-flavored encouragement to the stats section
- achiever: "N tasks conquered this week"
- explorer: "N new things tried this week"
- connector: "N sessions — your consistency inspires"
- planner: "N tasks on schedule this week"

---

## Fix 3 — Wire seasonalMode to pool limits (H-4)

**Problem:** seasonalMode (launch/maintain/recover/sandbox) has UI in Settings with descriptions mentioning pool limits ("Recover: 2 NOW tasks"), but these limits are never enforced.

**What to do:**

### constants.ts
- Add seasonal overrides to a new config:
```ts
export const SEASONAL_MODE_CONFIG = {
  launch:   { nowPoolMaxOverride: 5, description: 'Push forward — more capacity' },
  maintain: { nowPoolMaxOverride: null, description: 'Steady pace — default limits' },  // null = use appMode default
  recover:  { nowPoolMaxOverride: 2, description: 'Gentle mode — less is more' },
  sandbox:  { nowPoolMaxOverride: null, description: 'Experiment freely — no limits' },
} as const
```

### Wherever NOW_POOL_MAX is used (AddTaskModal.tsx, NowPoolWidget.tsx, HomeScreen.tsx):
- Current logic: `APP_MODE_CONFIG[appMode].nowPoolMax`
- New logic: `SEASONAL_MODE_CONFIG[seasonalMode]?.nowPoolMaxOverride ?? APP_MODE_CONFIG[appMode].nowPoolMax`
- Extract this into a helper function in constants.ts:
```ts
export function getNowPoolMax(appMode: AppMode, seasonalMode: SeasonalMode): number {
  return SEASONAL_MODE_CONFIG[seasonalMode]?.nowPoolMaxOverride ?? APP_MODE_CONFIG[appMode].nowPoolMax
}
```

### SettingsScreen.tsx
- The seasonal mode picker already shows descriptions. No UI change needed.
- When user changes seasonalMode, show toast: "Seasonal mode: [name]. NOW pool limit: [N] tasks"

---

## Fix 4 — DueDateScreen interactivity (M-1)

**Problem:** DueDateScreen shows tasks grouped by due date, but task rows are non-interactive. Clicking does nothing.

**What to do:**

### DueDateScreen.tsx
- Make each `TaskRow` clickable via `onClick` → navigate to `/tasks` with the task highlighted
- Or simpler: wrap each row in a button/link that opens a small bottom sheet with:
  - Task title
  - Current due date
  - "Reschedule" button → shows a simple date picker (native `<input type="date">`)
  - "Go to task" → navigates to `/tasks`
- On reschedule: call `updateTask(taskId, { dueDate: newDate })` from store

### store/index.ts
- Verify `updateTask` or `moveTask` supports updating `dueDate`. If not, add:
```ts
updateTaskField: (taskId: string, field: string, value: unknown) => set(...)
```
- Or just use the existing `updateTaskDifficulty` pattern to create `updateTaskDueDate`

---

## Fix 5 — Add dueTime picker to AddTaskModal (M-2)

**Problem:** `dueTime` field exists in the Task type and works via voice input, but there's no manual time picker in AddTaskModal.

**What to do:**

### AddTaskModal.tsx
- When `dueDate` is set (the date picker section is visible), show an additional input below:
```tsx
{dueDate && (
  <input
    type="time"
    value={dueTime || ''}
    onChange={(e) => setDueTime(e.target.value)}
    className="..."
    aria-label="Due time"
  />
)}
```
- Style consistently with existing date input (same surface color, text style)
- This is a native HTML time picker — works on mobile with OS-native time scroll

---

## Fix 6 — Reset FirstTaskPrompt when NOW pool empties (M-8)

**Problem:** The "What's one thing on your mind?" prompt on HomeScreen is dismissed permanently via `firstTaskDismissed` local state. It never comes back even if the user completes all tasks.

**What to do:**

### HomeScreen.tsx
- Find `firstTaskDismissed` state variable
- Add an effect that resets it when NOW pool becomes empty:
```tsx
useEffect(() => {
  if (nowPool.filter(t => t.status === 'active').length === 0) {
    setFirstTaskDismissed(false)
  }
}, [nowPool])
```
- This way: user completes all tasks → prompt reappears → encourages adding a new one

---

## Fix 7 — Make carry-over badge actionable (M-9)

**Problem:** Tasks >24h old show an amber "carry-over" badge, but clicking it does nothing.

**What to do:**

### TaskCard.tsx
- Make the carry-over badge a button instead of a passive span
- On click, show a popover/menu with 3 options:
  - "Park it" → calls `snoozeTask(taskId)` (moves to NEXT)
  - "Move to Someday" → calls `moveTask(taskId, 'someday')`
  - "Still on it" → dismisses popover (no action)
- Use a simple absolutely-positioned div (like the park-thought popover in FocusScreen)
- Keep it non-punitive — no "You haven't done this!" tone

---

## Fix 8 — Show taskType on TaskCard (M-12)

**Problem:** Voice input can classify tasks as task/idea/reminder, but TaskCard never displays the type.

**What to do:**

### TaskCard.tsx
- Read `task.taskType` (or whatever the field name is — check `types/index.ts`)
- If taskType is present and not 'task' (the default), show a small badge:
  - `idea`: "💡" badge (subtle, next to title)
  - `reminder`: "🔔" badge
  - `task`: no badge (default, avoid visual noise)
- Place badge inline with task title, before the text
- Use muted color matching the existing difficulty badge style

---

## Fix 9 — Unify difficulty fields (A-2)

**Problem:** Two parallel systems: `difficulty` (1-3 for XP calculation) and `difficultyLevel` ('easy'/'medium'/'hard' for display). Redundant and confusing.

**What to do:**

### types/index.ts
- Keep `difficulty: 1 | 2 | 3` as the single source of truth
- Add a mapper function:
```ts
export const DIFFICULTY_MAP = {
  1: { label: 'Easy', color: 'var(--color-teal)' },
  2: { label: 'Medium', color: 'var(--color-gold)' },
  3: { label: 'Hard', color: '#A78BFA' },  // purple
} as const
```
- Deprecate `difficultyLevel` field — add comment: `// DEPRECATED: use difficulty + DIFFICULTY_MAP instead`

### TaskCard.tsx
- Replace `difficultyLevel` reads with `DIFFICULTY_MAP[task.difficulty]`
- This should be a find-and-replace across the file

### AddTaskModal.tsx
- If both fields are set on task creation, only set `difficulty`
- Remove any `difficultyLevel` assignment

### DueDateScreen.tsx
- Same: replace `difficultyLevel` reads with `DIFFICULTY_MAP[task.difficulty]`

---

## Fix 10 — Remove orphaned audio route (A-4)

**Problem:** `/audio` route exists in `App.tsx` but is not in BottomNav. User can't navigate to it except via direct URL.

**What to do:**

### App.tsx
- Check if the `/audio` route serves any purpose (e.g., deep link from FocusScreen)
- If FocusScreen or SessionControls link to `/audio`, keep it but add it back to BottomNav
- If nothing links to it, remove the route entirely:
  - Remove the `<Route path="/audio" ... />` line
  - Remove the lazy import for AudioScreen if it exists
  - Keep the audio engine hook (`useAudioEngine`) — it's used by FocusScreen directly

### BottomNav.tsx
- If keeping the route: add a nav item for Audio (🎧 icon)
- If removing: no change needed

---

## E2E Test Updates

After all fixes, check and update:

### e2e/settings.spec.ts
- Remove any tests for cognitiveMode toggle (Fix 1)
- Add test: seasonalMode change shows toast (Fix 3)

### e2e/tasks.spec.ts
- Verify "Done recently" test still passes (was added in Sprint A)
- Add test: FirstTaskPrompt reappears after completing all tasks (Fix 6)

### e2e/focus.spec.ts
- Verify existing tests pass (park-thought, NatureBuffer, etc.)

---

## Final Verification Checklist

After all 10 fixes:
- [ ] `tsc --noEmit` passes
- [ ] All existing e2e tests pass (update as needed)
- [ ] cognitiveMode toggle gone from Settings UI
- [ ] Mochi messages vary by psychotype during focus sessions
- [ ] Grid resets when appMode changes in Settings
- [ ] seasonalMode "recover" caps NOW pool at 2 tasks
- [ ] DueDateScreen task rows are tappable
- [ ] AddTaskModal shows time picker when dueDate is set
- [ ] FirstTaskPrompt reappears when all tasks completed
- [ ] Carry-over badge opens quick action menu on tap
- [ ] Ideas show 💡 badge, reminders show 🔔 badge on TaskCard
- [ ] Only `difficulty` (1-3) used; `difficultyLevel` deprecated
- [ ] Audio route either in nav or removed
- [ ] CLAUDE.md updated with Sprint B changes

---

## CLAUDE.md Update

After all fixes, update CLAUDE.md:
- Add Sprint B to Sprint History table
- Update `Branch: main @ [new commit hash]`
- Update Known Gaps (remove resolved items)
- Add Architecture (Sprint B additions) section noting:
  - `SEASONAL_MODE_CONFIG` in constants.ts
  - `getNowPoolMax()` helper
  - `cognitiveMode` deprecated
  - `difficultyLevel` deprecated
  - `psychotype` now drives Mochi personality
