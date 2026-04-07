# Ruthless Critique — design-synthesis-plan.md

Reviewer: senior design systems engineer hat on.
Target: `memory/design-synthesis-plan.md` (2026-04-07, after midnight).
Mode: no praise, no hedging, find what will break.

---

## TL;DR — the one-line verdict

The plan is **three themes with a philosophical overlay**, not adaptive UI. The "first in the world" framing is marketing theatre, the Figma→code pipeline has at least 4 documented failure points, the "font size changes by energy" rule directly collides with an **existing user-controlled `fontScale` feature already in `src/store/index.ts` and `src/index.css`**, and the 5-phase scope is one person pretending 8 Figma pages × 3 modes ≈ "one session per phase". Most of it is recoverable, but the framing and the font-size rule need to die before anything else gets built.

---

## Priority 0 — things that are factually wrong or self-contradictory in the plan

### P0-1. The plan reinvents a feature the repo already ships to the user.

`src/index.css` line 31 already defines `--font-scale`, controlled by `store.fontScale` (`src/store/index.ts` line 162), with explicit values `1 / 1.15 / 1.3` for default/large/XL. `src/index.css` line 215 applies it as `font-size: calc(16px * var(--font-scale))` on `<html>`. That is a **user-controlled accessibility preference**, shipped per commit `a344687` in sprint history ("Font Size Control — 3-step text scale for ADHD+dyslexia users").

The plan now wants `[data-energy="low"]` to also force body text to 18px. This means:

1. A user who chose Default (16px) will silently get 18px whenever they log low energy. Their explicit accessibility choice gets overridden by an implicit state change. That is not "adaptive", it's a **preference violation**. WCAG 1.4.4 says the user controls text size — not the app based on a mood slider.
2. A user who already chose XL (`fontScale: 1.3`) will get `18 × 1.3 = 23.4px` in low mode, blowing out their existing layout.
3. There is no collision-resolution logic in the plan. No `max(userPref, energyPref)`, no opt-out, no "respect explicit preference".

**The plan's Phase 1 would regress a feature that shipped 3 sessions ago.** The author did not check `sprint history` in CLAUDE.md or grep the existing CSS. That is the single biggest tell that this plan was written without reading the repo.

### P0-2. Law 2 ≠ "change font size". The plan misreads the Constitution.

CLAUDE.md, Foundation Law 2: "Energy Adaptation — UI simplifies at low energy" and explicitly defines it as: `isLowEnergy = energyLevel <= 2 || burnoutScore > 60` → 1 NOW task, hide NEXT, gentle banner. That is **content reduction** (fewer tasks, fewer widgets), not **typography manipulation**.

The plan conflates "simplify what is shown" with "restyle the things shown". A senior design systems engineer should know these are different problems:

- Content reduction is a **layout / visibility** decision. It's already implemented.
- Typography manipulation is a **rendering** decision. It creates reflow, CLS, and preference conflicts (see P0-1).

Nothing in the Constitution, in Research #2/#3/#8, or in ADHD fatigue research, says "dyslexic-style wide tracking in low mode is a win over just showing fewer things". The plan invents this, cites Zorzi 2012 (which is about dyslexia, not ADHD energy levels), and treats it as settled.

**Bottom line:** Law 2 says simplify. The plan says restyle. Those are not synonyms.

### P0-3. "Nobody ships combined adaptive UI" is not true enough to be a brand pillar.

The plan declares: *"Apple = type only. Material 3 = motion only. Endel = audio only. MindShift can be first."*

Counter-evidence:

- **iOS 26 Adaptive Power Mode** (June 2025 announcement, active in shipping iOS): combines brightness dimming + task pacing + workload shaping based on a predicted user/device state. That is multi-axis adaptive UI that requires Apple Intelligence silicon. Apple is already in this space.
- **Apple Home Adaptive Lighting** (iOS 18+): color-temperature shifts across the day tied to user wake/productivity/rest rhythms. Multi-axis, time-of-day driven.
- **Duolingo**: mascot state + celebration scale + "concerned owl on streak break" + energy/heart systems. That is mood-responsive UI tied to behavior, shipped at massive scale. The emotional-state adaptation **is their brand**.
- **Spotify**: context-sensitive playback UI, driving mode, quiet hours styling, personalized home reordering. Multi-surface, state-responsive.
- **Material 3 Expressive** (2025) covers more than motion. It includes shape, typography, color role variance tied to context.
- **Endel**: is literally an adaptive audio+visual app. The plan's own one-liner "Endel = audio only" is false; Endel's visuals morph with circadian state.

