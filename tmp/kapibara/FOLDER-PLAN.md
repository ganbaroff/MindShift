# Factory folder structure — proposal (DO NOT execute mid-finish-line)

> CEO 2026-07-07 asked to plan how to structure the folders. Ground truth: `tmp/kapibara/`
> holds **234 files** — 64 loose `.mjs`, 21 json, 49 png, 12 mp4, 6 html. It grew flat.

## The real problem (worth fixing more than the mess)
The factory lives in **`tmp/` which is gitignored**. Every engine file is force-added one by one,
so files silently go missing in CI. This has bitten us repeatedly:
`outro_build` + `buffer_create` (missed in a commit), then **`render_outro.mjs` today** (CI couldn't
find it → rebuild-outro failed until force-added). A flat gitignored dir is the root cause, not the file count.

## Proposal — two moves, staged

### Move A (the important one): promote the factory OUT of `tmp/` into a tracked dir
`tmp/kapibara/` → **`factory/`** (tracked normally, no more `-f`, nothing silently missing).
Outputs (renders) stay gitignored via a nested `factory/runs/.gitignore`.
This ends the whole class of "missing in CI" bugs.

### Move B: group by role inside it
```
factory/
  engine/     make-clip, gen_news, gen_voice, reconcat, build-data2, render6,
              assemble, env.mjs, studio_v6.html, translate_ar, build_subs_ar
  outro/      outro_build, render_outro, rebuild_outro, yusif_outro.html, outro.json, outro.mp4
  gates/      frame_check, content_critic, line, gates.test
  publish/    buffer_*, metrics, journal, supabase_sync, dashboard
  pult/       pult_worker, pult_setwebhook, webhook_probe, check_creatorbot
  ladder/     ladder_render, kapibara_ladder.html, ladder_ep01_token.json, ladder_question_bank.json
  brand/      kit.html, brand_render, assets, BRAND-KIT.md   (already its own tmp/brand — merge here)
  oneoff/     dup_*, del_drafts, send_*, gen_veo*, film_lib, make-film, list_veo, test_kling  (probes/experiments)
  runs/       film_runs, ladder_runs, reel_seg, frames_*, veo_clips, verify_*  (gitignored outputs)
  archive/    dead/superseded (already exists)
```

## Why NOT now — the risk
Every workflow uses `working-directory: tmp/kapibara` and scripts call each other by **bare relative
path** (`node gen_news.mjs`, `import './journal.mjs'`). Moving files breaks the **live daily
autopublish** (finish line, day 3/14) unless every path + every relative require + all workflow files
change **atomically in one PR**. A half-done move = red pipeline = broken finish line.

## Recommended timing & method
- **Wait until day 14 (2026-07-19)** — after the 14-day autopublish proof. Don't touch the green machine.
- Then do it as **ONE atomic PR**: move files, rewrite relative requires, update `working-directory` +
  script names in `kapibara-daily.yml` / `pult-poller.yml` / `rebuild-outro.yml`, run a full dry-run
  dispatch to prove green, merge.
- Low-risk cleanup that CAN happen sooner (still needs CEO ok, never-delete): archive/delete `runs/`
  outputs (~120MB: reel_seg, film_runs experiments, verify_* frames) — pure outputs, not engine.

## One-line ask for CEO
Approve the target structure + the "after day 14, one atomic PR" timing? And a separate yes/no on
deleting the ~120MB of render outputs now.
