# HANDOFF — external audit (Cursor), 2026-07-10

> **Who wrote this:** Atlas (Claude Code instance) after a multi-day build session on the content studio.
> **Your job (Cursor):** find my mistakes and help harden this into a QUALITY APPLICATION, not a founder's toy. §6 is my honest self-audit — start there, then hunt what I missed. Ground-truth everything: run the receipts in §7 before trusting any claim in this file.
> **Read first for repo orientation:** [AGENTS.md](AGENTS.md) (the tool-agnostic map). Binding laws: §9 — violating them is a bug even if the code "works".

## 1. Where you are

- **Repo:** `C:\Projects\mindshift` — ONE product + two lodgers:
  - `src/` = **MindShift PWA** (ADHD productivity app, production, 0 users). **DO NOT refactor casually.** Not the subject of this audit.
  - `tmp/kapibara/` = **the content-video studio** — THE subject of this audit. Note: `tmp/` is in `.gitignore`; the ~70 studio files that matter are FORCE-tracked (`git ls-files tmp/kapibara/` to see which). Untracked files there are runtime artifacts/experiments.
  - `memory/` = operator brain (backlogs, lessons, specs). `memory/marketing-backlog.md` holds the mini-specs; `memory/mistakes.md` holds the lessons ledger.
- **Branch:** `fix/crystal-earned-allowlist`, currently **== origin/main @ `15b0d7a`** (work is pushed to main via `git push origin HEAD:main` after local gates; the branch name is historical, not a feature scope).
- **CI:** `.github/workflows/` — `CI` (vitest excludes `tmp/**`), `Pult Conveyor E2E Tests` (hermetic, `PULT_MOCK=1 node e2e_mock_test.mjs` in tmp/kapibara), `kapibara-daily.yml` (the SHIPPING daily news engine, cron → `make-clip.mjs`), `Deploy Edge Functions`, `pult-poller` (*/10 queue tick). Standing red: `Sync to ZEUS Gateway` (pre-existing, being fixed in a separate session).

## 2. The product goal (CEO directive, 2026-07-10 — this is the WHY)

Paid **Telegram subscription**: subscribers chat in the channel/bot; in the background agents generate personalized videos. The user picks a **FORMAT** (Minecraft style, Lego style, greetings/поздравления in any language, more to come). Flow per order:

**format pick → IMAGE preview generated (cheap, controllable, user/CEO can approve or reroll) → approved image → VIDEO generated from that image (i2v) → gates → delivered in TG.**

Image-first is the control point: it makes output predictable and engaging before the expensive video spend. The conveyor below is the engine for this; every format = a **recipe** (data, not code). CEO verbatim: «у этого инструмента конвеера есть цель и надо всё настроить так чтобы работало как качественное приложение».

## 3. Architecture (Studio Conductor — chosen by a 14-agent voted panel, spec: `tmp/kapibara/STUDIO-CONDUCTOR-SPEC.md`)

