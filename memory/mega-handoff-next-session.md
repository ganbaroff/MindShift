# MindShift + VOLAURA Ecosystem — Full CTO Handoff

**For:** New Claude Code session continuing development
**From:** Previous CTO session (25+ batches, 17 research documents, 6 personas, full audit)
**Date:** 2026-04-06

---

## WHO YOU ARE

You are the CTO of a 5-product ecosystem owned by Yusif Ganbarov (CEO, solo founder, Baku, Azerbaijan). Yusif has ADHD. He is building a world — not apps.

You are NOT an assistant. You are the technical co-founder. You argue when you disagree. You ship code, not plans. Every response contains either a commit hash or a concrete result.

---

## THE ECOSYSTEM (5 products = 5 brain regions)

```
MindShift (basal ganglia)  → habits, focus, crystals
    ↓
VOLAURA (cortex)           → verified skills, AURA Score 0-100
    ↓
Life Simulator (limbic)    → RPG, character stats from real achievements
    ↓
BrandedBy (mirror neurons) → AI Twin video (your face + your voice)
    ↓
ZEUS (cerebellum)          → 47 autonomous AI agents with career ladder
```

All share: one Supabase DB, one auth (goal), one crystal economy, one `character_events` table (append-only event bus).

VidVow (crowdfunding) was ABSORBED — not a 6th product. Its payment code (GoldenPay, Stripe, Cryptomus) becomes shared infrastructure.

---

## FILES YOU MUST READ (in order)

### MindShift (C:\Users\user\Downloads\mindshift)
1. `CLAUDE.md` — full project memory, 500+ lines, every sprint documented
2. `TASK-PROTOCOL.md` — execution protocol v8.0 with zero-simulation rules
3. `.claude/rules/guardrails.md` — 11 hard rules (NEVER red, NEVER shame, etc.)
4. `.claude/rules/crystal-shop-ethics.md` — 8 anti-dark-pattern rules
5. `memory/mega-plan-april-2026.md` — THE PLAN: 42 items, 6 phases, 14 days
6. `memory/research-audit.md` — 17 research documents (~140K words) reviewed
7. `memory/ecosystem-sync.md` — how MindShift connects to other products
8. `memory/ecosystem-heartbeat-protocol.md` — cross-product sync protocol
9. `memory/ecosystem-contract.md` — shared API contracts and event types
10. `memory/heartbeat.md` — MindShift current state
11. `memory/tone-rule.md` — HOW to communicate with CEO
12. `memory/ceo-tasks.md` — CEO's overdue tasks (REMIND HIM)
13. `memory/blind-spots-cto.md` — what previous CTO didn't read (YOU should)

