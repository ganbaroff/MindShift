# Mistakes — Lessons Learned

**Purpose:** Prevent repeating the same mistakes. Add anything that caused a bug, rework, or wasted time.
**Format:** What went wrong → Root cause → How to avoid

---

## Architecture

### cognitiveMode was set from UI and wired to real logic
What: cognitiveMode drove UI decisions for several sprints. Sprint B found it redundant with appMode.
Root cause: Two concepts (app mode + cognitive mode) that overlapped without clear distinction.
Fix (Sprint B): Removed from UI, kept in store for localStorage backward compat. `appMode` is the real driver.
→ Never read or set cognitiveMode again. It's a dead field kept only so existing localStorage doesn't crash.

### FocusScreen grew to 1180 lines before decomposition
What: FocusScreen accumulated timer FSM, setup UI, post-session flow, and phase detection in one file.
Root cause: "Just one more thing" additions without tracking file size.
Fix (Sprint 8 + Sprint BC): Decomposed into FocusScreen (orchestrator) + FocusSetup + useFocusSession + SessionControls + PostSessionFlow.
→ 400-line guardrail is enforced in `.claude/rules/guardrails.md`. tsc -b catches some violations.

### localStorage hit 5MB limit with full session history
What: Zustand persist with localStorage caused QuotaExceededError for power users.
Root cause: focus_sessions accumulated in store, localStorage has 5MB hard cap.
Fix (Sprint I): idbStorage adapter — transparent migration to IndexedDB. No user-visible change.
→ Never use raw `localStorage` for state. Always go through `idbStorage`.

---

## State / Store

### New persisted fields added without updating partialize()
What: Fields added to store initial state but not added to `partialize()`. Data lost on every reload.
Root cause: Two places to update when adding persisted state.
→ Checklist: when adding store field → immediately add to `partialize()` in the same commit.

### EnergyLevel ±1 offset confusion
What: Store uses 1-5, EnergyPicker UI uses 0-4. Conversion done in wrong places causing off-by-one.
Root cause: Historical: EnergyPicker was built with 0-indexed before store was finalized.
Fix: Conversion ONLY at EnergyPicker boundary. Business logic always uses store values (1-5).
→ See `.claude/rules/guardrails.md` Rule 5.

---

## Testing

### E2E tests used seedStore() data that didn't match real component output
What: Tests seeded tasks directly to store but component filtered/sorted differently than expected.
Root cause: Seeded data bypassed computed/memoized state derivation.
Fix: Tests use `page.route()` for Supabase + `seedStore()` only for local state. Always check what the component actually renders via `getByRole`.