"Nobody in the world ships a combined adaptive visual layer" is a claim that will not survive a single competitor's marketing page, a single HN comment, or a single journalist's 15-minute fact-check. Building a **brand pillar** on it creates a predictable failure mode: the first person who writes "actually, Duolingo / Apple / Endel already did this" publicly becomes the story.

**The correct move is to narrow the claim until it is defensible**, e.g. "the first ADHD-focused productivity app whose typography, spacing, motion, and chroma all respond to self-reported energy level". That is specific, true as far as we know, and not embarrassing to defend.

### P0-4. The plan silently rewrites Constitution Law 1 and calls it "honesty".

Lines 98-102:
> Constitution Law 1 says "red triggers RSD" — no peer-reviewed study proves this directly.
> Rewrite to: "precautionary avoidance of red-family hues based on colour-arousal research and ADHD clinical reports".

This is a **Constitution amendment** sneaked into a design-system plan. The ecosystem rule in CLAUDE.md is explicit: "If code contradicts the Constitution — code changes." It does NOT say "if a plan contradicts the Constitution, the Constitution changes." Amending foundation laws should be a separate, flagged, explicit CEO decision, not a footnote in a tokens proposal. Even if the rewrite is defensible (and "clinical reports" is still hand-wavy), smuggling it in here is a governance failure, not a design-system task.

Either remove the amendment from this plan or promote it to a dedicated Constitution PR with its own review.

---

## Priority 1 — technical risks that will bite in implementation

### P1-1. Figma Variables with 3 modes → CSS via Style Dictionary → Tailwind v4: each arrow is a failure point.

The pipeline in Layer 3 is: `Figma REST API → Node script → DTCG JSON → Style Dictionary → Tailwind v4 @theme inline → [data-energy]`.

Known breakage points, in order:

1. **Figma REST API for published variables is library-scoped.** You must publish the library (or use local variables + a PAT with file access). Webhooks V2 (2025) added `LIBRARY_PUBLISH` events, but only fire on **publish**, not on save. A designer who edits Figma and never clicks Publish sends zero events. Silent drift day one.
2. **Figma API rate limit changes took effect November 17, 2025** per the Figma changelog. Any scheduled sync (the plan says "GitHub Action syncs Figma → code on schedule" in Phase 5, step 16) needs to be rate-aware. The plan doesn't mention rate limits.
3. **Style Dictionary 4.x still has non-trivial work to emit Tailwind v4 `@theme` blocks** correctly — most community examples emit plain CSS variables inside `:root` or `[data-theme="..."]` and leave `@theme` alone. Tailwind's own GitHub Discussion #16292 documents that **the `[data-theme]` selector does not scope `@theme` blocks**; the supported pattern is `@theme` for the base and `[data-theme="..."] { --token: value }` inside `@layer base`. The plan says "Tailwind v4 `@theme inline`" as if it's a feature for 3 modes — it isn't. The plan needs to rewrite this step as: base `@theme` + three `[data-energy="..."]` override blocks in `@layer base`, with explicit awareness that utility classes referencing those tokens will use the override only on elements under the attribute. Cascade interactions with dark mode, `[data-mode="calm"]`, and user `fontScale` need a matrix test, not a handwave.
4. **DTCG JSON format is still a W3C Community Group Draft, not a standard.** Tool vendors disagree on edge cases (aliases, math expressions, group vs token). Which Figma plugin emits DTCG — and does it match what Style Dictionary 4.x expects without an adapter? The plan doesn't name the plugin. That's a 4-hour yak-shave waiting to happen.
5. **SSR is a non-issue here** — MindShift is a Vite SPA, not Next.js. But service-worker caching IS an issue: `sw.ts` precaches CSS; after a token change the user may get stale CSS for up to the next SW update cycle. The plan doesn't mention SW cache busting.

None of these are fatal. All of them are uncounted cost.

### P1-2. "Hot-swap at runtime" is partially true, partially misleading.

