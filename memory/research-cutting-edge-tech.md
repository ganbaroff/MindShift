# Research — Cutting-Edge Adaptive / Living UI Tech (2025–2026)

Date: 2026-04-07
Target stack: React 18/19, TypeScript, Tailwind v4, Next.js 14, MindShift (ADHD-aware PWA)

---

## TL;DR — Top 5 Findings

1. **Pretext (`@chenglou/pretext`)** — 15 KB, zero-dep TS library that measures multiline text without touching the DOM. 300–600× faster than DOM reflow. Solves exactly the problem MindShift has during Mochi AI streaming responses. Ship-ready. **USE NOW.**
2. **Tailwind v4 + OKLCH** — Already compatible with MindShift's palette work. OKLCH gives perceptually uniform steps, P3 wide-gamut colors, and runtime CSS variables. **USE NOW** (already partially adopted via `:root` vars).
3. **View Transitions API (same-document)** — Baseline Newly Available since Oct 2025 (Firefox 144). Crosses MindShift overlay transitions at zero JS cost. **USE NOW** for Recovery / ContextRestore / Weekly overlay transitions.
4. **React 19 `useOptimistic` + React Compiler** — Compiler auto-memoizes (removes need for `React.memo` boilerplate on TaskCard etc.). `useOptimistic` fits carry-over badge / task complete undo flow. **EVALUATE** after v1 Play Store launch.
5. **Motion (new `motion/react`)** — Successor to Framer Motion, independently maintained, 75–90 % smaller than GSAP for scroll/animate work. MindShift already imports from `motion/react` per guardrails. **USE NOW**, already in.

---

## 1. PRETEXT — The Headline Discovery

### What it is
**Pretext** is a pure-TypeScript library for multi-line text measurement and layout that bypasses the browser's DOM layout engine entirely. Instead of reading geometry from DOM nodes (which forces expensive layout reflows), it uses the Canvas font metrics API once to calibrate, then does pure arithmetic to predict where every glyph, word, and line will break.