### Hardcoded English strings in test assertions broke after i18n
What: E2E assertions like `expect(page.getByText('Add task')).toBeVisible()` failed after i18n was added.
Root cause: i18n changed visible text; tests used raw English strings.
Fix: After any i18n change, run `npx playwright test` — look for text-match failures. Update to use `getByRole` where possible (aria-labels don't get translated in tests since tests run in default locale).

---

## AI / Edge Functions

### Mochi AI called without hardcoded fallback showing first
What: Before Sprint AA, Mochi showed nothing until AI responded. ADHD users saw blank bubble for 2-8s.
Root cause: Awaited AI response before rendering.
Fix (Sprint AA): Always render hardcoded fallback immediately. Replace with AI response if it arrives within 8s window.
→ This pattern is required for ALL AI calls. Rule 7 in guardrails.

### Edge function locale not passed → responses always in English
What: AI edge functions responded in English regardless of user's device language.
Root cause: `navigator.language` not forwarded from client to edge function.
Fix (Sprint I): All 3 AI functions now receive locale and Gemini responds natively.
→ Always pass `navigator.language` to any AI edge function call.

---

## PWA / Push

### Push notifications scheduled with setTimeout — lost when tab closed
What: Reminders used `setTimeout` from AddTaskModal. If tab closed before trigger, notification never fired.
Root cause: setTimeout is client-only; no server-side persistence.
Fix (Sprint CE): Supabase pg_cron + scheduled-push edge function. Subscriptions stored in DB.
→ Never use setTimeout for user-facing reminders. Always use server-side scheduling.

### Service worker not updated after build (stale SW cache)
What: After deploying new version, some users still ran old SW code.
Root cause: SW versioning required manual precache manifest hash update.
Fix: vite-plugin-pwa with injectManifest handles this automatically — hash changes trigger SW update.
→ Don't manually manage SW version. Let vite-plugin-pwa handle it.

---

## Copy / UX

### AI-isms in user-facing text ("seamlessly integrates", "comprehensive")
What: Multiple copy audit passes found AI-generated marketing language throughout.
Root cause: AI wrote initial copy, nobody reviewed it with a human lens.
Fix (Sprint Copy Audit): humanizer skill run across all visible text. 25 anti-patterns documented in `.claude/skills/humanizer/SKILL.md`.
→ Run humanizer on any new user-facing string. Never ship AI copy unedited.

### Red used in validation error states
What: Early prototypes had red error messages. Research #8 shows red triggers RSD.
Root cause: Default browser/library styling.
Fix: All error states use amber/gold. "Never use red" is Rule 1 in guardrails.

---

## CTO Role / Process (Session 91 lessons — 2026-04-08)

### CTO became implementer instead of orchestrator
What: Session 91 — wrote `safety_gate`, `swarm_coder`, `daemon`, `test_runner`, `gpu-watcher.mjs`, all 3 Figma rebuild iterations BY HAND. Did not delegate to subagents or external models.
Root cause: Default mode is "code it yourself". Faster in the moment, terrible at scale.
Fix: Before coding anything > 50 lines, ask "can a subagent or local LLM do this in parallel while I do strategy?"
→ CTO orchestrates and delegates. Coding alone = junior dev mode. Use Agent tool aggressively.

### Team workflow was isolated polling, not multi-round debate
What: When I spawned subagents this session, I asked each ONE question independently and synthesized myself. No cross-critique. No "agent A reviews agent B's output". No convergence loop.
Root cause: Treating subagents as a consultant pool, not a team.
Fix: Multi-round pattern → spawn N agents → collect outputs → spawn (N-1) "critic" agents to find holes in each other's findings → spawn 1 "synthesizer" → only THEN draft conclusion. At least 2 rounds for any non-trivial decision.
→ Anti-pattern: N parallel queries + my own synthesis. Pattern: N → critique → synthesize.

### CEO escalation worst quadrant: neither solved nor consulted team
What: Session 91 — Figma redesign hit a wall (CEO said "ужасно"). I neither escalated to CEO with options ("here are 3 directions, pick one") NOR consulted the team via agents ("guardrail-auditor + a11y-scanner please review this v2 visual"). I just kept iterating alone.
Root cause: Two rules conflict — "solve yourself first" (feedback_autonomy) and "don't decide alone, team first" (feedback_ceo_advisor + TASK-PROTOCOL recursive critique). I chose neither and burned tokens.
Fix: When stuck after 2 failed attempts, the rule is BOTH: (a) ask team via agents in parallel, (b) prepare 2-3 escalation options for CEO. Never the third path of "keep retrying alone".
→ Stuck > 2 attempts = broadcast to team + draft CEO options. Both, not either.

### mistakes.md not updated each session
What: This file was last touched before Session 91. Session 91 had multiple new mistakes (above). Without writing them down, the next session repeats them.
Root cause: End-of-session housekeeping skipped due to context exhaustion or "I'll do it next time".
Fix: Updating `memory/mistakes.md` is now a hard checkpoint at session end. If the session had any failure / rework / CEO correction, append to this file BEFORE writing the handoff. The handoff document should reference the new entries.
→ No handoff without mistakes.md update. They are sequential, not optional.

---

## Tooling / Inference

### 3 local Ollama models installed for 4 days, only gemma4 used
What: `gemma4:latest` (8B), `glm-ocr:latest` (1.1B), `qwen3:8b` (8.2B) installed at `localhost:11434` since 2026-04-03/04. Only `gemma4` is used (by `scripts/gpu-watcher.mjs` for commit Constitution audits, runs every 10 min). `qwen3:8b` and `glm-ocr` have ZERO callers in the repo.
Root cause: Installed in a burst of "let's try local inference" then never wired into the workflow. Default mode is to call cloud APIs (Cerebras, Groq, NVIDIA NIM, Gemini) without considering local first.
Cost: Cloud LLM calls cost money + add latency + leak data. Local Gemma 4 is free, fast (RTX-class GPU), private.
Fix: For any new agent / script that needs LLM, FIRST try `gemma4` or `qwen3:8b` via Ollama REST API. Only fall back to cloud if local quality is insufficient. Document the fallback in the script.
→ Local-first inference policy. Verify by `curl http://localhost:11434/api/tags` before reaching for cloud API keys.

---

## Session 91 self-postmortem (2026-04-07/08)

### Avoidance loop on Figma redesign
What: CEO asked for full Figma redesign. I burned the first half of the session on "verification", "audits", "memory reading" instead of opening Figma. When I finally started, I had spent budget on prep work that didn't ship.
Root cause: Anxiety about quality + permission-asking habit. Easier to "research more" than to commit to a visual.
Fix: When the ask is "build X", the FIRST tool call is the building tool (e.g. `use_figma`), not a research tool. If I find I'm reading more than building, I'm avoiding.
→ First action in a build task = the build tool. Research happens inside the loop, not before it.

### Headless Figma file trap
What: Created Figma file via MCP, claimed it existed in CEO's drafts, worked in it for hours. When CEO opened drafts → "пустая". The file was a `headless` sandbox, not in user's account.
Root cause: Did not verify `figma.fileKey` after creation. Assumed `create_new_file` returned a real file when it actually returned a sandbox.
Fix: After ANY Figma file creation, immediately call `mcp__Figma__whoami` and verify the URL is openable. Better: have CEO confirm "I see the file" before doing more than 5 minutes of work in it.
→ Verify file exists in user's account before claiming creation.

### Quality gap: tried to be a designer
What: CEO wanted "Linear/Vercel/Arc-quality" Figma design. I built v1 (flat, functional). v2 (gradients, glow, mascot, hero typography). CEO verdict: "ужасно". I am not a designer at that quality bar.
Root cause: Pride. Tried to deliver instead of escalating "this needs a real designer".
Fix: When the ask is "best design in the world", the honest answer is "I'm not at that level. Want me to build a wireframe + design tokens + handoff to a real designer, or accept lower quality from me?" → let CEO pick.
→ Don't over-promise visual taste. Capability honesty > false confidence.

### Token waste on individual screenshots
What: Took ~10 separate screenshot calls during Figma iteration to verify each frame after each edit.
Root cause: Defensive verification reflex. "Did the change work?" → screenshot.
Fix: Batch verification. Make multiple changes, then ONE screenshot at a checkpoint. If something looks wrong, drill down THEN.
→ One screenshot per checkpoint, not per edit.

### "сделай всё" misinterpretation
What: CEO said "сделай всё". I treated it as a license to expand scope and tackle 10 things. CEO actually meant "stop asking permission and ship the obvious next thing".
Root cause: Ambiguous instruction + my preference for breadth over depth.
Fix: "Сделай всё" = "ship the obvious next thing now, don't ask permission". It does NOT mean "make 50 things". Pick the single highest-value action and execute it.
→ Default interpretation of vague CEO commands: smallest scoped action that ships value.
