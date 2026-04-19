# HANDOFF — MindShift launch-blocker fixes (3 tasks) — REV2

**To:** Claude Code CLI (Terminal-Atlas) on `C:/Users/user/Downloads/mindshift/`
**From:** Cowork-Atlas (orchestrator)
**Date:** 2026-04-19 — REV2 (REV1 superseded; three Terminal-Atlas discrepancies corrected)
**Priority:** P0 — blocks Design-Claude Play Store screenshot recapture, which blocks Play Console submission
**Branch:** `fix/burnout-nan-guard`
**Merge target:** `release/mindshift-v1.0` (NOT main — main is frozen until AAB upload)

## Why REV2 exists

Terminal-Atlas caught three discrepancies between REV1 and actual source code after reading real files. REV2 absorbs the corrections. Prior revisions (initial + REV1) are superseded.

| # | REV1 said | Reality (verified via Read tool this session) |
|---|-----------|----------------------------------------------|
| 1 | `computeBurnoutScore(behaviors: BurnoutBehaviors[])` returns `number \| null` | `computeBurnoutScore(behaviors: BurnoutBehaviors): number` — takes single object, returns plain number, `deriveBehaviors` already has div-by-zero guards. Cannot produce NaN from finite inputs. |
| 2 | Task 3 edits `ProgressPage.tsx` 3-col grid | `ProgressPage.tsx` is a thin composition. The actual 3-col grid (Achievements / Tasks Done / Burnout) lives in `src/features/progress/StatsGrid.tsx`. `String(burnoutScore)` at line 18 is the literal NaN render site. |
| 3 | Task 2 adds fallback to `useSessionHistory` | `useSessionHistory` already has a fallback at lines 143-151 (`computeWeeklyStats([])` — returns zeros). The real problem is that on error/empty, the hook still fires `setWeeklyStats(data.stats)` via useEffect at lines 232-247, overwriting last-known-good values with zeros. Correct fix: don't overwrite. |

## Root cause re-diagnosis

NaN doesn't originate in `burnout.ts`. `computeBurnoutScore(behaviors)` cannot produce NaN from finite inputs because `deriveBehaviors()` guards every division.

NaN enters the pipeline at **App.tsx:166-183** in the callsite that writes to store:

```ts
const avgCompletedPerDay = completedTotal / 7
const behaviors = deriveBehaviors({
  snoozedCount: poolSnoozedCount,
  activeCount: Math.max(poolActiveCount, 1),
  recentCompletedPerDay: avgCompletedPerDay * (energyLevel / 3),
  //                                          ^^^^^^^^^^^^^^^
  //                    undefined / 3 = NaN (pre-hydration, or capture-script that omits energyLevel)
  avgCompletedPerDay,
  recentSessionMinutes: 20 * (energyLevel / 3),  // same risk
  avgSessionMinutes: 20,
  recentAvgEnergy: energyLevel,
})
const rawScore = computeBurnoutScore(behaviors)
...
setBurnoutScore(adjustedScore)  // <-- NaN lands in store
```

Then **StatsGrid.tsx:18** renders the literal string:

```ts
{ value: String(burnoutScore), emoji: '🧠', label: t('progress.burnoutScoreLabel') }
//        ^^^^^^^^^^^^^^^^^^^
//        String(NaN) === 'NaN' — this is what Design-Claude saw on screenshot 04
```

`BurnoutAlert` is not the render site — it returns `null` when `score <= 40`, and `NaN > 40` is false, so BurnoutAlert silently hides. Only StatsGrid's tiny Burnout cell shows the literal `"NaN"` text.

The proven guard pattern already exists in the codebase at **HomeDailyBrief.tsx:72**:

```ts
content: <BurnoutGauge score={isNaN(burnoutScore) ? 0 : (burnoutScore ?? 0)} />
```

Use the same pattern in StatsGrid. Plus defense-in-depth at the setter and App.tsx callsite.

## Task 1 — Guard NaN at the StatsGrid render site + setter + App.tsx callsite

Signature-sensitive. Do NOT change `computeBurnoutScore`'s signature (it's `(behaviors: BurnoutBehaviors) => number` — keep it).

**1a. `src/features/progress/StatsGrid.tsx` line 18** — mirror the HomeDailyBrief pattern:

```ts
const safeBurnoutScore = isNaN(burnoutScore) ? 0 : (burnoutScore ?? 0)
// ...
{ value: String(safeBurnoutScore), emoji: '🧠', label: t('progress.burnoutScoreLabel') }
```