Changing `document.documentElement.dataset.energy` IS cheap — CSS variable cascade handles it, no reload, no rehydration. But:

- **Layout will reflow** when body text is 16→18px and line-height 1.5→1.7. That's Cumulative Layout Shift on a live page. Core Web Vitals regression. On lists with 20+ TaskCards, everything jumps. ADHD users are sensitive to sudden layout changes — the plan's own rule 10 says so.
- **Motion tokens** (`stiffness 120 → 80`) only apply to animations **started after** the mode change. In-flight Framer Motion transitions use the old spring. For a few hundred ms after swap, old and new springs coexist. Not fatal, but looks sloppy if you catch it in a screen recording.
- **Bundle size.** The plan claims "no new infrastructure needed". But three full override blocks (colors, spacing, typography, radii, shadows, motion) for every semantic token is 3× the variable count in the compiled CSS. On a ~50KB CSS bundle baseline that's an extra ~40-80KB gzipped in the worst case. `.github/workflows` already has a **400 KB bundle gate** (BATCH-2026-04-04-M in sprint history). Phase 1 could trip that gate on day one if not measured.

### P1-3. SSR / Next.js objection from the question brief doesn't apply here.

The repo is Vite SPA (`vite.config.ts`, `main.tsx`, `App.tsx` with client router). There is no Next.js hydration step. This is one of the few things the plan got right by virtue of the stack. Mentioning for completeness: **do not migrate to Next.js just to pay for SSR hydration problems that don't exist yet**.

### P1-4. Runtime mode switching vs `prefers-reduced-motion` and `[data-mode="calm"]`: the selector specificity will fight itself.

Current repo: `[data-mode="calm"]` at `src/index.css:103` overrides things globally when `reducedStimulation` is on. Add `[data-energy="low"]` → now you have two orthogonal attribute overrides on `<html>`. Cascade order: whichever block is defined later wins for ties. Is `calm + low` a defined state? The plan doesn't say. What about `calm + full` (user is sharp but also has sensory sensitivity)? Undefined.

**Matrix you need to define before Phase 1:**

| calm \ energy | low | mid | full |
|---|---|---|---|
| off | defined? | defined? | defined? |
| on | defined? | defined? | defined? |

6 cells minimum. Plus light theme (`[data-theme="light"]`, already in repo at `src/index.css:188`). That's 12 cells. The plan talks about "3 modes" like it's only one axis. It isn't.

### P1-5. Developer experience: `[data-energy]` will absolutely be bypassed.

The plan's rule 10 says "never hardcode colors". The repo already has hardcoded hex values in several components (grep will show them) despite that rule existing since Sprint 8. In practice, what happens:

- New components get built with hardcoded Tailwind utility classes (`text-lg`, `p-4`).
- Those don't flex by `[data-energy]` because Tailwind utility values are static.
- Only components that use the semantic tokens via Tailwind v4 theme-referencing classes (e.g. `text-[--font-size-body]`) get the adaptation.
- Every new PR will quietly regress coverage of the adaptive system.

**Without an ESLint rule or a visual regression test that snapshots each mode, coverage will rot within 10 PRs.** The plan has zero enforcement.

### P1-6. 3× CSS is not the only bundle cost — Figma sync code ships too.

The plan lists "Node script → DTCG JSON → Style Dictionary". None of that ships to the browser. Fine. But the **motion tokens** (`motion.duration.*`, `motion.easing.spring.*` stolen from Framer) require per-mode JS objects because Framer Motion transitions are JS, not CSS. Either:

- three hardcoded JS presets in a `motion.ts` file + a `useEnergyMode()` hook that picks one at runtime (adds conditional logic everywhere `useMotion` is called today), or
- convert all motion to CSS `@keyframes` + `transition`, losing Framer's spring interpolation.

The plan doesn't pick. `useMotion` (I read `src/shared/hooks/useMotion.ts`) is already tightly wound to `motion/react` imports and preset transitions from `@/shared/lib/motion`. Retrofitting 3 modes into it is a non-trivial refactor that Phase 2 glosses over.

---

## Priority 2 — scope, execution, and process risk

### P2-1. "5 phases, 5 products, one person" is magical thinking.

