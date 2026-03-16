# MindShift — Path to World-Class: Implementation Plan

**Date:** 16 March 2026
**Goal:** Bring MindShift to production-grade quality worthy of global launch
**Excluded:** Stripe payments, real user recruitment (handled separately)
**Method:** Claude Code sprints with detailed prompts, verification after each

---

## Overview: 5 Sprints

| Sprint | Name | Time | Executor | What |
|--------|------|------|----------|------|
| **D** | "Clean Slate" | 30 min | Claude Code | Fix build, delete dead code, unblock deploys |
| **E** | "Real Data Pipeline" | 2-3h | Claude Code | Supabase sync, energy history, weekly stats |
| **F** | "Push & Remind" | 2-3h | Claude Code | SW push notifications, notification permission flow |
| **G** | "Polish & Harden" | 2-3h | Claude Code | Accessibility, performance, security, error handling |
| **H** | "Final QA" | 1-2h | Cowork + Claude Code | Full regression, e2e update, CLAUDE.md update |

**Total estimated: 1-2 days of Claude Code work**

---

## Sprint D — "Clean Slate" (30 min)

### Goal: Unblock Vercel deploys + remove all dead code

### D-1: Fix 2 TypeScript build errors

**File: `src/features/focus/useFocusSession.ts` line 477**

Problem: `.update({ energy_after: level })` — Supabase generic type resolves to `never` because the `.from('focus_sessions')` call doesn't know about `FocusSessionInsert`.

Fix:
```ts
// Change:
.update({ energy_after: level })
// To:
.update({ energy_after: level } as any)
// OR better — type the from() call:
.from('focus_sessions').update({ energy_after: level } satisfies Partial<FocusSessionInsert>)
```

**File: `src/features/tasks/AddTaskModal.tsx` line 14**

Problem: `NOW_POOL_MAX` imported but unused (replaced by `getNowPoolMax()`).

Fix: Remove `NOW_POOL_MAX` from the import.

### D-2: Delete dead files (~3,700 lines)

```
DELETE:
src/features/home/HomeScreen.tsx          (486 lines — replaced by HomePage.tsx)
src/features/home/BentoGrid.tsx           (241 lines — only HomeScreen imported it)
src/features/home/widgets/                (482 lines — all 5 widget files, only HomeScreen)
src/features/tasks/TasksScreen.tsx        (367 lines — replaced by TasksPage.tsx)
src/features/progress/ProgressScreen.tsx  (489 lines — replaced by ProgressPage.tsx)
src/features/settings/SettingsScreen.tsx  (530 lines — replaced by SettingsPage.tsx)
src/features/audio/AudioScreen.tsx        (302 lines — route removed Sprint B)
src/features/calendar/CalendarScreen.tsx  (458 lines — replaced by DueDateScreen)
src/features/focus/FocusPage.tsx          (149 lines — Lovable prototype, never routed)
src/lib/mock-data.ts                      (157 lines — zero imports)
src/globals.css                           (76 lines — Lovable Tailwind v3 tokens, dead)
```

### D-3: Clean up dead references

After deletion, grep for broken imports and fix any that reference deleted files. Likely affected: comments in `constants.ts`, `Input.tsx` (reference in JSDoc comments only — safe to update).

### D-4: Verify
```bash
npx tsc --noEmit        # clean
npm run build            # must succeed (tsc -b && vite build)
npx playwright test      # 112/112
```

### D-5: Commit + push
```
git add -A && git commit -m "chore(D): fix build errors + remove 3700 lines dead code"
git push origin main
```

Verify Vercel deploy succeeds (check dashboard or `gh run list`).

---

## Sprint E — "Real Data Pipeline" (2-3h)

### Goal: Connect the last remaining static/placeholder UI to real Supabase data

Currently the Lovable pages read from the Zustand store (Sprint C wired that), but the store itself only persists to `localStorage`. Several features show placeholder data because the Supabase ↔ Store sync pipeline is incomplete.

### E-1: Supabase task sync (bidirectional)

