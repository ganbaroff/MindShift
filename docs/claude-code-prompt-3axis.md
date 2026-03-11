# Claude Code — MindShift 3-Axis Feature Implementation

## Context

You are implementing features for **MindShift** — an ADHD-aware productivity PWA.
Stack: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + Zustand v5 + Supabase + dnd-kit.
Branch: `fix/mobile-ux-bugs`. Always run `tsc --noEmit` before committing. Never commit if tsc fails.

### Design Rules (non-negotiable)
- **Zero red.** Use gold `#F59E0B` for warnings, teal `#4ECDC4` for success, primary `#7B72FF` for CTAs
- **Zero streaks.** Never show "N-day streak" to user. Use cumulative totals instead
- **Zero shame language.** No "overdue", "failed", "lazy", "procrastination", "missed". Use "carry-over", "parked", "fresh start"
- **All new components must call `useMotion()`** — import spring constants from `src/shared/lib/motion.ts`
- **All new spinners/animations** must have `motion-reduce:animate-none` Tailwind class
- **Color palette:** use `usePalette()` hook. Never hardcode colors outside `tokens.ts`
- **Calm copy only.** Forward-looking, identity-affirming, non-punitive

### Key Files
- `src/store/index.ts` — Zustand store (all state)
- `src/types/index.ts` — Domain types
- `src/shared/lib/constants.ts` — All numeric constants
- `src/features/focus/FocusScreen.tsx` — 6-state FSM
- `src/features/tasks/RecoveryProtocol.tsx` — 72h+ recovery overlay
- `src/features/settings/SettingsScreen.tsx` — Settings UI
- `supabase/migrations/` — DB migrations (create new file per migration)
- `supabase/functions/` — Edge functions (Deno + Gemini 2.5 Flash)

---

## BLOCK 1 — Data Model (do this first, everything else depends on it)

### 1a. Extend `Task` type (src/types/index.ts)

Add to the `Task` interface:
```typescript
difficultyLevel?: 'easy' | 'medium' | 'hard'  // Traffic Light (B-8)
```

### 1b. Extend store state (src/store/index.ts)

Add to UserSlice:
```typescript
timerStyle: 'countdown' | 'countup' | 'surprise'   // OH-1: timer preference
sleepQuality: 1 | 2 | 3 | null                      // OH-2: bad/ok/great (null = not asked)
medicationEnabled: boolean                           // OH-3: takes ADHD meds
medicationTime: 'morning' | 'afternoon' | 'evening' | null  // OH-3
chronotype: 'lark' | 'owl' | 'varies' | null        // OH-4
seasonalMode: 'launch' | 'maintain' | 'recover' | 'sandbox' // B-3
burnoutScore: number                                 // 0-100, computed from behavior (B-1)
flexiblePauseUntil: string | null                   // ISO date, Flexible Pause end (B-10)
```

Add setters for all new fields in the store slice.

Add to `partialize` (fields that survive reload):
`timerStyle`, `medicationEnabled`, `medicationTime`, `chronotype`, `seasonalMode`, `flexiblePauseUntil`

Do NOT persist: `burnoutScore`, `sleepQuality` (re-evaluated each session)

### 1c. Supabase migration (supabase/migrations/002_health_profile.sql)

```sql
-- Energy logs table for progressive profiling
create table if not exists public.energy_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  logged_at     timestamptz default now() not null,
  energy_level  smallint not null,          -- 1-5
  sleep_quality smallint,                   -- 1=bad 2=ok 3=great
  low_battery_context text,                 -- 'sleep'|'stress'|'meds'|'tired'|null
  session_id    uuid references public.focus_sessions
);

alter table public.energy_logs enable row level security;
create policy "user owns energy logs" on public.energy_logs
  for all using (auth.uid() = user_id);

-- Add difficulty to tasks table
alter table public.tasks
  add column if not exists difficulty_level text check (difficulty_level in ('easy','medium','hard'));

-- Add burnout score to user_behavior
alter table public.user_behavior
  add column if not exists burnout_score real default 0;
```

After writing the migration, run: `npx supabase db push` (only if Supabase CLI is configured).

---

## BLOCK 2 — P0: Burnout Radar (B-1)