The plan claims:
- Phase 1 Foundations = "1 session" (4-6 hours)
- Phase 2 Core components = "1 session"
- Phase 3 MindShift screens = "1 session" (rebuild Home/Focus/Tasks + 3 modes each + Constitution audit)
- Phase 4 Other products = "3 sessions" (VOLAURA + Life Sim HUD + BrandedBy)
- Phase 5 Ship = unspecified

**Real math:**

- Phase 1: 60 colors × 3 modes = 180 semantic tokens, minimum. Each has to be wired to the right primitive, named, documented, tested in both light and dark, matrix-audited against `[data-mode="calm"]`. This is 2-4 days of focused work even for someone experienced, not "4-6 hours".
- Phase 2: Button alone has ~8 variants × 4 states × 3 modes = 96 permutations in Figma before you write a line of code. Code Connect mapping is non-trivial — the plan lists it as a single bullet. Linear's public design engineering talks put Button alone at a week of component work for a mid-sized team.
- Phase 3: "Rebuild HomePage/FocusScreen/TasksPage in Figma from actual current code" is reverse-engineering, not designing. `src/features/focus/FocusScreen.tsx` is explicitly called out in CLAUDE.md as a ~350-line orchestrator with 4 sub-components (SessionControls, PostSessionFlow, ArcTimer, MochiSessionCompanion). Rebuilding that in Figma faithfully is 1-2 days alone.
- Phase 4: three other products, each with their own stacks and screens, in "3 sessions" is absurd. Life Simulator is a Three.js 3D app — designing a 3D HUD in Figma is a different craft entirely.

**Realistic estimate: 6-10 weeks of solo work for anything resembling Phase 1 + Phase 2 + Phase 3 done well.** The plan's timeline is off by ~10×.

### P2-2. Most-likely-abandoned phase: Phase 4.

Pattern match: Phase 4 (VOLAURA + Life Sim + BrandedBy screens) is the cross-product one. Every multi-product design-system effort in public post-mortems (Shopify Polaris rollout, Airbnb DLS, Uber Base) hit the "we own our own design" pushback from sister teams. For a single-founder ecosystem where "the team" is one person context-switching, Phase 4 is where fatigue eats motivation.

**Pre-mortem prediction:** Phases 1-2 ship. Phase 3 ships partially for MindShift core screens. Phase 4 is abandoned at VOLAURA landing, and Life Sim + BrandedBy never happen. The "ecosystem design system" framing collapses back to "MindShift design system + aspirations". That's still valuable — but the plan should be **honest about that outcome from day 1** and not load-bear on "ecosystem" in the brand pillar.

### P2-3. Missing: definition of done.

The plan lists execution steps. It does not list:

- What tests prove a mode switch worked?
- What regressions are acceptable (CLS budget? LCP budget?)?
- What's the rollback plan if users complain that low mode is ugly?
- Is there an A/B test? If not, how do we learn?
- Who is the first human who sees the new Home Screen Low Mode and says "ship / don't ship"?

No DoD = infinite work. This is a classic signal that the author is excited about the tech and hasn't thought about landing it.

### P2-4. Missing: analytics.

Sprint BATCH-2026-04-04-Q shipped analytics events for `app_first_open`, `burnout_alert_shown`, etc. The plan says nothing about instrumenting `energy_mode_changed`, `energy_mode_auto_applied`, `energy_mode_user_override`, or retention effects of the new adaptive layer. **If you can't measure whether adaptive UI improves anything, it's not a brand pillar, it's a vibe.**

Minimum viable analytics cut:
- `energy_mode_changed {from, to, reason: 'auto'|'manual', sessionStage}`
- `layout_reflow_on_mode_change {cls, lcp}`
- `user_preference_override {userFontScale, autoAppliedSize, winner}`

---

## Priority 3 — craft issues a senior reviewer would flag on first read

### P3-1. The plan treats Figma as the source of truth, but never says how conflicts are resolved.

If a developer hot-fixes a color in `src/index.css` (happens, always happens, pre-launch), then the next Figma sync overwrites it. The plan has no "Figma drift detection", no "code-side lockfile", no conflict resolution. Compare with **Vanilla Extract / Tokens Studio** pipelines where the JSON is the lockfile, not Figma. The plan leaves this as homework.

### P3-2. DTCG as output, but DTCG has no first-class concept of "mode".

