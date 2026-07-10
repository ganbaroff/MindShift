# AGENTS.md — START HERE (read this first, any tool, any model)

> **Назначение (RU):** Это единая точка входа. Какой бы инструмент ты ни открыл — Claude Code, Codex, Antigravity, Gemini CLI, Cursor — прочитай этот файл первым. Он говорит: что это за репозиторий, что где лежит, что работает, что сломано, что мусор, что делать дальше. Глубокие детали — по ссылкам, не здесь.
>
> **Last verified:** 2026-07-07 by ground-truth survey (git status + file reads, not memory).
>
> **🗺️ Two companion maps:** [docs/HARNESS-MAP.md](docs/HARNESS-MAP.md) — the 13 agentic-engineering primitives → where each lives (claude md / specs / hooks / gates / retrieval / agentic CI / feedback loop…). [docs/FACTORY-MAP.md](docs/FACTORY-MAP.md) — the daily media line, stage-by-stage, with its quality-gate controllers.
>
> **🔍 External audit in progress (2026-07-10):** [HANDOFF-CURSOR-AUDIT-2026-07-10.md](HANDOFF-CURSOR-AUDIT-2026-07-10.md) — current state, product goal (paid TG video-format subscription), honest bug/debt list, receipts to re-run. Any tool auditing the studio starts THERE.

---

## 0. TL;DR (30 seconds)

This git repo (`C:\Projects\mindshift`) is **ONE product plus two lodgers**:

1. **MindShift** — an ADHD-aware productivity PWA. **This is the actual product.** Production v1.0, code-complete, **0 users**. React 19 + Vite + Zustand + Supabase + Capacitor. Stable — *do not casually refactor it.*
2. **`tmp/kapibara/`** — the "Капибара Новости" daily video pipeline. Active work, runs locally, ships real clips. **Being moved out** to a sibling repo (see §4). Mostly **not** in git.
3. **`memory/`** — the operator's (Atlas) brain: CEO task tracker, status cards, handoff notes. Not product code.

If you only remember one thing: **MindShift needs USERS, not more code. The video pipeline needs to finish moving OUT of this repo.**

---

## 1. Where to start, by intent

| You were opened to… | Go to | Deep doc |
|---|---|---|
| Work on the **MindShift app** (UI, features, bugs) | `src/` | [MINDSHIFT_AI_HANDOVER.md](MINDSHIFT_AI_HANDOVER.md) + [CLAUDE.md](CLAUDE.md) |
| Make / fix a **daily video** | `tmp/kapibara/` | [tmp/kapibara/PROJECT-MAP.md](tmp/kapibara/PROJECT-MAP.md) |
| Understand **what the CEO must do** (launch blockers) | `memory/ceo-tasks.md` | — |
| **Finish the video-pipeline extraction** | `C:\Projects\kapibara-studio` (sibling repo) | [memory `kapibara-upgrade-plan`](memory/... see MEMORY.md) |
| Just orient / "what's the state" | this file §3–§6 | — |

> ⚠️ **Stack-hallucination guard:** MindShift is **NOT** Next.js / Clerk / Turso / Prisma / LemonSqueezy. Earlier agents hallucinated that stack; it was wiped in a "Reality Reset". The real stack is in §2. Do not install or search for those packages.

---

## 2. MindShift app — the real product (GOOD, keep stable)

- **Stack:** React 19 + TypeScript + **Vite** (not Next). State: **Zustand v5** + idbStorage (`src/store/index.ts`). Routing: React Router v7 (`src/app/App.tsx`). Styling: Tailwind v4 + CSS vars. Backend/Auth: **Supabase** (`src/shared/lib/supabase.ts`). Edge functions: Deno in `supabase/functions/`. Mobile: **Capacitor** (`android/`). Tests: Vitest + Playwright.
- **Run it:**
  ```bash
  npm install
  npm run dev            # local dev server
  npx tsc -b             # MANDATORY build gate before any commit (not tsc --noEmit)
  npm run build          # vite production build
  npx playwright test    # E2E (offline, Supabase mocked)
  ```
