# AGENTS.md — START HERE (read this first, any tool, any model)

> **Назначение (RU):** Это единая точка входа. Какой бы инструмент ты ни открыл — Claude Code, Codex, Antigravity, Gemini CLI, Cursor — прочитай этот файл первым. Он говорит: что это за репозиторий, что где лежит, что работает, что сломано, что мусор, что делать дальше. Глубокие детали — по ссылкам, не здесь.
>
> **Last verified:** 2026-06-29 by ground-truth survey (git status + file reads, not memory).

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
