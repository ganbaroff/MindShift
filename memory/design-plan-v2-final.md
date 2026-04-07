# Design Plan v2 — Honest + Current Tech + Graded Adaptation
# 2026-04-07 — after 8 research agents + ruthless critique

## WHAT DIED FROM PLAN v1
- "First in the world adaptive UI" — false (Endel ships this)
- "Figma 3 modes = adaptive layer" — it's just 3 themes
- "4-6 hours Phase 1" — 6-10 weeks realistic
- "Rewrite Law 1" — needs separate Constitution PR, not design footnote
- "Typography 16→18 on low energy" — conflicts with existing fontScale feature
- "10-15 hours pipeline setup" — Tailwind v4 @theme inline doesn't scope to data-theme
- "nobody ships this" — Endel, Apple Focus Modes, Material 3 all exist

## WHAT SURVIVED
- Constitution Laws 1-5 (honest rewording of Law 1's evidence base, not the law itself)
- APCA Lc 75/60 hard metrics
- Cowan 4±1 confirming NOW=3
- Pretext as killer tech for Mochi streaming
- View Transitions API replacing Framer Motion
- OKLCH replacing HSL
- MindShift already has 80% of the infrastructure — don't rebuild

## THE HONEST PILLAR (marketing)
NOT "first adaptive UI"
INSTEAD one of these:
- "Endel changes music to your heart rate. We change your task list to your brain."
- "Tiimo makes one soft interface. MindShift makes four."
- "The first ADHD productivity app (that we know of) that binds typography, spacing, motion and color to your current energy."

## TWO TRACKS (pick BOTH sequentially, not at once)

### TRACK 1: TOKENS V2 + MODERN TECH (Now — 1-2 weeks)
Upgrade the technical foundation using research findings.
Value: 80% of design system plan, 20% of risk.
Does NOT claim adaptive UI. Just modernizes under the hood.

**Week 1 actions:**
1. Install `@chenglou/pretext` (15KB, zero deps). Replace MochiSessionCompanion bubble rendering. Kills streaming layout shift — visible user win day 1.
2. Migrate 4 overlays (RecoveryProtocol, ContextRestore, WeeklyPlanning, MonthlyReflection) to View Transitions API. Delete Framer Motion imports from those files. Measure bundle size drop.
3. Convert CSS tokens HSL → OKLCH. Write ESLint rule that parses OKLCH and rejects any color with hue in [340-15]° range. Automated Law 1 enforcement.
4. Create Figma master file "MindShift Foundations v2" via MCP. Primitives + Semantic collections. ONE mode. No 3-mode fantasy.
5. Code Connect mapping for existing 6 components (Button, Input, Card, Badge, Toast, Sheet).
6. ADR-0008 documenting what changed and why.

**Week 2 actions:**
7. Verify existing `isLowEnergy` behavior still works (don't touch useMotion or fontScale).
8. Audit current MindShift screens against Constitution — find real violations, not imagined ones.
9. Fix real violations without scope creep.
10. Commit new tokens to GitHub, run visual regression.

### TRACK 2: GRADED ADAPTIVE LAYER (Later — 2-3 months R&D)
This is the actual "novel" thing. Needs real study, not fantasy.

**Prerequisites:**
- Track 1 complete and stable
- 20+ real MindShift users with session data
- Willingness to run 1-month user study
- Willingness to kill the feature if data says no

**Research questions:**
- Does gradient adaptation (continuous interpolation) beat binary switch in retention?
- What axes should move together (spacing + color), and what should stay (fontScale user control)?
- Can we infer energy from behavior (tap latency, session entropy) without asking?
- Does the adaptation help or confuse ADHD users?

**If research says yes:**
- Build behavioral inference layer (read tap latency, session entropy, abandonment rate)
- Interpolate 4 axes continuously from [0..1] state score (not 3 hardcoded modes)
- Graded color saturation via OKLCH lightness/chroma smooth curves
- Graded spacing via CSS custom property arithmetic
- Graded motion via useMotion integration (new axis carefully added)
- Graded typography ONLY within user's fontScale choice (don't override)

**If research says no:**
- Document findings in ADR-0009
- Keep Track 1 tokens as final design system
- Move on to next P0 blocker

## TECH STACK FOR TRACK 1

| Item | What | Why | Status |
|------|------|-----|--------|
| @chenglou/pretext | DOM-free text layout | 300-600× faster reflow, kills Mochi jitter | Install day 1 |
| View Transitions API | Native browser transitions | Baseline Oct 2025, removes ~10KB FM code | Use for overlays |
| OKLCH colors | Perceptually uniform | Tailwind v4 native, enables automated Law 1 enforcement | Migrate tokens |
| Figma MCP | Programmatic Figma | Already connected | Build foundations page |
| Code Connect | Figma → React mapping | Free until end 2026 | 6 core components |
| Style Dictionary | Token transform | Industry standard | Only if needed |
| Tailwind v4 `@theme` | CSS variables | Already in use | Extend |

## TECH STACK FOR TRACK 2 (R&D, don't build yet)

| Item | What |
|------|------|
| Terrazzo (Cobalt v2) | DTCG design tokens with computed values |
| React Compiler | Auto-memoization for adaptive re-renders |
| Behavioral inference service | Read tap latency + session entropy |
| User study framework | 20 users, 1 month, A/B graded vs binary |

## HONEST ESTIMATES

**Track 1 (Foundation):** 40-80 hours solo over 1-2 weeks. Could parallelize with agents for component Figma work. Result: modernized foundation, faster Mochi, smoother overlays, automated Law 1 enforcement. No novel marketing claim needed.

**Track 2 (Adaptive R&D):** 2-3 months if data supports it. Skip if user study fails. This is where the honest "first in the world" pitch can actually be earned — but only after real research.

## WHAT I NEED FROM CEO

Not approval to start. A decision on scope:

**Option A: Track 1 only.** Ship solid foundation. Mochi stops jittering. Overlays get smooth. Tokens modernize. No marketing of adaptivity — we already have isLowEnergy which is enough. Realistic, shippable, makes MindShift better.

**Option B: Track 1 + Track 2 sequentially.** Track 1 now, then user study, then graded layer if data supports. Takes 3-4 months total but results in actually novel product — defensibly unique in the market.

**Option C: Track 2 first (dangerous).** Jump to adaptive R&D before foundation. Risk: 3 months without shippable code. Not recommended.

My recommendation: **Option B.** Track 1 ships value fast, buys research time for Track 2. If Track 2 fails, Track 1 is still a win.

## FILES CHANGED BY TRACK 1 (estimate)

- `src/features/focus/MochiSessionCompanion.tsx` — pretext integration
- `src/features/focus/BreathworkRitual.tsx` + 3 others — View Transitions
- `src/index.css` — HSL → OKLCH
- `eslint.config.js` — add no-red-oklch rule
- `src/app/App.tsx` — remove Framer Motion from overlay lazy imports
- `docs/adr/0008-modern-ui-foundation.md` — document decisions
- `.claude/rules/guardrails.md` — update Rule 1 with OKLCH enforcement
- `package.json` — add @chenglou/pretext, remove 3-4 Framer Motion usages
- NEW: `figma/foundations.md` — link to Figma master file
- NEW: `scripts/sync-figma-tokens.mjs` — REST API → Style Dictionary

~10 files touched. No sprawling rewrite. No 5-product ecosystem scope creep.

## WHAT IS EXPLICITLY NOT IN THIS PLAN

- 5 products (only MindShift for Track 1)
- 3 Figma modes (Tailwind v4 can't scope them properly)
- New typography scale (respects user fontScale)
- useMotion rewrite (preserves existing contract)
- Constitution amendment (separate PR if needed)
- "First in the world" marketing (false)
- Life Simulator / BrandedBy / VOLAURA screens (later)
- Style Dictionary if Tailwind v4 can do it directly
- Tokens Studio plugin (paid, unnecessary)

## NEXT STEP

CEO picks A/B/C. I execute. No more 5-agent research sessions until Track 1 is done.