DTCG handles themes via `$extensions` or multiple token files, neither of which is standardized across tooling. The plan says "3 modes" cheerfully. In practice you'll emit either (a) 3 separate DTCG files and merge them, or (b) custom extensions Style Dictionary doesn't know about, or (c) per-token `$value` maps that your transformer needs to understand. None of this is zero-code.

### P3-3. "Component" tokens as "1 mode, locked composition" breaks the premise.

Layer 1 point 3 says component tokens are 1 mode. But if `button/padding` is locked, then Button's padding doesn't breathe with energy state — only colors and typography do. Is that intentional? The plan doesn't say. It reads like the author wanted purity ("composition is locked, values are variable") but didn't think through whether a drained user benefits from bigger tap targets (they probably do; WCAG AAA 44×44 is the baseline, not the low-energy peak).

If low-energy users get the **same** button padding as full-energy, the "adaptive UI" claim is weaker than advertised.

### P3-4. Motion tokens stolen from Framer, but gated by `useMotion` hook that already exists.

`useMotion` combines OS `prefers-reduced-motion` + in-app `reducedStimulation` toggle → `shouldAnimate: boolean`. It returns `INSTANT` transition if either is true. The plan proposes a **third** dimension (energy level → spring stiffness). You now have a 3-axis motion state machine:

1. OS says no motion → must collapse to opacity
2. User toggled calm → must collapse to opacity
3. Energy low → slower spring but still motion

What wins? If energy=low but reducedStimulation=off, do we animate with soft spring, or not at all? The plan doesn't define. Worse, implementing it means rewriting `useMotion` to return **mode-specific** transitions, which means every call site that does `t('expressive')` gets a behavior change without opting in. That's a blast-radius issue.

### P3-5. "Steal from the best" section is mostly aspirational garnish.

9 bullets. How many are actually implemented in the execution plan?

- Linear LCH generator: not in any phase.
- Raycast auto-contrast: not in any phase.
- Arc per-Space color identity → seasonalMode: not in any phase.
- Notion haiku ("delete 5 unused components before adding any"): not even a checklist item.

If the plan doesn't use them, cut them. Otherwise it reads like a deck that was built to impress, not to ship.

### P3-6. "The interface that feels different when you feel different" is a good tagline and a bad engineering spec.

Taglines are for marketing. The plan is supposed to convert the tagline into testable criteria. It doesn't. What does "feels different" measure? RMS pixel delta between screenshots? User self-report on a 1-5 scale? Time-on-task? The plan doesn't pick, which means "done" is undefined, which means scope creeps forever.

---

## Priority 4 — accessibility / regression risks

### P4-1. Font size changes conflict with browser zoom and iOS Dynamic Type.

A user at 200% browser zoom who is also in "low energy" mode now gets `18px × 2 = 36px` body text in a layout that was designed at 16px. Tap targets stop aligning. Focus rings fall off-screen. The plan doesn't include a zoom matrix.

iOS Dynamic Type on a PWA installed on iOS is more subtle: Dynamic Type only applies if you use `-apple-system-body` in CSS `font` property. The repo currently uses `Inter` as the primary font (see `src/index.css:30`). That means Dynamic Type **does not work** in MindShift today — the plan leaves that as an unaddressed gap and on top of it adds another font-size override that will only further confuse accessibility tooling.

### P4-2. WCAG 1.4.4 Resize Text requires user control, not app control.

"Text can be resized without assistive technology up to 200 percent without loss of content or functionality." This is a **user resize**, not an app-initiated resize. Adaptive font sizing based on energy is not a WCAG violation per se, but it fails the **spirit** of 1.4.4 unless you also let users override it to "always use my chosen size". The plan has no override.

### P4-3. Changing letter-spacing +2% in Low mode interacts with Inter's metrics.

Inter is designed around tight tracking. Adding +2% letter-spacing changes the optical weight of the typeface and the ligature behavior. This is a **visible** typographic change even at small doses, and for users with dyslexia or low vision the effect can help OR hurt depending on the individual. Zorzi 2012 is dyslexia research on children reading Italian — not a blanket endorsement for all users in all contexts in all energy states. Citing it as justification is cherry-picking.