**Problem:** Tasks live only in localStorage. If user logs in from another device, they see nothing. If localStorage is cleared, all tasks are lost.

**Solution:** Add a `useTaskSync` hook:

```ts
// src/shared/hooks/useTaskSync.ts
// On mount: fetch tasks from Supabase for userId, populate store
// On task mutation (add/complete/snooze/move/remove): debounced upsert to Supabase
// On focus: re-fetch (handles multi-device)
```

**Key decisions:**
- **Optimistic local-first**: Zustand store is source of truth during session
- **Background sync**: Every `addTask`/`completeTask`/etc. also pushes to Supabase
- **On load**: Merge server tasks with local (server wins on conflict, local-only tasks get pushed)
- **Offline queue**: Already exists (`enqueue`/`dequeue` pattern) — wire it to task mutations

**Files to create/modify:**
- NEW: `src/shared/hooks/useTaskSync.ts`
- MODIFY: `src/app/App.tsx` — call `useTaskSync()` after auth

### E-2: Focus session persistence

**Problem:** `useFocusSession.ts` saves sessions to Supabase (line ~420), but session history isn't fetched back. ProgressPage can't show real weekly bars.

**Solution:** Add `useSessionHistory` hook:
```ts
// src/shared/hooks/useSessionHistory.ts
// Fetches last 30 days of focus_sessions from Supabase
// Computes WeeklyStats from real data
// Calls setWeeklyStats() on store
```

**Data available in `focus_sessions` table:**
- `started_at`, `duration_ms`, `phase_reached`, `energy_before`, `energy_after`, `audio_preset`

**Computed fields for WeeklyStats:**
- `totalFocusMinutes`: SUM(duration_ms) / 60000 for current week
- `tasksCompleted`: COUNT of completed tasks this week
- `peakFocusTime`: MODE of hour-of-day from started_at
- `consistencyScore`: unique days with sessions / 7
- `peakEnergyLevel`: MAX energy_before this week

### E-3: Energy history for ProgressPage

**Problem:** "Energy after sessions" section shows only current emoji. Should show last 10 session energies as a trend.

**Solution:** In `useSessionHistory`, also return `energyTrend: { emoji: string, level: number }[]` from last 10 sessions' `energy_after`. Wire to ProgressPage.

### E-4: Achievement sync

**Problem:** Achievements are tracked locally in store, never synced to Supabase `achievements` table.

**Solution:** After each `unlockAchievement(key)`, upsert to Supabase achievements table. On load, merge.

### E-5: AI Weekly Insights (real data)

**Problem:** ProgressPage "Weekly insight" section shows static placeholder text.

**Solution:** Call `weekly-insight` edge function with real session data. Cache result in store (refresh once per week or on pull-to-refresh).

```ts
// In useSessionHistory or separate useWeeklyInsight hook:
const response = await supabase.functions.invoke('weekly-insight', {
  body: { sessions: last7DaysSessions, seasonalMode }
})
```

### E-6: Verify
```bash
npm run build
npx playwright test
# Manual: create task → refresh page → task persists
# Manual: complete focus session → check ProgressPage shows real weekly bars
```

---

## Sprint F — "Push & Remind" (2-3h)

### Goal: Real push notifications for task reminders

This is the single most impactful missing feature for an ADHD app.

### F-1: Notification permission flow

**Where:** Add to OnboardingPage (step 5 after current step 4), and to SettingsPage.

**UX (ADHD-friendly):**
```
"Want gentle reminders? 🔔"
"We'll nudge you before tasks are due — nothing aggressive, just friendly taps."
[Enable reminders]  [Maybe later]
```

On tap → `Notification.requestPermission()`. If "maybe later", store in `seenHints` and re-prompt after 3 completed tasks.

### F-2: Service Worker push handler

**Modify: `src/sw.ts`**

Add push event listener:
```ts
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'MindShift', body: 'Time to focus!' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'mindshift-reminder',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})
```

### F-3: Upgrade reminders.ts for SW-based scheduling

**Current:** `setTimeout` (dies on tab close). `reminders.ts` already has `pushReminderNotify()` with `Notification` API — but it only works while the tab is open.