**1b. `src/store/slices/userSlice.ts` line 173** — guard the setter so NaN never reaches persistence:

```ts
setBurnoutScore: (score) => set({ burnoutScore: Number.isFinite(score) ? score : 0 })
```

**1c. `src/app/App.tsx` lines 166-183** — guard `energyLevel` at the callsite so the math can't produce NaN:

```ts
const energyForMath = Number.isFinite(energyLevel) && energyLevel > 0 ? energyLevel : 3
const avgCompletedPerDay = completedTotal / 7
const behaviors = deriveBehaviors({
  snoozedCount: poolSnoozedCount,
  activeCount: Math.max(poolActiveCount, 1),
  recentCompletedPerDay: avgCompletedPerDay * (energyForMath / 3),
  avgCompletedPerDay,
  recentSessionMinutes: 20 * (energyForMath / 3),
  avgSessionMinutes: 20,
  recentAvgEnergy: energyForMath,
})
// rest unchanged
```

(Default of 3 matches the mid-scale EnergyLevel; keeps semantic neutrality when pre-hydration.)

Together these three close the NaN pathway at three layers: callsite (source), setter (persistence), render (display). If any single layer regresses in a future edit, the other two still hold.

## Task 2 — Stop `useSessionHistory` from overwriting store with zeros on error/empty

Current behavior at `src/shared/hooks/useSessionHistory.ts` lines 143-151:

```ts
if (error) {
  logError('useSessionHistory.fetch', error)
  return {
    sessions: [],
    energyTrend: [],
    weeklyInsight: FALLBACK_INSIGHTS,
    stats: computeWeeklyStats([]),  // <-- all-zeros WeeklyStats
  }
}
```

Then at lines 232-247 the useEffect unconditionally pushes to store:

```ts
useEffect(() => {
  if (data?.stats) {
    setWeeklyStats(data.stats)  // <-- zeros overwrite last-known-good
    ...
  }
}, [data?.stats, setWeeklyStats])
```

Fix is two-part and minimal:

**2a. Change return type of error path to signal "no data" explicitly.**

Update `SessionQueryResult` interface at line 121-126:

```ts
interface SessionQueryResult {
  sessions: FocusSessionRow[]
  energyTrend: number[]
  weeklyInsight: string[]
  stats: WeeklyStats | null  // <-- was WeeklyStats
}
```

Error branch returns `stats: null`:

```ts
if (error) {
  logError('useSessionHistory.fetch', error)
  return {
    sessions: [],
    energyTrend: [],
    weeklyInsight: FALLBACK_INSIGHTS,
    stats: null,  // <-- was computeWeeklyStats([])
  }
}
```

