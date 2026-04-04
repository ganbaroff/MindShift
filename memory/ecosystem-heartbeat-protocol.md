# Ecosystem Heartbeat Protocol v1.0

**Created:** 2026-04-05
**Purpose:** Every CTO session across all 5 products reads this file.
**Canonical location:** VOLAURA/memory/context/ecosystem-heartbeat-protocol.md
**Copies:** Each product keeps a symlink or copy in its memory/ directory.

---

## THE PROBLEM

5 products, potentially 5 different Claude sessions. Each session has its own context window.
Without a sync protocol, MindShift CTO doesn't know VOLAURA shipped a new API endpoint.
VOLAURA CTO doesn't know MindShift changed the crystal formula. Life Simulator CTO
doesn't know either of them changed anything. Drift accumulates. Integration breaks.

## THE SOLUTION: HEARTBEAT FILES

Every product maintains ONE heartbeat file at a fixed location. This file contains:
- What was shipped in the last 4 sprints
- What APIs/events changed
- What's blocked waiting on another product
- What's planned that affects other products

### File locations (canonical paths):

```
C:\Users\user\Downloads\mindshift\memory\heartbeat.md          ← MindShift
C:\Projects\VOLAURA\memory\context\heartbeat.md                ← VOLAURA
C:\Projects\VOLAURA\packages\swarm\heartbeat.md                ← ZEUS/Swarm
[Life Simulator repo]\heartbeat.md                              ← Life Simulator
[BrandedBy repo]\heartbeat.md                                   ← BrandedBy
```

### Heartbeat file format (MANDATORY — every field required):

```markdown
# [PRODUCT] Heartbeat
**Updated:** [ISO date]
**Sprint:** [current sprint ID]
**Session:** [session number]

## Last 4 Sprints
- [BATCH-ID]: [1-line what shipped]
- [BATCH-ID]: [1-line what shipped]
- [BATCH-ID]: [1-line what shipped]
- [BATCH-ID]: [1-line what shipped]

## APIs Changed
- [endpoint]: [what changed] | [breaking: yes/no]

## Events Changed
- [event_type]: [added/modified/removed] | [payload change description]

## Blocked By Other Products
- [PRODUCT]: [what I need from them]

## Planning That Affects Others
- [what I'm about to build that touches shared infra]

## Skills This CTO Has (that others don't)
- [skill]: [what tool/MCP it uses]
```

## SYNC PROTOCOL

### When to read other heartbeats:

```
EVERY SESSION START:
  1. Read YOUR product's heartbeat.md (refresh context)
  2. Read ecosystem-contract.md (shared rules)

EVERY 4th SPRINT (or when touching shared infra):
  3. Read ALL other products' heartbeat.md files
  4. Check for breaking changes, new endpoints, new events
  5. Update YOUR heartbeat.md with what you shipped
  6. If conflict found → write to VOLAURA/memory/swarm/ceo-inbox.md
```

### When to WRITE your heartbeat:

```
AFTER EVERY BATCH COMMIT:
  → Update "Last 4 Sprints" section (FIFO — drop oldest)
  → Update "APIs Changed" if any endpoint was added/modified
  → Update "Events Changed" if any analytics event changed
  → Update "Blocked By" if you discovered a dependency
  → Update "Planning" if next sprint touches shared infra
```

### When to ALERT (write to ceo-inbox.md):

```
IF another product's heartbeat shows:
  - Breaking API change that affects you
  - Event type you consume was removed/renamed
  - Shared table schema changed
  - Auth flow changed
  - Crystal economy formula changed
→ Write alert to VOLAURA/memory/swarm/ceo-inbox.md
→ Format: "[YOUR PRODUCT] ⚠️ [OTHER PRODUCT] changed [WHAT]. Impact: [DESCRIPTION]."
```

## CROSS-PRODUCT SKILL SHARING

Each CTO has unique capabilities. Instead of every session learning everything,
specialize and reference:

| Product CTO | Unique Skills | Tools/MCPs |
|-------------|--------------|------------|
| **MindShift** | PDF/carousel generation, Playwright screenshots, html-to-image, LinkedIn post writing, humanizer, Play Store optimization | Claude Preview, Chrome MCP, Playwright |
| **VOLAURA** | Figma design integration, Stitch components, multi-model swarm orchestration (47 agents), IRT/CAT psychometrics, FastAPI, pgvector | Figma MCP, Stitch MCP, Groq/Gemini/NVIDIA APIs |
| **ZEUS** | Autonomous content generation, GitHub Actions, Telegram bot, video generation (Kokoro TTS + SadTalker), web research | FAL API, edge-tts, python-telegram-bot |
| **Life Simulator** | Godot 4.4, GDScript, game economy balancing, character stat systems | Godot editor |
| **BrandedBy** | Video rendering pipeline, voice cloning, face animation, Cloudflare Workers | Kokoro TTS, SadTalker, FAL API |

### How to use another CTO's skill:

1. Write a request in `VOLAURA/memory/swarm/ceo-inbox.md`:
   ```
   [REQUESTING PRODUCT] needs [SKILL] from [OWNER PRODUCT].
   Task: [specific deliverable]
   Deadline: [sprint or date]
   ```

2. CEO routes the request to the right session.

3. Receiving CTO reads the request, executes, writes result to a shared location.

4. Requesting CTO reads the result from the shared location.

## SHARED INFRA RULES

### character_events table (append-only):
- NEVER delete rows
- NEVER modify existing rows
- Only INSERT new events
- Schema changes require ALL product CTOs to review heartbeats

### Crystal economy:
- Formula changes require ecosystem-contract.md update
- Daily caps are per-source (MindShift: 15/day, VOLAURA: 400 lifetime per competency)
- New crystal sources require CEO approval

### Auth (Supabase):
- Currently: MindShift and VOLAURA share same Supabase project but separate auth flows
- Phase E2: unified auth (single login for all products)
- ANY auth change must update ecosystem-contract.md

### Design tokens:
- Shared palette: teal (#4ECDC4), indigo (#7B72FF), gold (#F59E0B)
- NO RED in any product (hue 0-15 banned)
- Each product can add product-specific tokens but MUST NOT conflict with shared palette

## AGENT CROSS-POLLINATION

VOLAURA has 47 agents. MindShift has 8 agent types. They can help each other:

| VOLAURA Agent | Can help MindShift with |
|--------------|------------------------|
| Cultural Intelligence Strategist | AZ/TR/RU translation quality review |
| Assessment Science Agent | Psychotype derivation validation |
| Behavioral Nudge Engine | ADHD-first UX validation |
| Financial Analyst | Crystal economy health check |
| Security Agent | Cross-product RLS audit |
| Performance Engineer | Shared Supabase query optimization |

| MindShift Agent | Can help VOLAURA with |
|----------------|----------------------|
| a11y-scanner | WCAG audit on VOLAURA frontend |
| bundle-analyzer | Next.js bundle optimization |
| e2e-runner | Playwright test patterns |
| guardrail-auditor | ADHD-safe design compliance |
| growth agent | Retention funnel analysis |

### How to borrow an agent:

Include the agent's skill file content in your prompt. The skill files are:
- VOLAURA: `memory/swarm/skills/[agent-name].md`
- MindShift: `.claude/agents/[agent-type].md`

## METRICS DASHBOARD (future)

When all products are live, track these cross-product metrics:

| Metric | Formula | Target |
|--------|---------|--------|
| Ecosystem DAU | users active in 2+ products / total DAU | >15% |
| Crystal velocity | crystals earned per day (all sources) | Growing MoM |
| Cross-product retention | D30 retention for users in 2+ products vs 1 product | 2x+ difference |
| Share viral coefficient | shares from MindShift → new VOLAURA signups | K > 0.3 |
| Event bus health | character_events writes per day, error rate | <0.1% error |

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-04-05 | Initial protocol. Created by MindShift CTO session. |
