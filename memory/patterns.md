# Code Patterns — MindShift

**Purpose:** Established patterns to follow for consistency. Check here before writing boilerplate.
**Format:** Pattern name → When to use → Example or location

---

## React Patterns

### Lazy overlay pattern
All full-screen overlays (z-50) are lazy-loaded and mutually exclusive.
```tsx
const RecoveryProtocol = React.lazy(() => import('@/features/tasks/RecoveryProtocol'))
// In App.tsx — only one renders, priority order enforced
{showRecovery ? <RecoveryProtocol /> : showContext ? <ContextRestore /> : ...}
```
Priority order (App.tsx): RecoveryProtocol > ContextRestore > BreathworkRitual > ShutdownRitual > WeeklyPlanning > MonthlyReflection > FirstFocusTutorial.

### List item memoization
All list-rendered components must be `React.memo` with explicit custom comparator.
```tsx
export const TaskCard = React.memo(function TaskCard(props: Props) { ... }, (prev, next) =>
  prev.id === next.id &&
  prev.status === next.status &&
  prev.title === next.title &&
  prev.dueDate === next.dueDate &&
  prev.difficulty === next.difficulty &&
  prev.note === next.note
)
```
Applied to: TaskCard, ArcTimer, MochiSessionCompanion, BurnoutAlert.

### Filtered list memoization
Every filtered/sorted task list in pages uses `useMemo`.
```tsx
const nowTasks = useMemo(
  () => nowPool.filter(t => t.status !== 'done'),
  [nowPool]
)
```

### Animated component gating
```tsx
const { shouldAnimate, t } = useMotion()
<motion.div
  initial={shouldAnimate ? { opacity: 0, y: 10 } : {}}
  animate={{ opacity: 1, y: 0 }}
  transition={shouldAnimate ? t('default') : { duration: 0 }}
>
```

---

## Store Patterns

### Adding a persisted field
1. Add to slice state type
2. Add initial value in `createXxxSlice`
3. Add setter function
4. **Add to `partialize()`** — do not skip this
```ts
partialize: (state) => ({
  // ... existing
  yourNewField: state.yourNewField,
})
```

### Pool limit calculation
Never hardcode `3` or `6`. Always:
```ts
import { getNowPoolMax } from '@/shared/lib/constants'
const limit = getNowPoolMax(appMode, seasonalMode)
```

### Task difficulty colors
Never hardcode "Easy" / "teal". Always:
```ts
import { DIFFICULTY_MAP } from '@/types'
const { label, color } = DIFFICULTY_MAP[task.difficulty]
```

---

## AI / Edge Function Patterns

### Instant fallback + AI replacement
```tsx
// 1. Show hardcoded immediately
setActiveBubble({ text: hardcodedMessage, mascotState: 'neutral' })

// 2. Fire AI async
const result = await callMochiRespond(context)  // 8s timeout built in

// 3. Replace if still visible
if (result && bubbleRef.current) {
  setActiveBubble({ text: result.message, mascotState: result.mascotState })
}
```

### Edge function locale injection
```ts
// In every edge function call from client:
const locale = navigator.language  // e.g. "ru-RU"
const response = await supabase.functions.invoke('mochi-respond', {
  body: { ...context, locale }
})
```

---

## i18n Patterns

### Translation key naming
```
namespace.screen.element_description
mochi.neutral.phase_release       → array of messages
mochi.psychotype.achiever.milestone_15 → specific psychotype + milestone
tutorial.step_1.title
push.reminder.title
```

### Accessing array translations (Mochi messages)
```ts
const { t } = useTranslation()
const messages = t('mochi.neutral.phase_release', { returnObjects: true }) as string[]
const picked = messages[Math.floor(Math.random() * messages.length)]
```

### Adding new locale keys
1. Add to `src/locales/en.json` (source of truth)
2. Run `node scripts/translate.mjs` to auto-translate into ru/az/tr/de/es
3. Verify translations in `src/locales/*.json` — auto-translate is a starting point, may need review

---

## Supabase Patterns

### Offline queue
```ts
import { enqueue } from '@/shared/lib/offlineQueue'
// Use instead of direct supabase.from().insert() for user-initiated writes
enqueue({ table: 'tasks', operation: 'insert', data: task })
```

### Session history (read-only)
Never call `supabase.from('focus_sessions')` directly from components.
```ts
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'
const { sessions, weeklyStats } = useSessionHistory()
```

### Task sync
Never write a parallel sync mechanism.
```ts
import { useTaskSync } from '@/shared/hooks/useTaskSync'
// Handles bidirectional sync, server-wins on login, local-push on first device
useTaskSync()
```

---

## Accessibility Patterns

### Interactive elements
```tsx
<button
  aria-label="Close modal"          // required if no visible text
  aria-pressed={isActive}           // for toggle buttons
  className="focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
>
```

### Expandable sections
```tsx
<button aria-expanded={isOpen} aria-controls="section-content">
  {label}
</button>
<div id="section-content" hidden={!isOpen}>
  {children}
</div>
```

### CSS animations
```css
@keyframes pulse {
  /* animation definition */
}
.animated-element {
  animation: pulse 2s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
  }
}
```

---

## Testing Patterns

### Supabase mock
```ts
// In e2e test file:
await page.route('**/rest/v1/tasks*', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockTasks)
  })
})
```

### Store seeding
```ts
// From e2e/helpers.ts:
await seedStore(page, {
  nowPool: [mockTask],
  energyLevel: 3,
  onboardingCompleted: true,
})
```

### Selector preference
```ts
// Best: role (accessibility-first)
page.getByRole('button', { name: 'Add task' })

// OK: testid for non-interactive elements
page.getByTestId('task-card-uuid-123')

// Avoid: raw text (breaks on i18n)
page.getByText('Add task')  // ❌ breaks when locale changes
```