### 2a. Burnout score calculation (src/shared/lib/burnout.ts) — NEW FILE

Create a pure function `computeBurnoutScore(behaviors: UserBehaviorRow[]): number`:

```
Input: last 7 days of user_behavior rows
Logic (weighted score 0-100):
  - snoozeRatio = avg(snooze_count) / 10 → clamped 0-1 → weight 30%
  - completionDecay = 1 - avg(task_completion_ratio) → weight 30%
  - sessionDecay = 1 - (activeDays / 7) → weight 25%
  - energyDecay = (5 - avg(energy_before)) / 4 → weight 15%

  score = (snoozeRatio * 0.30 + completionDecay * 0.30 + sessionDecay * 0.25 + energyDecay * 0.15) * 100

Thresholds:
  0-40: healthy (green zone, no action)
  41-65: caution (amber zone, gentle nudge)
  66-100: burnout (red zone → suggest Recovery Mode)
```

### 2b. Wire burnout score to store

In `src/app/App.tsx`: after fetching weekly stats (or on app load), compute burnout score from last 7 days of `user_behavior` table. Store in `burnoutScore` via `setBurnoutScore`.

### 2c. Burnout alert component (src/features/home/BurnoutAlert.tsx) — NEW FILE

Show on HomeScreen when `burnoutScore >= 41`:
- Score 41-65 (amber): subtle card — "This week feels a bit heavy. That's normal. Want to switch to a lighter mode?" + button "Switch to Recover mode" + "I'm fine, thanks"
- Score 66+ (purple — NOT red): soft full-card — "Your brain is asking for rest. That's data, not failure. Switch to Recovery Mode?" + "Yes, recover" + "Not yet"

Rules:
- Animate in with `useMotion()` spring
- Dismiss stores `dismissedAt` in local state (re-shows next day if score unchanged)
- Copy is calm, identity-safe, never diagnostic
- Zero red. Use `#F59E0B` (amber) and `#7B72FF` (purple) for severity tiers

### 2d. Wire to ProgressScreen

In `src/features/progress/ProgressScreen.tsx`: add BurnoutAlert above the weekly stats bars. Only show when `burnoutScore >= 41`.

---

## BLOCK 3 — Onboarding & Health Profile

### 3a. Timer preference in onboarding (OH-1)

In `src/features/onboarding/OnboardingFlow.tsx`: add a new screen between the current energy screen and final screen.

Screen title: "How do timers feel to you?"
Three visual cards (emoji + label):
- ⏱️ "Count down" — "I like knowing exactly how much time is left"
- ⬆️ "Count up" — "Just show me how long I've been going"
- 🎲 "Surprise me" — "Hide the time, just let me flow"

Store selection in `timerStyle`. Default: 'countdown' (preserves existing behavior).

### 3b. Count-up timer mode (OH-8)

In `src/features/focus/ArcTimer.tsx`:
- When `timerStyle === 'countup'`: display `elapsed` seconds counting up (current behavior already counts up internally — just change display logic)
- When `timerStyle === 'surprise'`: hide all digit displays. Show only the arc ring. No numbers at any phase.
- When `timerStyle === 'countdown'`: existing behavior (show target - elapsed)

In `src/features/focus/FocusScreen.tsx`: read `timerStyle` from store, pass to ArcTimer.

### 3c. Low Battery contextual prompt (OH-5)

In `src/features/home/EnergyWidget.tsx` or wherever energy is displayed:
When user taps energy 1 or 2: show a bottom sheet with title "What's going on?" and chip selector:
- 😴 Poor sleep
- 😰 Stressed
- 💊 Meds haven't kicked in
- 😶 Just tired
- ✕ Skip

On selection: store context in `energy_logs` table (`low_battery_context` field). Show a gentle response:
- "Poor sleep" → "Got it. I'll suggest shorter sessions today."
- "Stressed" → "Understood. We'll keep things simple."
- "Meds" → "Makes sense. Maybe wait 30 min before a focus session?"
- "Just tired" → "Fair enough. Even a 5-minute session counts today."

### 3d. Post-session energy delta (OH-10)

In `src/features/focus/FocusScreen.tsx`, after session ends (transition from session → recovery-lock state): add a one-tap prompt before the recovery lock countdown starts:

"How's your energy now?" — show 5 emoji buttons (😴😌🙂😄⚡)

On tap: store in `energy_after` field of the current focus session record (field already exists in DB). Then start recovery lock countdown as normal.

If user taps nothing for 5 seconds: auto-proceed without storing.

### 3e. Progressive profiling — Sleep & Medication (OH-2, OH-3, OH-4)

In `src/features/settings/SettingsScreen.tsx`: add a new section "Health & Rhythms" (after Energy Level section):

**Sleep quality** (optional): "How do you usually sleep?" → three buttons: 😫 Rough / 😐 Okay / 😴 Good. Store in `sleepQuality`. Label: "Helps me suggest smarter focus windows."

**Medication** (optional, very private framing): "Do you take ADHD medication?" → Yes / No / Rather not say. If Yes: "Roughly when?" → Morning / Afternoon / Evening. Store in `medicationEnabled` + `medicationTime`. Label: "Completely optional. Used only to suggest your best focus windows."

**Chronotype** (optional): "When does your brain wake up?" → 🌅 Morning person / 🌙 Night person / 🔀 It varies. Store in `chronotype`.

All three sections should have the label "Private. Stored only on your device." (data stays in Zustand persist, not sent to server).

---

## BLOCK 4 — Focus Session Improvements

### 4a. Session hard stop at 90/120 min (SL-6)

In `src/features/focus/FocusScreen.tsx`:

At 90 minutes elapsed: show a non-blocking toast (bottom, warm amber): "Nice long session 💪 You've been going for 90 min." Dismiss automatically after 8s.

At 120 minutes elapsed: show a soft overlay (not full-screen, half-sheet from bottom) with:
- Title: "Time for a real break 🌿"
- Body: "120 minutes is a long time. Your brain will thank you."
- Primary: "Take a break" (ends session, triggers recovery lock)
- Secondary: "10 more minutes" (bypassable once; second time at 130min → force end)

Add constants to `src/shared/lib/constants.ts`:
```typescript
export const SESSION_SOFT_STOP_MINUTES = 90
export const SESSION_HARD_STOP_MINUTES = 120
```

### 4b. Flexible Pause (B-10)

In `src/features/settings/SettingsScreen.tsx`: add "Take a break from MindShift" button in the app settings section.

Show a bottom sheet: "Taking a break is self-care, not failure."
Options: 1 day / 3 days / 1 week / Custom

On confirm: set `flexiblePauseUntil` to ISO date string in store.

During pause:
- In `src/app/App.tsx`: check `flexiblePauseUntil`. If active (date is in future): show a minimal "Rest mode" screen instead of full app. Screen content: "You're on a planned break. Come back [date]. Or return early anytime." + "Return early" button.
- On return (date passed OR "Return early"): clear `flexiblePauseUntil`. Show ContextRestore overlay (not RecoveryProtocol — planned pause ≠ abandonment).
- During pause: zero push notifications.

---

## BLOCK 5 — AI & Mochi Enhancements

### 5a. Mochi active body-double (SL-1, SL-10)

**Context:** Mochi is the mascot component. Find it in `src/features/home/` or `src/components/`. It currently shows static states (idle/focused/celebrating/resting/low-energy).

Enhance Mochi for active co-regulation during focus sessions:

In `src/features/focus/FocusScreen.tsx` (session state only):
- At 15 min elapsed: Mochi shows "You're in the zone 🌱" (small animated bubble, fades after 4s)
- At 30 min elapsed: "Still here with you ✨"
- At each phase transition (struggle→release, release→flow): "Nice shift 💙"
- On session complete: Mochi does celebrating state + "You did it!" bubble

Accountability prompt (randomized, 20-35 min intervals during session):
Show Mochi with a soft speech bubble: "What are you working on right now?" with a single-line text input (optional — user can dismiss with one tap or just ignore). If user types: store as `sessionFocus` note on the focus_session record. If no response in 10s: bubble fades automatically.