Success branch with empty data also returns `stats: null` (no data yet = don't overwrite):

```ts
const sessions: FocusSessionRow[] = (data ?? []) as FocusSessionRow[]
const stats = sessions.length === 0 ? null : computeWeeklyStats(sessions)
```

**2b. useEffect at 232-247 already has `if (data?.stats)` — null bypasses it naturally.** No change needed there; the null just short-circuits the setter call, so store.weeklyStats retains previous values (or its default).

This keeps React Query as the single source of truth for session data. The hook never reads from store. Store only gets written when real data exists.

## Task 3 — NaN-guard in StatsGrid is sufficient; defer "Building your baseline" placeholder copy

Terminal-Atlas should ONLY implement the Task 1a NaN guard in StatsGrid (already covered above). Do NOT add "Building your baseline · N more sessions" placeholder copy — the StatsGrid cell is tiny (text-[18px] in a 2.5-padded card) and cannot fit multi-line copy without breaking the 3-col grid layout.

Cowork-Atlas is filing a question back to Design-Claude:

> "StatsGrid Burnout cell is 1/3 of a row, too small for 'Building your baseline · N more sessions' copy. Options for the empty-state: (a) show '0' with neutral framing (matches HomeDailyBrief pattern, minimal change, ships now), (b) show '—' dash (ambiguous but honest), (c) widen/taller empty-state card breaking 3-col layout, (d) replace Burnout cell with a different stat until data exists. Which do you want? Default for this sprint: (a). The 'Building your baseline' copy can live elsewhere on Progress screen if you spec that component separately."

Default for REV2 ship: Task 1a guard renders "0" when NaN. Design-Claude's copy decision slots in as a follow-up sprint without blocking Play Store submission.

## Out of scope for this PR (explicit)

- No new store field `sessionHistory: FocusSessionRow[]`. REV1 Part B removed — React Query stays the single source of truth.
- No seed of `DEMO_STATE.sessionHistory`. Screenshot 07 (populated Session Log) remains empty-state for v1.0. Design-Claude's recapture spec v1.0 screenshots around that — he adjusts copy on screenshot 07 to reflect genuine first-run empty state.
- No change to `computeBurnoutScore` signature or `burnout.ts`. The function is correct. NaN guards live at the boundaries.
- No palette changes. No animation changes. No new dependencies.
- No changes to VOLAURA, Life Simulator, BrandedBy, ZEUS. Everything except VOLAURA + MindShift is frozen per CEO directive 2026-04-19.

## Merge-gate requirements (ALL must pass before merge into `release/mindshift-v1.0`)

1. `tsc -b` — zero errors (NOT `tsc --noEmit`).
2. `npx playwright test` — all existing e2e pass. Add one new test that loads Progress screen with an empty Supabase mock and verifies the Burnout cell renders `"0"` (not `"NaN"`).
3. `npx vitest run` — all existing unit tests pass. Add one unit test for `setBurnoutScore(NaN)` resulting in store.burnoutScore === 0.
4. Commit message body MUST include this exact line:
   `UI state: StatsGrid Burnout cell guards NaN → renders '0' when burnoutScore undefined/NaN. WeeklyStats preserved on Supabase empty/error.`
5. No red. Run: `grep -rn "#EF4444\|#DC2626\|#FF0000\|red-[0-9]" src/ --include="*.tsx" --include="*.ts" --include="*.css"` — output must be empty. Foundation Law #1.

## Downstream

Once merged into `release/mindshift-v1.0`:
1. Design-Claude runs `npx tsx scripts/capture-screenshots.ts` locally on fixed build.
2. Design-Claude diffs new 04-progress.png — verifies Burnout cell shows `"0"` (or real value if seeded energyLevel), no `"NaN"` anywhere.
3. Design-Claude answers Cowork-Atlas's question on empty-state copy — triggers a follow-up UX sprint if (c) or (d).
4. Design-Claude ships 8 fresh screenshots + feature-graphic verdict to Cowork-Atlas via Yusif-courier.
5. Cowork-Atlas verifies diff, Yusif uploads to Play Console.

## Verification checklist for Claude Code CLI when done

- [ ] Branch created: `git checkout -b fix/burnout-nan-guard` (or reuse existing)
- [ ] Task 1a: `StatsGrid.tsx` guards `String(burnoutScore)` via `isNaN()` + `??` pattern
- [ ] Task 1b: `userSlice.ts` `setBurnoutScore` uses `Number.isFinite` guard
- [ ] Task 1c: `App.tsx` burnout callsite guards `energyLevel` via `Number.isFinite` + > 0, default 3
- [ ] Task 2a: `useSessionHistory.ts` `SessionQueryResult.stats` typed `WeeklyStats | null`; error branch returns `null`; empty-data branch also returns `null`
- [ ] `tsc -b` — 0 errors
- [ ] `npx playwright test` — all pass + new Progress empty-state test
- [ ] `npx vitest run` — all pass + new `setBurnoutScore(NaN)` test
- [ ] Red-check grep — empty
- [ ] Commit body has required verbatim line
- [ ] Push to `origin fix/burnout-nan-guard`
- [ ] Open PR targeting `release/mindshift-v1.0`
- [ ] Report back to Yusif (he forwards to Cowork-Atlas): "fix/burnout-nan-guard PR #NNN opened, all checks green"

## Model guidance

All three tasks are mechanical, guard-insertion work. Sonnet sufficient. Read each target file before editing — do not trust this handoff's line numbers blindly, verify against actual file state at edit time.

Do NOT call external APIs. Do NOT modify anything outside the target files + their tests. Do NOT touch main branch.

## REV2 signoff

Filed by: Cowork-Atlas 2026-04-19, after Terminal-Atlas's three-discrepancy report. All three findings verified against source (burnout.ts, ProgressPage.tsx, StatsGrid.tsx, BurnoutAlert.tsx, FocusScoreCard.tsx, XpCard.tsx, useSessionHistory.ts, App.tsx, userSlice.ts, HomeDailyBrief.tsx). REV1 superseded. This is the canonical handoff for Terminal-Atlas.