- **Kernel:** `conductor.mjs` — format-blind walker of `recipes/*.recipe.json`. Stateless; journals every step. Live semantics: skip-if-artifact-exists, journal-based resume skip (green stages never re-run), human gates park/resume (`--job` + `--approve=<gate>`), producer exit 3 = infra-PARK (3-strike ceiling → needs_human), other non-zero = visible REWORK.
- **Voting gate:** `gate_tally.mjs` — 3 layers: (1) deterministic veto, 0 tokens: never-red PPM pixel scan (>2% irritating-red = block; 0 parsed frames = PARK), shame/urgency regex, duration band; (2) critic bar: `no evidenced ≤2 AND mean ≥3.5` (parses the critic's printed output); (3) 3-sample quorum escalation ONLY in mean band [3.3,3.7]. Ballots → `studio_votes.jsonl`. Verdicts never cached.
- **Credits-first:** `credit_gate.mjs` + `credit_gate_auto.mjs` (fetch-patch metering every `generativelanguage` call → `studio_spend.jsonl`), enforced by `lint_credit_gate.mjs` (any .mjs referencing Gemini must import the gate).
- **State (local prototypes of future Supabase tables — migration is CEO-gated):** `studio_jobs.jsonl`, `studio_steps.jsonl`, `studio_votes.jsonl`, `studio_spend.jsonl`.
- **Recipes today:** `recipes/news.recipe.json` (the daily engine, descriptive + dry-run-walkable), `recipes/agency.recipe.json` (Integronix promo — fully live-walked end-to-end).
- **Telegram control plane (exists, reuse):** edge functions `supabase/functions/creator-pult` (verbs /brief /ок /нет /go /status), `telegram-webhook`; workers `tmp/kapibara/pult_worker.mjs`, `conveyor.mjs` (Supabase queue `pult_briefs`, optimistic claim + lease reaper).
- **Generation substrate for the new formats (exists, not yet recipe-wired):** `gen_vzimg.mjs` (image gen), `gen_veo_i2v.mjs` / `gen_veo.mjs` (image→video Veo), `make-film.mjs` (script→consistent stills→Veo first+last→film, proven), `gemini_tts.mjs` (multi-voice TTS, free→Vertex fallback), `el_voice.mjs` (ElevenLabs AZ), Lyria music (`music_probe.mjs` → `music_bed.mp3`).

## 4. Active tasks / direction stack

1. **NEW (top): productize formats** — see §8 plan. Awaiting CEO's confirmation of the plan, but the direction is set.
2. reel7.mp4 (Integronix promo) delivered to CEO TG (msg 46) — awaiting his eye/ear. Critic mean 3.14; the two low scores are CEO-directed constraints (one-site, static device).
3. P3 backlog (task list + `STUDIO-CONDUCTOR-SPEC.md`): watcher-exec per station, input-hash idempotency, `studio_*` Supabase migration (CEO gate), make-clip slimming (assemble-only mode).
4. Background chips running/pending: ZEUS Sync workflow red (separate session), `kapibara_episodes` table missing (sync 404 every daily run).
5. Daily news cron: GREEN on the metered engine (first scheduled run after the merge succeeded 2026-07-10 07:56Z).

## 5. What provably works (run §7 to re-verify)

- CI + Pult E2E green on `15b0d7a`; daily cron green post-merge.
- Conductor live job `live-1`: park at `ceo_ear` → `--approve` → artifact-skips → live critic call → honest REWORK + `needs_human` (see `studio_jobs.jsonl`).
- gate_tally deterministic tests: pure-red clip → exit 1 with zero LLM calls; shame text → exit 1; reel7 → clean pass; journal-skip: tick2 skips a green stage.
- Credit meter: every Gemini caller (20 files) routes through the gate; lint 111 scanned / 0 unmetered; a full make-clip dry-run logged 15 metered calls.
- Adversarial review (25-agent panel, run `wf_4f13ffa5`): 18 confirmed findings — all fixed except two LOW deferred with rationale (§6.9, §6.10).

## 6. KNOWN BUGS / DEBTS / SUSPECT SPOTS — hunt here first

> **AUDIT ROUND 1 LANDED (2026-07-10, external agent + Atlas verification):** items **#1** (CRITIC_VERDICT_FILE structured exchange, stdout-regex now fallback-only), **#3-partial** (job-isolated journals `studio_steps_<job>.jsonl`, global kept for audit), **#4** (quota day = America/Los_Angeles), **#5** (`make-clip --skip-voice` + news recipe), **#8** (dir-artifact must be non-empty, file >0 bytes), **#9** (corrupt-webm rename), **#10** (LINES/SUB length assert + tempo>1.1 warn) — FIXED and verified live. Two defects found in the external patch itself during verification: missing `existsSync` import in gate_tally (runtime crash on the new path — caught by a LIVE run, not by diff review) and critic-response truncation at 6/7 dims (fixed via rubric word-caps). Lesson: diff-review is not acceptance — run the receipts. Still open: #2 (red-threshold calibration set), #6 (input-hash), #7 (watcher-exec), #11 (IG handle), #12 (voice warmth), #13, #15.

1. **Critic-output parsing is stdout-regex** (`gate_tally.mjs` criticSampleOnce): brittle by design; any format drift in `critic_agency.mjs`/`content_critic.mjs` console output silently degrades to PARK-after-retry. Proper fix: critics should emit a JSON verdict FILE the tally reads.
2. **Red-scan heuristic unvalidated at scale** (`gate_tally.mjs` rgb2redness): hue 0-15/345-360, sat>0.55, val>0.35, >2% threshold — calibrated on 2 synthetic cases only. False-positive risk: warm-toned Minecraft/Lego frames. Needs a labeled frame set.
3. **JSONL journals have no locking/rotation** — parallel agents (Codex runs in this repo too! We hit `.git/index.lock` contention today) or two conductor ticks could interleave writes; `studio_votes.jsonl` already at 300+ lines. Needs per-job files or a real DB (the gated migration).
4. **Timezone**: `studio_spend.jsonl` "day" is UTC; Baku is UTC+4; Gemini free-tier resets midnight Pacific. Daily-cap math will be wrong at edges.
5. **make-clip double-runs voice**: the news recipe's assemble station calls `make-clip.mjs --skip-news`, but make-clip still internally re-runs gen_voice/reconcat (its own stages). TTS cache mostly absorbs it; still a smell. Slimming = P3.
6. **`approvals` are per-job forever** unless `--force`; there's no artifact-hash binding (approve ear → regenerate voice by editing el_voice.mjs manually → old approval still valid unless --force). Input-hash idempotency (P3) is the real fix.
7. **conductor never executes station `watcher`s** (only the critic station gates) — Factory Law 10 says checker after EVERY module. P3.
8. **`rec3` directory-as-artifact**: an empty rec3/ false-skips the device station (caught later by encode_rec fail-loud, but the skip semantics lie).
9. **Deferred LOW (panel #15/#16 partially)**: encode_rec treats any non-ENOENT ffmpeg failure as REWORK — corrupted webm loops to needs_human without cleanup hints.
10. **`el_voice.mjs` atempo hack**: >22.5s total → global atempo up to 1.25 — can make AZ speech sound rushed; also SUB texts differ from spoken LINES by design (fine) but nothing validates they stay in sync when edited.
11. **`@integronix` handle on the endcard is UNVERIFIED** (CEO's real IG handle unknown to me) — `tmp/kapibara/endcard.html`.
12. **Voice quality**: independent critic scored the AZ ElevenLabs voice 3/5 "clinical, lacks warmth" — matches CEO's standing complaint pattern. Needs style-directive experiments + CEO ear sampling (Law 7 station exists: `send_ear_sample.mjs`).
13. **Windows/paths**: everything currently runs from `tmp/kapibara` cwd; `conductor.mjs` spawns with `cwd: DIR` — recipes with nested producer paths (e.g. `webdemo/flagship/index.html`) work, but nothing tests spaces-in-path or non-C: drives.
14. **Secrets hygiene**: keys live in `tmp/kapibara/.secrets.env` (gitignored — verify with `git check-ignore`). NEVER print its bytes; read names only (`awk -F= '{print $1}'`). A `secret-stream-guard` hook blocks unsafe access patterns — don't fight it, use Read/Edit tools for files whose CONTENT mentions env var names.
15. **Local-index drift risk**: I committed once via `GIT_INDEX_FILE` plumbing to bypass lock contention; if you see staged-deletion ghosts in `git status`, run `git reset` (mixed) — worktree is the truth, remote main is green.

## 7. Receipts — run these before believing anything

```bash
cd tmp/kapibara
node lint_credit_gate.mjs                                  # expect PASS, 0 unmetered
node validate_recipe.mjs recipes/news.recipe.json          # expect PASS 6 stations
node validate_recipe.mjs recipes/agency.recipe.json        # expect PASS 10 stations
node conductor.mjs recipes/agency.recipe.json --mock --job=audit-$RANDOM   # 10/10 mock walk
ffmpeg -y -f lavfi -i color=red:s=270x480:d=2 -pix_fmt yuv420p _r.mp4 && node gate_tally.mjs _r.mp4 --recipe=recipes/agency.recipe.json --skip-critic; echo "exit=$? (must 1)"; rm _r.mp4
node make-clip.mjs --force --no-preview --no-publish       # FULL daily engine dry-run (~5-10 min, burns some Gemini quota, publishes NOTHING)
cd ../.. && npx tsc -b && npx vitest run                   # PWA gates (must stay green — the studio must never break the app suite)
```

## 8. Proposed gap plan for the product (NOT built yet — correct/critique this)

1. **Format recipes** (data-only where possible): `recipes/minecraft.recipe.json`, `lego.recipe.json`, `greeting.recipe.json` — stations: `brief(format,params: name/occasion/language)` → `image_gen` (gen_vzimg w/ style refs; produces `preview_<job>.png`) → `frame_check` gate → **`user_ok` human gate (TG: картинка + «ок/переделать»)** → `i2v` (gen_veo_i2v from the approved image) → per-shot `frame_check` → `assemble` (+TTS in target language via gemini_tts voices, music bed) → `gate_tally` → `deliver`.
2. **New human-gate kind `user_ok`** — approval by the SUBSCRIBER, not the CEO: conductor already parks; the missing piece is creator-pult verbs (`/formats`, `/make <format>`, inline-button approve) writing `approved_user_ok` into the job store.
3. **Job store → Supabase** (`studio_jobs/steps/votes` migration): required before multi-user; CEO-gated (prod DB).
4. **Payments**: research-first, do NOT hardcode — candidates: Telegram Stars subscriptions (native, zero-friction) vs Dodo Payments (already integrated in this repo's edge functions: `create-checkout`, `dodo-webhook`). Deliverable = comparison with real production evidence, then CEO picks.
5. **Cost model per order**: image gen (1-3 rerolls) + i2v (5-8s clip) + TTS — meter per job_id via `studio_spend.jsonl` tier field; per-user daily caps before launch.
6. **Moderation/safety gate** on user-supplied text (names/greetings): the shame/urgency veto extends with a user-content policy list; never-red stays absolute.

## 9. Laws that bind every change (violating these = bug)

- `.claude/rules/content-factory-law.md` (12 laws; Law 7 = CEO ear on a voice sample BEFORE full render; Law 10 = checker after every module, code tallies not model self-report; Law 11 = one publisher, 1/day, idempotent).
- `.claude/rules/guardrails.md` + Constitution quickref: **NEVER RED** (hue 0-15/345-360), shame-free copy, max 1 CTA, no urgency language.
- Credits-first LLM: NVIDIA→Vertex→Azure→free→paid-LAST; all Gemini calls through the credit gate (lint enforces).
- `.claude/rules/never-delete.md`: never remove functionality without the owner's explicit OK.
- Irreversible actions (prod DB migrations, payments, publishing, new external TOS) = CEO's explicit word first.

## 10. Open questions only the CEO can answer

1. Which format ships as the daily product — News or Ladder (Factory Law 0)? The new product direction may supersede this — needs his word.
2. Is `ship_ready:false` an absolute publish block, or may borderline taste-calls reach him with the verdict attached?
3. LOCKED_VOICE per character confirmed? (Algieba capybara / Charon Yusif / Charlie for agency-ElevenLabs.)
4. Real Instagram handle for the Integronix endcard (`@integronix` is a placeholder).
5. Go for the `studio_*` Supabase migration (prod DB)?
6. Payments rail: TG Stars vs Dodo (after the research lands).
