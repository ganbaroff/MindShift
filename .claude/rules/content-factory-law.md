# Content Factory Law — binding, loaded every session

> Why this exists (CEO 2026-07-04): «мы знаем кому продаём и как, но каждый раз получаем разные результаты, потому что нет законов, рамок». Every run diverged because no spec pinned the variables. These laws pin them. Grounded in the actual code (file:line receipts) by workflow wf_0fea6245. TIGHT on purpose. If a law and the code disagree, the code is the bug — fix the code, don't loosen the law.

## MASTER SEAL (Law 0) — one daily engine
CI runs EXACTLY ONE named engine; the laws govern THAT file. **Ground truth: `kapibara-daily.yml:69` runs `node make-clip.mjs` = the NEWS engine (gen_news → gen_voice 11-line TPL). `ladder_render.mjs` and `make-film.mjs` are NOT invoked by cron — they do not ship on schedule.** A law pinning a file the cron never calls pins nothing. **🔴 CEO must decide which format is the daily product (News vs Ladder) — everything else waits on that call.** Each law below tags SHIPPING (news) vs NOT-IN-PIPELINE (ladder/film).

## The laws (one line each; pinned value inline)

1. **FORMAT — frozen skeleton.** New episode swaps text+JSON only, never edits the skeleton. NEWS = 11 lines fixed TPL (`gen_voice.mjs:15`). LADDER = 7 beats hook→question→options→micro→think→reveal→cta (`ladder_render.mjs:23`). A third format needs its own locked template + a law entry, never an ad-hoc fork.
2. **FORMAT — pace is LAW: 135 words/min (CEO 2026-07-05)** via `NEWS_TARGET_WPM=135` (env.mjs); reconcat derives targetSec from script length, atempo clamp [1.0,1.5]. Proven: 77 words → 34.2s @ exactly 135 wpm. Duration follows the script; gen_news char budgets keep totals sane. LADDER: apply the same WPM law when it ships.
3. **VISUAL — palette.** UI/design-token code uses NO red hex (teal #4ECDC4, indigo #7B72FF, gold #F59E0B, surface #1E2136/#252840, text #E8E8F0/#8B8BA7; festive #FFE66D accents). Reveal=teal never green; wrong=gray fade never red. **RED RULE (CEO 2026-07-04): the ban targets IRRITATING red, not every red pixel.** A little incidental red (tiny logo speck, distant background) is fine; what's banned is large/aggressive red, red as an error/alarm signal, an all-red garment/object dominating a frame — the RSD trigger. The frame QA gate (`frame_check.mjs`) flags irritating red as HIGH, tolerates small incidental red. CI grep gate still exits non-zero on red hex in the app's own design-token files.
4. **VISUAL — mascot is ONE artifact.** Canon = `src/shared/ui/Capy.tsx` (Mochi). **Today imported by ZERO engines — three rogue capybaras exist** (`kapibara_ladder.html:20` .mochi CSS, `render_assets.mjs:20` inline CAPY_SVG, `studio_split.html` #capy). Render Capy.tsx once → committed `capy_canon` asset → embed that ONE file everywhere; delete the copies; CI grep gate blocks their return.
5. **VISUAL — mute-readable + AI disclosure + 1 CTA.** Hook on frame 1, big/high-contrast; no urgency words; no 👎/❌/💀 (use 🌊/🌱/🌀). Persistent on-frame AI-disclosure badge every clip. Exactly one primary CTA.
6. **VOICE — NEWS voice = ElevenLabs Brian `nPczCjzI2devNBz1zQrb` / `eleven_multilingual_v2` (CEO ear-verdict 2026-07-20, supersedes the 2026-07-05 Algieba lock — the critic flagged Algieba "robotic" daily; a 4-way ear test picked Brian).** voice_settings `{stability:0.4, similarity_boost:0.75, style:0.3, use_speaker_boost:true}` — CEO-approved sample, do not retune. One voice per CHARACTER still holds; the ENGINE is now ElevenLabs, not Gemini TTS. Gemini/Algieba stays the FALLBACK in `gen_voice.mjs` (EL 401/quota → Algieba for that run + alert, so the daily never goes silent). Outro (`outro_build.mjs`) + Yusif-character = LOCKED_VOICE (Algieba) / Charon — unchanged this round. Changing the news voice = edit `EL_VOICE` + a fresh CEO ear receipt only.
7. **VOICE — frozen style + fixed audio norm.** TTS directive is a per-format CONSTANT (news B+F frozen strings, mapped by TPL, `gen_voice.mjs:10-11`). TTS_MODEL = gemini-2.5-flash-preview-tts. Audio always loudnorm I=-16:TP=-1.5:LRA=11, 24kHz, 192k. CEO ear approves a SHORT sample BEFORE any full render.
8. **MOTION — real motion, no slideshow.** Mascot rig + state transitions animate. Slow ken-burns picture pans BANNED (too slow for ADHD). Static-frame-only is not "animated".
9. **PROCESS — reuse engine, JSON-swap only.** Never rebuild. Script text has ONE source = the episode JSON. **Today ladder text lives in 3 places** (`ladder_render.mjs:23` BEATS, `kapibara_ladder.html:101` DEFAULT_EP+literals, `ladder_ep01_token.json`) → VO can say one thing while the frame shows another. HTML must read all strings from window.EP; delete DEFAULT_EP+literals in prod.
10. **QUALITY GATE — a checker after EVERY module, not one at the end (SEAL).** The line is n8n-style: each stage's output is inspected by the next module; fail → REWORK that unit, don't advance; a bug is caught where it's born, never discovered at the end. Two module-checkers exist and both BLOCK with non-zero exit (proven 2026-07-04):
    - **Per-frame/shot:** `frame_check.mjs <img>` — catches generation artifacts (stray smoke/objects from the body, extra/fused limbs, wrong-sport props, left/right orientation & handedness errors, wrong character, red, garbled text). Runs after each still-gen and each Veo shot, BEFORE assembly. Proven: flagged real CR7 frames, exit 1 on `verify_cr7/t_20.jpg`.
    - **Whole-clip:** `content_critic.mjs <clip>` — voice/motion/mascot/readability/palette; `process.exit(ship_ready?0:1)` (proven exit 1). Runs after assembly, BEFORE CEO/publish.
    The line is orchestrated by `line.mjs <jobDir>` (proven 2026-07-04: ran stills→frame_check PASS then clip→content_critic REWORK, HALTED at the assembly gate, exit 1 — refused to publish the flawed clip). Gates are TESTED: frame_check is stable (same frame→same verdict 3/3, temp 0, blocks HIGH-severity only) and discriminating (injected red → REWORK); content_critic exits 1 on ship_ready:false.
    **GREEN ACHIEVED 2026-07-05 (commit a120d3e):** the daily NEWS engine passed the full gated loop after 3 rework iterations — LOCKED_VOICE+one style, pace-lock 29s, gradient mascot + breathing/nods/chips, sub backing. Final: frame gate 5/5 PASS + critic SHIP_READY:true (mean 3.86, stable 3/3 runs). Critic CALIBRATION is law: format-aware rubric (news≠quiz), temperature 0, EVIDENCE RULE (score ≤2 requires a timestamp, else ignored), ship bar computed by CODE = no evidenced ≤2 AND mean ≥3.5. Model's own ship_ready field is ignored (it oscillated on identical quality).
    **Ticker profanity guard (build-data2):** scrolling ticker words clipped by the СВОДКА label can leave a vulgar suffix on a frozen frame — LIVE CATCH by frame gate: «потребляют»→«ебляют». Any ticker item containing a risky substring is dropped + label-edge fade in studio. Never remove this guard.
    Only a genuine taste/voice issue may reach the CEO WITH the verdict attached.
11. **DISTRIBUTION — one publisher, 1/day.** Publish only via the canonical publisher (`make-clip.mjs` → `tg_post.mjs` preview → buffer_create+buffer_publish → IG+TikTok, GCS-hosted). Cadence 1/day (3/day HARMFUL). Never hand-post. YouTube via Buffer token = KNOWN BROKEN — never claim YouTube publish. Idempotent guard at `make-clip.mjs:30`.
12. **DISTRIBUTION — pinned CTA + humanized caption.** Each platform gets a PINNED CTA + one fixed funnel destination, same wording across a series until CEO changes it. Caption follows the humanizer/tone guide (one idea per line; banned promo-speak).

## Variance killed (what floated → what pins it → value)
- Which engine ships → Law 0 → make-clip.mjs (news) @ kapibara-daily.yml:69.
- Voice → Law 6 → one LOCKED_VOICE const (replaces 4 argv/board sites).
- News runtime → Law 2 → NEWS_TARGET_SEC + atempo (GAP, to add).
- Ladder duration → Law 2 → EP.durationSec (JSON sole source).
- Mascot → Law 4 → one capy_canon from Capy.tsx.
- Ladder script text → Law 9 → episode JSON (window.EP) sole source.
- Quality → Law 10 → critic ship_ready = hard gate.
- TTS style → Law 7 → B+F frozen constants.

## Gaps needing code (enforcement TODO, ranked)
1. **Critic gate**: `content_critic.mjs` exit code — DONE; wire into `kapibara-daily.yml` between render+publish — PENDING (needs CEO format + gate-policy).
2. **Voice const**: delete all argv/board fallbacks → one LOCKED_VOICE (gen_voice.mjs:6, ladder_render.mjs:12, make-film.mjs:120, outro_build.mjs:10).
3. **News pace-lock**: add NEWS_TARGET_SEC + atempo to gen_voice/reconcat/assemble (only if News stays daily).
4. **Mascot unify**: render Capy.tsx → capy_canon → embed; delete .mochi CSS + CAPY_SVG; add grep gate.
5. **Ladder single-source**: HTML reads window.EP only; delete DEFAULT_EP+literals; TARGET_SEC=EP.durationSec.
6. **CI lint gates**: red-hex grep + rogue-mascot grep, pre-render, non-zero on hit.

## 🔴 Open CEO decisions (only these unblock the rest)
1. **Which format is the daily product — News or Ladder?** Decides which engine CI pins; the other set of laws goes to archive. Everything waits on this.
2. **LOCKED_VOICE** — fresh ear-test on one sample, name the single voice (Puck/Fenrir/Zephyr?). Your ear before any full render.
3. If News stays: approve NEWS_TARGET_SEC + its band (e.g. 28-35s).
4. Critic gate policy — is ship_ready:false an absolute publish block, or may a clip still reach you (verdict attached) when the only issue is a taste/voice call?