### P4-4. APCA instead of WCAG 2.x for contrast: defensible, but APCA is still in draft.

The plan cites APCA Lc 75 body / Lc 60 UI. APCA is a **W3C Community Group Draft** under WCAG 3 Silver, not a normative standard. Certification bodies (e.g. EU Accessibility Act audits taking effect 2025) still audit against WCAG 2.1 / 2.2. If MindShift has EU users, **legally you need WCAG 2.1 AA compliance as the baseline**, regardless of whether APCA is "better". The plan treats APCA as a replacement. It's an addition. Both must pass.

---

## Priority 5 — what's missing that a senior design systems engineer at Linear or Vercel would immediately add

1. **Visual regression tests per mode.** Chromatic / Playwright screenshots comparing Full / Mid / Low side-by-side, blocking CI on unexpected diffs. Not optional for adaptive UI.
2. **Token contract tests.** Every semantic token must resolve to a valid primitive in every mode. A unit test that fails if an alias points at `undefined`.
3. **Contrast matrix CI.** For every (surface, text) pair in every mode, compute APCA **and** WCAG 2.1 and fail CI if either drops below threshold.
4. **Accessibility escape hatch.** `reduceMotionSystemWide` is one axis. `respectMyFontSize` must be another. `skipEnergyAdaptation` setting for users who find the shifts disorienting.
5. **Design lint.** ESLint rule that bans hardcoded Tailwind color utilities in `src/features/**/*.tsx` — must reference semantic tokens. Without this, coverage rots.
6. **Storybook (or equivalent).** 30+ components × 3 modes = 90+ stories. Impossible to manually verify without a browseable catalog. The plan doesn't mention Storybook at all. Ladle, Histoire, Storybook 8 — pick one.
7. **Changelog + migration guide per token break.** When a token is renamed, automated codemods (`jscodeshift`) should rewrite imports. Linear has a whole internal tool for this.
8. **Perf budget per mode.** CLS, LCP, TBT, bundle size per mode. Without budgets this is a vibes-based system.
9. **User research, not library research.** The plan is 100% industry library research. Zero user sessions watching ADHD users transition between modes. That is where you'd learn whether the transition itself is distressing.
10. **Kill switch.** One environment variable `DISABLE_ADAPTIVE_UI=1` that falls back to Full mode for everyone. You will need this the first time a user emails "the app keeps resizing and it's making me sick".

---

## Priority 6 — smaller but real nits

- **"One master file: VOLAURA Ecosystem Design System"** — naming a single Figma file to cover 5 products is operationally a nightmare. Each product should have its own library and extend a shared primitives library. Figma's own best practice. The plan picks the easy path and will regret it when library publish cycles collide.
- **"Each screen page has 3 variants per key screen"** — Figma variants are a specific feature with known performance cliffs at ~1000 instances per file. 120 variants is manageable, 300 is not. No headroom.
- **"Phase 5 — Ship, 17. GitHub Action syncs Figma → code on schedule"** — on schedule or on webhook? Schedule wastes API calls; webhook is more reliable but requires a public endpoint, which the plan doesn't mention provisioning.
- **Cost: "$0 added"** — false. Time cost at ~6-10 weeks of single-founder attention is the real cost. Opportunity cost on other ecosystem priorities (ZEUS, Life Sim, VOLAURA) is the real cost. "Total added: $0" is a CFO line, not an engineer line.
- **"Figma Pro $12/mo"** — Figma is $15/mo for Professional (Full Seat) in 2026 pricing. Minor but still inaccurate.
- **"Cowan 4±1 working memory"** — Cowan's figure is 4±1 for adults in general, but the plan pairs it with "NOW pool max 3" which is a separate, stricter choice. Fine, but cite it correctly: "NOW pool = 3 as an ADHD-safe reduction below Cowan's baseline", not "NOW pool max 3 (Cowan)" which implies 3 is the Cowan number.
- **Confetti particles = 12** — fine, but not a design-system concern. Shouldn't live in the hard metrics table. It's a feature constant in `constants.ts`.

---

## Is it actually "adaptive UI" or "3 themes with extra steps"?

**Verdict: 3 themes with extra steps.** Here's why.

True adaptive UI in the research literature (Henze, Gellersen, "adaptive user interfaces") has three properties:

1. **Inference** — the system learns user state from behavior, not a self-report slider.
2. **Gradual** — adjustments happen at a granularity smaller than "mode".
3. **Per-element** — not every element changes at once; only the relevant ones.

The plan has none of these:

1. Energy level is a **user self-report** number (1-5). That's a preference, not an inference.
2. The transition is **discrete** — energyLevel ≤ 2 → `low`, else → `mid/full`. That's a threshold, not a gradient.
3. **Every token changes at once** via `[data-energy="low"]`. That's a theme.

Two extra inputs to differentiate it from "dark mode + a size slider":

- It auto-applies based on a self-report the user already made elsewhere.
- It changes more than just color (type, spacing, motion, chroma).

That's meaningfully more than "just dark mode", **but calling it "the first adaptive UI in the world" is overreach**. It's "user-state-linked theming with typographic + motion dimensions". Clunky, but accurate.

**Reframe recommendation:** drop the "adaptive" word entirely from external comms. Use "responsive-to-state theming" or "energy-aware UI". Adaptive has specific academic meaning and you don't meet it.

---

## KILL THIS PLAN IF...

Kill the plan (or pivot hard) when **any two** of the following become true:

1. **P0-1 is not fixed.** The plan cannot regress the existing user `fontScale` accessibility feature. If the author cannot articulate a clean collision-resolution rule (max of user-pref and energy-pref, or explicit opt-out), stop.
2. **Phase 1 bundle size increase exceeds the 400KB CI gate.** Measure after Style Dictionary emits the 3-mode CSS. If the gate trips, the 3-mode approach via CSS variables is wrong; go back to compositional approach (e.g., per-route lazy theme imports).
3. **Phase 1 takes more than 2 sessions.** Plan says one session. If by session 3 the foundations aren't shipping, the scope/time estimate is off by 3× and Phase 4 is a fantasy.
4. **"First in the world" claim cannot be defended in writing.** If you can't write the differentiation in one paragraph without someone credibly pointing to Duolingo / Apple Adaptive Power / Endel, the brand pillar is dead. Narrow it or pick a different pillar.
5. **A real ADHD user tests Low mode and reports feeling worse, not better.** The plan is built on research citations, not observation. The first user test that shows the transition itself is jarring kills the premise. Run this test in Phase 2 at the latest, not Phase 5.
6. **Figma→code pipeline takes more than 1 day to get a single token round-tripping to production.** If round-trip is fragile, every future change becomes a tax. Pivot to hand-authored DTCG JSON with Figma as "reference view, not source of truth".
7. **Phase 4 (other products) becomes a blocker for Phase 3 ship.** Phase 3 must ship MindShift only. If the author finds themselves unable to freeze the MindShift system until "the ecosystem is aligned", the ecosystem framing is eating the product.
8. **No visual regression tests by end of Phase 2.** Without them, the 3-mode system will silently regress within 10 PRs. Regressions you can't see will become regressions you ship.

**Pivot targets if killed:**

- Down to "MindShift design tokens v2": ship one mode (current), tokenize properly, cut Figma sync, cut adaptive layer. This is 80% of the real value at 20% of the cost.
- Or up to "real adaptive UI": add behavioral inference (energy_after deltas, session drop rate), make mode transitions gradient not discrete, run a 5-user ADHD study. That is a 3-month research project, not a 5-session build. Name it and scope it accordingly.

Not both. Pick one.

---

## The 30-second version

- Plan collides with existing shipped user-fontScale feature (P0-1, fatal). Fix or die.
- "First in the world" is not true (P0-3). Narrow the claim or drop it.
- Law 2 ≠ restyle (P0-2). Plan conflates simplification with theming.
- Constitution amendment smuggled in (P0-4). Extract to its own PR.
- Timeline is ~10× optimistic (P2-1). Phase 4 will be abandoned.
- Pipeline fragility is uncounted cost (P1-1). 4+ failure points, zero mitigations.
- No visual-regression tests, no analytics, no DoD, no kill switch, no user study (P2-3, P2-4, P5-1, P5-10). Infinite scope.
- Is actually 3 themes with a philosophy coat of paint (final section). Which is fine — if you stop claiming otherwise.

Build the tokens. Cut the brand-pillar theatrics. Ship one mode at a time.