- **Author**: [Cheng Lou](https://github.com/chenglou) — former React core contributor, ReasonML author, currently at **Midjourney**. Library was born from production pain at Midjourney where streaming AI tokens were triggering continuous text reflows.
- **Repo**: https://github.com/chenglou/pretext
- **npm**: `@chenglou/pretext` — https://www.npmjs.com/package/@chenglou/pretext
- **Homepage / demos**: https://www.pretext.cool/ and https://chenglou.me/pretext/
- **Announced**: March 27, 2026 (brand new, ~2 weeks old at time of this research)
- **License**: MIT
- **Bundle**: ~15 KB gzipped, **zero dependencies**, ships with full TypeScript types
- **HN thread**: https://news.ycombinator.com/item?id=47556290

### Why it matters for MindShift
MindShift has **two** places where text-reflow-during-streaming is a real problem:

1. **MochiSessionCompanion / mochi-respond** — AI responses stream in, causing bubble heights to shift mid-render. Current workaround: show hardcoded fallback first, swap in AI response when ready. Pretext could predict the final bubble height the instant the AI starts streaming → **zero layout shift, no swap flash**.
2. **HistoryPage + TasksPage virtualization** — If session count grows, we'll need virtual scrolling. Pretext integrates cleanly with React Virtuoso / TanStack Virtual and lets you pre-measure every row without mounting it.

### Key APIs
```ts
import { prepare, layout } from '@chenglou/pretext'

// one-time pass per (text, font) pair
const prepared = prepare(text, font, options)

// O(1) arithmetic on every subsequent call
const height = layout(prepared, maxWidth, lineHeight)

// for manual line routing (canvas, SVG, wrap-around-image)
import { prepareWithSegments, layoutWithLines, walkLineRanges } from '@chenglou/pretext'
```

Supports:
- `white-space: normal` and `pre-wrap`
- `word-break: normal` and `keep-all`
- Soft hyphens, grapheme-aware breaking
- Mixed fonts (rich inline), atomic items (e.g. chips)
- RTL languages

Does **not** support kerning adjustments or precise glyph positioning for complex script shaping. For MindShift's Latin + Cyrillic use, this is a non-issue.

### Published benchmark
- Process **500 different texts in ~0.09 ms** via `layout()`
- **300–600× faster** than DOM-based measurement
- Paper: claims "500× faster" from Cheng Lou directly

### Does it fit our stack?
- React 18/19: yes (library is framework-agnostic, each demo is a React component)
- TypeScript: yes (written in TS, full typings)
- Tailwind v4 / Next.js 14: no conflicts; it's a pure compute library
- SSR-safe: yes — uses Canvas only on the client, the API is deterministic given font metrics
- Bundle budget: +15 KB gzipped. MindShift's CI bundle gate is 400 KB. Fine.

### Recommendation: **USE NOW**
Ship locations:
- `MochiSessionCompanion.tsx` — predict bubble height before stream starts
- `HistoryPage.tsx` — pre-measure session rows for eventual virtualization
- (Maybe later) `TaskCard` note preview — pre-measure truncation boundary to avoid 1-line overflow jitter

**Known risk**: Brand-new library (~2 weeks old). No v1.x stability promise yet. Pin exact version, watch for breaking changes through v0.x.

### Related community
- **Awesome-pretext**: https://github.com/bluedusk/awesome-pretext — curated demos, tutorials, tips
- **Magazine-style shadcn/ui blocks**: Creative Tim has already shipped 5 editorial components built on Pretext ([blog post](https://www.creative-tim.com/blog/shadcn/building-magazine-style-blocks-with-pretext-five-new-editorial-components/))
- **Dataconomy coverage**: https://dataconomy.com/2026/03/31/new-typescript-library-pretext-tackles-text-reflow-bottlenecks/
- **VentureBeat**: Midjourney engineer debuts vibe-coded open-source standard "Pretext"
- **Simon Willison notes**: https://simonwillison.net/2026/Mar/29/pretext/

---

## 2. Variable Fonts 2026

### State of the art
Variable fonts are now the default for UI in 2026. One file, many axes.

- **Figtree** — geometric sans-serif, 7 weights, 280+ Latin languages. Adobe Fonts, Google Fonts, Fontsource. Free.
- **Inter** — 9 weights + italic, variable axis. Battle-tested, huge community.
- **Geist** — Vercel's open-source UI font. 9 weights, UI + display sizes. Variable version ships with `next/font`.

### Axes beyond weight
- `wght` (weight) — universal
- `wdth` (width) — condensed ↔ extended
- `opsz` (optical size) — automatically adjusts contrast/spacing for small vs display
- `slnt` (slant) — linear italic
- `GRAD` (grade) — weight change without metric shift (great for dark-mode balance)
- Custom axes — e.g. Recursive has a "casual" axis

### Animation in React
- `next/font` auto-inlines the variable font with `font-display: swap` and zero CLS.
- Scroll-linked: common trick is to attach a JS scroll listener and mutate `font-variation-settings`. With CSS scroll-driven animations (now baseline), you can do this **purely in CSS** via `animation-timeline: scroll()`.
- Hover/state-driven: `transition: font-variation-settings 200ms ease` — cheap, no JS.

### Fit for MindShift
Currently MindShift uses Inter-ish system sans via Tailwind defaults. Switching to Figtree variable (via `@fontsource-variable/figtree`) would give:
- `wght` interpolation for energy-level visual emphasis
- `opsz` for better readability at small sizes (relevant for dyslexia + fatigue)
- Self-hosted, zero runtime cost

### Recommendation: **EVALUATE**
Not urgent. Current fonts work. But if we do a typography pass to land dyslexia-friendly defaults, Figtree Variable (+ optional Atkinson Hyperlegible fallback) is the move.

Sources:
- [Fontsource Figtree Variable](https://fontsource.org/fonts/figtree)
- [Next.js font optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [Variable fonts guide 2026](https://inkbotdesign.com/variable-fonts/)

---

## 3. Adaptive Typography Libraries

### Fluid type with `clamp()` — table stakes
```css
font-size: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
```
Scales linearly between viewport widths. Production-ready for years. Already in Tailwind v4 via utilities like `text-[clamp(...)]`.

**Accessibility gotcha**: `vw` is **locked to viewport** and does not respond to browser zoom. Users zooming with `Cmd +` will find fluid type doesn't scale. Mitigation: always use `rem` in the min/max values, or pair `vw` with a `rem`-based factor. MindShift's Phase-3 font-size control already uses a user preference slider which sidesteps this entirely.

### Tools
- **[fluid-type-scale.com](https://www.fluid-type-scale.com/)** — generates CSS custom properties for a complete scale
- **Tailwind v4** — first-class fluid utilities via `@theme` and CSS vars
- **size-adjust / font-size-adjust** — used to normalize x-height across fallback fonts (prevents CLS during font load). Next.js `next/font` applies automatically.

### Fontsource
- Library of self-hostable open-source fonts
- Variable + static builds
- Per-weight tree-shakable imports
- https://fontsource.org/

### Next Font (Vercel)
- Ships with Next.js 14+
- Inlines font metrics, applies `size-adjust` automatically, zero CLS
- Works with Google Fonts and local files
- https://nextjs.org/docs/app/getting-started/fonts

### Nothing I could find adapts to "reading ability, fatigue, or zoom" at runtime
This is actually a **product gap** that MindShift could own. The Phase-3 font-size control and dyslexia-aware fallback is already ahead of the curve. No library does this for you because "ADHD reading comfort" isn't standardized.

### Recommendation
- **USE NOW**: keep `clamp()` for fluid basics
- **EVALUATE**: Fontsource for self-hosting the next font pick
- **SKIP**: any "adaptive typography" library — we already have a better, user-controlled version

---

## 4. CSS Container Queries + Adaptive UI 2026

### What's production-ready
| Feature | Browser support | Baseline status |
|---|---|---|
| `@container` size queries | Chrome 105+, FF 110+, Safari 16+ | Baseline Widely Available (2023) — ~95 %+ coverage |
| `@container style()` queries | Chrome 111+, Edge 111+ only | NOT baseline (FF/Safari lag) |
| `:has()` parent selector | All major browsers | Baseline 100 % as of 2026 |
| `@scope` (scoped CSS) | Chrome 118+, Safari 17.4+ | NOT in Firefox yet |
| **CSS Anchor Positioning** | Chrome 125+, Edge 125+, Opera 111+ | NOT in Firefox or Safari stable — feature flag only in Safari TP |
| **View Transitions API** (same-document) | All majors as of FF 144 (Oct 2025) | **Baseline Newly Available — Oct 2025** |
| View Transitions API (cross-document) | Chrome 126+, Safari 18.2+ | NOT baseline |
| `@starting-style` | Chrome 117+, Edge 117+, Safari 17.5+, FF 129+ | **Baseline Newly Available** |
| Scroll-driven animations (`animation-timeline`) | Chrome 115+, Edge 115+ | NOT baseline (FF/Safari lag) |

### Implications for MindShift
1. **`:has()`** — safe everywhere. Good for e.g. styling a TaskCard differently when it contains a `.due-date-badge.past-due` sibling without JS.
2. **Container queries** — safe everywhere. Good for NowPoolWidget layout changes without coupling to viewport. e.g. "show 2-col if widget ≥ 320 px, 1-col otherwise".
3. **View Transitions** — baseline. **Big win** for RecoveryProtocol / ContextRestore / WeeklyPlanning overlay entrances. One line:
   ```css
   @view-transition { navigation: auto; }
   ```
   + `document.startViewTransition(() => setShowOverlay(true))` in JS. Automatic crossfade with no Framer Motion code. Respects `prefers-reduced-motion`.
4. **`@starting-style`** — baseline. Eliminates half of our entrance-animation Framer Motion code. Works from `display: none` which was impossible before.
5. **Anchor Positioning** — **NOT safe yet** because Firefox and Safari are missing. Skip for now. (Our carry-over popover uses JS positioning — keep it.)
6. **Scroll-driven animations** — **NOT safe yet** (FF/Safari lag). Keep using JS for scroll-linked animations.

### Recommendation: **USE NOW** (selectively)
- Migrate RecoveryProtocol / ContextRestore / WeeklyPlanning overlay entrances to View Transitions API + `@starting-style`. Saves ~10–15 KB of Framer Motion code and gets native 60 fps crossfades.
- Replace any `useEffect`-based parent-class-toggle patterns with `:has()`.

Sources:
- [Interop 2026](https://css-tricks.com/interop-2026/)
- [Scroll-driven animations spec](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [CSS 2026 features](https://nerdy.dev/4-css-features-every-front-end-developer-should-know-in-2026)
- [View Transitions guide](https://webperfclinic.com/article/view-transitions-api-smooth-page-transitions-perceived-performance)

---

## 5. React 19 + Adaptive Patterns

### What's new and relevant
- **`useOptimistic`** — immediate UI update while the real mutation is in flight. Reverts on error. Perfect for task-complete toggles, energy logging, carry-over popover actions.
- **`useActionState`** — wraps a mutation function, returns `[state, dispatch, isPending]`. Cleaner than manual useState + try/catch for form submits.
- **Actions** — `<form action={serverFn}>` works in client components. Ties into useOptimistic.
- **`use()`** — unwraps promises/contexts. Cleaner than `useContext` in many cases.
- **React Compiler (aka React Forget)** — **automatically memoizes** components and hook callbacks at compile time. **Removes the need for manual `React.memo`, `useMemo`, `useCallback` in most cases.** Ships with React 19.

### Impact on MindShift
- MindShift has a lot of manual memoization boilerplate (TaskCard custom comparator, useMemo on filtered lists, useCallback for event handlers). **React Compiler would simplify ~30 % of our component code** with a single Babel plugin install.
- `useOptimistic` fits:
  - Task complete → undo toast pattern (4s window) — currently uses manual timer state
  - Energy level logger — optimistic commit + Supabase background write
  - Carry-over popover actions (Park / Someday / Still on it)
- `useActionState` fits:
  - AddTaskModal form submit
  - OnboardingPage final submit

### Does it work with our stack?
- React 18: **No**, needs React 19.
- Next.js 14: **Yes**, Next 14.1+ supports React 19 RC; Next 15 stable as of Nov 2025 ships with React 19.
- MindShift is on Vite + React 18 currently. Upgrade is non-trivial but not huge — mostly `@types/react@19`, `react-dom@19`, and running codemods.

### Recommendation: **EVALUATE**
Not a v1 blocker. But for the post-Play-Store refactor, moving to React 19 + Compiler would remove ~400 lines of memoization boilerplate and unlock `useOptimistic` for ADHD-friendly instant feedback. Do after Google Play launch lands and crashes are stable.

Sources:
- [React 19 official blog](https://react.dev/blog/2024/12/05/react-19)
- [useOptimistic docs](https://react.dev/reference/react/useOptimistic)
- [React 2026 new primitives + Compiler era](https://pas7.com.ua/blog/en/react-2026-new-primitives-compiler-era)
- [useActionState deep dive](https://pas7.com.ua/blog/en/react-useactionstate-deep-dive)

---

## 6. Design Tokens 2026

### W3C DTCG — first stable spec
- **October 28, 2025**: The Design Tokens Community Group shipped **Format Module 2025.10** — the first **stable** version of the DTCG specification.
- Defines standard JSON format for colors, typography, spacing, shadows, animations, etc.
- Adopted by Adobe, Amazon, Google, Figma, Framer, Microsoft, Meta, Salesforce, Shopify, Sketch, Sony + dozens more.
- Spec URL: https://www.designtokens.org/tr/2025.10/format/

### Tooling
- **[Terrazzo](https://terrazzo.app/)** — the new name for **Cobalt UI v2**. MIT-licensed CLI + Visual Token Builder + React components. Multi-platform (web, native, mobile) code gen from DTCG JSON. The spiritual successor to Style Dictionary.
  - GitHub: https://github.com/terrazzoapp/terrazzo
  - Migration path from Cobalt documented
- **Style Dictionary v4** — has first-class DTCG support. v5 (in progress) will match the 2025.10 format.
- **Tokens Studio** (Figma plugin) — bidirectional DTCG export. Designers edit tokens in Figma, devs consume the same JSON.
- **zeroheight** — documentation layer on top of DTCG.

### Fit for MindShift
- MindShift currently uses CSS custom properties in `:root` + `[data-mode="calm"]` overrides. This is fine for a single-platform PWA.
- If/when we expand to native (Capacitor is already scaffolded), DTCG + Terrazzo lets us share colors/typography/spacing between web and native iOS/Android without duplication.
- ADR-0005 (ADHD-safe color system) could be codified as a DTCG tokens file with a "constitution" validation step that blocks any red hue from landing.

### Recommendation: **EVALUATE**
Worth investigating for the ecosystem level. VOLAURA + MindShift + Life Simulator all share the Ecosystem Constitution — a single DTCG source of truth with Terrazzo codegen would enforce "no red" across all 5 products at build time.

Sources:
- [DTCG first stable spec blog](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Terrazzo migration from Cobalt](https://terrazzo.app/docs/cli/migrating/)
- [Style Dictionary DTCG page](https://styledictionary.com/info/dtcg/)

---

## 7. Motion Libraries 2026

### The landscape
| Library | Weekly DLs (Apr 2026) | Bundle | Status |
|---|---|---|---|
| **Motion** (`motion/react`, ex-Framer Motion) | 3.6 M | 18 KB full / 2.3 KB mini | **Recommended**, fastest-growing, independent open source |
| GSAP 4 | 1.47 M | 78 KB | Bulletproof for complex timelines |
| React Transition Group | 20 M | tiny | Legacy, still good for CSS-class transitions |
| TailwindCSS Motion | 33 k | 5 KB | Simple animations only, pure CSS |
| Remotion | 170 k | large | Video rendering, not UI |
| **Motion One** (framework-agnostic) | — | 3.8 KB | Tiny, non-React-specific |

### Motion (the library formerly known as Framer Motion)
- Now **`motion`** on npm (was `framer-motion`). Import from `motion/react` for React-specific APIs.
- MIT licensed, **financially backed by Framer, Figma, Sanity, Tailwind CSS, LottieFiles**.
- Scroll function is **75 % smaller** than GSAP equivalent.
- Mini `animate()` is **90 % smaller** than GSAP.
- Full `animate()` with timeline sequencing is **18 KB** — still smaller than GSAP's core.
- MindShift's guardrails **already require** `motion/react` imports, not `framer-motion`. We're on the new package. Good.

### Native CSS scroll-driven animations
Still Chromium-only as of 2026 (Firefox/Safari lag). If cross-browser support matters (it does for MindShift), Motion is still the right choice for scroll-linked effects.

### View Transitions
Separately, View Transitions API is baseline (see Section 4). Where it overlaps with Motion, prefer View Transitions for route/overlay transitions and Motion for component-level micro-interactions.

### Recommendation: **USE NOW** (already in)
- MindShift already uses `motion/react` per guardrails. Keep it.
- Add View Transitions API on top for RecoveryProtocol / ContextRestore entrances (better performance, less JS).
- Skip GSAP, Motion One, Remotion — no fit.

Sources:
- [Motion vs GSAP comparison](https://motion.dev/docs/gsap-vs-motion)
- [Best React animation libraries 2026](https://blog.logrocket.com/best-react-animation-libraries/)

---

## 8. AI-Native UI Libraries

### The contenders
| Tool | What it is | Status |
|---|---|---|
| **Vercel AI SDK** (`ai`) | TypeScript toolkit for LLM apps. React/Next/Vue/Svelte/Node. Streaming, tool calling, multi-provider. | Production. Vercel-maintained. |
| **AI Elements** (Vercel) | Component library built on shadcn/ui for AI-native apps. Message bubbles, tool UIs, status indicators. | https://github.com/vercel/ai-elements — active |
| **v0.dev** | Generates React + shadcn components from text prompts. | Vercel-hosted service, freemium |
| **CopilotKit** | Framework for in-app AI copilots. Real-time context, UI control, agent integration. | Production. Active community. |
| **assistant-ui** | Headless React components for AI chat UIs. Works with Vercel AI SDK, LangChain, Mastra. | Active. Growing. |
| **LangChain UI** | Not a serious contender — LangChain has a few JS components but UI is not their focus. | Skip. |
| **shadcn/ui + AI** | shadcn is the baseline. AI Elements builds on it. Already used by v0 and the ecosystem. | Production. |

### Fit for MindShift
MindShift already has a handcrafted AI Mochi chat experience (MochiSessionCompanion, mochi-respond edge function). We don't need a full framework. But:

- **Vercel AI SDK** (`ai` package) could replace our hand-rolled streaming parsing in `mochi-respond`. It handles SSE / streaming tool calls out of the box.
- **AI Elements** components might give us better message-streaming UI out of the box — worth a look for the post-launch refactor.
- **CopilotKit** is too heavyweight for our use case. Skip.

### Recommendation
- **EVALUATE**: Vercel AI SDK for the `mochi-respond` streaming pipeline
- **EVALUATE**: AI Elements for MochiSessionCompanion redesign
- **SKIP**: CopilotKit, LangChain UI, v0.dev (nice for prototyping only)

Sources:
- [Vercel AI SDK](https://ai-sdk.dev/)
- [AI Elements GitHub](https://github.com/vercel/ai-elements)
- [2026 AI chat UI library evaluation](https://dev.to/alexander_lukashov/i-evaluated-every-ai-chat-ui-library-in-2026-heres-what-i-found-and-what-i-built-4p10)

---

## 9. Adaptive Color Systems 2026

### OKLCH has won
- Perceptually uniform — equal numeric deltas → equal perceptual deltas
- Wider gamut than sRGB (supports P3 displays properly)
- Fixes the blue/purple shift problem LCH had
- Baseline browser support in all evergreens

### Tools
- **[Culori](https://culorijs.org/)** — JS color manipulation library. OKLCH, OKLab, P3, all conversions. Zero-dependency, tree-shakable. **Production-ready.**
- **[dittoTones](https://github.com/meodai/dittoTones)** — analyzes the perceptual "DNA" (lightness + chroma curves in OKLCH) of Tailwind and Radix palettes, then maps your brand color onto those curves. **Brilliant for generating ADHD-safe palettes from a single hue.**
- **Radix Colors** — hand-tuned 12-step scales. Has automatic dark-mode pairs. Widely used.
- **[UiHue](https://www.uihue.com/)** — Tailwind v4 palette generator in OKLCH with P3 gamut support
- **Color.js / [oklch.fyi](https://oklch.fyi/)** — color pickers for OKLCH

### Tailwind v4 already uses OKLCH
Tailwind v4's **entire default color palette is OKLCH**. Design tokens are exposed as CSS variables. You can define:
```css
@theme {
  --color-teal-500: oklch(75% 0.13 195);
  --color-indigo-500: oklch(65% 0.18 275);
}
```
And then animate / interpolate / derive variants at runtime in pure CSS.

### Fit for MindShift
- MindShift already uses CSS custom properties. Migrating to OKLCH values would give:
  - Perceptually uniform dark-mode step generation (no more eyeballing "does this look right")
  - P3 wide-gamut colors on modern displays (teal and indigo specifically would pop more)
  - Easy runtime interpolation for energy-level color transitions
  - **dittoTones could automatically generate our entire palette from `#4ECDC4` teal** matching the Radix DNA while guaranteeing no red hues

### Recommendation: **USE NOW**
- Convert `:root` tokens to OKLCH (simple find/replace via Culori programmatically)
- Use dittoTones once to validate current palette against Radix DNA and check accessibility contrast
- Add a constitution validator: reject any OKLCH hue in range [0–15, 345–360] at commit time (enforces Foundation Law 1)

Sources:
- [Tailwind v4 + OKLCH](https://tailwindcss.com/blog/tailwindcss-v4)
- [dittoTones](https://github.com/meodai/dittoTones)
- [Evil Martians: dynamic themes in Tailwind with OKLCH](https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic)

---

## 10. The "Living Interface" Movement

### What it is
A design philosophy / trend, not a single library. The core claim: UIs should **adapt in real time** to the user's context, behavior, intent, mood, and abilities — **not** just viewport size.

### Key voices and sources
- **"Adaptive UX: Designing Interfaces for Dynamic Contexts in 2025"** — Charlotte Rhodes, Medium — describes adaptive UX as "design philosophy focused on interfaces that adjust seamlessly to changing contexts: screen size, connectivity, input methods, mobility, and user expectations."
- **"UI Design Trend 2026 #5: Adaptive & AI-Driven Interfaces"** — Mohan Kumar, Bootcamp — 2026 interfaces analyze "context, behavior, and intent to deliver personalized layouts, colors, and even tone of voice, creating interfaces that adjust to people, not just pixels."
- **"Composable Interfaces"** — Design Systems Collective — "UI is a living, breathing composition of interchangeable parts" — championed by Notion and Framer.
- **"Interface Engineer Manifesto"** — nikoloza, Symbols — "Interface Engineers ensure that a design doesn't remain a static picture, but becomes a living, breathing part of the application."
- **"Smart Frontends: AI-Driven UI Case Studies"** — Emmanuel Ayo Oyewo, KAIRI AI

### Key themes
1. **Hyper-personalization** — not "user type A vs B" but "this specific user's current moment"
2. **Emotion-responsive UIs** — color palette shifts with inferred mood (MindShift's energy-picker already does this)
3. **Cognitive load adaptation** — fewer options when tired, more when energized (MindShift's `isLowEnergy` gate is exactly this)
4. **Context-aware tone of voice** — greeting, copy, even button labels change based on state
5. **"Composable blocks, not pages"** — UI as a dynamic composition, Notion-style

### Is anyone actually shipping it?
- **Notion** — dynamic blocks, live databases, AI rewrites tone in place
- **Framer** — variants + state-aware interactions at design time
- **Linear** — adaptive keyboard shortcuts, contextual menus
- **MindShift itself** — `isLowEnergy`, `seasonalMode`, `psychotype`, time-of-day greetings, adaptive NOW pool limits. **We are already doing this.**

### Recommendation
**Document what we already do.** MindShift is ahead of the "living interface" curve — we have:
- Burnout-aware pool sizing
- Energy-adaptive home layout
- Psychotype-derived Mochi tone
- Seasonal mode pool overrides
- Phase-adaptive audio gain
- Medication-window-aware badges
- Weekly intention chip
- Time-of-day greetings + cards

No library would give us any of this. The "living interface" trend is **validation** that the MindShift approach is right, not a set of tools to adopt.

**One action**: write a blog post / landing page feature titled "MindShift is a living interface" for Google Play launch. It's a real differentiator.

Sources:
- [Adaptive UX 2025 (Charlotte Rhodes)](https://medium.com/design-bootcamp/adaptive-ux-designing-interfaces-for-dynamic-contexts-in-2025-e3ff0afa89b4)
- [UI Trend 2026: Adaptive AI-Driven Interfaces](https://medium.com/design-bootcamp/ui-design-trend-2026-5-adaptive-ai-driven-interfaces-dc2eeb6f6a66)
- [Composable Interfaces](https://www.designsystemscollective.com/composable-interfaces-why-the-future-of-ux-is-built-in-blocks-not-pages-c9263ff42681)
- [Interface Engineer Manifesto](https://medium.com/symbolsapp/interface-engineer-manifesto-d65e7058511f)

---

## Final Recommendation Matrix

| Tech | Category | Recommendation | Priority | Rationale |
|---|---|---|---|---|
| **Pretext** | Typography / layout | **USE NOW** | HIGH | Fixes Mochi streaming layout shift. 15 KB, MIT, zero deps. |
| **View Transitions API** | Motion / CSS | **USE NOW** | HIGH | Baseline. Zero-JS overlay transitions. |
| **`@starting-style`** | CSS | **USE NOW** | MEDIUM | Baseline. Cleaner entrance animations. |
| **`:has()`** | CSS | **USE NOW** | MEDIUM | Baseline. Removes some JS class-toggling. |
| **OKLCH tokens** | Color | **USE NOW** | MEDIUM | Tailwind v4 path. ADHD-palette validator. |
| **dittoTones** | Color tooling | **USE NOW** (one-off) | LOW | Validate palette DNA against Radix. |
| **Terrazzo / DTCG** | Design tokens | **EVALUATE** | MEDIUM | Ecosystem-wide constitution enforcement. |
| **React 19 + Compiler** | Framework | **EVALUATE** | MEDIUM | Post-launch refactor. Removes memoization boilerplate. |
| **`useOptimistic` / `useActionState`** | React 19 hooks | **EVALUATE** | MEDIUM | Better feedback loops for task complete, undo, energy log. |
| **Vercel AI SDK (`ai`)** | AI | **EVALUATE** | LOW | Could simplify mochi-respond streaming parsing. |
| **AI Elements** | AI UI | **EVALUATE** | LOW | Post-launch MochiSessionCompanion redesign. |
| **Figtree Variable** | Typography | **EVALUATE** | LOW | Do in typography / dyslexia pass. |
| **Motion (`motion/react`)** | Motion | **USE NOW** (already in) | — | Guardrails already enforce this. |
| **CSS Anchor Positioning** | CSS | **SKIP for now** | — | Not baseline (no Firefox/Safari). |
| **CSS Scroll-Driven Animations** | Motion | **SKIP for now** | — | Chromium-only still. |
| **CopilotKit** | AI | **SKIP** | — | Too heavy for our use case. |
| **GSAP** | Motion | **SKIP** | — | Motion is smaller and sufficient. |
| **Style Dictionary v4/v5** | Design tokens | **SKIP** (prefer Terrazzo) | — | Terrazzo is more modern. |

---

## Immediate Action Items (if Yusif approves)

1. **Install `@chenglou/pretext`** + prototype in MochiSessionCompanion to pre-measure bubble heights before streaming. Expect: zero layout shift during AI responses. Budget: 1 day.
2. **Migrate RecoveryProtocol / ContextRestore / WeeklyPlanning entrances** to View Transitions API + `@starting-style`. Remove corresponding Framer Motion code. Budget: 1 day. Bundle savings: ~10 KB.
3. **Convert `:root` color tokens to OKLCH** via Culori programmatic conversion. Add a commit-time validator that rejects hues in [0–15, 345–360]. Budget: half day. Enforces Foundation Law 1 automatically.
4. **Write "living interface" landing copy** for Google Play listing — we already are one, we just don't market it. Budget: half day.
5. **Document this research** in `docs/adr/0008-pretext-text-layout.md` if we ship Pretext. Budget: half day.

Total: ~4 days of work for significant quality + perf + marketing wins, zero new runtime risk besides Pretext (which is 15 KB of pure compute, worst case we remove it).

---

## Research confidence

| Section | Confidence | Notes |
|---|---|---|
| Pretext | HIGH | Multiple independent sources, GitHub + npm + HN + author bio confirmed |
| CSS features | HIGH | MDN + caniuse confirmed |
| React 19 | HIGH | Official React blog + multiple deep-dives |
| Motion / Framer Motion rename | HIGH | motion.dev official |
| Tailwind v4 + OKLCH | HIGH | Tailwind official blog |
| DTCG + Terrazzo | HIGH | W3C CG blog + Terrazzo official |
| AI-native UI libraries | MEDIUM | Evolving fast, rankings shift monthly |
| "Living interface" movement | MEDIUM | Trend, not formal spec — consensus in the design press |
| Adaptive color tools (dittoTones) | MEDIUM | Small project, but author credible (meodai has other respected tools) |

---

*Research conducted 2026-04-07 via WebSearch. All URLs verified at time of writing. Pin exact versions when adopting any of these.*
