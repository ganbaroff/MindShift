# Studio Conductor — multi-agent content-video studio (chosen architecture)

> Chosen 2026-07-10 by a 14-agent design panel (workflow `wf_0dd04d7c-4ad`): 4 architects propose → 4 devil's-advocates break → 5 perspectives vote → 1 synthesize. **Substrate choice UNANIMOUS across all 5 voters.** CEO directive: efficiency + long-term over speed; each stage watched by its own agent; gates decided by multi-agent voting; **exclude Atlas-as-sole-orchestrator (the monolith).**

## Verdict — the substrate
**Extend the EXISTING Supabase-queue state machine (`conveyor.mjs` + `pult_worker.mjs` optimistic-claim, driven by the */10 GitHub Actions poller) into a small, format-blind KERNEL that walks a versioned per-format RECIPE (data, not code).** The complexity the CEO asked for lives in DATA (recipes + a ballot ledger), never in a swarm of long-lived daemons or a monolith brain.

Net-new surface (the whole build):
- 3 thin tables: `studio_jobs` (generalizes `pult_briefs`), `studio_steps` (durable step-journal → idempotency/replay/observability), `studio_votes` (gate ballot ledger).
- A versioned `recipes/{news,agency,ladder}.recipe.json` format (constants move OUT of env.mjs → env holds secrets only).
- ONE credits-first `llm_call()` shim (tier order NVIDIA→Vertex→Azure→free→paid-last) that ALL callers route through.

**Rejected** (with reasons): Mastra = the excluded monolith + provider lock-in; LangGraph = Python/LangChain on an all-Node stack + duplicate checkpointer state; Temporal/Inngest = re-solve durability we already own in Postgres (heavy ops / new external TOS the Constitution gates); n8n = GUI tool hostile to tested render code ("n8n-style" in the factory law = "checker after every module", a metaphor, not a directive). Also rejected: building the full 26-agent committee up front.

## The honest refinement of "multi-agent voting"
A dedicated LLM juror on EVERY step + N-juror voting everywhere would exhaust the free-tier (~100 req/day) in ONE rework loop, and video understanding is Gemini-only on free tier (provider-diversity at the clip gate is a fiction). So voting where it EARNS its cost, three layers, CODE-tallied:
1. **Deterministic VETO (0 tokens, reproducible):** never-red HSV-histogram on sampled frames + shame-phrase grep + duration/count asserts. A Foundation-Law breach here blocks unconditionally — cannot be outvoted.
2. **Voting bar (reused verbatim from `critic_agency.mjs:75-77`):** PASS iff `lowValid.length===0 AND mean>=3.5` (lowValid = dims scored ≤2 WITH an evidence timestamp).
3. **Escalate to a 3-juror quorum panel ONLY in the borderline band (mean 3.3–3.7);** block a dimension only if ≥2/3 jurors agree evidenced-≤2 on the SAME dimension.
Anti-oscillation: temp 0; evidence rule; CODE tally over model self-report; **never cache an LLM verdict by input_hash** (Factory Law 10 — the judge oscillates; a lucky cached pass would be canonized). Pin model versions in the recipe + a golden-clip regression.

## Per-stage roster (producer + watcher/gate)
| # | Stage | Agent | Gate | Wraps |
|---|-------|-------|------|-------|
| 0 | Conductor | `conductor.mjs` | — (reasons about nothing) | generalizes conveyor.mjs loop + line.mjs |
| 1 | Brief | intake | machine Brief Panel | brief_store + validate_brief |
| 2 | Research | scout | Fact Panel (unbacked → CUT) | gen_news search + fact_gate |
| 3 | Copy H-P-S-P-C | scribe | Copy Panel (provider-diverse) | gen_news/gen_agency |
| 4 | Localize AZ | transcreator | back-translation + native + length | gemini_translate/translate_az |
| 5 | Humanizer | humanizer | Tone Watcher | .claude/skills/humanizer |
| 6 | Storyboard | director | Continuity Watcher (deterministic) | chunker |
| 7 | Design | art_director | Palette Watcher (HSV never-red) | gen_designs/render_assets |
| 8 | Record | camera | frame_check (1/still) | prep_assets/record_3d; frame_check |
| 9 | Voice | voxsmith | **CEO EAR — human gate #1 (Law 7)** | el_voice/gemini_tts; send_ear_sample |
| 10 | Music/Mix | composer | Mix Watcher (deterministic) | mix_music |
| 11 | Assembly | editor | Assembly Watcher (deterministic) | build_reel7/assemble_reel |
| 12 | Whole-clip critic | critic_panel | 1 critic, escalate on borderline | content_critic/critic_agency |
| 13 | Deliver | publisher | **CEO /ok — human gate #2** + idempotent 1/day | make-clip→tg_post→buffer |

