# Design System Plan — Synthesis of 5 research streams
# 2026-04-07 (after midnight)

## THE ONE INSIGHT
Nobody in the world ships a COMBINED adaptive visual layer
(typography + spacing + motion + color desaturation responding to user state).
Apple = type only. Material 3 = motion only. Endel = audio only.
MindShift already has all the infrastructure. We can be first.

This is the brand pillar. Not "ADHD-friendly". That's table stakes.
The pillar is: **"The first interface that feels different when you feel different."**

## WHAT WE BUILD (3 layers)

### Layer 1 — Tokens (Figma Variables, 3 collections)
1. **Primitives** (1 mode) — raw values
   - color/neutral/0..12, color/teal/0..12, color/indigo/0..12, color/amber/0..12, color/purple/0..12
   - space/0..12 (4px base), radius/0..6, shadow/0..4
2. **Semantic** (3 modes: Full / Mid / Low) — aliases pointing at primitives
   - surface/base, surface/card, surface/raised, surface/high
   - text/primary, text/secondary, text/muted
   - primary/default, primary/hover, primary/active
   - success, warning, error (all NOT red — purple/amber)
3. **Component** (1 mode) — locked composition
   - button/padding, button/radius, card/padding

### Layer 2 — The Adaptive Magic (3 Modes)
Energy levels map to Figma Modes:

**Full (energy 4-5)** — user is sharp
- All features visible, normal spacing (4px base)
- Body text 16px, line-height 1.5
- Motion: spring stiffness 120, damping 15
- Full saturation on primary accents
- All widgets on BentoGrid

**Mid (energy 3)** — user is okay
- Reduced widgets (BentoGrid trimmed), entrance-only animations
- Body text 16px, line-height 1.55
- Motion: stiffness 100, damping 18
- Accent saturation −10%

**Low (energy 1-2)** — user is drained
- Single-action card, fade-in only
- Body text 18px, line-height 1.7, letter-spacing +2%
- Motion: stiffness 80, damping 25
- Accent saturation −20%, brightness −15%
- NEXT pool hidden, max 1 task shown
- Typography changes: h1 −20% size (less shouting)

### Layer 3 — Code Pipeline
Figma REST API → Node script → DTCG JSON → Style Dictionary → Tailwind v4 `@theme inline` → `[data-energy="full|mid|low"]` on `<html>`.

**How UI switches mode at runtime:**
```tsx
// Already exists in MindShift: useStore(s => s.energyLevel)
useEffect(() => {
  const mode = energyLevel <= 2 ? 'low' : energyLevel >= 4 ? 'full' : 'mid'
  document.documentElement.dataset.energy = mode
}, [energyLevel])
```

CSS auto-switches via `:root[data-energy="low"] { --text-size-body: 18px; ... }`.

Matches existing `[data-mode="calm"]` pattern from Sprint 8. No new infrastructure needed.

## STEAL FROM THE BEST (9 ideas from top design systems)

1. **Linear LCH theme generator** — 3 inputs → 98 derived colors, auto-contrast
2. **Vercel Geist constraint** — narrow palette, no exceptions (we already do this)
3. **Apple GlassEffectContainer** — opt-in glass, reduced-motion-safe
4. **Raycast auto-contrast** — colors that pick legible variant
5. **Arc per-Space color identity** — map to seasonalMode (launch/maintain/recover/sandbox)
6. **Cursor unified rhythm** — same spacing across HomePage/FocusScreen/TasksPage
7. **Framer Motion tokens** — `motion.duration.*`, `motion.easing.spring.*`
8. **Notion haiku philosophy** — delete 5 unused components before adding any
9. **ORIGINAL: Adaptive UI as marketed pillar** — nobody else has this

## HARD METRICS (research-backed, not just opinion)

