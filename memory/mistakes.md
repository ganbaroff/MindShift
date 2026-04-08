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
What: Spawned subagents independently, synthesized results alone. No cross-critique between agents.
Root cause: Treating subagents as a consultant pool, not a team.
Fix: Multi-round pattern → spawn N agents → collect outputs → spawn critic agents to find holes → synthesize. At least 2 rounds for non-trivial decisions.
→ Anti-pattern: N parallel queries + solo synthesis. Pattern: N → critique → synthesize.

### CEO escalation worst quadrant: neither solved nor consulted team
What: Figma redesign hit wall. Neither escalated to CEO with options NOR consulted team via agents. Just kept retrying alone.
Root cause: Two rules conflict — "solve yourself first" vs "don't decide alone". Chose neither.
Fix: Stuck > 2 attempts = broadcast to team (agents) + draft CEO options. Both, not either.

### mistakes.md not updated each session
What: File was last touched before Session 91. Multiple new mistakes went unrecorded.
Root cause: End-of-session housekeeping skipped due to context exhaustion.
Fix: Updating mistakes.md is a hard checkpoint at session end, BEFORE writing the handoff.
→ No handoff without mistakes.md update.

---

## Tooling / Inference

### Local Ollama models installed but unused
What: `gemma4`, `glm-ocr`, `qwen3:8b` installed at localhost:11434. Only gemma4 used. Zero callers for qwen3/glm-ocr.
Root cause: Installed in burst, never wired into workflow. Default is cloud APIs.
Fix: For any new agent/script needing LLM, FIRST try gemma4 or qwen3:8b via Ollama. Fall back to cloud only if quality insufficient.
→ Local-first inference policy. `curl http://localhost:11434/api/tags` before reaching for cloud keys.

---

## Session 91 self-postmortem (2026-04-07/08)

### Avoidance loop on Figma redesign
What: Burned first half of session on verification/audits/memory instead of opening Figma.
Root cause: Anxiety about quality + permission-asking habit.
Fix: When the ask is "build X", FIRST tool call is the build tool. Research happens inside the loop.
→ First action in a build task = the build tool.

### Headless Figma file trap
What: Created Figma file via MCP, worked in it for hours. CEO opened drafts → empty. File was a headless sandbox, not in user's account.
Root cause: Did not verify fileKey after creation.
Fix: After ANY Figma file creation, verify URL is openable. Have CEO confirm "I see the file" before more than 5 min of work.
→ Verify file exists in user's account before claiming creation.

### Quality gap: tried to be a designer
What: CEO wanted "Linear/Vercel/Arc-quality" Figma. I built v1 (flat), v2 (gradients+glow). CEO verdict: "ужасно".
Root cause: Pride. Tried to deliver instead of escalating capability limits.
Fix: When ask is "best design in the world": "I'm not at that level. Want wireframe + design tokens + handoff to real designer, or accept lower quality?" → let CEO pick.
→ Capability honesty > false confidence.

### "сделай всё" misinterpretation
What: CEO said "сделай всё". Treated as license to expand scope, tackled 10 things.
Root cause: Ambiguous instruction + preference for breadth over depth.
Fix: "Сделай всё" = "ship the obvious next thing now". Pick single highest-value action and execute.
→ Default interpretation: smallest scoped action that ships value.