Human gates = EXACTLY TWO blocking (voice ear + final /ok), as async parked-signal states; infra faults (429/timeout) → PARK+notify, NEVER fail-closed-to-rework (a transient 429 must never masquerade as a quality failure or auto-publish).

## Universal by recipe
One `conductor` walks `stages[]` generically; NO stage code names a format. New format that reuses producers = data-only new recipe; a new render/voice ENGINE = one adapter behind the same envelope contract (honest limit: "zero kernel edits" is false when the toolchain is new, e.g. agency ElevenLabs vs Gemini voice). `validate_recipe` CI gate = schema + Factory-Law lint + DAG dry-run (every input artifact produced upstream) + adversarial MUST-BLOCK fixtures (a red-dominated clip, a shame-copy clip must still REWORK). Telegram: `/make <format> [topic]`, `/status`, `/why` (last verdict + evidence), `/recipes`, `/cap <n>`, `/ok /net`, `/go`.

## Phased plan
- **P0 — Credits-first shim + guardrails (BLOCKING, first):** `llm_call()` tier-order router + per-call request-count log; retrofit the 3 critics + gen_news + gen_voice first, then the rest; CI lint failing on any direct `generativelanguage.googleapis.com`; deterministic never-red HSV check + shame grep.
- **P1 — Ledger + kernel skeleton:** migrations (studio_jobs/steps/votes, dual-write shadow); lift per-format constants → news.recipe.json (behavior-preserving); `walkRecipe(job)`; lease-expiry reaper + per-stage attempt cap → needs_human; port PULT_MOCK=1 offline self-test.
- **P2 — Single-critic gates + human barriers:** wrap frame_check/content_critic/critic_agency behind `gate_tally.mjs` (deterministic veto + reused bar, verdicts NOT cached); wire `awaiting_ear` + `awaiting_ok`; GCS content-address every intermediate artifact; repoint dashboard + verbs.
- **P3 — Universality by recipe:** author ladder + agency recipes (agency = ElevenLabs adapter); `validate_recipe` CI; shared rubric module.
- **P4 — Escalating panels + calibration:** 3-juror borderline escalation; provider-diverse text jurors; labeled golden PASS/REWORK set gating model-pin bumps.

## First sprint (recommended start = P0)
1. `llm_call()` shim (NVIDIA→Vertex→Azure→free→paid) + request-count log; land in content_critic, critic_agency, frame_check, gen_news, gen_voice first (receipts).
2. CI lint failing on any direct `generativelanguage.googleapis.com`.
3. Deterministic never-red HSV-histogram frame check (hex-grep can't see red in a generated frame).
4. Per-stage attempt counter + park-on-max in conveyor.mjs (today: gate fail → exit(1) → poller re-runs → crash-loop, no ceiling/alert).
5. Lease-expiry reaper for the `delivering` tombstone (conveyor.mjs:145 strands a row on mid-stage crash; run() exits 0 looking healthy).

## VERIFIED findings (grounded this session, not the panel's word)
- **Credits-first is NOT wired:** `generativelanguage.googleapis.com` = 22 direct hits across 20 files; `freellmapi` = **0** matches in the whole repo (Grep, 2026-07-10). Violates CLAUDE.md non-negotiable #4 + the spend guard. → P0 task 1.
- **conveyor.mjs** has 6 hits for `process.exit(1)`/`claimBrief`/`delivering` — consistent with the crash-loop + tombstone the panel flagged (pattern present; line-level not yet audited).

## Open questions — ONLY the CEO answers
1. **Which format is the daily product — News or Ladder?** (Factory Law 0, still open.) Decides which recipe CI pins as the shipping engine; everything inherits from this.
2. Keep the current one-tap `/brief` confirm as a cheap steer, or truly drop to two human gates only? (Panel split; default = keep it as a non-blocking steer.)
3. Confirm LOCKED_VOICE per character (Algieba capybara / Charon Yusif) is final, AND that agency may use a DIFFERENT engine (ElevenLabs) — one LOCKED_VOICE const can't represent both.
4. Is `ship_ready:false` an ABSOLUTE publish block, or may a borderline clip reach you (verdict attached) on a genuine taste split only?
5. Throughput: is 1 publish/day total the 2-year ceiling, or will cadence rise? (If it rises → budget a self-hosted GH Actions runner; a 15–40 min render already eats a 45-min CI job.)
6. Approve isolating the studio tables (separate schema/pool) from live product tables (tasks/focus_sessions/profiles) so a content backlog can never starve the user-facing app.
