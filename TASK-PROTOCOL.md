# TASK-PROTOCOL v8.0 — MindShift Team Operating Standard

> **Owner:** Yusif Ganbarov
> **Project:** MindShift — ADHD-aware productivity PWA
> **Updated:** 2026-04-04 (v8.0 — Zero-simulation rewrite. Every step has a mandatory artifact. No step can be faked.)
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

## THE CORE RULE — NO ARTIFACT, NOT DONE

Every step below produces a specific artifact. If the artifact is absent, the step did not happen.

**Artifacts are not summaries. They are structured outputs with grep-verifiable claims.**

An agent cannot say "blast radius is small" without showing the grep command and its output.
An agent cannot say "I read the file" without producing a READ RECEIPT.
An agent cannot say "approved" without running an independent grep.

**If any artifact is missing → ARCH stops execution, names the missing artifact, and restarts that step.**

---

## FLOW DETECTION — Declare BEFORE executing

```
CEO says "загрузи протокол и делай"    →  FULL PROTOCOL (all 6 steps)
CEO says "что дальше / propose"        →  TEAM PROPOSES (Step 1.5 → 2.0)
CEO says "срочно / P0"                 →  HOTFIX  (keep security 4-box)
CEO says "быстро / today"              →  EXPEDITED (1 critique round, keep security)
```

**Declared flow must appear as first line of response:**
```
FLOW: [FULL PROTOCOL | TEAM PROPOSES | HOTFIX | EXPEDITED]
LEVEL: [L1 | L2 | L3 | L4 | L5]
REASON: [1 sentence why this level]
```
If this declaration is missing → CLASS 3 mistake. Stop. Restart.

### HOTFIX path (P0 only)
```
□ Rate limiting preserved?
□ RLS policies unaffected?
□ TypeScript validation on new input paths?
□ Auth/session logic unchanged or SEC agent reviewed?
```
All 4 must be ✅ before commit. No exceptions — not even for 1-line fixes.

---

## PHASE 0.7 — SPRINT GATE

Run BEFORE Team Proposes. Required output:

```
SPRINT GATE:
  Current sprint: [read from CLAUDE.md Sprint History — exact batch ID]
  Open P0 items: [list or NONE]
  Open P1 items: [list or NONE]
  BLOCKS_LAUNCH unresolved: yes → [item] / no
  Batch fits sprint goal: yes / no [if no: 1-sentence justification]
```

**EXIT CONDITION:** This block must exist before any agent reads a file.
If BLOCKS_LAUNCH = yes → that item becomes forced P0. Nothing else executes first.

---

## TASK LEVEL

| Level | Name | What it means | Agents needed |
|-------|------|--------------|---------------|
| **L1** | Trivial | ≤10 lines, 1 file, 0 consumers outside that file. NOT auth/store/external. | None — FASTPATH |
| **L2** | Simple | 10-50 lines OR internal doc/ADR. 1-2 domains. Blast radius ≤ 3 files. | 1 domain agent |
| **L3** | Standard | 50-200 lines OR multiple domains OR blast radius 4+ files. | 2 agents + confidence gate |
| **L4** | Complex | 200+ lines OR DB migration OR edge function change. | 3-4 agents + confidence gate |
| **L5** | Critical | Production deploy / auth rewrite / irreversible data change. | Full 7-agent + Yusif |

**L1 FASTPATH is BLOCKED for:** auth logic · store partialize() · Supabase schema · edge functions · RLS policies · any value used in more than 1 file

**L1 FASTPATH requires proof:**
```
L1 PROOF:
  grep "[changed value/component]" src/ --include="*.tsx" --include="*.ts" -l
  RESULT: [exact output — must show only 1 file]
```
If grep returns > 1 file → auto-escalate to L2 minimum. No exceptions.

---

## THE TEAM

| Role | Agent | Responsibility |
|------|-------|----------------|
| **ARCH** | `general-purpose` | Store integrity, decomposition, types, migrations, blast radius |
| **SEC** | `sec` | Auth, edge functions, GDPR, secrets, RLS |
| **PERF** | `bundle-analyzer` | Bundle, React memo, hooks, audio, Web Vitals |
| **UX** | `a11y-scanner` + `guardrail-auditor` | ADHD safety, copy, a11y, motion, color |
| **TEST** | `e2e-runner` | Playwright E2E, unit tests, coverage gaps |
| **INFRA** | `infra` | CI/CD, Vercel, Supabase migrations, PWA, SW |
| **LIVEOPS** | `liveops` | Production health, Sentry errors, Vercel logs |
| **GROWTH** | `growth` | Analytics, funnel gaps, retention metrics |

