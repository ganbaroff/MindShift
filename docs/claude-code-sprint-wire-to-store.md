# Sprint C — "Wire to Store": Claude Code Prompt

## Mission

Wire 6 Lovable-generated UI pages + 6 shared components to the production Zustand store, eliminating all mock-data imports. Every screen must read/write real state. No regressions.

---

## Context: What Happened Before You

A Lovable redesign produced beautiful new pages and components. They were integrated into the production `App.tsx` with auth, routing, error boundaries, and all production infrastructure intact. **However**, all Lovable files currently import from `@/lib/mock-data` and use `useState` for everything — nothing talks to the real Zustand store.

Your job: replace mock data → real store, while keeping the visual design pixel-perfect.

---

## CRITICAL WARNINGS — Read Before Touching Anything

### 1. Version Mismatches (Lovable vs Production)

| Dependency | Production | Lovable assumed | Notes |
|---|---|---|---|
| React | **19** | 18 | No breaking changes for this work |
| Tailwind | **v4** (`@import "tailwindcss"` + `@theme`) | v3 (`@tailwind base` + `tailwind.config.ts`) | **DO NOT** add `@tailwind` directives. All tokens are in `@theme` block in `src/index.css`. The `tailwind.config.ts` at root is DEAD — ignore it. |
| Animation | **`motion`** (v12.35.1) | `framer-motion` | Both are installed. `framer-motion` imports work fine. Do NOT change animation imports. |
| Router | **react-router v7** | v6 | API is compatible. Do NOT change router code. |
| Vite | **7** | 5 | Irrelevant for this sprint. |

### 2. Files You Must NOT Touch

| File | Reason |
|---|---|
| `src/app/App.tsx` | Production router, auth, RecoveryProtocol, burnout computation — DONE |
| `src/app/AppShell.tsx` | Production layout with BottomNav, safe-area — DONE |
| `src/app/AuthGuard.tsx` | Production auth guard — DONE |
| `src/main.tsx` | Production bootstrap (Sentry, analytics, QueryClient) — DONE |
| `src/features/focus/FocusScreen.tsx` | Production focus orchestrator (350 lines) — already wired to store |
| `src/features/focus/useFocusSession.ts` | Production timer FSM hook — already wired |
| `src/features/focus/SessionControls.tsx` | Production session controls — already wired |
| `src/features/focus/PostSessionFlow.tsx` | Production post-session flow — already wired |
| `src/features/focus/ArcTimer.tsx` | Production arc timer — already wired |
| `src/features/focus/MochiSessionCompanion.tsx` | Production body-double — already wired |
| `src/features/home/HomeScreen.tsx` | Production home screen with BentoGrid — **coexists** with Lovable `HomePage.tsx` |
| `src/features/tasks/TaskCard.tsx` | Production TaskCard — **coexists** with Lovable `src/components/TaskCard.tsx` |
| `src/features/tasks/AddTaskModal.tsx` | Production AddTaskModal — **coexists** with Lovable `src/components/AddTaskModal.tsx` |
| `src/store/index.ts` | The store itself — READ-ONLY for this sprint. Do NOT modify. |
| `src/types/index.ts` | Domain types — READ-ONLY. Do NOT modify. |
| `src/shared/lib/constants.ts` | App constants — READ-ONLY. Do NOT modify. |

### 3. Dual Component Versions

Production and Lovable components **coexist** at different paths:

| Component | Production path | Lovable path (you're wiring) |
|---|---|---|
| TaskCard | `src/features/tasks/TaskCard.tsx` | `src/components/TaskCard.tsx` |
| AddTaskModal | `src/features/tasks/AddTaskModal.tsx` | `src/components/AddTaskModal.tsx` |
| BottomNav | `src/app/BottomNav.tsx` | `src/components/BottomNav.tsx` |

The Lovable pages import from `@/components/`. That's correct — keep it that way. The production `AppShell.tsx` uses its own `BottomNav` from `src/app/`. Both coexist.

### 4. Pre-existing TypeScript Errors (IGNORE)

These 2 errors exist before your work. Do NOT fix them:
- `src/features/focus/useFocusSession.ts(474)` — TS2345
- `src/features/tasks/AddTaskModal.tsx(14)` — TS6133

Your changes must not ADD any new errors. Run `tsc --noEmit` to verify.

---

## Store API Reference

### Import
```ts
import { useStore } from '@/store'
// or with selector:
const energyLevel = useStore(s => s.energyLevel)
```

### User Slice (read + write)
```ts
// State
userId: string | null
email: string | null
appMode: 'minimal' | 'habit' | 'system'          // ← Lovable "mode" chip index
energyLevel: 1 | 2 | 3 | 4 | 5                   // ← NOT 0-indexed!
psychotype: 'achiever' | 'explorer' | 'connector' | 'planner' | null
onboardingCompleted: boolean
timerStyle: 'countdown' | 'countup' | 'surprise'  // ← Lovable "timer" chip index
seasonalMode: 'launch' | 'maintain' | 'recover' | 'sandbox'  // ← Lovable "phase" card index
burnoutScore: number                               // 0–100
flexiblePauseUntil: string | null                  // ISO timestamp
xpTotal: number

// Setters
setEnergyLevel(level: EnergyLevel)                 // level is 1|2|3|4|5
setAppMode(mode: 'minimal' | 'habit' | 'system')
setTimerStyle(style: 'countdown' | 'countup' | 'surprise')
setSeasonalMode(m: 'launch' | 'maintain' | 'recover' | 'sandbox')
setFlexiblePauseUntil(until: string | null)
setOnboardingCompleted()                           // no args — sets true
setReducedStimulation(val: boolean)
addXP(amount: number)                              // auto-applies VR multiplier
signOut()                                          // resets everything
```

### Task Slice (read + write)
```ts
// State
nowPool: Task[]
nextPool: Task[]
somedayPool: Task[]

// Methods
addTask(task: Task)                                // full Task object required
completeTask(taskId: string)                       // sets status='completed', increments completedTotal
snoozeTask(taskId: string)                         // NOW→NEXT, snoozeCount++
moveTask(taskId: string, toPool: Pool)             // any direction
removeTask(taskId: string)
```

### Session Slice (read)
```ts
activeSession: ActiveSession | null
sessionPhase: SessionPhase                         // 'idle'|'struggle'|'release'|'flow'|'recovery'
timerSeconds: number
timerRunning: boolean
startSession(taskId, durationMinutes, preset)
endSession()
```

### Progress Slice (read + write)
```ts
achievements: Achievement[]                        // { key, name, description, emoji, unlockedAt }
weeklyStats: WeeklyStats | null
completedTotal: number                             // lifetime completed tasks
unlockAchievement(key: string)
hasAchievement(key: string): boolean
```

### Preferences Slice (read + write)
```ts
reducedStimulation: boolean
setReducedStimulation(val: boolean)
subscriptionTier: 'free' | 'pro_trial' | 'pro'
```

### Selectors
```ts
import { selectActiveTasks, selectSessionProgress } from '@/store'

selectActiveTasks(s)        // s.nowPool.filter(active).slice(0, 3)
selectSessionProgress(s)    // 0–1 float
```

---

## Type Mapping: Mock-Data → Store

This is the single most important section. Lovable uses `MockTask` from `@/lib/mock-data`. Production uses `Task` from `@/types`. They are DIFFERENT.

### MockTask (Lovable) → Task (Production)

| MockTask field | Type | Task field | Type | Conversion |
|---|---|---|---|---|
| `id` | `string` | `id` | `string` | Same |
| `title` | `string` | `title` | `string` | Same |
| `difficulty` | `'easy'\|'medium'\|'hard'` | `difficulty` | `1\|2\|3` | `easy→1, medium→2, hard→3` |
| `estimatedMinutes` | `number` | `estimatedMinutes` | `number` | Same |
| `pool` | `'now'\|'next'\|'someday'` | `pool` | `Pool` | Same |
| `done` | `boolean` | `status` | `'active'\|'completed'\|'archived'` | `done ? 'completed' : 'active'` |
| `doneAt` | `string?` | `completedAt` | `string \| null` | Same |
| `createdAt` | `string` | `createdAt` | `string` | Same |
| `isCarryOver` | `boolean` | — | — | Derive: `Date.now() - new Date(t.createdAt).getTime() > 24*3600*1000` |
| `hasReminder` | `boolean` | `taskType` | `'task'\|'idea'\|'reminder'` | `taskType === 'reminder'` |
| `hasIdea` | `boolean` | `taskType` | `'task'\|'idea'\|'reminder'` | `taskType === 'idea'` |

### Difficulty Colors (CRITICAL — production differs from Lovable mock)

| Lovable mock-data (`difficultyConfig`) | Production (`DIFFICULTY_MAP`) |
|---|---|
| easy → `#4ECDC4` (teal) | 1 → `#4ECDC4` (teal) ✅ same |
| medium → `#7B72FF` (purple) | 2 → `#F59E0B` (gold) ⚠️ DIFFERENT |
| hard → `#F59E0B` (gold) | 3 → `#7B72FF` (purple) ⚠️ DIFFERENT |

**Medium and Hard colors are SWAPPED between Lovable and production.** Production is canonical. Use `DIFFICULTY_MAP` from `@/types`.

### EnergyLevel Indexing (CRITICAL)

| Lovable (EnergyPicker) | Production (Store) |
|---|---|
| 0 = Drained | **1** = Drained |
| 1 = Low | **2** = Low |
| 2 = OK | **3** = Okay |
| 3 = Good | **4** = Good |
| 4 = Peak | **5** = Wired |

**EnergyPicker uses 0-indexed, store uses 1-indexed.** When reading from store, subtract 1 for picker display. When writing to store from picker, add 1.

```ts
// Reading: store → picker
<EnergyPicker selected={energyLevel - 1} onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)} />
```

### Canonical Energy Labels (use instead of mock-data energyOptions)
```ts
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'
// ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Wired']
// ENERGY_EMOJI  = ['😴', '😌', '🙂', '😄', '⚡']
```

---

## File-by-File Wiring Instructions

### 1. `src/components/TaskCard.tsx` — Adapt to real Task type

**Current:** Imports `MockTask`, `Difficulty`, `difficultyConfig` from `@/lib/mock-data`.

**Target:**
```ts
import { DIFFICULTY_MAP } from '@/types'
import type { Task } from '@/types'
```

**Changes:**
- Replace `MockTask` → `Task` in props interface
- Replace `difficultyConfig[task.difficulty]` → `DIFFICULTY_MAP[task.difficulty]`
- `DifficultyDots`: `config.dots` doesn't exist in `DIFFICULTY_MAP`. Use `task.difficulty` as dot count (1/2/3).
- `task.hasIdea` → `task.taskType === 'idea'`
- `task.hasReminder` → `task.taskType === 'reminder'`
- `task.isCarryOver` → derive: `task.status === 'active' && (Date.now() - new Date(task.createdAt).getTime() > 24 * 60 * 60 * 1000)`
- `task.pool !== 'now'` pool badge → works as-is (Task has `.pool`)
- `task.estimatedMinutes` → same field name

### 2. `src/components/AddTaskModal.tsx` — Create real tasks

**Current:** `onAdd` callback with `{title, difficulty: Difficulty, minutes}`. Uses `difficultyConfig`, `durationOptions` from mock-data.

**Target:** Import `useStore` and call `addTask()` directly.

**Changes:**
- Remove `onAdd` prop. Wire `handleSubmit` to `useStore`:
  ```ts
  import { useStore } from '@/store'
  import type { Task } from '@/types'
  import { getNowPoolMax } from '@/shared/lib/constants'

  const { addTask, nowPool, appMode, seasonalMode } = useStore()
  const maxNow = getNowPoolMax(appMode, seasonalMode)
  const nowCount = nowPool.filter(t => t.status === 'active').length
  ```
- Replace difficulty `'easy'|'medium'|'hard'` state → `1|2|3`:
  ```ts
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1)
  ```
- Replace `difficultyConfig` usage → `DIFFICULTY_MAP`:
  ```ts
  import { DIFFICULTY_MAP } from '@/types'
  // {([1, 2, 3] as const).map(d => { const c = DIFFICULTY_MAP[d]; ... })}
  ```
- `durationOptions` can stay from mock-data, OR inline `[5, 15, 25, 45, 60]`.
- In `handleSubmit`, construct a full `Task` object:
  ```ts
  const newTask: Task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    pool: nowCount >= maxNow ? 'next' : 'now',
    status: 'active',
    difficulty,
    estimatedMinutes: minutes,
    createdAt: new Date().toISOString(),
    completedAt: null,
    snoozeCount: 0,
    parentTaskId: null,
    position: 0,
    dueDate: null,
    dueTime: null,
    taskType: 'task',
    reminderSentAt: null,
  }
  addTask(newTask)
  ```
- Remove `nowCount` and `maxNow` from props — read from store.
- Keep `open` and `onClose` props for parent control.

### 3. `src/components/EnergyPicker.tsx` — Use canonical labels

**Current:** Imports `energyOptions` from `@/lib/mock-data`.

**Target:**
```ts
import { ENERGY_LABELS, ENERGY_EMOJI } from '@/shared/lib/constants'

const energyOptions = ENERGY_LABELS.map((label, i) => ({ emoji: ENERGY_EMOJI[i], label }))
```

**The component itself stays 0-indexed internally** — the conversion (±1) happens at the call site.

### 4. `src/features/home/HomePage.tsx` — Wire to store

**Current:** All mock data, `useState` for energy.

**Changes:**
- Remove `import { mockTasks } from '@/lib/mock-data'`
- Add:
  ```ts
  import { useStore } from '@/store'
  import type { EnergyLevel } from '@/types'
  import { getNowPoolMax, APP_MODE_CONFIG } from '@/shared/lib/constants'
  ```
- Replace `mockTasks.filter(t => t.pool === 'now' && !t.done)` → `useStore(s => s.nowPool).filter(t => t.status === 'active')`
- Replace `mockTasks.filter(t => t.pool === 'next' && !t.done)` → `useStore(s => s.nextPool).filter(t => t.status === 'active')`
- Replace `useState(3)` energy → wire to store:
  ```ts
  const { energyLevel, setEnergyLevel } = useStore()
  // Pass to EnergyPicker:
  <EnergyPicker selected={energyLevel - 1} onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)} />
  ```
- NOW pool count: `nowTasks.length` / `getNowPoolMax(appMode, seasonalMode)` (not hardcoded `/3`)
- Bento grid stats: wire real data:
  - `47 done` → `useStore(s => s.completedTotal)`
  - `2,340 XP` → `useStore(s => s.xpTotal)`
  - `12.5h` — no direct store field for totalFocusMinutes on home. Use `weeklyStats?.totalFocusMinutes` if available, or show `—` if null.
  - Energy emoji → `ENERGY_EMOJI[energyLevel - 1]`
  - Burnout gauge `score={34}` → `useStore(s => s.burnoutScore)`
  - Streak — no streak field in store. Remove or show `completedTotal` instead.
- `TaskCard` callbacks:
  ```ts
  const { completeTask, snoozeTask } = useStore()
  <TaskCard task={t} index={i} onDone={(id) => completeTask(id)} onPark={(id) => snoozeTask(id)} />
  ```
- Welcome card "mode selection" → wire to `setAppMode`:
  - Index 0 → `'minimal'`, Index 1 → `'habit'`, Index 2 → `'system'`
  - On "Skip for now" → just hide the card (already works)
- `AddTaskModal` — remove `nowCount` prop (modal reads store internally after wiring #2 above)
- Home subtitle: `APP_MODE_CONFIG[appMode].homeSubtitle`
- Up next section visibility: `APP_MODE_CONFIG[appMode].showNextOnHome`

### 5. `src/features/focus/FocusPage.tsx` — Wire to store

**Current:** Mock tasks, `useState` for session state, static progress.

**Changes:**
- Remove `import { mockTasks, durationOptions } from '@/lib/mock-data'`
- Add:
  ```ts
  import { useStore, selectActiveTasks, selectSessionProgress } from '@/store'
  import { ENERGY_EMOJI, ENERGY_LABELS, TIMER_PRESETS } from '@/shared/lib/constants'
  ```
- Replace `mockTasks.filter(t => !t.done).slice(0, 3)` → `useStore(selectActiveTasks)`
- Duration options: use `TIMER_PRESETS` ([5, 25, 52, 90]) or keep `durationOptions` ([5, 15, 25, 45, 60]) — either is fine.
- Energy display at top: `ENERGY_EMOJI[energyLevel - 1]` + `ENERGY_LABELS[energyLevel - 1]`
- `activeSession` state → `useStore(s => s.activeSession)` (if non-null, show FocusActive)
- "Start Focus" button → `startSession(selectedTask, duration, null)`
- "Stop" button → `endSession()`
- FocusActive `progress` → `useStore(selectSessionProgress)` (0–1 float)
- FocusActive `timeLeft` → compute from `useStore(s => s.timerSeconds)`:
  ```ts
  const timerSeconds = useStore(s => s.timerSeconds)
  const mins = Math.floor(timerSeconds / 60)
  const secs = timerSeconds % 60
  const timeLeft = `${mins}:${String(secs).padStart(2, '0')}`
  ```
- Phase label ("Release") → `useStore(s => s.sessionPhase)` (capitalize first letter)
- Mochi message → can keep static for now, or use phase-based messages

**IMPORTANT:** This page is the Lovable visual wrapper. The production `FocusScreen.tsx` at `src/features/focus/FocusScreen.tsx` is a completely different file with full audio, phases, post-session flow. Do NOT merge them. The Lovable `FocusPage.tsx` coexists — App.tsx currently routes `/focus` to `FocusPage`. If you want to switch back to production FocusScreen, change the lazy import in App.tsx, but that's a separate decision.

### 6. `src/features/tasks/TasksPage.tsx` — Wire to store

**Current:** All mock data.

**Changes:**
- Remove `import { mockTasks, difficultyConfig } from '@/lib/mock-data'`
- Add:
  ```ts
  import { useStore } from '@/store'
  import { DIFFICULTY_MAP } from '@/types'
  import { getNowPoolMax } from '@/shared/lib/constants'
  ```
- Replace filters:
  ```ts
  const { nowPool, nextPool, somedayPool, completeTask, snoozeTask, appMode, seasonalMode } = useStore()
  const nowTasks = nowPool.filter(t => t.status === 'active')
  const nextTasks = nextPool.filter(t => t.status === 'active')
  const somedayTasks = somedayPool.filter(t => t.status === 'active')
  const doneTasks = [...nowPool, ...nextPool, ...somedayPool]
    .filter(t => t.status === 'completed' && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
  ```
- NOW pool count: `/getNowPoolMax(appMode, seasonalMode)` (not hardcoded `/3`)
- `TaskCard` callbacks: `onDone={id => completeTask(id)}` `onPark={id => snoozeTask(id)}`
- Done section: `difficultyConfig[t.difficulty]` → `DIFFICULTY_MAP[t.difficulty]`
- Done section `t.doneAt` → `t.completedAt` (format: `new Date(t.completedAt).toLocaleDateString()` or relative time)
- Task count subtitle: `nowTasks.length + nextTasks.length` (already correct pattern)
- `AddTaskModal` — remove `nowCount` prop

### 7. `src/features/progress/ProgressPage.tsx` — Wire to store

**Current:** ALL hardcoded/static data.

**Changes:**
- Add:
  ```ts
  import { useStore } from '@/store'
  ```
- XP card:
  - `2,340 XP` → `useStore(s => s.xpTotal)`
  - Level calculation: `Math.floor(xpTotal / 1000) + 1` (or whatever formula you derive — there's no explicit level system in the store, so derive a simple one)
  - Progress bar: `(xpTotal % 1000) / 1000 * 100`%
- Weekly bars: `useStore(s => s.weeklyStats)` — may be `null`. If null, show placeholder or "No data yet".
- Stats grid:
  - Achievements unlocked: `achievements.filter(a => a.unlockedAt).length`
  - Tasks Done: `completedTotal`
  - Active Days: no direct store field — can show `—` or derive from weeklyStats
- Achievements: `useStore(s => s.achievements)` — map real achievement data:
  ```ts
  achievements.map(a => ({
    emoji: a.emoji,
    name: a.name,
    unlocked: !!a.unlockedAt,
  }))
  ```
- Energy trends: no store field for historical energy logs. Show `energyLevel` current emoji or placeholder.
- AI Insights: keep static for now (edge function wiring is a separate sprint)
- Burnout score → `useStore(s => s.burnoutScore)` (if you add a gauge here)

### 8. `src/features/settings/SettingsPage.tsx` — Wire to store

**Current:** All `useState` with indices.

**Changes:**
- Add:
  ```ts
  import { useStore } from '@/store'
  import type { EnergyLevel } from '@/types'
  import { supabase } from '@/shared/lib/supabase'
  ```
- **App Mode** (currently `useState(0)` index):
  ```ts
  const { appMode, setAppMode } = useStore()
  const modeIndex = ['minimal', 'habit', 'system'].indexOf(appMode)
  // onClick: setAppMode(['minimal', 'habit', 'system'][i] as AppMode)
  ```
- **Timer** (currently `useState(0)` index):
  ```ts
  const { timerStyle, setTimerStyle } = useStore()
  const timerIndex = ['countdown', 'countup', 'surprise'].indexOf(timerStyle)
  // onClick: setTimerStyle(['countdown', 'countup', 'surprise'][i])
  ```
- **Energy**:
  ```ts
  const { energyLevel, setEnergyLevel } = useStore()
  <EnergyPicker selected={energyLevel - 1} onSelect={(i) => setEnergyLevel((i + 1) as EnergyLevel)} />
  ```
- **Phase** (seasonal mode, currently `useState(1)` index):
  ```ts
  const { seasonalMode, setSeasonalMode } = useStore()
  const phaseKeys = ['launch', 'maintain', 'recover', 'sandbox'] as const
  const phaseIndex = phaseKeys.indexOf(seasonalMode)
  // onClick: setSeasonalMode(phaseKeys[i])
  ```
- **Rest Mode** toggle:
  ```ts
  const { flexiblePauseUntil, setFlexiblePauseUntil } = useStore()
  const restMode = flexiblePauseUntil ? new Date(flexiblePauseUntil) > new Date() : false
  // onChange: setFlexiblePauseUntil(checked ? new Date(Date.now() + 24*3600*1000).toISOString() : null)
  ```
- **Reduced Stimulation** toggle:
  ```ts
  const { reducedStimulation, setReducedStimulation } = useStore()
  ```
- **User email**: `useStore(s => s.email)` (show instead of `user@mindshift.app`)
- **Subscription tier**: `useStore(s => s.subscriptionTier)` → display "Free" / "Pro Trial" / "Pro"
- **Sign out**:
  ```ts
  const { signOut } = useStore()
  // onClick: async () => { await supabase.auth.signOut(); signOut(); }
  ```
- **Export**: wire to edge function `gdpr-export` (or keep as placeholder button for now)
- **Delete account**: wire to edge function `gdpr-delete` (or keep as placeholder)
- Legal links: use `<Link to="/privacy">`, `<Link to="/terms">`, `<Link to="/cookie-policy">`

### 9. `src/features/onboarding/OnboardingPage.tsx` — Wire to store

**Current:** `useState` for selections, navigates to `/` on finish. Doesn't persist anything.

**Changes:**
- Add:
  ```ts
  import { useStore } from '@/store'
  import type { EnergyLevel } from '@/types'
  ```
- On final "Let's go ✨" button (`handleNext` when `step === 3`):
  ```ts
  const { setAppMode, setEnergyLevel, setTimerStyle, setOnboardingCompleted } = useStore()

  // Step 0: What brings you here → appMode
  const modeMap = ['minimal', 'habit', 'system'] as const
  if (selections[0] !== null) setAppMode(modeMap[selections[0]])

  // Step 1: Energy → energyLevel (picker is 0-indexed)
  setEnergyLevel((energy + 1) as EnergyLevel)

  // Step 2: Timer style
  const timerMap = ['countdown', 'countup', 'surprise'] as const
  if (selections[2] !== null) setTimerStyle(timerMap[selections[2]])

  // Step 3: Cognitive focus (this step doesn't map to a direct store setter anymore,
  // but selection 0 = "one at a time" could reinforce 'minimal', selection 1 = 'system')
  // NOTE: cognitiveMode is DEPRECATED. You can skip this or use appMode override.

  setOnboardingCompleted()
  navigate('/')
  ```

### 10. `src/components/BottomNav.tsx` — Already functional

This component uses `react-router` `useLocation`/`useNavigate` and needs no store wiring. It's already working. **Leave as-is.**

### 11. `src/components/MochiAvatar.tsx` — Pure SVG

No store wiring needed. **Leave as-is.**

### 12. `src/components/Fab.tsx` — Pure UI

No store wiring needed. **Leave as-is.**

---

## After Wiring: Remove Mock-Data Imports

Once all files are wired, verify no file still imports from `@/lib/mock-data`:
```bash
grep -r "mock-data" src/ --include="*.tsx" --include="*.ts"
```

If only `src/lib/mock-data.ts` references itself, the file can stay (no harm). But no component should import from it.

---

## Creating New Tasks: Full Task Object Template

Whenever you need to create a Task (in AddTaskModal or elsewhere):

```ts
import type { Task } from '@/types'

const task: Task = {
  id: crypto.randomUUID(),
  title: 'Task title',
  pool: 'now',                    // 'now' | 'next' | 'someday'
  status: 'active',               // always 'active' for new tasks
  difficulty: 1,                  // 1 | 2 | 3
  estimatedMinutes: 25,
  createdAt: new Date().toISOString(),
  completedAt: null,
  snoozeCount: 0,
  parentTaskId: null,
  position: 0,
  dueDate: null,
  dueTime: null,
  taskType: 'task',               // 'task' | 'idea' | 'reminder'
  reminderSentAt: null,
}
```

---

## Verification Checklist

Run these in order after all changes:

### 1. TypeScript
```bash
npx tsc --noEmit
```
- Must pass with **no new errors**. The 2 pre-existing errors are OK.

### 2. Build
```bash
npm run build
```
- Must succeed. Check for tree-shaking warnings about mock-data.

### 3. Dev Server Visual Check
```bash
npm run dev
```
Open in browser and verify:
- [ ] `/` (HomePage) loads, shows real energy picker, tasks from store
- [ ] Adding a task via FAB actually creates it in the store
- [ ] Completing a task moves it to "Done recently"
- [ ] Parking a task moves it NOW → NEXT
- [ ] `/tasks` shows all 3 pools + done section from real data
- [ ] `/focus` shows task picker from real tasks, can start a session
- [ ] `/progress` shows real XP, achievements, completedTotal
- [ ] `/settings` shows real appMode/timerStyle/energy/phase, toggles persist after reload
- [ ] `/onboarding` saves choices to store on completion
- [ ] Energy picker works everywhere (HomePage, Settings, Onboarding)
- [ ] Page refresh preserves all state (Zustand persist)

### 4. E2E Tests
```bash
npx playwright test
```
- Existing e2e tests may need updating if they reference old copy or selectors.

### 5. No Mock-Data Imports Remaining
```bash
grep -r "mock-data" src/ --include="*.tsx" --include="*.ts" | grep -v "src/lib/mock-data.ts"
```
- Should return empty.

---

## Order of Operations (Recommended)

1. **TaskCard** + **EnergyPicker** first (shared components, needed by all pages)
2. **AddTaskModal** (needs Task type + store)
3. **HomePage** (uses all 3 above)
4. **TasksPage** (uses TaskCard + AddTaskModal)
5. **SettingsPage** (independent, straightforward)
6. **OnboardingPage** (independent, straightforward)
7. **ProgressPage** (mostly read-only from store)
8. **FocusPage** (most complex — timer integration)
9. Run full verification checklist

---

## Summary of What You're Changing

| File | What changes |
|---|---|
| `src/components/TaskCard.tsx` | `MockTask` → `Task`, `difficultyConfig` → `DIFFICULTY_MAP`, derive carry-over/idea/reminder |
| `src/components/AddTaskModal.tsx` | Wire to `addTask()`, difficulty string→number, construct full Task, remove `onAdd`/`nowCount` props |
| `src/components/EnergyPicker.tsx` | `energyOptions` → `ENERGY_LABELS`/`ENERGY_EMOJI` from constants |
| `src/features/home/HomePage.tsx` | `mockTasks` → store pools, wire energy/complete/snooze/addTask, real stats |
| `src/features/focus/FocusPage.tsx` | `mockTasks` → `selectActiveTasks`, wire session start/end, real timer/progress |
| `src/features/tasks/TasksPage.tsx` | `mockTasks` → store pools, wire complete/snooze, `DIFFICULTY_MAP` in done section |
| `src/features/progress/ProgressPage.tsx` | Static data → `xpTotal`, `completedTotal`, `achievements`, `weeklyStats` |
| `src/features/settings/SettingsPage.tsx` | `useState(index)` → store getters/setters for all settings |
| `src/features/onboarding/OnboardingPage.tsx` | Save selections to store on completion |

**Total: 9 files to modify. 0 new files. 0 deleted files.**
