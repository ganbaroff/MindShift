# TASK-PROTOCOL v7.0 — MindShift Team Operating Standard

> **Owner:** Yusif Ganbarov
> **Project:** MindShift — ADHD-aware productivity PWA
> **Updated:** 2026-04-02 (v7.0 — L1-L5 classification, Sprint Gate DSP, Completion Consensus, Session Context Injection, HOTFIX 4-box, Efficiency Gate scope, Concurrent Edit Protocol)
> **Status:** ACTIVE — all Claude Code agents follow this protocol without exception

---

## PRIME DIRECTIVE — AUTONOMY FIRST

**Never escalate to Yusif unless the team is genuinely blocked after real attempts.**

The owner operates at strategy level. The team resolves everything at execution level.

| Situation | Action |
|-----------|--------|
| Missing file path | `glob` + `grep` before asking |
| Unknown architecture decision | Run ARCH + SEC agents, debate internally |
| Missing env var | Check `.env`, `.env.example`, memory, Vercel docs |
| Build error | `build-error-resolver` agent — minimum 3 fix attempts |
| Unclear requirement | Infer from CLAUDE.md + existing code patterns |
| Need Yusif | Only for: production credentials that exist nowhere, explicit business decisions (pricing, launch date, partnerships), Supabase Dashboard manual actions requiring his login |

**Escalation threshold: 3 genuine attempts minimum before any "I need your input" message.**

---

## BEFORE EVERY BATCH — Required Reads (30 seconds, non-skippable)

### Tier 1 — Always read (every session, every batch)
```
□ sprint-state: CLAUDE.md Sprint History → WHERE ARE WE
□ mistakes: TASK-PROTOCOL.md Backlog Priorities → what's open/blocked
□ guardrails: .claude/rules/guardrails.md → what NEVER to do
```

### Tier 2 — Read if relevant (domain match)
```
□ Store changes → src/store/index.ts + partialize()
□ Auth/security → .claude/rules/security.md + AuthGuard.tsx
□ New dep → vite.config.ts + package.json (PERF sign-off required)
□ Edge function → supabase/functions/ + rate limit logic
□ E2E changes → e2e/helpers.ts + playwright.config.ts
```

### Tier 3 — Reference (as needed)
```
□ CLAUDE.md full → Architecture sections, Stack hot cache
□ ADRs in docs/adr/ → architecture decisions
□ .claude/rules/testing.md → test patterns
```

**All Tier 1 items empty before batch start = CLASS 3 mistake.**

---

## FLOW DETECTION — Declare BEFORE executing

```
CEO says "загрузи протокол и делай"    →  FULL PROTOCOL (5 steps)
CEO says "что дальше / propose"        →  TEAM PROPOSES (Step 1.5 → 2.0)
CEO says "срочно / P0"                 →  HOTFIX  (keep security 4-box)
CEO says "быстро / today"              →  EXPEDITED (1 critique round, keep security)
```

### HOTFIX path (P0 only)
```
□ Rate limiting preserved?
□ RLS policies unaffected?
□ TypeScript validation on new input paths?
□ Auth/session logic unchanged or SEC agent reviewed?
```
All 4 must be ✅ before commit. No exceptions — not even for 1-line fixes.

### EXPEDITED path
- 1 critique round (not 2)
- Security 4-box still mandatory
- BATCH_ID still required
- Completion Consensus still required (Step 4.0.5)

---

## PHASE 0.7 — SPRINT GATE (fires BEFORE Team Proposes)

When flow = FULL PROTOCOL, run this check FIRST:

```
SPRINT GATE:
  □ Current sprint: [read from CLAUDE.md Sprint History]
  □ What's in progress: [open P0/P1 items from Backlog]
  □ Any BLOCKS_LAUNCH items unresolved? → fix those first
  □ Batch fits current sprint goal? → yes / no (if no, justify)
```

If a BLOCKS_LAUNCH item exists → that item becomes Step 1.5 forced P0. Nothing else ships first.

---

## THE TEAM

