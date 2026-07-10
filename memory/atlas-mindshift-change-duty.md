# Atlas duty: react to MindShift changes (replaces sync-to-zeus.yml)

> **Status: DRAFT — waiting for CEO «го» on the wording.** Once approved, this is binding for every Atlas instance that opens this repo.
> **Origin:** CEO decision 2026-07-10 — the GH Action that POSTed push events to ZEUS was deleted (endpoint dead since April, see AGENTS.md §5.5). CEO: «генерация тестов будет на атласе» — the machine-to-machine notification is replaced by Atlas doing the actual useful reaction itself.

## Why this exists (one paragraph)

The old workflow *told* a gateway that MindShift changed and hoped agents would react. Nobody reacted — the endpoint was dead for 3 months and nobody noticed, because the notification produced no artifact. The replacement inverts it: no notification, just the reaction. When the repo changes, Atlas itself checks what changed and closes the test gap. An artifact (tests, green run) instead of a signal into the void.

## The loop (what Atlas does, step by step)

1. **Trigger — session start in this repo.** Any Atlas instance beginning substantive work in `C:\Projects\mindshift` (including «джарвис»/boot) runs the check below BEFORE new feature work. No cron, no daemon — test generation needs a working session anyway, so the session IS the trigger (simplest thing that works).
2. **Check:** read `memory/atlas-change-duty-state.json` → `last_handled_sha`. `git fetch origin main`, compare. No new commits → duty done, proceed with the session. State file missing → seed it with current HEAD, don't back-fill history.
3. **Classify the diff** (`git diff --name-only <last_handled_sha>..origin/main`):
   - `src/**` product code → **in scope**;
   - `tmp/kapibara/**`, `docs/**`, `memory/**`, `.github/**` → out of scope (other duties own those);
   - `supabase/functions/**` → in scope, but tests = deno-level or E2E mocks only.
4. **Close the gap:** for in-scope changes with no covering test, write tests per `.claude/rules/testing.md` — Vitest unit next to the code (`src/**/__tests__/`), Playwright E2E in `e2e/` for user-visible flows. Follow existing patterns (`seedStore()`, `mockSupabase()`, offline-mocked Supabase).
5. **Gate:** `tsc -b` + full affected suite green before commit. A generated test that fails against current code is a FINDING, not a commit — surface it to CEO with the failing output (it may be a real bug).
6. **Receipt + advance state:** commit tests (normal commit rules), write the new SHA into `memory/atlas-change-duty-state.json`, one line in the session report: «change-duty: N commits covered, M tests added, suite green».

## Hard bounds (the leash)

- **Never-delete rule holds** — this duty adds tests, it never "cleans up" code or existing tests.
- **No refactors of product code under this duty.** A test that needs a refactor to be writable → backlog item, not a refactor.
- **Budget:** if the diff since `last_handled_sha` is huge (>20 files), don't heroically cover everything — cover the riskiest (store, focus session, crystal/payment paths), log the rest as a backlog line. No silent caps: say what was skipped.
- **No resurrecting the ZEUS POST.** If ecosystem eventing is needed later, that's a new CEO-approved design, not a side effect here.

## State file format

`memory/atlas-change-duty-state.json`:
```json
{ "last_handled_sha": "<full sha>", "handled_at": "YYYY-MM-DD", "by": "session note" }
```

## v2 (opt-in, NOT now)

A scheduled task (cron → Claude session) could run this loop nightly without waiting for a human-opened session. Deliberately not enabled: it spends tokens unattended and CEO hasn't asked. Revisit only on explicit «го» for automation.
