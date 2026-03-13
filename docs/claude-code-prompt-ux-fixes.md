# Claude Code Prompt — Sprint: "Nothing Should Lie"

> **Context:** Read `CLAUDE.md` for full project context, then read `docs/ux-dead-ends-audit-2026-03-13.md` for the complete audit. This prompt covers Sprint A — the CRITICAL fixes that make the app stop lying to users.
>
> **Rules:** Run `tsc --noEmit` after every file change. Don't break existing tests. Commit after each fix passes type check. Push when all fixes are done.

---

## Fix 1: Completed Tasks History ("Done Recently")

**Problem:** Completed tasks vanish after the 4s undo window. No way to see what you accomplished.

**Implementation:**

### TasksScreen.tsx
- After the SOMEDAY section, add a new collapsible section: **"Done recently"**
- Filter completed tasks from ALL pools: `[...nowPool, ...nextPool, ...somedayPool].filter(t => t.status === 'completed')`
- Sort by `completedAt` descending (newest first)
- Only show tasks completed in the last 7 days
- Section is **collapsed by default** (useState `doneOpen = false`)
- Header: `"✓ Done recently"` with task count badge and chevron toggle
- Each task shows: title, completion date (relative: "today", "yesterday", "3 days ago"), difficulty badge
- Tasks in this section are **read-only** (no complete/snooze/delete buttons)
- Use the same `TaskCard` component but with a `readOnly` prop, or create a simpler `CompletedTaskRow` component

### store/index.ts — Add hydration pruning
- In the `persist` middleware `onRehydrateStorage` callback (or a `migrate` function):
- Filter out tasks from `nowPool`, `nextPool`, `somedayPool` where `status === 'completed'` AND `completedAt` is older than 30 days
- This prevents localStorage from growing unboundedly

---

## Fix 2: Make appMode Actually Work

**Problem:** User picks "One thing at a time" / "Build daily habits" / "Manage everything" but the choice changes nothing after onboarding (only greeting subtitle differs).

**Implementation:**

### Define mode behaviors in constants.ts:
```ts
export const APP_MODE_CONFIG = {
  minimal: {
    nowPoolMax: 3,
    showNextOnHome: false,
    showSomedayOnHome: false,
    homeSubtitle: 'One task at a time. What matters most?',
  },
  habit: {
    nowPoolMax: 3,
    showNextOnHome: true,  // show compact NEXT preview
    showSomedayOnHome: false,
    homeSubtitle: 'Build your routine, one step at a time.',
  },
  system: {
    nowPoolMax: 5,  // system mode allows more parallel tasks
    showNextOnHome: true,
    showSomedayOnHome: true,
    homeSubtitle: 'Everything visible. You\'re in control.',
  },
} as const
```

### HomeScreen.tsx:
- Import `APP_MODE_CONFIG`
- Read `appMode` from store
- Conditionally render NEXT pool preview widget when `config.showNextOnHome === true`
- Conditionally render SOMEDAY summary when `config.showSomedayOnHome === true`
- The NEXT preview can be a compact card: "📋 Up next (N tasks)" that links to /tasks

### AddTaskModal.tsx:
- Replace hardcoded `NOW_POOL_MAX` with `APP_MODE_CONFIG[appMode].nowPoolMax`
- This means "system" mode allows 5 NOW tasks, while "minimal" stays at 3

### Remove cognitiveMode:
- `cognitiveMode` is now redundant (appMode covers the same spectrum)
- In SettingsScreen: replace the focused/overview toggle with the appMode 3-way picker
- Remove `cognitiveMode` from store (or keep as deprecated alias)
- NowPoolWidget: replace `cognitiveMode === 'focused'` check with `appMode === 'minimal'` (show 1 task in minimal, 3 in others)

---

## Fix 3: Remove Pro Trial UI (Until Stripe Is Ready)

**Problem:** "Start 30-day free trial" button works, but zero features are gated. Users can activate a trial of... nothing.

**Implementation:**