| Metric | Value | Source |
|--------|-------|--------|
| Body text (Full mode) | 16px | WCAG 1.4.4 |
| Body text (Low mode) | 18px | Zorzi 2012 + fatigue research |
| Line height (Full) | 1.5 | W3C cognitive disabilities |
| Line height (Low) | 1.7 | Reading fatigue research |
| Letter spacing (Low) | +2% | Zorzi 2012 (+18% → 1.87 vs 1.64 syl/s) |
| Touch target min | 44×44px | WCAG 2.5.5 AAA |
| Touch target spacing | 8px | WCAG 2.5.8 |
| Color contrast body | APCA Lc 75 | APCA (better than WCAG 2.x for dark themes) |
| Color contrast UI | APCA Lc 60 | APCA |
| NOW pool max | 3 | Cowan 4±1 working memory |
| Max animation | 500ms | Nielsen + Material 3 |
| Reduced motion | 0.001ms | React Motion safe floor |
| Confetti particles | 12 | Already fixed this session |
| Simultaneous animations | 1 | ADHD sensory overload research |

## WHAT WE REMOVE (Law 1 honesty)

Constitution Law 1 says "red triggers RSD" — no peer-reviewed study proves this directly.
Rewrite to: "precautionary avoidance of red-family hues based on colour-arousal research and ADHD clinical reports".
Law itself stays. Justification becomes honest.

## FIGMA STRUCTURE

One master file: **"VOLAURA Ecosystem Design System"**
- Page 1: Foundations (colors, typography, spacing, motion tokens)
- Page 2: Components — Primitives (Button, Input, Card, Badge, Toast, Sheet)
- Page 3: Components — Composite (TaskCard, FocusTimer, EnergyPicker, BentoWidget)
- Page 4: MindShift screens (Home, Focus, Tasks, Progress, Settings)
- Page 5: VOLAURA screens (Landing, Assessment, AURA Profile, Discovery, Org Hall)
- Page 6: Life Simulator UI overlay (3D office HUD, agent cards, chat panel)
- Page 7: BrandedBy screens (Profile builder, AI twin chat)
- Page 8: ZEUS swarm dashboard (already built as Telegram Mini App — reference)

Each screen page has 3 variants per key screen: Full / Mid / Low mode.

## EXECUTION ORDER

**Phase 1 — Foundations (1 session)**
1. Create new Figma file via MCP
2. Build Primitives collection (60 color tokens, 13 spacing, 7 radius, 5 shadow)
3. Build Semantic collection with 3 modes via `use_figma` (Plugin API)
4. Export via REST API → DTCG JSON → Style Dictionary → CSS vars
5. Integrate with MindShift Tailwind v4 config (replace existing tokens)

**Phase 2 — Core components (1 session)**
6. Button, Input, Card, Badge, Toast, Sheet in Figma + React
7. Code Connect mapping (`*.figma.tsx` files)
8. Verify adaptive modes work at runtime in MindShift

**Phase 3 — MindShift screens (1 session)**
9. Rebuild HomePage/FocusScreen/TasksPage in Figma from actual current code
10. Add Mid + Low variants for each screen
11. Audit against Constitution Laws 1-5

**Phase 4 — Other products (3 sessions)**
12. VOLAURA screens
13. Life Simulator HUD
14. BrandedBy screens

**Phase 5 — Ship**
15. Dev Mode link for every component
16. GitHub Action syncs Figma → code on schedule
17. Brand pillar announcement: "The interface that feels different when you feel different"

## COST
- Figma Pro: already have ($12/mo × 1 seat) — $12/mo
- Tavily API: already have (free tier 1000/mo) — $0
- Hosting: Vercel already — $0
- **Total added: $0**

## TIMELINE
- No deadline per CEO directive
- Phase 1 can start immediately — Foundations is 4-6 hours of focused work
- Full system: 5 sessions if done sequentially, could parallelize with agents for screens

## WHAT I NEED FROM CEO
1. Approval to create new Figma master file (or pointer to existing one to extend)
2. Decision: keep existing Figma files or start fresh (recommend: fresh master + reference old)
3. Green light on "adaptive UI as brand pillar" framing

## WHAT I DO NOT NEED
- Permission to research further — done
- Color decisions — Constitution defines palette
- Component list — derived from current code
