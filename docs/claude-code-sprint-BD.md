# Sprint BD — "World-Class Polish" — Claude Code Prompt

Copy everything below this line into Claude Code.

---

## Context

You are continuing work on MindShift, an ADHD-aware productivity PWA. Sprints BB (Hardening) and BC (Decomposition) are complete and verified. This sprint focuses on bringing the project to world-class quality using the full toolchain.

## Pre-flight

Before writing any code, run the verification pipeline:
```
/verify
```
All three checks (tsc -b, vite build, playwright) must pass. If anything fails, fix it first.

## What changed since your last session

1. **New guardrails** — `.claude/rules/guardrails.md` — 10 sections of hard rules. Read this FIRST. Every code change must comply. Highlights:
   - Rule 6: UX copy must pass the humanizer skill (`.claude/skills/humanizer/SKILL.md`). No "pivotal", no "amazing", no sycophancy.
   - Rule 8: `tsc -b` (not `tsc --noEmit`) is the gate. `--noEmit` misses `noUnusedLocals`.
   - Rule 2: Every animated component must use `useMotion()`. No bypasses.

2. **Humanizer skill** — `.claude/skills/humanizer/SKILL.md` installed. Use it to audit ALL user-facing strings (UI copy, toasts, Mochi messages, onboarding, settings, empty states). Run `/humanizer` on any text block you write or find.

3. **Verify command fixed** — `.claude/commands/verify.md` now uses `tsc -b` instead of `tsc --noEmit`.

## Sprint BD Tasks (in order)

### Phase 1: UX Copy Audit (humanizer pass)

Scan every user-facing string in the project and fix AI-isms. Priority files:

1. `src/shared/lib/i18n/en.ts` — all i18n strings
2. `src/shared/lib/i18n/ru.ts` — Russian strings
3. `src/features/focus/MochiSessionCompanion.tsx` — Mochi hardcoded messages
4. `src/features/focus/PostSessionFlow.tsx` — NatureBuffer and RecoveryLock copy
5. `src/features/focus/ShutdownRitual.tsx` — evening ritual copy
6. `src/features/focus/WeeklyPlanning.tsx` — weekly ritual copy
7. `src/features/focus/MonthlyReflection.tsx` — monthly ritual copy
8. `src/features/tasks/RecoveryProtocol.tsx` — 72h+ recovery copy
9. `src/features/tasks/ContextRestore.tsx` — 30-72h return copy
10. `src/features/home/HomePage.tsx` — greeting, daily brief, empty states
11. `src/features/onboarding/OnboardingPage.tsx` — onboarding steps copy
12. `src/features/progress/ProgressPage.tsx` — stats, achievements, insights copy
13. `src/shared/lib/constants.ts` — ENERGY_LABELS, ENERGY_EMOJI
14. `src/types/index.ts` — ACHIEVEMENT_DEFINITIONS descriptions

Apply humanizer rules:
- No significance inflation ("pivotal", "transformative", "crucial")
- No promotional tone ("stunning", "groundbreaking", "powerful")
- No sycophancy ("Great job!", "Amazing!", "You're incredible!")
- Instead: warm, grounded, specific ("3 tasks done. Solid.", "You showed up. That counts.")
- No rule-of-three padding
- Em dashes max 1 per paragraph
- Functional emojis only (energy, phase, type) — never decorative headers

### Phase 2: Accessibility Sweep

Use the `code-reviewer` agent in review context:
```
@code-reviewer Review all interactive components for WCAG AA compliance
```

Check specifically:
1. Every `<button>` has `aria-label` or visible text content
2. Every toggle uses `aria-pressed`
3. Every expandable section uses `aria-expanded`
4. Every clickable element has `focus-visible:ring-2`
5. Color is never the sole information carrier (pair with text/icon/shape)
6. `EnergyPicker` boundary: picker uses 0-4, store uses 1-5

Files to audit:
- `src/components/TaskCard.tsx`
- `src/components/AddTaskModal.tsx`
- `src/components/Fab.tsx`
- `src/components/EnergyPicker.tsx`
- `src/features/focus/FocusSetup.tsx` (new file from BC — no a11y audit yet)
- `src/features/focus/FocusRoomSheet.tsx`
- `src/features/focus/ArcTimer.tsx`
- `src/features/home/widgets/` (all bento widgets)
- `src/features/settings/SettingsPage.tsx`

### Phase 3: Motion System Audit

Verify every component using `motion.div` or `AnimatePresence` also uses `useMotion()`:

```bash
grep -rn "motion\." src/ --include="*.tsx" | grep -v "useMotion" | grep -v "import" | grep -v "//" | sort -u
```

Any file that uses `motion.div` but doesn't import `useMotion` needs fixing. Gate pattern:
```tsx
const { shouldAnimate, t } = useMotion()
// ...
initial={shouldAnimate ? { opacity: 0 } : {}}
transition={shouldAnimate ? t() : { duration: 0 }}
```

### Phase 4: Dead Code & Bundle Cleanup

1. Run: `grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "// debug" | grep -v "eslint-disable"`
   - Remove all non-debug console.log statements
2. Run: `npx tsc -b` — fix any `noUnusedLocals` or `noUnusedParameters` errors
3. Check for duplicate helper functions (e.g., `getWeekStart()` exists in both `dateUtils.ts` and `useSessionHistory.ts` — deduplicate)
4. Verify `cognitiveMode` is never read or set anywhere (deprecated Sprint B)

### Phase 5: E2E Test Coverage

Run existing tests first:
```
npx playwright test --reporter=list
```

Then write NEW tests for features that lack coverage:
1. **FocusSetup** (new from BC) — test setup screen renders, duration picker works, start button works
2. **FocusRoomSheet** — test create/join room UI
3. **WeeklyPlanning** — test ritual triggers and completes
4. **MonthlyReflection** — test ritual triggers and completes
5. **ShutdownRitual** — test ritual triggers and completes
6. **HistoryPage** — test session log renders
7. **Search in TasksPage** — test search filters tasks

Follow patterns from `e2e/helpers.ts`. Use `seedStore()` + `mockSupabase()`. Target: 150+ tests.

### Phase 6: Final Verification

```
/verify
```

Then commit everything:
```bash
git add -A
git commit -m "Sprint BD: world-class polish — humanizer copy audit, a11y sweep, motion audit, dead code cleanup, new e2e tests"
```

## Rules (non-negotiable)

Read `.claude/rules/guardrails.md` before starting. Key constraints:
- **Never red** — any hue. Teal/indigo/gold only.
- **Never shame** — no "failed", "overdue", "behind", "you missed".
- **Always dismissible** — every overlay, every ritual, every nudge.
- **`tsc -b` must pass** — not `tsc --noEmit`.
- **Humanizer on all copy** — no AI-isms in user-facing text.
- **`motion/react`** — never `framer-motion`.
- **`useMotion()`** — on every animated component without exception.

## Agents available

- `/build-fix` — auto-fix build errors
- `/verify` — full pipeline (tsc -b + build + e2e)
- `/tdd` — test-driven development workflow
- `/e2e` — run and fix e2e tests
- `@code-reviewer` — review for quality, a11y, ADHD-safe patterns
- `@build-error-resolver` — fix tsc/vite errors
- `@e2e-runner` — run and fix playwright tests

Use the right agent for the right job. Don't do everything manually.