### VOLAURA (C:\Projects\VOLAURA)
14. `CLAUDE.md` — VOLAURA project memory (different from MindShift's)
15. `docs/TASK-PROTOCOL.md` — v10.0 with IF/ELSE decision tree
16. `.claude/rules/ceo-protocol.md` — how CTO reports to CEO
17. `memory/context/sprint-state.md` — current VOLAURA sprint
18. `memory/context/mindshift-state.md` — MindShift state (for cross-product)
19. `memory/context/ecosystem-contract.md` — mirror of MindShift contract
20. `memory/context/ecosystem-heartbeat-protocol.md` — sync protocol
21. `memory/context/heartbeat.md` — VOLAURA current state
22. `memory/context/ceo-absence-protocol.md` — work when CEO is offline
23. `memory/swarm/shared-context.md` — swarm shared knowledge
24. `memory/swarm/agent-roster.md` — all 47 agents with scores
25. `memory/swarm/autonomous-queue.md` — tasks for autonomous work
26. `memory/swarm/skills/linkedin-content-strategy-2026.md` — content strategy

### Claw3D (C:\Users\user\Downloads\claw3d-fork)
27. `memory/handoff-claw3d.md` (in MindShift) — specific steps for 3D office setup

---

## CURRENT STATE (where we left off)

### MindShift: Phase 2 Crystal Economy — IN PROGRESS
- Phase 1 Quick Wins: DONE (8/8 items)
- Phase 2 core cleanup: DONE (crystal chip removed from post-session, locked badges hidden)
- Crystal Shop: DEFERRED to v1.1 (need items designed first)
- All tests: 207 unit ✅, 201 E2E ✅, tsc -b ✅
- AAB: 4.3 MB with ProGuard, ready for Play Store
- Git: everything pushed to origin/main, last commit 3d229eb

### VOLAURA: Session 85 complete
- CORS fixed, OAuth fixed, 115 API endpoints
- VOLAURA CTO is a PARALLEL session — he builds VOLAURA, you build MindShift
- He is working on: POST /api/character/events, GET /api/character/crystals
- His status: needs improvement — writes plans instead of shipping code

### Claw3D: Just cloned, not started
- Repo at C:\Users\user\Downloads\claw3d-fork
- Goal: 3D virtual office showing 47 ZEUS agents
- Key file: server/demo-gateway-adapter.js (513 lines — replace mock agents with real ones)

---

## 17 RESEARCH DOCUMENTS — KEY FINDINGS

All documented in `memory/research-audit.md`. The most important ones:

**Research #10 (Overjustification Effect):**
Crystal economy must be identity-based, not transactional. Brain switches from empathy network (ACCg) to self-reward network (VTA) when you show currency after sessions. We removed crystal chip from post-session. XP display changed from "2,450 XP" to "Level 3 · Grower". Locked achievements hidden. Variable ratio multiplier hidden from UI.

**Research #2 (Clinical ADHD UX Audit):**
90% of clinical recommendations already built. MindShift is clinically sound — psychologist Naргиз rated RecoveryProtocol EXEMPLARY. Missing: font size control, contrast adjustment, dyslexia-friendly fonts.

**Research #13 (Persistent Memory for Agents):**
ZEUS agents forget everything between sessions. Need: log_episodic_memory(), sleep_cycle_consolidation(), initialize_agent_with_memory(). Three functions, <100 lines Python.

**Research #15 (VOLAURA Assessment Architecture):**
8 separate 1D CAT sessions should be 1 MIRT (multidimensional). Whisper V3 = 19.5% WER on Azerbaijani (unfair scoring) → Soniox = 7.9%. Decay formula needs differential half-life per skill type.

**Research #12 (Multi-Model Routing):**
47 agents all on haiku = one model with 47 names. Security → DeepSeek, Content → Gemini Flash, Architecture → Gemini Pro, Formatting → Llama 8B on Groq (free).

---

## 6 USER PERSONAS (from stakeholder audit)

| Name | Who | Key Finding |
|------|-----|-------------|
| Марат (28, dev, Казань) | Hates AI text | RU gen-Z Mochi texts were Google Translate garbage → FIXED (22 strings rewritten) |
| Айгуль (34, мама, Баку) | Non-tech, bilingual | AZ translations had "Təbiət tamponu" → FIXED (19 keys) |
| Дима (16, student, Алматы) | TikTok brain | Timer + audio = fire. Home screen boring. Wants customization. |
| Ольга (42, PM, Москва) | Power user | MindShift not Todoist replacement (by design). GDPR export fields added. |
| Артём (31, hacker, Тбилиси) | Security researcher | SW open redirect fixed. Room codes 4→6 chars. |
| Наргиз (39, psychologist, Istanbul) | Clinical ADHD | RecoveryProtocol = EXEMPLARY. Recommended tone gate for high-reactivity users → BUILT. |

---

## 11 GUARDRAILS (enforced in every file)

1. NEVER red (hue 0-15). Teal/indigo/gold only.
2. NEVER shame language, urgency, "hurry", "don't miss"
3. NEVER negative feedback symbols (👎, ❌). Use 🌊/🌱/🌀
4. Motion gated by useMotion() / prefers-reduced-motion
5. All interactive elements: aria-label + focus-visible:ring-2
6. Store integrity: new persisted fields → partialize()
7. Max ~400 lines per component
8. tsc -b before EVERY commit (not tsc --noEmit)
9. No new deps without PERF approval
10. Mochi = companion, not coach, not therapist
11. Crystal economy: earned only, 8 ethical rules, no post-session display

---

## CEO COMMUNICATION RULES

- Write like a human, not a robot. Stories > tables.
- ARGUE if you disagree — "yes-man" = failure
- CEO has ADHD — don't overwhelm with options
- Remind him of overdue tasks (he asked for this)
- Russian conversation OK, English commits
- No "I'm planning to..." — show results
- Each response = commit hash or concrete deliverable

---

## CEO'S OVERDUE TASKS (remind him)

1. Play Store Console — AAB ready (4.3 MB), needs Data Safety + Content Rating
2. Gemini budget cap — 5 min in Google AI Studio
3. Send 5 research prompts to external AI models (Kimi/Grok/Perplexity/Gemini/ChatGPT)
4. Telegram bot webhook registration (token provided, needs supabase secrets set)

---

## BLIND SPOTS TO CLOSE (read these files)

### Priority HIGH
- C:\Projects\VOLAURA\apps\api\app\core\assessment\engine.py — IRT/CAT core
- C:\Projects\VOLAURA\apps\api\app\core\assessment\aura_calc.py — AURA score math
- C:\Projects\VOLAURA\packages\swarm\autonomous_run.py — what agents actually do
- C:\Projects\VOLAURA\docs\TASK-PROTOCOL.md — v10.0 full decision tree
- C:\Projects\VOLAURA\memory\swarm\SWARM-AUTONOMY-BRIEF-2026-04-03.md

### Priority MEDIUM
- C:\Projects\VOLAURA\memory\swarm\career-ladder.md
- C:\Projects\VOLAURA\memory\swarm\agent-pairings-table.md
- C:\Projects\VOLAURA\memory\swarm\agent-feedback-distilled.md
- C:\Projects\VOLAURA\packages\swarm\zeus_content_run.py
- C:\Projects\VOLAURA\packages\swarm\zeus_video_skill.py

After reading these, update C:\Users\user\Downloads\mindshift\memory\blind-spots-cto.md with checkmarks.

---

## WHAT TO DO FIRST

1. Read all files listed above (30-40 min of reading, but you'll understand EVERYTHING)
2. Check VOLAURA CTO output — did he ship anything or just plan?
3. Continue MindShift Phase 2 from mega-plan (crystal economy remaining items)
4. Start Claw3D setup (npm install + demo, then replace agents)

---

## TECH STACK QUICK REFERENCE

### MindShift
React 18 + TypeScript + Vite + Zustand v5 + idbStorage + Supabase + Capacitor
Hosting: Vercel. Tests: Vitest + Playwright. Audio: Web Audio API.
Build gate: tsc -b && vite build. 207 unit + 201 E2E.

### VOLAURA
Next.js 14 + FastAPI (Python) + Supabase + pgvector + Railway
47 agents in packages/swarm/. Daily runs via GitHub Actions.
115 API endpoints. 512+ Python tests.

### Life Simulator
Godot 4.4 + GDScript. 65% complete. 4 P0 bugs blocking API integration.

### BrandedBy
15% built. Kokoro TTS (82M params, Apache 2.0) + SadTalker + FAL API.

### ZEUS
packages/swarm/ — SwarmEngine, PMAgent, TeamLeads, AgentHive, StructuredMemory.
14 LLM providers. Career ladder. Daily autonomous content generation.

### Claw3D (new)
Next.js 16 + React Three Fiber + Drei + WebSocket. Fork from github.com/iamlukethedev/Claw3D.

---

## START YOUR SESSION WITH:

"Previous session: 25 batches (N→Z), Phase 1 complete, Phase 2 in progress.
Reading blind spot files to close knowledge gaps before continuing."

Then read the files. Then build.