Implementation notes:
- All bubbles animate in/out with `useMotion()` spring
- Never block UI or require interaction
- Maximum 1 bubble per 20 minutes (don't spam)
- Only show during `screen === 'session'` state

### 5b. Proactive AI intervention (B-4)

In `src/app/App.tsx` or a new `src/features/home/BurnoutNudge.tsx`:

When `burnoutScore >= 60` AND user has not been in a focus session for 24h+ AND we haven't shown this nudge in 48h:

Show an in-app card (NOT a push notification — less alarming):
```
"This week looks heavier than usual.

That's completely normal — brains have phases.
No pressure. Even opening this app counts.

Want to switch to lighter mode?"

[Switch to Recover mode]  [I'm managing]
```

"Switch to Recover mode" sets `seasonalMode = 'recover'`.
"I'm managing" records dismissal timestamp (no repeat for 48h).

Rules: No push notification for burnout nudge. In-app only. Not on HomeScreen itself (too confrontational) — show as a subtle notification dot on the Progress tab, tapping reveals the card.

### 5c. Wire pushWelcomeBack() to RecoveryProtocol

Find `src/features/tasks/RecoveryProtocol.tsx`. Find the point where the recovery message is displayed (when `screen === 'recovery'`). Add:
```typescript
import { pushWelcomeBack } from '@/shared/lib/notify'
// When recovery overlay mounts (useEffect on mount):
useEffect(() => {
  pushWelcomeBack()
}, [])
```

This fires a native push notification when the user opens the app after 72h+, in case they have the app in background.

---

## BLOCK 6 — Task & Planning Enhancements

### 6a. Traffic Light task difficulty (B-8)

**Task creation:** In `src/features/tasks/AddTaskModal.tsx` (or wherever tasks are created):
Add an optional difficulty selector at the bottom of the form (below priority, above submit):

Row of 3 chips (compact, single-row):
- 🟢 Easy — rendered as teal dot + "Easy"
- 🟡 Medium — rendered as gold dot + "Medium"
- 🔴 → **Use purple `#7B72FF` dot** (NOT red, Design Rule #1) + "Hard"

Label: "How tricky is this? (optional)"

Store as `difficultyLevel` on task.

**Energy-aware suggestions:** In `src/features/tasks/TasksScreen.tsx`, when `energyLevel <= 2` and there are tasks with `difficultyLevel === 'easy'` in NOW/NEXT, show a subtle banner at top:

"Low energy today? Here are your easier tasks 🌿" → filter to show easy tasks first. Existing task order unchanged below.

**Task card display:** In `src/features/tasks/TaskCard.tsx`: show a small colored dot (3px) next to task title when `difficultyLevel` is set. Teal/gold/purple. No label — just the dot.

### 6b. Cumulative progress widget (B-7)

Add a new widget type to BentoGrid. Widget name: `lifetime-stats`.

Widget file: `src/features/home/widgets/LifetimeStatsWidget.tsx`

Display (compact, fits standard widget size):
```
[Number: completedTotal] tasks completed
[Number: totalFocusMinutes] focus minutes
[Line: "Joined [relative date]"]
[Bottom: "You keep showing up 💫"]
```

Format numbers: "247 tasks" / "38 hours" (convert minutes to hours if >60).
For `totalFocusMinutes`: sum from `focus_sessions` table where `completed = true`. Compute once on mount, cache in component state.

Add 'lifetime-stats' to:
- `WIDGET_TYPES` in `src/types/index.ts`
- `WIDGET_DEFAULTS` for `connector` psychotype (they are most motivated by social/collective data)
- Widget picker in BentoGrid settings

### 6c. Seasonal Mode UI (B-3)

In `src/features/settings/SettingsScreen.tsx`: add "Your Current Phase" section above App Mode:

Four cards (2×2 grid, full-width):
- 🚀 **Launch** — "I'm going all in. New goals, ambitious energy."
- ⚙️ **Maintain** — "Keeping the momentum. Steady wins."
- 🌿 **Recover** — "I need gentler. Small steps, simple goals."
- 🧪 **Sandbox** — "Exploring. No pressure, just experimenting."

Currently selected card is highlighted with primary color border.

When Recover mode is selected:
- `nowLimit` soft reduces to 2 (override pool display in TasksScreen)
- ProgressScreen shows shorter sessions as "perfect" (5-15 min = 🌟 instead of needing 25min+)
- AI weekly insight prompt adds "recovery context" to Supabase edge function call
- Mascot stays in resting/gentle state (not celebrating/pushing)

When Launch mode is selected:
- All defaults unchanged (current app behavior)
- Weekly insight prompt adds "launch context"

Store `seasonalMode` in persist. Default: 'maintain'.

---

## BLOCK 7 — Final Polish & Tests

### 7a. Type check
Run `tsc --noEmit`. Fix all errors before proceeding.

### 7b. Update tests

In `src/store/__tests__/store.test.ts`:
- Add tests for `computeBurnoutScore()` from `src/shared/lib/burnout.ts`:
  - healthy scenario: all snooze_count=0, completion_ratio=1.0 → score < 40
  - caution scenario: snooze_count=5, completion_ratio=0.4, 4/7 active days → score 41-65
  - burnout scenario: snooze_count=8, completion_ratio=0.1, 1/7 active days → score >= 66

- Add tests for new store fields:
  - `timerStyle` default = 'countdown'
  - `seasonalMode` default = 'maintain'
  - `burnoutScore` default = 0
  - `flexiblePauseUntil` default = null

### 7c. Browser verification

After `npm run dev`, verify in browser:
1. Onboarding: timer preference screen appears as 3rd screen, selection stores in `timerStyle`
2. Settings → Health & Rhythms section visible with medication/sleep/chronotype
3. Settings → "Your Current Phase" section visible with 4 seasonal mode cards
4. Settings → "Take a break" button visible
5. Focus session: count-up mode works when timerStyle='countup' (digits count up not down)
6. Focus session: at 90min mark, toast appears (test by temporarily setting `SESSION_SOFT_STOP_MINUTES = 1`)
7. Task creation: difficulty chips appear, teal/gold/purple dots show on task cards
8. BentoGrid: lifetime-stats widget exists in widget picker
9. ProgressScreen: BurnoutAlert shows at burnoutScore >= 41 (test by temporarily setting burnoutScore=50 in Zustand DevTools)
10. RecoveryProtocol: Mochi speech bubbles appear during session at 15 and 30 min

### 7d. Commit

```bash
git add -A
git commit -m "feat: implement 3-axis neuroinclusive features (burnout radar, health profile, timer modes, seasonal modes, traffic light tasks, Mochi body-double, lifetime stats, flexible pause)"
git push origin fix/mobile-ux-bugs
```

---

## Implementation Order

Work in this exact order to avoid breaking changes:

1. **Block 1** (data model) — types, store, migration
2. **Block 3e** (Settings: Health & Rhythms) — visible, low-risk
3. **Block 3a + 3b** (Timer preference onboarding + count-up mode) — visible user-facing
4. **Block 2** (Burnout Radar) — logic + alert component
5. **Block 4a** (Session hard stop) — focus screen change
6. **Block 4b** (Flexible Pause) — settings + App.tsx gate
7. **Block 6c** (Seasonal modes) — settings UI + mild behavior changes
8. **Block 6a** (Traffic Light tasks) — task creation + card dots
9. **Block 6b** (Lifetime stats widget) — new Bento widget
10. **Block 5a** (Mochi body-double) — focus session bubbles
11. **Block 5b** (Proactive AI nudge) — burnout nudge card
12. **Block 5c** (pushWelcomeBack) — one line
13. **Block 3c + 3d** (Low Battery prompt, post-session energy) — smaller touches
14. **Block 7** (tsc + tests + browser + commit)

---

## Notes on Implementation

- **Supabase calls:** All new Supabase reads/writes go through the existing `supabase` client in `src/shared/lib/supabase.ts`. Never create a new client.
- **No new npm packages** unless absolutely necessary. Prefer native browser APIs and existing deps.
- **Edge functions:** If modifying `recovery-message` edge function to accept `seasonalMode` context, use the existing Deno + Gemini pattern from other functions in `supabase/functions/`.
- **RLS:** Any new Supabase table needs `enable row level security` + policy `using (auth.uid() = user_id)`.
- **Privacy:** Sleep, medication, chronotype stay in Zustand persist (localStorage). Never send to Supabase unless user explicitly opts into cloud sync.
- **Test build:** `npm run build` may fail due to rollup Windows binary. Use `tsc --noEmit` for type checking. Vitest tests can be run if binaries are available.