| Role | Real-world title | Claude Agent | Responsibility |
|------|-----------------|--------------|----------------|
| **ARCH** | Lead Engineer / Architect | `general-purpose` | Store integrity, decomposition, types, migrations |
| **SEC** | Security Engineer | `sec` | Auth, edge functions, GDPR, secrets, RLS |
| **PERF** | Performance Engineer | `bundle-analyzer` | Bundle, React memo, hooks, audio, Web Vitals |
| **UX** | UX + Accessibility Engineer | `a11y-scanner` + `guardrail-auditor` | ADHD safety, copy, a11y, motion, color |
| **TEST** | QA Engineer | `e2e-runner` | Playwright E2E, unit tests, coverage gaps |
| **INFRA** | Platform / DevOps Engineer | `infra` | CI/CD, Vercel, Supabase migrations, PWA, SW |
| **LIVEOPS** | Live Ops / SRE | `liveops` | Production health, Sentry errors, Vercel logs, user-facing incidents |
| **GROWTH** | Growth Engineer | `growth` | Analytics, funnel gaps, retention metrics, A/B hooks |

LIVEOPS runs FIRST after any prod deploy or user-reported incident.

---

## THE FIVE STEPS (non-negotiable order)

```
0.5  FLOW DETECTION    → classify task type, declare level
0.7  SPRINT GATE       → verify against current sprint (FULL only)
1.0  TEAM READS        → parallel reads of all relevant files
1.5  TEAM PROPOSES     → each agent returns ranked findings
2.0  DEBATE + LOCK     → triage, priority vote, declare BATCH-ID + named roles
3.0  EXECUTE           → implement, tsc -b, commit
4.0  CLOSE             → Completion Consensus → docs → memory → "what's next"
```

---

## STEP 0.5 — FLOW DETECTION

Classify incoming request before anything else:

| Signal | Route |
|--------|-------|
| "bug" / crash / error / broken / ошибка | `build-error-resolver` agent |
| E2E / Playwright / spec failing | `e2e-runner` agent |
| User complaint about production | **LIVEOPS first**, then route |
| audit / security / performance / analyze | 4–8 agent swarm |
| new feature | `Plan` → `general-purpose` |
| copy / UX text / translation | `humanizer` skill |
| ≤10 lines, obvious, not auth/store/external | L1 FASTPATH → `Edit` directly |
| "what's next" / roadmap | GROWTH + UX agents |

---

## TASK LEVEL — Declare BEFORE executing

| Level | Name | What it means | Agents needed |
|-------|------|--------------|---------------|
| **L1** | Trivial | ≤10 lines, 1 file, obvious, reversible. NOT auth/store/external. | None — FASTPATH |
| **L2** | Simple | 10-50 lines OR internal doc/ADR. 1-2 domains. | 1 domain agent |
| **L3** | Standard | 50-200 lines OR multiple domains OR formal output. | 2 agents + confidence gate |
| **L4** | Complex | 200+ lines OR DB migration OR edge function change. | 3-4 agents + confidence gate |
| **L5** | Critical | Production deploy / auth rewrite / irreversible data change. | Full 7-agent + Yusif |

**L1 FASTPATH is BLOCKED for:** auth logic · store partialize() · Supabase schema · edge functions · RLS policies
**Not in table? → Default L3. Never self-assign L1 for unknown type.**

### Before Launching ANY Agent (2 minutes)

```
□ SESSION CONTEXT filled (decisions today, what's done, Yusif said what)
□ MINDSHIFT CONTEXT BLOCK pasted (what MindShift is, stack, current sprint)
□ "What's already decided" filled (prevents re-research)
□ Output format specified
```
**All 4 empty = CLASS 3 mistake. Takes 2 minutes, saves hours.**

### Confidence Gate (MANDATORY before L3+ delivery)

```
CONFIDENCE GATE:
  Task type + Level: [e.g., DB migration, L4]
  ARCH confidence:   [%]
  Agents verified:   [list]
  Weak points:       [where knowledge is limited]
  Ready:             YES (≥85%) / NO
```