LIVEOPS runs FIRST after any prod deploy or user-reported incident.

---

## STEP 1.0 — TEAM READS

Launch all relevant agents simultaneously. Never read sequentially.

**Each agent must produce a READ RECEIPT for every file they read:**

```
READ RECEIPT
Agent: [name]
File: [exact path]
Lines read: [range or "full"]
Key facts relevant to current task: [2-3 bullet points — specific, not vague]
Risks spotted: [yes → describe / no]
Consumers of this module (if component/hook/util): [list from grep or NONE]
```

**EXIT CONDITION:** Every agent that will propose changes in Step 1.5 must have READ RECEIPTs for the files they're proposing to change. Agent without READ RECEIPT cannot make proposals. No exceptions.

---

## STEP 1.5 — TEAM PROPOSES

Each agent returns proposals. **Every field is mandatory. No field can be left blank.**

```
AGENT: {ID}
FINDING: {one line — what's wrong or what opportunity exists}
SEVERITY: P0 | P1 | P2 | P3
LEVEL: L1 | L2 | L3 | L4 | L5
FILE: {exact path:line — verified by Read, not assumed}

BLAST RADIUS ANALYSIS:
  grep command run: [exact command]
  grep output: [exact output — paste it]
  Direct consumers (files that import this): [list from grep]
  Prop consumers (components that receive this as prop): [list or NONE]
  Default value reliance (who uses the default): [list or NONE]
  i18n keys affected: [list or NONE — run grep on key name]
  Store/partialize impact: [yes → field name / no]

BLAST RADIUS VERDICT: CONTAINED (1 file) | MODERATE (2-3 files) | WIDE (4+ files)

FIX: {exact change in plain English — specific enough that a junior dev could implement it}
BLOCKS_LAUNCH: yes | no
```

**EXIT CONDITION:** Every proposal must have BLAST RADIUS ANALYSIS with actual grep output. "No consumers" is only valid if grep returned 0 results and that output is shown.

**Auto-escalation rules based on blast radius:**
- CONTAINED → level as declared
- MODERATE → minimum L2
- WIDE → minimum L3, requires Round-2 Debate

---

## STEP 2.0 — DEBATE + BATCH LOCK

### Round 1 — Cross-review (mandatory for ALL proposals)

Every proposal is reviewed by a **different** agent. Assignment:
- ARCH proposals → reviewed by SEC
- SEC proposals → reviewed by ARCH
- UX proposals → reviewed by PERF
- PERF proposals → reviewed by UX
- GROWTH proposals → reviewed by UX
- INFRA proposals → reviewed by ARCH
- TEST proposals → reviewed by INFRA

**Cross-review format (mandatory fields):**

```
CROSS-REVIEW
Reviewer: [agent]
Reviewing proposal: [agent + finding title]

Independent blast radius check:
  grep command: [run it yourself — do not trust original agent's grep]
  grep output: [paste]
  Matches original claim: yes / no [if no: describe discrepancy]

Checks:
  □ Store partialize() affected? yes/no
  □ Auth flow affected? yes/no
  □ i18n keys exist in all locales? yes/no/n-a
  □ a11y labels preserved? yes/no/n-a
  □ No red/shame/urgency in copy? yes/no/n-a
  □ Component stays ≤400 lines after change? yes/no/n-a
  □ tsc -b will pass? confident/uncertain [if uncertain: why]

VERDICT: APPROVED | APPROVED WITH NOTES [list notes] | BLOCKED [reason]
```

**EXIT CONDITION:** Every proposal needs one CROSS-REVIEW with VERDICT. No self-review. No skipped reviews.

### Round 2 — Conflict resolution (when BLOCKED or cross-reviewer found discrepancy)