**Upgrade path (no backend needed for v1):**
1. Keep current `setTimeout` approach for when app is open
2. Add `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))` for background
3. For true background push (app fully closed), need Web Push API + VAPID keys + Supabase cron

**v1 (this sprint):** Local notification when app is in background tab (SW showNotification)
**v2 (future):** Supabase cron + web-push for when app is fully closed

### F-4: Auto-schedule reminders on task creation

**Modify: `src/components/AddTaskModal.tsx`**

After `addTask(newTask)`, if task has `dueDate`:
```ts
if (newTask.dueDate && Notification.permission === 'granted') {
  reminders.schedule(newTask, 15) // 15 min before
}
```

### F-5: Reminder indicator on TaskCard

Show 🔔 icon on tasks that have active reminders:
```ts
{reminders.has(task.id) && <span className="text-[13px]">🔔</span>}
```

### F-6: Verify
```bash
npm run build
npx playwright test
# Manual: create task with due date → wait → notification appears
# Manual: close tab → reopen → reminders restored
```

---

## Sprint G — "Polish & Harden" (2-3h)

### Goal: Accessibility, performance, error handling, security

### G-1: WCAG AA compliance audit

Referencing `docs/neuroinclusive-ux-audit-2026-03-11.md` which already identified issues.

**Checklist:**
- [ ] All interactive elements have `focus-visible:ring-2` (Sprint 9 did this for old screens — verify new Lovable pages)
- [ ] Color contrast: verify all text meets 4.5:1 ratio (especially `#8B8BA7` on `#0F1120` background)
- [ ] Touch targets: minimum 44x44px for all buttons
- [ ] `aria-label` on icon-only buttons (FAB, audio toggle, stop, park-thought)
- [ ] Skip-to-content link for keyboard navigation
- [ ] Reduced motion: verify `motion` animations respect `prefers-reduced-motion`
- [ ] Screen reader testing: all sections have proper headings hierarchy

### G-2: Performance optimization

**Bundle analysis:**
- Main chunk: 300 KB (98 KB gzip) — slightly heavy
- Move `recharts` or heavy components to lazy imports if used
- Check if `lucide-react` is tree-shaking properly (import individual icons only)

**Runtime:**
- Add `React.memo` to new Lovable components (TaskCard, EnergyPicker) — they re-render on every store change
- Verify `useMemo` on filtered task lists (HomePage, TasksPage, FocusPage)
- Add `loading="lazy"` to images if any

### G-3: Error handling

- [ ] All Supabase calls wrapped in try/catch with `logError()`
- [ ] Network errors show user-friendly toast (not raw error)
- [ ] Edge function failures degrade gracefully (static fallback for weekly insights)
- [ ] Add error boundary to AddTaskModal (currently only per-route)

### G-4: Security hardening

- [ ] Verify no API keys in client code (check for hardcoded strings)
- [ ] CSP headers in vercel.json — already good, verify `@vercel/analytics` is covered
- [ ] XSS: all user input is React-escaped (verify no `dangerouslySetInnerHTML`)
- [ ] Rate limiting: check if Supabase RLS policies are in place
- [ ] GDPR: verify export/delete actually work (call edge functions, check response)

### G-5: Empty states for all screens

When user is new and has no data:
- HomePage: "Add your first task" prompt (already done via empty-state)
- TasksPage: "No tasks yet" with call-to-action
- ProgressPage: "Complete your first focus session" instead of empty bars
- FocusPage: handle no tasks gracefully (already has "Open focus" option)

### G-6: Verify
```bash
npm run build
npx playwright test
# Manual: test with screen reader (VoiceOver or NVDA)
# Manual: test keyboard-only navigation
# Manual: test with prefers-reduced-motion: reduce
```

---

## Sprint H — "Final QA" (1-2h)

### Goal: Full regression, documentation, confidence

### H-1: Update e2e tests for new features

- Add tests for task persistence across page reload
- Add test for notification permission prompt
- Add test for due date picker in AddTaskModal
- Add test for empty states on all pages