Thresholds:
- ≥85% after verification → deliver
- 70-84% → deliver with explicit caveat to Yusif
- <70% → do NOT deliver until additional verification

---

## STEP 1.0 — TEAM READS (always parallel)

Launch all relevant agents simultaneously. Never read sequentially.

### Domain → Files mapping

**ARCH reads:**
- `src/store/index.ts`, `src/store/slices/`
- `src/app/App.tsx`, `src/app/AppShell.tsx`
- `src/types/index.ts`, `src/types/database.ts`

**SEC reads:**
- `src/shared/lib/supabase.ts`, `src/app/AuthGuard.tsx`
- `supabase/functions/` (all edge functions)
- `.env.example`, `src/shared/lib/logger.ts`
- `supabase/migrations/` (latest 3)

**PERF reads:**
- `vite.config.ts`, `package.json` (deps + scripts)
- `src/shared/hooks/useAudioEngine.ts`
- `src/features/focus/useFocusSession.ts`
- `src/features/focus/MochiSessionCompanion.tsx`

**UX reads:**
- `src/features/today/TodayPage.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/focus/FocusScreen.tsx`
- `src/components/TaskCard.tsx`
- `.claude/rules/guardrails.md`

**TEST reads:**
- `e2e/helpers.ts`, `playwright.config.ts`
- `e2e/*.spec.ts` (all specs, filenames only + line counts)
- `src/store/__tests__/store.test.ts`

**INFRA reads:**
- `public/manifest.json`, `src/sw.ts`
- `vercel.json`, `.github/workflows/`
- `capacitor.config.ts`
- `supabase/migrations/` (all, for schema state)

**LIVEOPS reads:**
- Vercel deployment logs (via MCP or CLI)
- Sentry DSN from `.env` → check recent errors
- `src/shared/lib/logger.ts` — what gets captured
- `src/app/AppShell.tsx` — offline bar, error boundaries

**GROWTH reads:**
- `src/features/onboarding/OnboardingPage.tsx`
- `src/features/tutorial/FirstFocusTutorial.tsx`
- `src/features/focus/FocusScreen.tsx` (setup screen)
- `src/shared/lib/volaura-bridge.ts` — analytics events
- `src/shared/hooks/useInAppReview.ts`

---

## STEP 1.5 — TEAM PROPOSES

Each agent returns proposals in this exact format:

```
AGENT: {ID}
FINDING: {one line — what's wrong or what opportunity exists}
SEVERITY: P0 | P1 | P2 | P3
LEVEL: L1 | L2 | L3 | L4 | L5
FILE: {exact path:line}
FIX: {exact change in plain English}
BLOCKS_LAUNCH: yes | no
```

**Severity levels:**
- **P0** = data loss / security breach / crash / auth broken
- **P1** = user-facing bug / compliance gap / feature not working at all
- **P2** = degraded UX / tech debt / missing translation / performance issue
- **P3** = polish / nice-to-have / future optimization

---

## STEP 2.0 — DEBATE + BATCH LOCK

### Priority rules (non-negotiable)
1. P0 always executes first, regardless of effort
2. L1 items batch together (≤5 per batch)
3. L4+ items require Yusif awareness before execution
4. Nothing ships without `tsc -b` passing
5. LIVEOPS P0 items bypass all other queues

### Veto rules
- Store `partialize()` change → ARCH must verify no data loss
- New npm dependency → PERF must check bundle impact first
- Edge function change → SEC must verify rate limit logic untouched
- Any red color, shame language, urgency copy → rejected, no vote needed
- Component >400 lines → decompose first, feature second

### Round-2 Debate (when agents disagree)

After initial proposals, if two agents hold conflicting positions:
```
AGENT: [ID]
POSITION: [1-sentence stance]
COUNTER: [1-sentence rebuttal to opposing agent's position]
FINAL: AGREE / MAINTAIN — [if maintaining, cite specific technical reason]
```
CTO breaks tie after round 2. No round 3.