```
ROUND-2
Agent: [ID]
Position: [1-sentence stance]
Counter: [1-sentence rebuttal to opposing position]
Evidence: [grep command + output that supports your position]
Final: AGREE | MAINTAIN — [if maintaining: cite specific technical evidence]
```

ARCH breaks tie after Round 2. No Round 3.

### Concurrent Edit Protocol

When two tasks touch the same file:
```
CONCURRENT EDIT PROTOCOL:
  Primary owner: Task [X] — commits first
  Dependent: Task [Y] — waits for X commit hash, then applies changes
  Conflict trigger: [which specific lines overlap]
```

### Batch Lock (required before any execution)

```
BATCH-ID: BATCH-{YYYY-MM-DD}-{LETTER}
LEVEL: [highest level among all tasks]
C3_REVIEWER: [agent for final output review — cannot be author]
CROSS_QA_AGENT: [cannot be TEST author]
BATCH_AGENT_COUNT: [N]
CONCURRENT_EDITS: [list files with multiple owners, or NONE]

TASK LIST:
  [ID-1]: [description] | owner: [agent] | level: [L?] | blast: [CONTAINED/MODERATE/WIDE]
  [ID-2]: ...
```

**EXIT CONDITION:** Batch Lock block must exist before any file is touched. If it's missing → no execution.

---

## STEP 3.0 — EXECUTE

### Step 3.0 — Pre-flight (mandatory before touching ANY file)

For each task in the batch:

```
PRE-FLIGHT — [task ID]
Files I will edit: [exact list]
Files in blast radius I will NOT edit (but verified OK): [list]
tsc -b before state: [run it — 0 errors / N errors — paste output]
Rollback plan: [git stash / specific revert command]
```

**EXIT CONDITION:** Pre-flight exists for every task before first edit. tsc -b must be run and result pasted — not assumed.

### Step 3.1 — Security Pre-Check (L3+ mandatory, L2 if touching auth/edge/store)

```
SECURITY PRE-CHECK
□ Rate limiting on new endpoints? yes/no/n-a
□ RLS policies on new tables? yes/no/n-a
□ TypeScript validation on all new inputs? yes/no/n-a
□ Auth + ownership checks? yes/no/n-a
□ No sensitive data in logs? yes/no/n-a
□ Parameterized SQL? yes/no/n-a
□ Schema field names verified against actual DB schema file (not assumed)? yes/no/n-a
□ All interim TypeScript types verified against source? yes/no/n-a [list mismatches or NONE]
```

All boxes must be filled. "n-a" is valid only with a reason.

### Step 3.2 — Execute

- Follow the proposal scope exactly. Don't expand. Don't "while I'm here" fix adjacent things.
- After each individual item: run `tsc -b` and paste result.
- If blocked: announce blocker with exact error, continue unblocked parts. Don't wait silently.
- If deviating from plan: write MID-BATCH CHANGE block before deviating.

```
MID-BATCH CHANGE:
  Stopping: [task ID] — [reason in 1 sentence]
  New direction: [1 sentence]
  Partial work status: committed / discarded / will be in next batch
```

### Step 3.3 — Post-edit verification (mandatory after every file edit)

```
POST-EDIT — [file edited]
tsc -b result: [0 errors / paste errors]
grep verify — changed value still correct: [grep command + output]
Blast radius consumers verified: [for each consumer file — did I check it still works?]
```

### Step 3.4 — Peer Review (L2+ mandatory)

Agent who did NOT write the code:

```
PEER REVIEW — [reviewer] on [task ID]
□ Store partialize() — new persisted fields added to it? yes/no/n-a
□ Security gaps — unguarded routes, missing RLS? none / [describe]
□ Missing i18n keys — grep for hardcoded strings in changed files? none / [list]
□ Guardrail violations — red color, shame language, urgency copy? none / [describe]
□ Blast radius consumers — all affected files still compile? yes/no
VERDICT: APPROVED | APPROVED WITH NOTES | BLOCKED
```

### Step 3.5 — Cross-QA (L3+ mandatory)

TEST cannot self-verify. Independent agent spot-checks:

```
CROSS-QA — [checker, cannot be TEST]
□ Tests run actual code (not just mocking everything)? yes/no
□ Tests cover failure case, not just happy path? yes/no
□ Test data is realistic? yes/no
□ Edge cases present for known risk areas? yes/no
Tests verified by: [agent]. Issues found: [N — list or NONE]
```