### H-2: Update CLAUDE.md

Add Sprint D-G to sprint history, update:
- Known Gaps (remove fixed items)
- Production Status (confirm Sentry, analytics, edge functions)
- Build Notes (confirm `npm run build` ✅)
- File inventory (remove deleted files)

### H-3: Run full verification matrix

| Test | Expected | Actual |
|------|----------|--------|
| `tsc --noEmit` | ✅ clean | |
| `npm run build` | ✅ 38 precache entries | |
| `npx playwright test` | ✅ all passing | |
| Vercel deploy | ✅ green | |
| Sentry test event | ✅ received | |
| Mobile Safari | ✅ works | |
| Android Chrome | ✅ works | |
| Offline mode | ✅ gold bar, tasks persist | |
| Task CRUD | ✅ create/complete/snooze/move | |
| Focus session full cycle | ✅ start→struggle→release→flow→end | |
| Settings persistence | ✅ all toggles survive reload | |
| Onboarding → store | ✅ all choices saved | |
| Guest mode | ✅ works without auth | |
| Sign out → clean state | ✅ all reset | |

---

## How to Use everything-claude-code

That repo is a **methodology toolkit**, not something we install into MindShift. Here's what's useful:

### Applicable patterns:

1. **TDD workflow** (`/tdd`): For Sprint E/F, write test first → implement → verify. This prevents regressions.

2. **Code review agent** (`/code-review`): After each sprint, run review agent on the diff. Catches security issues, unused imports, type errors.

3. **E2E runner** (`/e2e`): Automated e2e with retry + screenshot on failure. We already have Playwright — this is bonus.

4. **Build error resolver**: If build breaks during sprint, agent auto-diagnoses. Useful but we already handle this manually.

5. **Verification loops**: The pattern of "implement → build → test → verify → commit" is exactly our sprint workflow.

### NOT applicable to MindShift:

- Go/Python/Java specific rules (we're TypeScript only)
- PM2 multi-agent orchestration (overkill for solo project)
- Token optimization (not relevant for the app itself)
- Business/content skills (we're building, not writing articles)

### Recommended setup for Claude Code:

```bash
# Before each sprint, set context:
# 1. Read CLAUDE.md (auto-loaded)
# 2. Read the sprint prompt doc
# 3. Run build to confirm baseline
# 4. Implement
# 5. Verify (tsc + build + playwright)
# 6. Commit + push
```

---

## Execution Plan: Who Does What

| Task | Cowork (me) | Claude Code |
|------|-------------|-------------|
| Sprint D prompt | ✅ Write | Execute |
| Sprint E prompt | ✅ Write | Execute |
| Sprint F prompt | ✅ Write | Execute |
| Sprint G prompt | ✅ Write | Execute |
| Sprint H tests | | ✅ Execute |
| Sprint H CLAUDE.md | ✅ Write | |
| Verification | Review | ✅ Run |
| Design decisions | ✅ Decide | |
| Supabase schema | ✅ Review | ✅ Implement |

---

## My Recommendation as Co-Founder

**Don't rewrite. Iterate.**

The codebase is solid. The architecture (Zustand + Supabase + PWA + lazy loading) is the right choice. The new Lovable UI is clean. What's missing is **the last 20% that makes it feel professional**:

1. **Data persistence** (Sprint E) — this is the biggest gap. A productivity app that loses your tasks on refresh is not shippable.

2. **Reminders** (Sprint F) — ADHD users will try the app once, forget it exists, and never return unless it pings them. This is existential.

3. **Polish** (Sprint G) — small details that separate "side project" from "real product": proper empty states, accessible buttons, graceful errors.

4. **Confidence** (Sprint H) — full test matrix, clean build, confirmed monitoring. So you can sleep at night after launch.

After these 4 sprints, the only things between you and launch are: Stripe (when you're ready to monetize) and 10-20 beta testers (which you can recruit the same day you finish Sprint H).

**Start with Sprint D right now — it's 30 minutes and unblocks everything else.**