### Concurrent Edit Protocol

When two tasks touch the same file:
```
CONCURRENT EDIT PROTOCOL:
  1. Task [X] declared primary owner → commits first
  2. Task [Y] dependent → waits for X commit, then applies changes
  3. Conflict detected → force sequential re-execution (no parallel merge)
  Declared at Batch Lock.
```

### Batch Lock Declares (once, at lock)

```
BATCH-ID:       BATCH-{YYYY-MM-DD}-{LETTER}
C3_REVIEWER:    [agent responsible for final output review]
CROSS_QA_AGENT: [agent that verifies tests — cannot be TEST author]
BATCH_AGENT_COUNT: [N agents running this batch]
```

---

## STEP 3.0 — EXECUTE

```bash
# Gate check — run before touching ANYTHING:
npx tsc -b

# After every individual item:
npx tsc -b

# Before commit:
npx tsc -b && npx playwright test --reporter=line
```

### Step 3.1 — Security Pre-Check (L3+ only)

```
□ Rate limiting on new endpoints?
□ RLS policies on new tables?
□ TypeScript validation on inputs?
□ Auth + ownership checks?
□ No sensitive data in logs?
□ Parameterized SQL?
□ Schema field names verified against actual DB (not assumed)?
□ All interim TypeScript types verified against source: [mismatches: none / list]
```

Schema verification is BLOCKING for L3+. Cannot proceed if unchecked.

### Step 3.2 — Execute

- Follow the proposal scope. Don't expand.
- Checkpoint commits at natural breakpoints: `git commit -m "[BATCH-ID] description"`
- If blocked: announce blocker, continue unblocked parts. Don't wait.
- If deviating from plan: log reason BEFORE deviating.

### Step 3.2.5 — Test Execution Gate (L2+ tasks)

Before any task is marked complete:
```
□ Test file exists and is committed
□ Tests ran: `npx playwright test` or `npx vitest run`  ← must actually run, not just exist
□ TEST declares: "Tests executed. [N] passing, 0 failing."
```

"Verified" = tests RAN and PASSED. Not: tests exist as code.

### Step 3.3 — Peer Review (L2+ tasks)

Agent who didn't write the code reviews it. Looks for:
- Store partialize() missing (causes silent data loss on reload)
- Security gaps (unguarded routes, missing RLS)
- Missing i18n keys
- Guardrail violations (red color, shame language, urgency copy)

Verdict: **APPROVED** / **APPROVED WITH NOTES** / **BLOCKED**

If BLOCKED → fix → re-review. Not restart.

### Step 3.4 — Cross-QA Verification (L3+ tasks only)

TEST cannot self-verify. Independent agent spot-checks:
```
CROSS-QA SPOT-CHECK (by ARCH or SEC):
  □ Tests are actually running code (not just mocking everything)
  □ Tests cover failure case, not just happy path
  □ Test data is realistic (not just value = true / value = "test")
  □ Edge cases present for known risk areas (auth, session sync, push)

Cross-checker declares: "Tests verified by [Agent]. Spotted [N] issues."
Rule: TEST cannot cross-check their own test suite.
```

### Commit format