- **Hard rules live in `.claude/rules/`** (guardrails, never-delete, security, typescript, testing) and `CLAUDE.md`. They are ADHD-safety + Constitution law. **NEVER RED** (no hue 0–15/345–360), motion behind `useMotion()`, shame-free copy, max 1 CTA/screen. These bind every tool, not just Claude.
- **Status:** 26 sprints shipped (A→AG), 227 tests pass, live on Vercel. The only thing missing is **users** — see `memory/ceo-tasks.md`.
- **Uncommitted right now (mascot work in progress):** `src/shared/ui/Capy.tsx` (new), `src/shared/ui/Mascot.tsx`, `src/components/MochiAvatar.tsx`. The round cream-capybara "Mochi". If you touch the mascot, continue here — don't restart the avatar detour (it's dead; see MEMORY.md).

---

## 3. Видео-пайплайн `tmp/kapibara/` — active, but tangled

> **🏭 UPDATE 2026-07-07 — the content factory is LIVE in the cloud.** The daily **EN news conveyor** runs autonomously (day **3/14** toward the finish line: 14 straight hands-off publishes + a weekly metrics report). GitHub Actions `kapibara-daily.yml` renders → runs the quality gates (`frame_check` per-frame, `content_critic` whole-clip, `cta-guard` bot-exists) → auto-publishes to IG + TikTok via Buffer, idempotent across runners via a **Supabase `publish_journal`** (`journal.mjs`, migration 036). CEO drives it from his phone with the **Пульт `@CreatorBy_bot`** (`/news` `/ladder` `/go` `/status`; `pult-poller.yml` every 10 min). Brand = **Kapibara AI** (VOLAURA design system + Mochi face) on its own accounts **@volaura.kapibara** (kit in `tmp/brand/`). Ladder quiz format is accepted + fact-checked (`ladder_question_bank.json`) but held out of CI until news day-14. Full stage-by-stage map with controllers: **[docs/FACTORY-MAP.md](docs/FACTORY-MAP.md)**. This supersedes the "cloud CANNOT pass" note in §5.1 below (that was true 2026-06-29; the missing scripts + secrets have since landed).

**What it is:** real AI news → Gemini script → Gemini TTS (Russian) → HTML studio scene → Playwright frame render → ffmpeg → publish to Telegram preview, then Instagram + TikTok (via Buffer). AZ subtitles auto-translated. **Free-first** (Gemini free tier, no paid APIs in the daily path).

**How to run (locally, the only place it fully works today):**
```bash
cd tmp/kapibara
node make-clip.mjs                 # full pipeline → Telegram preview
# after CEO says "го":
node assemble.mjs --upload && node buffer_publish.mjs   # publish IG + TikTok
```
Orchestrator `make-clip.mjs` runs 11 stages: gen_news → gen_voice → reconcat → build-data2 → translate_az → build_subs_az → render6 → outro → assemble → tg_post → (metrics → supabase_sync → dashboard). Fail-fast; dedups via `state.json`.

**Proof it's real:** `published.json` shows 3 posts shipped to IG+TikTok on 2026-06-28. `metrics.mjs` pulls live Buffer numbers → `metrics.json` → `dashboard.html` (a Telegram Mini App; bot menu button "🦫 Пульт" already wired). DB history in Supabase tables `kapibara_episodes` + `kapibara_metrics`.

**Full file inventory & target architecture:** [tmp/kapibara/PROJECT-MAP.md](tmp/kapibara/PROJECT-MAP.md). Don't duplicate it; read it.

---

## 4. The big architectural truth (read before touching CI or kapibara)

There are **TWO copies** of the video pipeline:

| Copy | Path | Git | State |
|---|---|---|---|
| Old / working | `C:\Projects\mindshift\tmp\kapibara\` | mostly **untracked** | runs daily, ships clips |
| New / future home | `C:\Projects\kapibara-studio\` | **own git** (commit `9c0d1a4`) | **scaffold only** — `core/lib`, `core/publish`, `formats/ai-news`, `formats/football` dirs exist, migration unfinished |

**Decision already made:** the pipeline becomes a **standalone** project (`kapibara-studio`), not a parasite in the MindShift app repo. The extraction is ~10% done.

---

## 5. What's BROKEN / needs fixing (honest list)

1. **🔴 GitHub Actions cloud migration is half-done and currently CANNOT pass.** `.github/workflows/kapibara-daily.yml` checks out the repo and runs `make-clip.mjs`, but **only 10 of ~20 required scripts are committed**. Tracked: `gen_news, gen_voice, translate_az, tg_post, metrics, supabase_sync, buffer_publish, env, make-clip, setup_gh_secrets`. **Missing from git (untracked):** `reconcat, build-data2, build_subs_az, render6, assemble, dashboard, outro_build, render_outro` + the scene HTML (`studio_v6.html`, `studio_split.html`) + assets (music/fonts/mascot). CI will fail at **stage 3 (`reconcat.mjs`)**. The commit message `8f1d695 "cloud migration"` overstates what landed.
2. **🟠 Stale `GEMINI_API_KEY` GitHub Secret** — the last CI run failed `API_KEY_INVALID`. Fix is staged: CEO must run `bash tmp/kapibara/setup_gh_secrets.sh` once (the hook blocks reading secret values into chat, so this is a human step).
3. **🟠 Where should CI even live?** Per §4 the pipeline is moving to `kapibara-studio`. Putting daily CI in the **MindShift app repo** is arguably wrong — it couples the app's git history to video runs. **Recommendation:** finish the extraction, then host the daily cron in `kapibara-studio`, and delete the workflow from here. Don't pour more effort into mindshift-side CI until that's decided.
4. **🟡 `memory/antigravity-status.md` is a redirect stub** dated 2026-06-24 pointing to an Academy project (`C:\Users\user\.gemini\antigravity\scratch\mindshift-mvp\`). That's a *different* product (a Clerk/Prisma "Academy"). Don't confuse it with this repo.
5. **✅ RESOLVED 2026-07-10 — `sync-to-zeus.yml` retired by CEO decision.** History: the workflow was red on every push since April (multi-line `GITHUB_OUTPUT` broke the `summary` output before curl ever ran) — that bug was fixed and a green push-run proven ([run 29086829784](https://github.com/ganbaroff/MindShift/actions/runs/29086829784)). But the target was structurally dead: `zeus-gateway-production.up.railway.app` is now the Claw3D ZEUS **WS** gateway (no `/event` HTTP route, studio-cookie gate), and the original `/event` gateway (Railway `zesty-art`) has a FAILED last deploy from 2026-04-11. CEO call: don't revive the HTTP ingest — **the react-to-repo-changes duty moves to Atlas itself** (test generation first). Workflow deleted; duty spec: [memory/atlas-mindshift-change-duty.md](memory/atlas-mindshift-change-duty.md). GitHub `GATEWAY_SECRET` secret + `ZEUS_GATEWAY_URL` var left in place (harmless, endpoint dead) — delete whenever convenient.

---

## 6. What's TRASH (safe-to-ignore / cleanup candidates)

These are **build artifacts**, never source. They pollute `git status` and must never be committed:

- `tmp/kapibara/`: `frames_fast/`, `frames_outro/`, `prev6/`, `prev_outro/`, `verify/`, `*.wav` (`ln_*`, `tr_*`, `octa_*`), `*.pcm`, `*.mp4`, `voice.*`, `data*.json`, `az_final.json`, `latest_output.json`, `*.vtt`
- `tmp/`: `frames/`, `capy-render.html`, `capy-round.png`, `capy-shot.mjs`
- Audit scratch (keep until extraction done, then archive): `AUDIT-*.md`, `archive/`

A `tmp/kapibara/.gitignore` now marks these so they stop showing as untracked and can't be `git add .`-ed by accident. **Source `.mjs`/`.html` are NOT ignored** — they still need a decision (commit-here vs move-to-studio).

---

## 7. Suggestions (my recommended order)

1. **Stop the bleeding on CI confusion:** decide §5.3 first. My vote — **finish the `kapibara-studio` extraction**, move the daily cron there, delete `.github/workflows/kapibara-daily.yml` from MindShift. One pipeline, one home.
2. **Until then, don't claim the cloud pipeline works** — it doesn't (§5.1). Local `node make-clip.mjs` is the only true path today.
3. **MindShift product:** the highest-leverage action is **distribution, not code** — `memory/ceo-tasks.md` items 1–9 (Google Play verification, OAuth toggle, pg_cron, post to r/ADHD). Code is 95th percentile; users are 0.
4. **Finish & commit the mascot work** (`Capy.tsx` et al.) or revert it — don't leave the working tree dirty across handoffs.
5. **Keep this file current.** Any tool that does meaningful work here should update §5–§6 before handing off. A map built from stale memory is worse than none.

---

## 8. Tool-specific entry points (all point back here)

- **Claude Code** → reads `CLAUDE.md` (+ `.claude/rules/*`). It links here.
- **Codex / Cursor / Zed / most agentic CLIs** → read **this `AGENTS.md`** natively.
- **Gemini CLI / Antigravity** → read `GEMINI.md` (a thin pointer to this file).

Whatever you are: this file + the doc it links for your task = enough to start without breaking anything.

---

## 9. Handing the Пульт (video factory) to a DIFFERENT AI (2026-07-07)

> CEO ask: when Claude Code hits its usage limit, a different AI should be able to pick up **maintaining** the daily video factory without re-explaining everything from scratch.

**Already true, no work needed here: the pult does not run on Claude.** The daily publish loop is plain Node + GitHub Actions — `tmp/kapibara/pult_worker.mjs` polls the `pult_commands` Supabase table (claim → run `make-clip.mjs` / `ladder_render.mjs` / `buffer_publish.mjs` → report to Telegram), triggered by `pult-poller.yml` every 10 min. Zero LLM calls in the orchestration itself (Gemini is only called *inside* those scripts, for script-writing / TTS / the critic gate). Confirmed working today (2026-07-07): CI run succeeded, clip published to IG+TikTok, GCS file verified live (`curl -I` → 200). Claude/Atlas's actual job is **maintainer**, not operator: read a failed CI run, diagnose, fix the script, write the lesson down. That's the role that needs to transfer, not the pult.

**To pick up maintenance as a new AI, read in this order:**
1. This file — orientation, what's real vs stale.
2. [docs/FACTORY-MAP.md](docs/FACTORY-MAP.md) — the 9-stage line + which gate catches what.
3. [.claude/rules/content-factory-law.md](.claude/rules/content-factory-law.md) — the 12 binding laws (voice, palette, pace, one CTA, gate-before-ship). Hard constraints, not suggestions.
4. [memory/marketing-backlog.md](memory/marketing-backlog.md) — the live task list + what's `WAITING-CEO` (don't re-decide a forked question CEO already parked).
5. `tmp/kapibara/pult_worker.mjs` + `tmp/kapibara/PULT-ANALYSIS-2026-07-04.md` — the pult's own mechanics + the v2 roadmap (edit scenario / duration from the phone, Mini App constructor — not built yet).

**3 health checks any AI can run without asking the CEO anything:**
- `gh run list --workflow=kapibara-daily.yml --limit 5` — is the daily CI green?
- Query Supabase table `publish_journal` for today's date — did it actually *publish* (not just run)?
- `curl -I https://storage.googleapis.com/kapibara-news-pub-0321449510/kapibara-<date>.mp4` — does today's clip file exist and serve?

**Secrets needed (names only — NEVER read or paste values into chat, per the secret-stream guard):** `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_CREATORBOT_TOKEN`, `GEMINI_API_KEY` — already live as GitHub Actions secrets (proven by today's successful publish). A new AI never needs the values, only `gh secret list` to confirm they exist.

**Do NOT, without explicit CEO word:** change publish cadence (1/day is Factory Law 11), touch `LOCKED_VOICE`, merge/abandon the `kapibara-studio` extraction (§4 — CEO-gated structural call), or restart a fork already marked `WAITING-CEO` in the backlog.

**First live handoff task (2026-07-07):** [tmp/kapibara/HANDOFF-antigravity-ladder5-2026-07-07.md](tmp/kapibara/HANDOFF-antigravity-ladder5-2026-07-07.md) — a self-contained capability-proof task for Antigravity/Gemini: build ONE video with 5 quiz questions in the existing Ladder format. If you are Antigravity reading this, go there now.