### Commit format

```
{type}({scope}): {description} ({BATCH-ID})

- item: what changed and why
- item: what changed and why

tsc -b ✅

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `fix` · `feat` · `perf` · `refactor` · `test` · `chore` · `docs`

---

## STEP 4.0 — CLOSE

### Step 4.0.5 — Completion Consensus

Each primary agent produces:

```
AGENT: [Name]
TASKS COMPLETED: [list task IDs]
TESTS RAN: [exact command] → [X passed, 0 failed — paste summary line]
JOURNEY VERIFIED: [page/flow + what was confirmed in preview or grep]
BLAST RADIUS CLEARED: [for each MODERATE/WIDE item — consumers verified]
MEMORY UPDATED: [files updated, or "none required"]
BLOCKERS: [any unresolved issue, or "none"]
SIGN-OFF: ✅ READY | ❌ BLOCKED — [reason if blocked]
```

Rules:
- 2+ READY sign-offs required before batch report
- Any ❌ BLOCKED → batch stays open, ARCH investigates
- "Tests ran" line requires actual command + actual result. Not: "tests should pass."

### Step 4.1 — Batch Report

```
BATCH: [ID]
COMPLETED: [N] tasks
  - [task]: [1-line description of what changed + blast radius verdict]
DEFERRED: [N] — [why each — must be a real reason, not "out of scope"]
DISCOVERED: [gaps found during execution — add to backlog]
USER IMPACT: [what users can now do / see / not see that they couldn't before]
QUESTION: NONE  ← default. CEO question requires proof team couldn't answer it.

WHAT'S NEXT:
  1. [highest priority unblocked task — ready to start immediately]
  2. [highest risk item outstanding]
  3. [thing Yusif probably hasn't thought about yet — must be non-obvious]
```

### Step 4.2 — Memory + Docs Update

```
□ npx playwright test — result: [N passing]
□ CLAUDE.md sprint history updated if feature landed: yes/no
□ memory/ updated if architectural decision made: yes/no [which file]
□ TASK-PROTOCOL.md backlog updated: yes/no [which items closed/opened]
```

---

## GUARDRAILS (enforced by all agents — never override)

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

---

## FAILURE MODES

| What happened | CLASS | What should have caught it |
|--------------|-------|---------------------------|
| Executed without team proposal | CLASS 3 | Step 2.0 Batch Lock missing |
| Changed value without blast radius grep | CLASS 3 | Step 1.5 BLAST RADIUS field missing |
| "Done" without test evidence | CLASS 1 | Step 4.0.5 TESTS RAN line missing |
| Memory not updated | CLASS 2 | Step 4.2 checklist |
| Wrong field names assumed (DB schema) | CLASS 4 | Step 3.1 security pre-check |
| Invented numbers or file paths | CLASS 5 | Step 1.5 FILE field must be grep-verified |
| Agent launched without context block | CLASS 3 | Step 1.0 READ RECEIPT missing |
| L1 self-assigned for multi-file change | CLASS 3 | L1 PROOF grep showed >1 file |
| Cross-review skipped | CLASS 3 | Step 2.0 no CROSS-REVIEW block |
| Post-edit tsc -b not run | CLASS 3 | Step 3.3 POST-EDIT block missing |
| Blast radius claimed without grep output | CLASS 3 | Grep output is mandatory — "I believe" = rejected |

---

## PRODUCTION HEALTH CHECKLIST (LIVEOPS)

```
□ Vercel latest deploy: status = READY?
□ Sentry: 0 new P0 errors in last 24h?
□ Supabase: all deployed edge functions responding?
□ E2E on prod: tests passing?
□ Auth: magic link + Google OAuth working?
□ Push notifications: scheduled-push edge function running via pg_cron?
□ IDB storage: no quota errors in Sentry?
□ Service worker: latest version cached?
```

---

## STRESS TEST CHECKLIST (TEST + PERF before launch gates)

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

### NVIDIA NIM — available models

| Model | Best for | Speed |
|-------|---------|-------|
| `meta/llama-3.3-70b-instruct` | Drop-in Gemini Flash replacement | Fast |
| `deepseek-ai/deepseek-r1` | Complex reasoning, task decomposition | Medium |
| `nvidia/llama-3.1-nemotron-ultra-253b-v1` | Synthesis, deep analysis | Slow |
| `mistralai/mistral-large-2-instruct` | Multilingual (RU/TR/AZ) | Fast |

**Endpoint:** `https://integrate.api.nvidia.com/v1` (OpenAI-compatible)
**Key env var:** `NVIDIA_API_KEY`

---

## BACKLOG PRIORITIES (as of 2026-04-04)

### P0 — Blockers
- [x] Google OAuth ✅
- [x] All store slices decomposed ✅
- [x] send-magic-link removed from CI (no function exists) ✅ BATCH-2026-04-04-I

### P1 — User-facing gaps
- [ ] Push notifications: pg_cron needs enabling in Supabase Dashboard (manual — Yusif only)
- [x] gcal-inbound edge function ✅ BATCH-2026-04-04-H
- [x] tutorial momentum (from= dim in session_started) ✅ BATCH-2026-04-04-I
- [x] a11y: aria-pressed on tone picker, aria-live on timer, aria-label on search ✅ BATCH-2026-04-04-I
- [x] BurnoutGauge + progress bar ARIA (BLOCKS_LAUNCH) ✅ BATCH-2026-04-04-K
- [x] manifest.json stable alias + deploy-edge-functions CI gate ✅ BATCH-2026-04-04-K
- [x] Quick Start ADHD defaults (timeBlindness + emotionalReactivity) ✅ BATCH-2026-04-04-K

### P2 — Quality
- [x] S-5 Ghosting Grace — ContextRestore re-entry card (L3) ✅ BATCH-2026-04-04-N
- [x] K-9: ContextRestore ghosting_grace_shown logEvent ✅ BATCH-2026-04-04-N (ghosting_grace_shown dim on context_restore_shown)
- [x] S-9 Post-social cool-down ritual (L3) ✅ BATCH-2026-04-04-O
- [x] manifest.json og-image wide removed (Play Store fix) ✅ BATCH-2026-04-04-M
- [x] NatureBuffer + ContextRestore + AchievementGrid focus rings ✅ BATCH-2026-04-04-M
- [x] nature_buffer_skipped/recovery_lock_bypassed/autopsy_picked/share/progress_viewed events ✅ BATCH-2026-04-04-M
- [x] CI bundle gate 400 KB exit 1 ✅ BATCH-2026-04-04-M
- [x] ADHD profile dims in onboarding_completed ✅ BATCH-2026-04-04-I
- [x] QuickCapture i18n complete ✅ BATCH-2026-04-04-I
- [x] Sentry source maps in CI ✅ BATCH-2026-04-04-I
- [x] ArcTimer tap hint i18n (6 locales) ✅ BATCH-2026-04-04-K
- [x] CI bundle size warning threshold ✅ BATCH-2026-04-04-K

### P3 — Polish
- [x] Play Store: 8 screenshots ✅ BATCH-2026-04-04-P (re-run Apr 4, all 8 PNGs updated)
- [x] Feature graphic 1024×500 ✅ BATCH-2026-04-04-R (Playwright HTML→PNG, 2048×1000 @2×)
- [x] supabase/config.toml for reproducible local env ✅ BATCH-2026-04-04-L

---

## FILE REGISTRY

### Over guardrail (>400 lines) — needs decomposition
_None — all resolved_ ✅

### Supabase edge functions (deployed)
`decompose-task` · `recovery-message` · `weekly-insight`
`classify-voice-input` · `mochi-respond` · `gdpr-export` · `gdpr-delete`
`scheduled-push` · `gcal-store-token` · `gcal-sync` · `gcal-inbound`
`telegram-webhook` · `stripe-webhook` · `create-checkout`

### Infrastructure
- `supabase/migrations/` — 13 migrations applied
- `.github/workflows/e2e-production.yml` — runs on Vercel deploy
- `.github/workflows/ci.yml` — type check + build + tests + Sentry source maps
- `.github/workflows/deploy-edge-functions.yml` — deploys 14 edge functions on push to main
- `scripts/capture-screenshots.ts` — Play Store screenshots
- `scripts/translate.mjs` — auto-translate en.json → other locales