```
{type}: {description} ({BATCH-ID})

- item 1: what changed and why
- item 2: what changed and why

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `fix` · `feat` · `perf` · `refactor` · `test` · `chore` · `docs`

---

## STEP 4.0 — CLOSE

### Step 4.0.5 — Completion Consensus (required before batch report)

Each primary agent produces:

```
AGENT: [Name]
TASKS COMPLETED: [list task IDs]
TESTS RAN: [command] → [X passed, 0 failed]
JOURNEY VERIFIED: [page/flow tested + what was confirmed]
MEMORY UPDATED: [files updated, or "none required"]
BLOCKERS: [any unresolved issue, or "none"]
SIGN-OFF: ✅ READY / ❌ BLOCKED — [reason if blocked]
```

Consensus rules:
- 2+ READY sign-offs required before batch report (MindShift has smaller team than VOLAURA)
- Any ❌ BLOCKED → batch stays open, ARCH investigates
- If agent cannot produce TESTS RAN line → task is NOT done

### Step 4.1 — Batch Report

```
BATCH: [ID]
COMPLETED: [count] tasks — [1-line each]
DEFERRED: [count] — [why each]
DISCOVERED: [gaps found during execution]
USER IMPACT: [what users can now do that they couldn't before]
QUESTION: NONE  ← default. CEO question requires proof team couldn't answer it.

WHAT'S NEXT:
  1. [highest priority unblocked task — ready to start immediately]
  2. [highest risk item outstanding]
  3. [thing Yusif probably hasn't thought about yet]
```

"What's next" is declared proactively by the team — not after Yusif asks "что дальше".

### Step 4.2 — Memory Update

After every batch:
1. Run `npx playwright test` — must stay green
2. If Vercel auto-deploys → LIVEOPS checks production within 10 min
3. Update CLAUDE.md sprint history if a feature landed
4. Update `memory/` if new architectural decision made

---

## MID-BATCH DIRECTION CHANGE

If scope changes mid-execution (Yusif redirects, blocker discovered, P0 surfaces):

```
MID-BATCH CHANGE:
  Stopping: [task ID + reason in 1 sentence]
  New direction: [1 sentence]
  Partial work: [committed / discarded / will be in next batch]
```

2-sentence rule: if you can't explain the change in 2 sentences, you haven't understood it yet.

---

## GUARDRAILS (enforced by all agents — never override)

From `.claude/rules/guardrails.md`:

1. **Never red.** Teal/indigo/gold only. #FF0000, red-*, hue 0-15 = instant reject.
2. **Never urgency.** "hurry", "running out", "don't miss", "urgent" = instant reject.
3. **Never shame.** Missed tasks → warm amber badge. No penalties. No guilt.
4. **Motion is opt-out.** All animations gated by `useMotion()`. No bypasses.
5. **Accessibility baseline.** aria-label on all interactive. focus-visible:ring-2 everywhere.
6. **Store integrity.** New persisted field → add to `partialize()`. Always.
7. **Max ~400 lines.** Component over limit → decompose before feature.
8. **`tsc -b` before commit.** Not `tsc --noEmit`. Non-negotiable.
9. **No new deps without PERF approval.** Bundle size matters.
10. **Mochi is a companion, not a coach.** Never medical advice. Never diagnose.

### Efficiency Gate SCOPE (violations cause CLASS 3 mistake)

Efficiency Gate = "skip DSP if obvious." Applies ONLY to DSP (design/proposal step).
**NEVER applies to:** agent context blocks · security pre-check · Tier 1 required reads · Completion Consensus

---

## TOP FAILURE MODES

| What happened | CLASS |
|--------------|-------|
| Executed without team proposal | CLASS 3 (dominant) |
| "Done" without test evidence | CLASS 1 |
| Memory not updated | CLASS 2 |
| Wrong field names assumed (DB schema) | CLASS 4 |
| Invented numbers or file paths | CLASS 5 |
| Agent launched without context block | CLASS 3 |
| Efficiency Gate applied to non-DSP step | CLASS 3 |
| L1 self-assigned for auth/store/external task | CLASS 3 |

---

## PRODUCTION HEALTH CHECKLIST (LIVEOPS runs this)

```
□ Vercel latest deploy: status = READY?
□ Sentry: 0 new P0 errors in last 24h?
□ Supabase: all 13 edge functions deployed and responding?
□ E2E on prod: 340+ tests passing?
□ Auth: magic link + Google OAuth working?
□ Push notifications: scheduled-push edge function running via pg_cron?
□ IDB storage: no quota errors in Sentry?
□ Service worker: latest version cached?
```

---

## STRESS TEST CHECKLIST (TEST + PERF run before launch gates)

```
□ 500 tasks in store — TasksPage renders without lag?
□ 90-min session — timer drift? phases fire at 7/15 min?
□ Offline → complete task → online → task synced to Supabase?
□ Tab close at 30 min → reopen → pending session toast shown?
□ IDB quota exceeded → localStorage backup kicks in?
□ Auth token expired mid-session → graceful recovery?
□ SW update available → user prompted?
□ Push notification with app in background → opens correct route?
□ energyLevel=1 → low-energy UI simplifies?
□ RecoveryProtocol after 72h → doesn't override fresh sessions?
□ Audio autoplay: session starts → brown noise starts automatically?
□ Tomorrow task → does NOT appear in TodayPage?
□ Google OAuth → redirect back to app → user lands on /today?
```

---

## CURRENT STACK (hot cache for agents)

| Layer | Tech | Key file |
|-------|------|---------|
| Frontend | React 18 + TypeScript + Vite | `vite.config.ts` |
| State | Zustand v5 + idbStorage | `src/store/index.ts` |
| Routing | React Router v6 | `src/app/App.tsx` |
| Animation | motion/react (NOT framer-motion) | — |
| Backend | Supabase (project: `awfoqycoltvhamtrsvxk`) | `src/shared/lib/supabase.ts` |
| Edge Functions | Deno + Gemini 2.5 Flash (primary) / NVIDIA NIM (available) | `supabase/functions/` |
| Auth | Supabase Auth (magic link + Google OAuth) | `src/features/auth/AuthScreen.tsx` |
| Hosting | Vercel (prod: `mindshift-umber.vercel.app`) | `vercel.json` |
| E2E Tests | Playwright (chromium + iPhone 14) | `playwright.config.ts` |
| Error tracking | Sentry (org: `yusif-ganbarov`, project: `mindshift`) | `src/shared/lib/logger.ts` |
| Push | Web Push + VAPID + Supabase pg_cron | `supabase/functions/scheduled-push/` |
| i18n | react-i18next + `src/locales/` | `en.json`, `ru.json`, `tr.json`, `az.json` |
| CSS | Tailwind + CSS variables (`:root` tokens) | `src/index.css` |
| Audio | Web Audio API (synthesized, no files) | `src/shared/hooks/useAudioEngine.ts` |
| PWA | Workbox injectManifest | `public/manifest.json`, `src/sw.ts` |
| Native | Capacitor (scaffold ready, not built) | `capacitor.config.ts` |
| AI (alt) | NVIDIA NIM — OpenAI-compatible, 70B+ models | `NVIDIA_API_KEY` in `.env` |

### NVIDIA NIM — available models (use when Gemini is insufficient)

| Model | Best for | Speed |
|-------|---------|-------|
| `meta/llama-3.3-70b-instruct` | Drop-in Gemini Flash replacement | Fast |
| `deepseek-ai/deepseek-r1` | Complex reasoning, task decomposition | Medium |
| `nvidia/llama-3.1-nemotron-ultra-253b-v1` | Synthesis, deep analysis | Slow |
| `mistralai/mistral-large-2-instruct` | Multilingual (RU/TR/AZ) | Fast |

**Endpoint:** `https://integrate.api.nvidia.com/v1` (OpenAI-compatible)
**Key env var:** `NVIDIA_API_KEY`

---

## BACKLOG PRIORITIES (as of 2026-04-02)

### P0 — Blockers
- [x] Google OAuth — ✅ Supabase enabled + Google Cloud redirect URI set (2026-03-31)
- [x] `useFocusSession.ts` — ✅ 335 lines (decomposed in prior sprint)
- [x] `SettingsPage.tsx` — ✅ 48 lines (decomposed in prior sprint)
- [x] `src/store/index.ts` — ✅ 163 lines (decomposed in prior sprint)
- [x] `AuthGuard.tsx` — ✅ investigated 2026-04-02: intentional guest PWA design; RLS protects all Supabase data. False alarm, closed.
- [x] `weekly-insight` edge function — ✅ timeout fixed 8s (BATCH-2026-04-02-L)

### P1 — User-facing gaps
- [x] Audio: BreathworkRitual — ✅ soft rising/falling sine tones added (BATCH-2026-03-31-D)
- [x] Audio: volume default too quiet — ✅ raised 0.55 → 0.65 (BATCH-2026-03-31-C)
- [ ] Google Calendar: inbound sync missing (one-way only)
- [ ] Push notifications: pg_cron needs enabling in Supabase Dashboard (manual: Supabase Dashboard)
- [x] CSP: ✅ investigated 2026-04-02: fonts.googleapis.com already in connect-src; OAuth uses page navigation, not fetch. False alarm, closed.
- [x] OnboardingPage: keyboard trap ✅ fixed (BATCH-2026-04-02-L)
- [x] FocusRoomSheet: role="dialog" + aria-labelledby ✅ added (BATCH-2026-04-02-L)
- [x] SessionControls.tsx: focus-visible:ring-2 + aria-pressed ✅ added (BATCH-2026-04-02-L)

### P2 — Quality
- [ ] QuickCapture: "today" / "tomorrow" without time shows no dueTime (expected)
- [x] TodayPage: next-tasks nudge when NOW empty + NEXT has tasks ✅ (BATCH-2026-03-31-C)
- [x] Tutorial: "Start for Real" → navigates to /focus for momentum ✅ (BATCH-2026-03-31-C)
- [x] HistoryPage: phase filter chips (All/Flow/Release/Struggle) ✅ (BATCH-2026-03-31-D)
- [x] Onboarding: progress indicator already implemented (segments + "Step X of Y") ✅
- [x] Add `install_date` to store + `days_since_install` to analytics events ✅ (BATCH-2026-04-02-M)
- [x] Add `energy_after` to `session_completed` logEvent ✅ energy_logged upgraded with energy_before + energy_delta (BATCH-2026-04-02-N)

### P3 — Polish
- [ ] Play Store: 8 screenshots need manual capture (`scripts/capture-screenshots.ts`)
- [ ] Feature graphic 1024×500 (needs design)
- [x] In-App Review API trigger ✅ already wired: import + useInAppReview() in App.tsx:241

---

## FILE REGISTRY (key files only — full list in CLAUDE.md)

### Over guardrail (>400 lines) — needs decomposition
_None — all resolved as of 2026-03-31_ ✅

### Decomposed (resolved)
- `src/features/auth/AuthScreen.tsx` — 252 lines ✅
- `src/features/mochi/MochiChat.tsx` — 366 lines ✅
- `src/features/focus/FocusScreen.tsx` — 288 lines ✅
- `src/features/tasks/TasksPage.tsx` — 326 lines ✅
- `src/features/focus/MonthlyReflection.tsx` — 260 lines ✅
- `src/store/index.ts` — 163 lines ✅
- `src/features/settings/SettingsPage.tsx` — 48 lines ✅
- `src/features/focus/useFocusSession.ts` — 335 lines ✅
- `src/features/focus/FocusSetup.tsx` — 207 lines ✅
- `src/features/progress/ProgressPage.tsx` — 109 lines ✅

### Core orchestrators
- `src/app/App.tsx` — Router + overlay priority logic
- `src/app/AppShell.tsx` — Layout, offline bar, friction nudge
- `src/features/today/TodayPage.tsx` — Default route, daily view
- `src/features/focus/FocusScreen.tsx` — Focus orchestrator

### Supabase edge functions (13 deployed)
- `decompose-task` · `recovery-message` · `weekly-insight`
- `classify-voice-input` · `mochi-respond` · `gdpr-export` · `gdpr-delete`
- `scheduled-push` · `gcal-store-token` · `gcal-sync`
- `telegram-webhook` · `stripe-webhook` · `send-magic-link`

### Infrastructure
- `supabase/migrations/` — 13 migrations applied
- `.github/workflows/e2e-production.yml` — runs on Vercel deploy
- `scripts/capture-screenshots.ts` — Play Store screenshots
- `scripts/translate.mjs` — auto-translate en.json → other locales