### SettingsScreen.tsx:
- Comment out or remove the entire ProBanner section (lines ~207-279)
- Replace with a subtle "MindShift Free" label (no action)
- Keep the store logic (`subscriptionTier`, `isProActive`) intact for future Stripe integration
- Add a code comment: `// TODO: Restore ProBanner when Stripe integration is ready (see CLAUDE.md Known Gaps)`

---

## Fix 4: Display Energy Trends

**Problem:** User picks post-session energy emoji every time, but the data is never shown back.

**Implementation:**

### ProgressScreen.tsx:
- Add a new section below the focus session stats: **"Energy after sessions"**
- Read from store: all completed focus sessions that have `energy_after` set
- Display as a simple horizontal bar of the last 10 session emojis (using `ENERGY_EMOJI` from constants.ts)
- Show trend arrow: if average of last 5 > average of previous 5, show "↑ trending up", else "↓" or "→ steady"
- Fallback: if no energy_after data exists yet, show: "After your next session, we'll track how you feel."

### useFocusSession.ts:
- Set `energy_before` from current store `energyLevel` when starting a session (currently hardcoded to `null`)
- This enables future energy delta analysis

---

## Fix 5: Remove or Wire Health Data (sleep, chronotype, medication)

**Problem:** Settings → Health & Rhythms asks 4 questions (sleep, chronotype, medication, season) but none affect behavior.

**Two options — pick based on time budget:**

### Option A — Remove until implemented (faster, honest):
- In SettingsScreen.tsx, wrap the Health & Rhythms section in a feature flag or remove it entirely
- Keep store fields for future use
- Add comment: `// TODO: Sprint B — wire health data to session recommendations`

### Option B — Wire minimal downstream effects (better UX):
- **sleepQuality:** Persist it (add to partialize). When `sleepQuality === 1` (Rough): auto-suggest 15-min sessions instead of 25-min on FocusScreen. Show hint: "Rough night? We'll keep it short today."
- **chronotype:** When `chronotype === 'owl'` and current time is before 10am, show gentle hint: "Still waking up? No pressure."
- **medicationTime:** Show a subtle indicator on HomeScreen during the 2h window after medication time: "You're in your peak window — great time to focus."
- **seasonalMode:** Apply pool limit overrides: recover = max 2 NOW, launch = max 5 NOW, maintain = 3, sandbox = unlimited

---

## Fix 6: Quick Wins (do these between the main fixes)

1. **QuickSetupCard toast** — After `resetGridToDefaults()`, add: `toast('Layout updated for ' + modeLabel)`
2. **BurnoutNudge cooldown copy** — On dismiss, change toast to: "No worries — we'll check back in a couple days"
3. **GDPR delete validation** — In `handleDelete()`, check `resp.ok` before showing success toast
4. **BurnoutAlert CTA fix** — For burnout level (score 66+), change CTA from "Start with just 5 minutes →" to "Take a breather first →" and navigate to a rest/breathing screen or NatureBuffer-like view instead of `/focus?quick=1`
5. **Flexible Pause indicator** — When `flexiblePauseUntil` is set and in the future, show a banner on HomeScreen: "Rest mode active until [date]. Taking a break is progress too."

---

## Testing Checklist

After all fixes, verify:
- [ ] `tsc --noEmit` passes
- [ ] Completed tasks appear in "Done recently" section on TasksScreen
- [ ] Completing a task → it shows in Done section immediately
- [ ] Tasks older than 30 days are pruned on reload
- [ ] Changing appMode in Settings visibly changes HomeScreen (pool visibility, limits)
- [ ] ProBanner is gone or replaced with static label
- [ ] ProgressScreen shows energy emoji history (after at least 1 session with energy_after)
- [ ] Health & Rhythms either removed or has visible downstream effect
- [ ] All existing e2e tests still pass (update assertions if copy changed)
- [ ] BurnoutAlert CTA copy matches its intent
- [ ] GDPR delete only confirms on success response
