# Ecosystem Sync — MindShift ↔ VOLAURA

**Created:** 2026-04-05
**Purpose:** MindShift CTO must know about the ecosystem to make correct architectural decisions.

---

## THE ECOSYSTEM (5 Products, 1 User)

MindShift is NOT a standalone app. It is the ENTRY DOOR to a 5-product ecosystem.

| Product | Brain Analog | Status | What it does |
|---------|-------------|--------|-------------|
| **MindShift** | Basal ganglia | 95% ready | ADHD focus, habits, Mochi AI, crystals |
| **VOLAURA** | Cortex | 85% ready | Verified skills, AURA Score, IRT/CAT testing |
| **Life Simulator** | Limbic system | 65% game | Godot RPG — real achievements = character stats |
| **BrandedBy** | Mirror neurons | 15% | AI Twin video (Kokoro TTS + SadTalker) |
| **ZEUS** | Cerebellum | 70% | Autonomous agent framework, 47 agents |

## SHARED INFRASTRUCTURE

- **One Supabase** — VOLAURA project: `awfoqycoltvhamtrsvxk` (same as MindShift currently!)
  BUT MindShift may migrate to shared auth later (Phase E2)
- **One auth** — goal: login once, access everything
- **One event bus** — `character_events` table (append-only)
- **One crystal economy** — crystals earned in MindShift flow into Life Simulator

## WHAT MINDSHIFT SENDS TO VOLAURA

| MindShift Event | character_event type | Effect |
|----------------|---------------------|--------|
| Focus session completed | `xp_earned` | Reliability signal, INT stat in Life Sim |
| Streak >= 7 days | `buff_applied: consistency` | Reliability boost |
| Psychotype derived | `stat_changed` | Maps to STR/WIS/INT/CHA |
| Burnout score > 70 | `state_changed: health` | Adaptation hint |
| Energy level logged | `vital_logged: energy` | Timing signal |

## WHAT VOLAURA SENDS TO MINDSHIFT

| VOLAURA Data | Where in MindShift | Effect |
|-------------|-------------------|--------|
| AURA badge tier | ProgressPage | Show verified badge alongside XP |
| Crystal balance | NatureBuffer chip | "💎 +N" after sessions |
| Communication score | character_state | Social stat in Life Sim |

## CRYSTAL ECONOMY RULES

- MindShift focus → crystals: `floor(sessionMinutes * 5)` (already implemented in FocusScreen.tsx)
- VOLAURA assessment → crystals: 50 per competency (max 400)
- Daily cap from MindShift: 15 crystals
- Crystals are NEVER purchased directly (earned only)
- Prisms (purchased currency) buy ONLY cosmetics, never features

## INTEGRATION PHASES

### Phase 1 (NOW — no code changes needed):
- MindShift shows VOLAURA crystal chip in NatureBuffer ✅ (already done)
- `isVolauraConfigured()` checks `VITE_VOLAURA_API_URL` env var ✅

### Phase 2 (Sprint E2 — auth migration):
- Migrate MindShift to shared Supabase auth
- MindShift writes to `character_events` via VOLAURA FastAPI
- Crystal balance visible in both apps
- AURA badge in MindShift ProgressPage

### Phase 3 (Month 2+):
- Life Simulator reads character_events → character stats grow
- BrandedBy generates video from character_state
- ZEUS orchestrates autonomously

## DESIGN RULES (CROSS-PRODUCT)

1. No red — anywhere, in any product
2. No punishment framing — "Earn more" not "You lost"
3. ADHD-first — every screen must pass Behavioral Nudge Engine review
4. Crystals always shown in teal/gold
5. Mochi personality consistent across products
6. Offline-first — every product works without network

## KEY FILES IN VOLAURA

| File | What it is |
|------|-----------|
| `docs/MINDSHIFT-INTEGRATION-SPEC.md` | 346-line API contract (source of truth) |
| `docs/MINDSHIFT-HANDOFF-PROMPT.md` | Handoff prompt for cross-session analysis |
| `memory/swarm/shared-context.md` | Swarm context (product map, event bus) |
| `memory/swarm/skills/linkedin-content-strategy-2026.md` | Content strategy (shared) |
| `.claude/rules/ceo-protocol.md` | How CTO reports to CEO |

## VIDVOW (absorbed, not standalone)

VidVow is NOT a 6th product. It is decomposed into shared services:
- **GoldenPay integration** → shared payment edge function (P0, before WUF13)
- **Stripe webhook handlers** → shared payment service (P0)
- **Video verification** → shared face-detect edge function (feeds BrandedBy, P2)
- **Trust Score** → merged into AURA Score as fundraising sub-dimension
- **Campaign/donation model** → VOLAURA "Fundraising" module
- **Cloudflare Workers** → DISCARDED, consolidated to Supabase
- **Separate auth** → DISCARDED, use ecosystem Supabase Auth

Source code: C:\Users\user\Downloads\vidvow (React 19 + Hono + Cloudflare Workers)

## KEY FILES IN MINDSHIFT

| File | What it is |
|------|-----------|
| `CLAUDE.md` | Project memory (stack, sprints, architecture) |
| `TASK-PROTOCOL.md` | Execution protocol v8.0 |
| `src/shared/lib/volaura-bridge.ts` | API bridge to VOLAURA |
| `memory/ecosystem-sync.md` | THIS FILE — ecosystem context |

## ECOSYSTEM DEBT CLOSURES (2026-04-09)

Three VOLAURA UNFULFILLED-PROMISES items closed — relevant to MindShift:

| Item | What closed | MindShift impact |
|------|------------|-----------------|
| #23 | `packages/swarm/execute_proposal.py` now exists | 62 approved swarm proposals (incl. MindShift bridge proposals) can now be auto-implemented |
| #26 | AURA scoreMeaning fix (`7fec325` merged) | Low-scorer UX improved — affects VOLAURA badge quality shown in MindShift ProgressPage (Phase 2) |
| D1 | 16 stale handoff docs archived from VOLAURA docs/ | Cleaner shared docs/ — reduces confusion when MindShift CTO reads VOLAURA context |

---

## VOLAURA CTO CONTACT

- Same Claude, different session
- Protocol: TASK-PROTOCOL v9.0 (10 steps, multi-model critique)
- 44 agents with career ladder
- ZEUS runs daily at 9am Baku time via GitHub Actions
- Telegram bot: CEO notifications
