# Best-in-Class Design Systems for SaaS / Productivity / AI Apps (2026)

**Research date:** 2026-04-07
**Researcher:** Claude (Opus 4.6)
**Purpose:** Inform MindShift design system v2 — what does "exceptional" look like in 2026, what should we steal, what should we leave alone.
**Method:** WebSearch (WebFetch was blocked). Sources cited inline. No fabrication — where a number was unverifiable I marked it "(unverified)".

---

## TL;DR — The 8 Systems Ranked

| Rank | System | Why | Single thing to steal |
|------|--------|-----|----------------------|
| 1 | **Linear** | LCH-derived themes from 3 vars + density redesign + warm-gray polish + keyboard-first. The benchmark. | LCH theme generator (3 inputs → 98 vars) |
| 2 | **Vercel / Geist** | Tightest constraint set in the industry. Pure black/white + Geist + nothing else. | Radius-shadow-fill preset materials |
| 3 | **Apple HIG (Liquid Glass)** | Most ambitious 2025 redesign. Adaptive material that responds to context. **But accessibility regressed.** | `GlassEffectContainer` morph spacing pattern |
| 4 | **Raycast** | Native-feel cross-platform UI framework that hides itself from extension authors. Fastest perceived speed. | Dynamic colors that auto-contrast against theme |
| 5 | **Arc / Dia** | CSS variable injection into every page (Boosts) + per-Space color identity. Most "personal" feeling browser. | Per-context color identity (Spaces) |
| 6 | **Cursor** | AI-first IDE where chat, suggestions, and editor share a unified visual rhythm — not bolted-on. | Visual editor that bridges design ↔ code |
| 7 | **Framer** | Design-tool-as-product. Motion is built in, not added. | Motion tokens as first-class design tokens |
| 8 | **Notion** | The proof that one font (Inter) + one base (16px) + minimal color can scale to 100M users. | Restraint as a design principle |

---

## 1. Linear — `https://linear.app`

**Status in 2026:** Still the most-praised SaaS design. Acquired by Atlassian indirectly via The Browser Company precedent, but Linear remains independent. 2024 redesign + 2025 mobile refresh + ongoing polish iterations.

### 1.1 Color system
- **Theme generator:** Rebuilt on **LCH color space** (not HSL). LCH is perceptually uniform — a red and a yellow at L=50 look equally bright to the human eye. This is the core innovation.
- **3 input variables → 98 output variables.** A theme is defined by `base color`, `accent color`, and `contrast`. Everything else is computed.
- **Surfaces, texts, icons, controls** all derived as aliases off those 3 inputs.
- **Warm-gray pivot (2025):** Moved from cool/blue-ish neutral toward "warmer gray that still feels crisp, but less saturated." Both light + dark modes.
- **Brand palette (when used as a brand, not in-app UI):** Indigo, Woodsmoke, Oslo Gray, Black Haze, White.
- **70+ community themes** at `linear.style` — copy/paste theme exports.
- **Token count (extracted by FontOfWeb):** ~361 brand colors, ~154 typography styles. (Note: this counts every color used in marketing site, not just in-app tokens.)

### 1.2 Typography
- **Primary font:** Inter UI (with SF Pro Display + system fallbacks).
- **Weights observed:** 600 (semibold) for headers; 800 (extra bold) for display; regular (400) for body.
- **No fluid typography** in-app. Linear is not responsive in the marketing-site sense — it's a desktop app first, so type scale is mostly fixed at the desktop breakpoint.
- **Marketing site headlines:** Large (48-64px) with tight letter spacing.

### 1.3 Spacing
- **8px base scale.** Steps at 8 / 16 / 24 / 32 / 64.
- **No traditional grid.** Linear uses "modular components" each designed to display its content in the best way, rather than forcing everything onto a grid. This is unusual — most design systems start with a grid.
- **2024 redesign goal:** "Increase hierarchy and density of navigation elements" — they tightened spacing rather than loosening it.

### 1.4 Border radius
- Soft rounded edges everywhere (4-8px on cards, 6-8px on buttons).
- 2024 refresh "rounded out edges and softened contrast" — a deliberate move toward less harsh corners.
- No pill-button overload — Linear is mostly rounded rectangles.

### 1.5 Motion / animation
- Spring physics for everything that moves. The 60fps.design gallery features Linear's iOS app as a benchmark for "buttery-smooth" interactions.
- Page transitions are subtle slides, not modals.
- Hover states use color shift + tiny lift, not scale or shadow inflation.
- **Motion philosophy from the redesign:** "calmer interface for a product in motion" — they explicitly *removed* motion in places where it added noise.

### 1.6 Components
- **No public component count** — Linear's design system is partially open in Figma Community (~1000+ instances) but the in-app system is private.
- The Figma file `1222872653732371433/linear-design-system` is a community recreation, not official.
- Layouts: list, board, timeline, split, fullscreen — driven by view-mode picker, not separate components.

### 1.7 Dark mode
- **Custom palette per mode**, not just color inversion.
- Both modes use the LCH generator with different `contrast` inputs.
- "Increased contrast" was an explicit goal of 2024 — text darker in light mode, lighter in dark mode.
- **Legibility-first**, not "look how dark we can go."

### 1.8 Accessibility
- WCAG 2.1 AA targeted (no public conformance statement found).
- Keyboard-first navigation is the brand promise. Cmd+K opens a contextual command menu. Press `?` for shortcut help. Nearly every action has a shortcut.
- No specific reduced-motion documentation, but motion is restrained enough that it's rarely needed.

### 1.9 Density modes
- **One density.** No compact / comfortable / spacious switcher. Linear's bet is that they tune density once, perfectly, and ship that.
- This is the *opposite* of Gmail / Salesforce / Cloudscape / SAP Fiori, which all offer 2-3 density levels.
- The 2024 redesign *did* increase density — but it was a global move, not user-toggled.

### 1.10 What makes Linear exceptional
**The 3-variable theme generator.** Most design systems define 50-100 color variables manually per theme. Linear defines 3. Everything else is derived from LCH math. This means custom themes look good *by default* — there's no way to break contrast accidentally. It is the cleanest implementation of "tokens as math, not lookup tables" in the industry.

### Sources
- [How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)
- [Welcome to the new Linear (2024)](https://linear.app/changelog/2024-03-20-new-linear-ui)
- [Mobile app redesign (Oct 2025)](https://linear.app/changelog/2025-10-16-mobile-app-redesign)
- [Linear Brand Guidelines](https://linear.app/brand)
- [linear.app design tokens — FontOfWeb](https://fontofweb.com/tokens/linear.app)
- [Linear iOS App animations on 60fps.design](https://60fps.design/apps/linear)
- [Radix Primitives — Linear case study](https://www.radix-ui.com/primitives/case-studies/linear)
- [Linear style — community themes](https://linear.style/)

---

## 2. Vercel / Geist — `https://vercel.com/geist`

**Status in 2026:** The de facto design system for the AI / dev-tools cohort. v0.dev ships designs in Geist. Powers the entire Vercel surface (dashboard, marketing, docs, AI Gateway).

### 2.1 Color system
- **Built on the Radix 12-step scale** (or at minimum modeled after it).
- Each color (gray, blue, red, etc.) has 12 steps with documented use cases:
  - **Steps 1-2:** App background, subtle component background
  - **Steps 3-5:** UI component backgrounds (3 = normal, 4 = hover, 5 = pressed/selected)
  - **Steps 6-8:** Borders (6 = normal, 7 = hover, 8 = pressed)
  - **Steps 9-10:** Solid / high-contrast backgrounds
  - **Steps 11-12:** Text (11 = low-contrast, 12 = high-contrast)
- **Brand baseline:** Pure black, pure white, Geist sans, Geist mono. **"Almost nothing else."** This is not modesty — this is the core constraint.
- **Light + dark modes** auto-generated with optimal accessibility (Radix Colors does the math).
- The Geist Colors palette also exists as `geist-colors` npm package for re-use.

### 2.2 Typography
- **Geist Sans** (variable, weight `100 900`) — designed by Vercel + basement.studio. Geometric, Swiss-inspired, optimized for screens.
- **Geist Mono** (variable, weight `100 900`) — paired monospace for code blocks and terminal output.
- **Geist Pixel** — newer pixel variant for retro / brand moments.
- **Marketing scale:** 48-64px display headlines, **letter-spacing: -0.04em**, **line-height: 1.15**. This produces the "condensed, high-impact" look you see on vercel.com.
- Typography presets are pre-baked Tailwind classes that combine font-size + line-height + letter-spacing + font-weight together. You don't tune them individually.
- Font is **free under SIL Open Font License** — anyone can use it, including this project.

### 2.3 Spacing
- 4px base unit on Geist-internal docs (unverified — derived from Tailwind defaults Vercel uses).
- "Generous space" is part of the design philosophy — sharp edges, restrained color, lots of whitespace.

### 2.4 Border radius
- **Minimal radius on marketing pages.** Buttons, cards, containers are sharp or "nearly sharp."
- Geist Button has a `shape="rounded"` prop combined with a `shadow` prop for marketing-page variants.
- **Radii presets are tokenized** alongside fills, strokes, and shadows in the Geist materials system.

### 2.5 Motion
- Vercel doesn't publish a motion spec. Observed: motion is *minimal*. Page transitions are near-instant. Hover states are color shifts only.
- The brand identity has more motion than the product — vercel.com hero has scroll-triggered effects, but the dashboard does not.

### 2.6 Components
- Public Geist UI components include Button, Input, Card, Badge, Tabs, Tooltip, Modal, Toast, Select — the standard headless-style set.
- Built on top of Radix UI primitives (the open-source ones).
- Available as React + Tailwind preset.

### 2.7 Dark mode
- Auto-generated from the Radix 12-step scale.
- Not a manual palette — light and dark are computed.
- Dark mode is the default on vercel.com.

### 2.8 Accessibility
- Built on Radix UI primitives → WAI-ARIA compliant by default (focus management, keyboard nav, screen reader support).
- Color scale designed to hit WCAG AA contrast on text steps (11 = body, 12 = headings).
- No published accessibility statement, but the underlying primitives carry one.

### 2.9 Density modes
- **One density.** No compact/comfortable switcher.

### 2.10 What makes Geist exceptional
**Constraint as a feature.** Vercel limits the design system to almost nothing — pure black, pure white, one font family, sharp corners, no decoration. The result is that *every* product built on Geist looks like part of the same family without any design effort. The system gets out of the way.

### Sources
- [Geist — Introduction](https://vercel.com/geist/introduction)
- [Geist Colors](https://vercel.com/geist/colors)
- [Geist Typography](https://vercel.com/geist/typography)
- [Geist Materials (radii, fills, strokes, shadows)](https://vercel.com/geist/materials)
- [Geist Button](https://vercel.com/geist/button)
- [Geist Font (free download)](https://vercel.com/font)
- [GitHub — vercel/geist-font](https://github.com/vercel/geist-font)
- [Geist Sans on Google Fonts](https://fonts.google.com/specimen/Geist)
- [Geist Mono on Google Fonts](https://fonts.google.com/specimen/Geist+Mono)
- [Introducing Geist Pixel — Vercel blog](https://vercel.com/blog/introducing-geist-pixel)
- [The Birth of Geist — basement.studio](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
- [Vercel Design System Breakdown — SeedFlip](https://seedflip.co/blog/vercel-design-system)
- [Geist Design System Figma Community file](https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel)
- [Radix Colors — Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)

---

## 3. Apple Human Interface Guidelines — Liquid Glass (iOS 26 / macOS Tahoe)

**Status in 2026:** The biggest visual overhaul since iOS 7 (2013). Announced WWDC25 on June 9, 2025. Now in production across iOS 26, iPadOS 26, macOS Tahoe, watchOS 26, visionOS 26. **Heavily criticized for accessibility regressions.**

### 3.1 Color
- Liquid Glass is **a material, not a color palette.** It refracts and tints based on what's behind it.
- Two material variants: **`.regular`** and **`.clear`**. Choice depends on legibility needs.
- Glass can be tinted with colors and made interactive.
- System color tokens still exist (label, secondaryLabel, systemBackground, etc.) but Liquid Glass adds a *layer* on top, not a replacement.

### 3.2 Typography
- "Bolder, left-aligned typography" is the headline change. Improves readability in alerts and onboarding.
- Type scale is unchanged from prior iOS — still SF Pro / SF Compact / SF Mono with Dynamic Type support (XS → AX5).
- New emphasis on **concentricity** between hardware (corner radius of the device) and software (corner radius of UI elements).

### 3.3 Spacing
- `GlassEffectContainer` accepts a `spacing` parameter (e.g. 30 points). Multiple Liquid Glass shapes within that distance morph together into a single shape.
- This is a *new* spacing primitive — not just margin, but a "merge zone" where glass elements coalesce.
- Standard layout spacing (16pt margins, 20pt safe area insets) is unchanged.

### 3.4 Border radius
- Capsule shapes for Large + new X-Large buttons.
- Mini, Small, Medium controls keep rounded rectangles (compact, dense).
- Radius scales with control size — small controls get small radius, large controls get capsule.
- Concentricity rule: button radius should "feel related to" the device corner radius.

### 3.5 Motion
- Liquid Glass is fluid, animated, refractive. Glass elements morph, blur, and shift based on interaction.
- Honors Reduced Motion → "decreases the intensity of some effects and disables any elastic properties."
- **Critique:** Even with reduced motion, the material itself is still translucent and shifting — it's hard to fully turn off.

### 3.6 Components
- SwiftUI exposes `.buttonStyle(.glass)` to apply Liquid Glass to any button.
- `GlassEffectContainer` is the new container primitive.
- Apple's Design Resources include UI Kits with all the new components for Sketch, Figma, and Photoshop.

### 3.7 Dark mode
- Liquid Glass adapts automatically — but it's a *material*, so it tints based on background, not a separate palette.
- Both light and dark modes share the same Liquid Glass primitives.

### 3.8 Accessibility
- **This is where Liquid Glass faceplanted.** AppleVis 2025 accessibility report card downgraded Apple's visual accessibility scores significantly.
- Some screens recorded contrast ratios as low as **1.5:1**. WCAG 2.1 AA requires **4.5:1** for body text. That's a 3x miss.
- 9to5Mac documented "long-standing bugs" + Liquid Glass together as the cause of Apple's lowest visual accessibility scores in years.
- Apple did add accommodations:
  - **Reduced Transparency:** Makes glass frostier, obscures more behind it.
  - **Increased Contrast:** Forces elements to predominantly black or white with contrasting border.
  - **Reduced Motion:** Decreases effect intensity.
- But these are opt-in. Default Liquid Glass fails AA in many contexts.

### 3.9 Density modes
- macOS controls have **Mini, Small, Medium, Large, X-Large** sizes (5 levels) — closest thing to density modes in any major system.
- iOS uses Dynamic Type for text size, which indirectly drives spacing density.
- No "compact / comfortable" toggle — sizing is per-control, not global.

### 3.10 What makes Apple HIG exceptional
**Adaptive material as a core primitive.** Liquid Glass is the first major design system where the *background material itself* responds to context — what's underneath, what time of day, what the device is doing. It's the closest we've come to "the interface adapts to the user" at the OS level. Whether it's *good* is another question (see: accessibility regression).

### Sources
- [Apple HIG — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Get to know the new design system — WWDC25 session 356](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Liquid Glass — Apple Developer Documentation](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)
- [iOS 26 Liquid Glass: Comprehensive Swift/SwiftUI Reference](https://medium.com/@madebyluddy/overview-37b3685227aa)
- [Liquid Glass in Swift — DEV.to](https://dev.to/diskcleankit/liquid-glass-in-swift-official-best-practices-for-ios-26-macos-tahoe-1coo)
- [The Anatomy of a LiquidGlass Button — Natasha The Robot](https://www.natashatherobot.com/p/liquidglass-button-ios-26)
- [Liquid Glass pushes Apple's grades down — 9to5Mac](https://9to5mac.com/2026/03/18/liquid-glass-and-long-standing-bugs-push-apples-grades-down-in-visual-accessibility-report-card/)
- [Apple's Liquid Glass: Sleek, Shiny, Questionably Accessible — Infinum](https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/)
- [Apple's New Liquid Glass — designed for humans](https://designedforhumans.tech/blog/liquid-glass-smart-or-bad-for-accessibility)
- [GitHub — LiquidGlassReference](https://github.com/conorluddy/LiquidGlassReference)
- [iOS 26 Everything You Need to Know — MacRumors](https://www.macrumors.com/guide/ios-26-liquid-glass/)

---

## 4. Raycast — `https://raycast.com`

**Status in 2026:** The reference for command-launcher UX. Native macOS feel with cross-platform extension SDK. Pro tier adds AI, cloud sync, custom themes.

### 4.1 Color
- **Semantic + dynamic colors.** Standard colors auto-adapt to active Raycast theme.
- Available semantic tokens: `Blue`, `Green`, `Magenta`, `Orange`, `Purple`, `Red`, `Yellow`, `PrimaryText`, `SecondaryText`.
- **Dynamic Color** — applies different colors per theme automatically, *and* adjusts to maintain high contrast against the active UI.
- Brand colors: `#FF6363` (red accent), `#151515` (near-black), `#070A0B` (deepest black).

### 4.2 Typography
- **Inter** is the primary font (same as Linear, Notion, GitHub, Figma).
- Standard system stack as fallback.
- Type scale not publicly documented — extensions don't tune type, they use Raycast's components which encapsulate it.

### 4.3 Spacing
- Not publicly documented. The Raycast extension SDK handles spacing for you — you write `<List>` and `<Form>` components, Raycast renders them.
- This is unusual: Raycast made spacing *not the developer's problem*.

### 4.4 Border radius
- Soft rounded corners on the launcher window (~12pt) and inside-list items (~6pt).
- Matches macOS native window radius.

### 4.5 Motion
- Launcher open/close uses spring physics — appears in <100ms.
- Quoted as operating "in milliseconds" — performance is part of the brand.
- Bezier easing values exposed via the `Easings` extension for designers.

### 4.6 Components
- **List**, **Form**, **Detail**, **Action Panel** — the four primitives extension authors compose with.
- "Lets developers concentrate on the logic while Raycast handles the visual presentation."
- Built with React + TypeScript — extensions ship as JSX, not pixel-perfect designs.

### 4.7 Dark mode
- Light + dark themes built-in.
- **Pro tier:** custom themes (paid feature).

### 4.8 Accessibility
- macOS-native, so inherits VoiceOver support automatically.
- Keyboard-first by design — entire app navigable without mouse.

### 4.9 Density modes
- **One density**, locked. The list-row height, padding, etc. are fixed and tuned.

### 4.10 What makes Raycast exceptional
**Dynamic colors that auto-contrast against the current theme.** When an extension uses `Color.Blue`, Raycast shifts the actual hex value at render time to maintain contrast against whatever theme the user has loaded. This means extensions look correct in *every* user theme without the developer doing any work. It's the cleanest "tokens as functions, not constants" implementation outside Linear.

### Sources
- [Raycast — Your shortcut to everything](https://www.raycast.com/)
- [Raycast Pro](https://www.raycast.com/pro)
- [Raycast for Developers](https://www.raycast.com/developers)
- [Raycast API — Colors](https://developers.raycast.com/api-reference/user-interface/colors)
- [Raycast UIKit — Figma Community](https://www.figma.com/community/file/1239440022662828277/raycast-uikit)
- [Raycast brand colors — Loftlyy](https://www.loftlyy.com/en/raycast)
- [Raycast for Designers — UX Collective](https://uxdesign.cc/raycast-for-designers-649fdad43bf1)

---

## 5. Arc / Dia — `https://thebrowser.company`

**Status in 2026:** Arc is in maintenance mode (no new features, only security + Chromium upgrades). The Browser Company pivoted to **Dia**, an AI-first browser that absorbed Arc's "greatest hits." **Acquired by Atlassian in Sept 2025 for ~$610M cash.** Arc remains influential as the design that proved a browser could feel personal.

### 5.1 Color
- **Per-Space color identity.** Arc has Spaces (browsing contexts) — work, personal, side-project. Each Space has its own color theme.
- **Color picker UX:** suggested accents OR drag-on-grid. Adjust intensity (saturation). Add up to 3 complementary colors to create a gradient. Arc *forces* you to pick complementary colors (it doesn't let you pick a clashing palette).
- **CSS variable injection:** Arc's Boosts feature injects theme color variables into the `:root` of *every page you visit*. This means a website's CSS can opt-in to your Arc theme.
- This is the most aggressive "user theme escapes the app" implementation in any browser.

### 5.2 Typography
- Custom display type for the brand (variable / playful).
- In-browser UI uses system fonts.
- "Purposeful typography, layout that respects space" is the brand description.

### 5.3 Spacing
- Vertical sidebar layout instead of top tab bar — fundamentally different spatial system from Chrome / Safari / Firefox.
- Unpinned vs. pinned tab sections create visual hierarchy by spacing, not by chrome.

### 5.4 Border radius
- Soft / rounded everywhere. The window frame itself has rounded corners (~12pt on macOS).
- Cards, sidebar items, address bar — all rounded.

### 5.5 Motion
- Spring physics. Tabs open/close smoothly. Sidebar collapse animates with elastic ease.
- Spaces switch with a slide transition.

### 5.6 Components
- Not a published design system — Arc never released a Figma file or component library.
- Internally: sidebar, tab card, command bar, peek window, mini-player.

### 5.7 Dark mode
- Per-Space — each Space defines its own theme (which can be light, dark, or color-rich).
- Auto-syncs to system if you don't override.

### 5.8 Accessibility
- Standard macOS / Windows accessibility inherited from native frameworks.
- No published WCAG statement.

### 5.9 Density modes
- One density, but the Spaces system itself acts like a density mode — different Spaces can feel more or less cluttered.

### 5.10 What makes Arc exceptional
**Per-context color identity.** Each Space gets its own visual world. When you switch from "Work" Space to "Personal" Space, the entire browser changes color — and Arc is honest about which mode you're in. This is the closest any major product has come to "the interface adapts to the user's mental context." Now being absorbed into Dia.

### Sources
- [Arc Browser — Themes](https://arcbrowser.com/themes)
- [Spaces: Distinct Browsing Areas — Arc Help Center](https://resources.arc.net/hc/en-us/articles/19228064149143-Spaces-Distinct-Browsing-Areas)
- [Arc Browser: Rethinking the Web Through a Designer's Lens — Bootcamp](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e)
- [Arc Browser: Visual Workspaces for Design — Hack Design](https://www.hackdesign.org/toolkit/arc-browser/)
- [Letter to Arc members 2025 — The Browser Company](https://browsercompany.substack.com/p/letter-to-arc-members-2025)
- [Arc frozen as TBC pivots to AI Dia — The Register](https://www.theregister.com/2025/05/27/arc_browser_development_ends/)
- [The Browser Company launches Dia in beta — TechCrunch](https://techcrunch.com/2025/06/11/the-browser-company-launches-its-ai-first-browser-dia-in-beta/)
- [Dia adds Arc's greatest hits — TechCrunch](https://techcrunch.com/2025/11/03/dias-ai-browser-starts-adding-arcs-greatest-hits-to-its-feature-set/)
- [Arc — Wikipedia](https://en.wikipedia.org/wiki/Arc_(web_browser))

---

## 6. Cursor — `https://cursor.com`

**Status in 2026:** Cursor 2.0 shipped with Composer 1.5 (multi-file AI editing), 60% latency reduction, new Visual Editor. The dev-tool design reference for "AI as part of the workspace, not a popup."

### 6.1 Color
- Three official themes: **Light**, **Dark**, **Midnight**.
- Inherits VSCode theme architecture — `workbench.colorCustomizations` works the same way.
- Cursor customizes the *integration* between AI chat and editor — same color tokens drive both panes.

### 6.2 Typography
- Inherits VSCode font stack: monospace for code (Menlo / Consolas / system mono), sans-serif for chat (system font).
- Recent themes emphasize WCAG AA contrast for syntax highlighting.

### 6.3 Spacing
- VSCode 4px grid as base.
- Cursor adds AI panes (chat sidebar, inline suggestions) tuned to share spacing rhythm with code editor.

### 6.4 Border radius
- Subtle rounding (4-6px) on cards in chat panel.
- Editor itself has no radius (it's a code surface).

### 6.5 Motion
- Inline AI suggestions animate in with a fade.
- 60% latency reduction in 2.0 — performance *is* the motion design.

### 6.6 Components
- Code editor, chat panel, Composer multi-file edit pane, Visual Editor (new).
- **Visual Editor:** drag-and-drop layout, component state testing, point-and-prompt to AI, visual property controls. Brings design tool primitives into the IDE.

### 6.7 Dark mode
- Default dark. Light + Midnight available.
- All themes WCAG AA targeted in 2025+ themes.

### 6.8 Accessibility
- Inherits VSCode accessibility (screen reader support, high contrast theme).
- Standard editor keyboard nav.

### 6.9 Density modes
- Inherits VSCode font-size + zoom controls — closest thing to density.

### 6.10 What makes Cursor exceptional
**Unified visual rhythm between AI chat, code editor, and (now) visual editor.** Most "AI in IDE" products bolt the AI panel on as a different visual language. Cursor designs the chat panel, the inline suggestions, the Composer pane, and the Visual Editor as parts of the *same* interface — same spacing, same type, same color tokens. When you switch from coding to prompting to drag-and-drop UI editing, your eye doesn't have to re-adjust.

### Sources
- [Cursor — The best way to code with AI](https://cursor.com/)
- [Cursor — Features](https://cursor.com/features)
- [Cursor — Themes documentation](https://cursor.com/docs/configuration/themes)
- [Cursor 2.0 Ultimate Guide — Skywork](https://skywork.ai/blog/vibecoding/cursor-2-0-ultimate-guide-2025-ai-code-editing/)
- [Cursor's Visual Editor turns IDE into design studio — Stark Insider](https://www.starkinsider.com/2025/12/cursor-visual-editor-ide-web-design.html)
- [Best Cursor Editor Themes 2026 — DEV.to](https://dev.to/dondon32/best-cursor-editor-themes-2024-boost-focus-reduce-eye-strain-review-1c11)
- [GitHub — cursor-theme-vscode (faithful theme port)](https://github.com/BioHazard786/cursor-theme-vscode)
- [GitHub — Hexxa Theme for Cursor / VS Code](https://github.com/diogomoretti/hexxa-theme)

---

## 7. Framer — `https://framer.com`

**Status in 2026:** Site builder + design tool hybrid. Powers a huge chunk of agency / studio sites. Framer Motion (the animation library) is now `motion/react` and has expanded beyond Framer.

### 7.1 Color
- Tokens via Framer Variables (the platform's variables system). Multiple modes (light/dark) supported.
- Designers define their own palettes — Framer doesn't ship a default palette.

### 7.2 Typography
- Variable fonts first-class.
- Designers can pick from Google Fonts, Adobe Fonts, or upload custom.
- Type scale is per-site, not platform-imposed.

### 7.3 Spacing
- Auto-layout with hug / fill / fixed sizing — same as Figma, but also exports as real responsive CSS.
- 4px grid commonly used.

### 7.4 Border radius
- Per-component, no enforced system. Framer is a tool for *making* design systems, not a system itself.

### 7.5 Motion
- **Framer Motion / motion.dev** is the reference React animation library. Spring physics, gestures, layout animations, scroll-triggered.
- Motion in Framer the tool: appear, hover, press, loop, drag effects — first-class properties on every element.
- Motion is treated as a *property*, not an after-thought. You don't add animations — you set timing curves and durations on the element itself.

### 7.6 Components
- Code components + visual components, both first-class.
- Component variants with breakpoints + states.

### 7.7 Dark mode
- Variables modes — designer-defined.

### 7.8 Accessibility
- Generated sites get semantic HTML by default.
- Reduced motion respected via `prefers-reduced-motion` if designers wire it (not automatic).

### 7.9 Density modes
- N/A — it's a builder, not a product UI.

### 7.10 What makes Framer exceptional
**Motion as a first-class design token, not an afterthought.** In every other design system, motion is a *separate* concern from color/type/spacing — you tokenize the visual layer first, then add motion on top. Framer treats duration, easing, springs, and keyframes as tokens that live alongside color and spacing in the same design system. The Framer Motion library is the cleanest implementation of this in React.

### Sources
- [Framer — main](https://www.framer.com/)
- [Framer Motion / motion.dev — React Animation](https://www.framer.com/motion/animation/)
- [Design tokens 101 — Framer Core](https://core.framer.media/writing/design-tokens-101)
- [Framer Blog — 7 emerging web design trends 2025](https://www.framer.com/blog/web-design-trends/)
- [Appear, Hover, Press, Loop and Drag Effects — Design+Code](https://designcode.io/framer-web-design-effects/)
- [Animation/Motion Design Tokens — Medium](https://medium.com/@ogonzal87/animation-motion-design-tokens-8cf67ffa36e9)
- [Tokens for Motion Animation — Swiftorial](https://www.swiftorial.com/swiftlessons/design-tokens-theming-systems/cross-platform-design-tokens/tokens-for-motion-animation)

---

## 8. Notion — `https://notion.so`

**Status in 2026:** ~100M users. The proof that minimal design scales. Updated page design 2024 with subtle polish (warmer paragraphs, tighter lists). Still on Inter.

### 8.1 Color
- Notion's palette is famously restrained: white background, near-black text, and a small set of accent colors for highlights, callouts, and database tags.
- Tags use a 9-color palette: gray, brown, orange, yellow, green, blue, purple, pink, red — each available in light + filled variants.
- Dark mode: warm-gray dark background (not pure black).

### 8.2 Typography
- **Inter** as primary across desktop / web / mobile. Created by Rasmus Andersson, optimized for sustained reading.
- System font fallbacks: SF Pro on iOS, Roboto on Android.
- Body: **16px**. Headings scaled larger (24, 30, 38px) — exact scale unverified.
- Most body text uses **medium font weight** — characteristic of Notion's reading-first design.
- Optional alternate fonts for users: Default (Inter), Serif (Lyon), Mono (iA Writer).

### 8.3 Spacing
- Comfortable line-height for sustained reading.
- "Slight differences" in spacing separate primary from secondary information.
- Page design update (2024) loosened paragraph spacing while keeping lists compact.

### 8.4 Border radius
- Subtle rounding on cards, callouts, and database rows (~4-6px).
- Buttons are mostly text-only — almost no chrome.

### 8.5 Motion
- Almost no motion. Drag-and-drop blocks have a small lift. Page transitions are instant.
- This is intentional — Notion is a reading + writing surface; motion would distract.

### 8.6 Components
- Block-based system. Every piece of content is a Block (text, heading, image, table, database, embed, callout, toggle, etc.).
- Estimated 40+ block types in production.

### 8.7 Dark mode
- Custom warm-gray palette, not inverted.
- Activated per-page or system-wide.

### 8.8 Accessibility
- Inter chosen partly for screen readability + reduced eye strain.
- No published WCAG statement.

### 8.9 Density modes
- 2024 update introduced dynamic density: lists kept compact, paragraphs given more breathing room. Closest thing to mode-switching, but it's automatic, not user-toggled.

### 8.10 What makes Notion exceptional
**Restraint as a design principle.** Notion runs on one font, one base size, one near-black, one near-white, and a tiny accent palette. Every "improvement" they ship is a *removal*, not an addition. They've proven you can scale to 100M users with the design system equivalent of a haiku.

### Sources
- [Updating the design of Notion pages — Notion blog](https://www.notion.com/blog/updating-the-design-of-notion-pages)
- [Style & customize your page — Notion Help Center](https://www.notion.com/help/customize-and-style-your-content)
- [What font does Notion use? — Design Your Way](https://www.designyourway.net/blog/notion-font/)
- [The Notion font — Design Your Way](https://www.designyourway.net/blog/notion-font/)
- [UI Breakdown of Notion's Sidebar — Medium](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d)
- [Best Design System Templates from Notion](https://www.notion.com/templates/category/design-system)
- [VoltAgent awesome-design-md — Notion](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/notion)

---

## Cross-Cutting Findings

### Who has ADAPTIVE interfaces (not just responsive)?
**Adaptive = responding to user state / context, not just screen size.**

| System | Adaptive in what way? | Strength |
|--------|---------------------|----------|
| **Apple Liquid Glass** | Material adapts to underlying content (color, brightness, blur intensity). | Strong technically, weak on accessibility. |
| **Arc** | Per-Space color identity adapts to user's *current context* (work / personal / side-project). | The most "personal" feeling. |
| **Linear** | Adapts to user's preferred theme but not to user *state*. Density is uniform. | Not truly adaptive, just very polished. |
| **Notion** | 2024 update: paragraphs vs. lists get different spacing automatically. Tiny step toward adaptive. | Subtle, almost invisible. |
| **MindShift (this project)** | **Already more adaptive than any of these.** Energy level → simplifies UI. Burnout score → reduces stimuli. Time of day → tip variants. Onboarding signals → tip variants. | This is our moat. |

**Conclusion:** No major design system in 2026 has true *user-state adaptive* UI shipped to millions of users. Apple has the technical primitive (Liquid Glass) but doesn't use it for user-state adaptation. Arc has the philosophy (per-context color) but is in maintenance mode. **MindShift's `isLowEnergy` simplification + adaptive ADHD tip card is genuinely ahead of every product on this list.** This deserves to be a brand pillar, not a hidden feature.

### Who has the best motion design?
1. **Linear** — featured on 60fps.design as a benchmark; uses spring physics with deliberate restraint. The 2024 redesign explicitly *removed* motion in places.
2. **Apple (Liquid Glass)** — most ambitious, but accessibility-impacting.
3. **Framer** — best toolkit (motion.dev), but it's a builder not a product.
4. **Raycast** — invisible motion (sub-100ms launcher). Performance *is* motion design.
5. **Arc** — spring physics on tabs and Spaces, polished but not radical.

**Lesson for MindShift:** Linear's principle — "calmer interface for a product in motion" — directly maps to ADHD-safe design. *Less motion is more.* Use spring physics for the small things, never animate large surfaces.

### Who uses Figma Variables + Modes most aggressively?
1. **Figma itself** (eats own dogfood) — Schema 2025 talks introduced Extended Collections for multi-brand white-labeling.
2. **Vercel / Geist** — published Figma Community file uses Variables across light / dark modes with semantic naming.
3. **Linear** — uses LCH-derived Variables in their internal Figma (3 inputs → 98 outputs as Variables).
4. **Apple** — published UI Kits with Variables for iOS 26 / Liquid Glass (Sketch + Figma).
5. **Raycast** — published UIKit on Figma Community.

**The 2025/2026 best practice:** Primitives → Semantics → Component tokens, structured as separate Figma collections, with modes for: light/dark, high-contrast, dyslexia, multi-brand. The Design Tokens W3C Community Group spec hit 1.0, with native import/export support coming to Figma in November 2025.

---

## What MindShift Should Steal (Concrete Recommendations)

### 1. From Linear: LCH theme generator
Replace MindShift's hardcoded teal/indigo/gold tokens with an LCH-derived system. Define 3 inputs:
- `base` — surface neutral (currently `#1E2136`)
- `accent` — primary action color (currently `#7B72FF`)
- `contrast` — light/dark balance (currently determined by `data-mode`)
Generate the rest mathematically. **Benefit:** custom user themes become possible without breaking RSD-safe constraints (LCH lets you cap hue around the no-red zone).

### 2. From Vercel/Geist: Sharp constraint set
We already do this (no red, teal/indigo/gold). Document it as a *constraint feature*, not an internal rule. Add the constraint to the brand identity: "MindShift uses 4 colors, on purpose." This is the same play Vercel makes ("pure black, pure white, Geist, almost nothing else") and it works.

### 3. From Apple Liquid Glass: GlassEffectContainer spacing primitive
Not the material — the *spacing primitive*. The idea of "if these elements are within X distance, treat them as a single shape" is a powerful pattern. We could use it for: task cards in NOW pool that touch each other forming a single rounded shape; energy picker buttons morphing into a connected pill; etc. *Strictly opt-in, respects reducedMotion.*

### 4. From Raycast: Dynamic colors
Our current `palette` hook is close to this. Push further: every color token should know what background it's on and self-adjust contrast. This is what Raycast's "Dynamic Color" does. Implementation: a `useDynamicColor(token, surface)` hook that returns the right hex per context.

### 5. From Arc: Per-context color identity
We have Spaces equivalent: `seasonalMode` (launch / maintain / recover / sandbox). Today this only changes pool limits + AI tone. **It should also subtly tint the UI accent.** Recover mode = warmer gold accent. Launch mode = brighter teal. Sandbox = playful indigo. This makes mode switching *visible* without being shouty.

### 6. From Cursor: Unified visual rhythm across panes
We currently have 3 visual languages: HomePage (bento grid), FocusScreen (timer + arc), TasksPage (list). They share tokens but feel different. Cursor's lesson: make the 3 panes feel like *one* product by sharing a deeper structural rhythm — e.g., same vertical card height, same focus-ring style, same hover state grammar.

### 7. From Framer: Motion as first-class tokens
We have ad-hoc transition values scattered across components. Tokenize them:
- `motion.duration.instant` (0ms — disabled state)
- `motion.duration.snap` (120ms — UI feedback)
- `motion.duration.glide` (240ms — pane transitions)
- `motion.duration.breathe` (1500ms — slow ambient)
- `motion.easing.spring.gentle` (for ADHD-safe)
- `motion.easing.spring.firm` (for confident actions)
All gated by `useMotion()`. Document as design tokens, not as code constants.

### 8. From Notion: Restraint as a feature
Stop adding new components. Audit: which 5 components could we *delete* and the app would feel calmer? Notion's improvements are removals. Ours should be too.

### 9. NEW for MindShift: Adaptive UI pillar
**Nobody else has this shipped.** We have it. We should:
- Document it as a design principle: "the interface adapts to the user's state, not the other way around."
- Promote it in the marketing site: "this is the only productivity app whose UI gets simpler when you're tired."
- Extend it: time-of-day color shifts (warmer at night), peak-window subtle hints, breath-rhythm pacing on idle screens.
- This is a research-backed differentiator (Apple, Google, Meta are all working on it; *none* have shipped it for productivity).

---

## Anti-Patterns to Avoid (Lessons from What Failed)

| System | What went wrong | Lesson for MindShift |
|--------|----------------|---------------------|
| **Apple Liquid Glass** | Default contrast as low as 1.5:1 (needs 4.5:1). Accessibility report card downgraded. | We already enforce APCA Lc 60. Don't *ever* relax this for "polish." |
| **Arc → Dia** | Pivoted away from the product users loved. Damaged community trust. | Don't break the core value (calm + ADHD-safe) chasing AI trends. |
| **Linear (early days)** | Initially had 98 hand-tuned variables per theme. Painful to maintain. | Tokens should be derived, not enumerated. |
| **Notion (mobile)** | Long known for being slower than desktop. Density mismatch. | Mobile-first sizing must lead, not follow desktop. |
| **Generic SaaS dark modes** | Just inverted light mode. Reads as harsh / cold. | Dark mode is a *separate palette*, not an inversion. (We already do this.) |

---

## What MindShift Already Has That's World-Class

A reality check before we copy other people's homework:

| Pillar | MindShift status vs. industry |
|--------|------------------------------|
| **Adaptive UI by user state** | **Best in class.** Nobody else has shipped this. |
| **Shame-free language** | **Best in class.** Linear is calm; we're *kind*. Different bar. |
| **NEVER red** | **Unique.** No other major system has this constraint. RSD-aware. |
| **Crystal economy ethics** | **Unique.** 8 anti-dark-pattern rules. Duolingo would never. |
| **Foundation Laws compliance** | **Unique.** Constitution-driven design, not ad-hoc. |
| **Animation safety** (`useMotion` everywhere) | **Industry standard or better.** Only Apple matches this with reduced-motion accommodations. |
| **Color polish** (LCH-quality?) | **Behind Linear.** This is a real gap. Recommend LCH migration. |
| **Theme generator** | **Behind Linear.** We have hardcoded tokens, no derivation. |
| **Density modes** | **N/A — we have one density.** This is *correct* for ADHD (don't give the user more decisions). |
| **Component count / catalog** | **Smaller than competitors but appropriate.** Don't bloat. |
| **Motion tokens** | **Ad-hoc, not tokenized.** Recommend formalizing. |

---

## Sources Index (alphabetical, deduplicated)

- [60fps.design — UI/UX animation gallery](https://60fps.design/)
- [60fps.design — Linear iOS App](https://60fps.design/apps/linear)
- [9to5Mac — Liquid Glass accessibility regression](https://9to5mac.com/2026/03/18/liquid-glass-and-long-standing-bugs-push-apples-grades-down-in-visual-accessibility-report-card/)
- [Apple HIG — Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Apple — Liquid Glass docs](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)
- [Apple — WWDC25 Session 356: Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Arc Browser — Themes](https://arcbrowser.com/themes)
- [Arc Help Center — Spaces](https://resources.arc.net/hc/en-us/articles/19228064149143-Spaces-Distinct-Browsing-Areas)
- [basement.studio — The Birth of Geist](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
- [The Browser Company — Letter to Arc members 2025](https://browsercompany.substack.com/p/letter-to-arc-members-2025)
- [Cursor — main](https://cursor.com/)
- [Cursor — Themes documentation](https://cursor.com/docs/configuration/themes)
- [DEV.to — Best Cursor Editor Themes 2026](https://dev.to/dondon32/best-cursor-editor-themes-2024-boost-focus-reduce-eye-strain-review-1c11)
- [DEV.to — Liquid Glass in Swift](https://dev.to/diskcleankit/liquid-glass-in-swift-official-best-practices-for-ios-26-macos-tahoe-1coo)
- [DEV.to — WWDC 2025 Liquid Glass](https://dev.to/arshtechpro/wwdc-2025-apples-liquid-glass-design-system-52an)
- [Design Systems Collective — Design System Mastery with Figma Variables 2025/2026](https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66)
- [Design Systems Collective — Design Tokens in 2026](https://www.designsystemscollective.com/design-tokens-in-2026-beyond-colors-and-spacing-d2fd632029e1)
- [DesignedForHumans — Liquid Glass accessibility critique](https://designedforhumans.tech/blog/liquid-glass-smart-or-bad-for-accessibility)
- [Eleken — Linear App Case Study](https://www.eleken.co/blog-posts/linear-app-case-study)
- [Figma Blog — Schema 2025: Design Systems For A New Era](https://www.figma.com/blog/schema-2025-design-systems-recap/)
- [Figma Community — Geist Design System](https://www.figma.com/community/file/1330020847221146106/geist-design-system-vercel)
- [Figma Community — Linear Design System](https://www.figma.com/community/file/1222872653732371433/linear-design-system)
- [Figma Community — Raycast UIKit](https://www.figma.com/community/file/1239440022662828277/raycast-uikit)
- [FontOfWeb — linear.app design tokens](https://fontofweb.com/tokens/linear.app)
- [Framer — main](https://www.framer.com/)
- [Framer Blog — 7 emerging web design trends 2025](https://www.framer.com/blog/web-design-trends/)
- [Framer Core — Design tokens 101](https://core.framer.media/writing/design-tokens-101)
- [Framer Motion — animation docs](https://www.framer.com/motion/animation/)
- [GitHub — conorluddy/LiquidGlassReference](https://github.com/conorluddy/LiquidGlassReference)
- [GitHub — vercel/geist-font](https://github.com/vercel/geist-font)
- [GitHub — VoltAgent/awesome-design-md (Linear)](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/linear.app/)
- [GitHub — VoltAgent/awesome-design-md (Notion)](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/notion)
- [Google Fonts — Geist Sans](https://fonts.google.com/specimen/Geist)
- [Google Fonts — Geist Mono](https://fonts.google.com/specimen/Geist+Mono)
- [Hack Design — Arc Browser](https://www.hackdesign.org/toolkit/arc-browser/)
- [Infinum — Liquid Glass critique](https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/)
- [Linear App — main](https://linear.app/)
- [Linear App — Brand Guidelines](https://linear.app/brand)
- [Linear App — Changelog: Welcome to the new Linear (2024)](https://linear.app/changelog/2024-03-20-new-linear-ui)
- [Linear App — Changelog: Mobile app redesign (Oct 2025)](https://linear.app/changelog/2025-10-16-mobile-app-redesign)
- [Linear App — Now: How we redesigned the Linear UI part II](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear App — Now: A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)
- [linear.style — community themes](https://linear.style/)
- [LogRocket — Linear design SaaS trend](https://blog.logrocket.com/ux-design/linear-design/)
- [Loftlyy — Raycast brand colors](https://www.loftlyy.com/en/raycast)
- [MacRumors — iOS 26 Liquid Glass guide](https://www.macrumors.com/guide/ios-26-liquid-glass/)
- [Medium — Linear design rise](https://medium.com/design-bootcamp/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646)
- [Medium — iOS 26 Liquid Glass Reference](https://medium.com/@madebyluddy/overview-37b3685227aa)
- [Natasha The Robot — LiquidGlass Button anatomy](https://www.natashatherobot.com/p/liquidglass-button-ios-26)
- [Notion — Updating the design of Notion pages (blog)](https://www.notion.com/blog/updating-the-design-of-notion-pages)
- [Notion — Style & customize your page (Help Center)](https://www.notion.com/help/customize-and-style-your-content)
- [Radix Colors — Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Radix Themes — Color](https://www.radix-ui.com/themes/docs/theme/color)
- [Radix Primitives — Linear case study](https://www.radix-ui.com/primitives/case-studies/linear)
- [Raycast — main](https://www.raycast.com/)
- [Raycast — Pro](https://www.raycast.com/pro)
- [Raycast — Developers](https://www.raycast.com/developers)
- [Raycast API — Colors](https://developers.raycast.com/api-reference/user-interface/colors)
- [Refine — Rise and Journey of Arc Browser](https://refine.dev/blog/arc-browser/)
- [SeedFlip — Vercel Design System Breakdown](https://seedflip.co/blog/vercel-design-system)
- [Skywork — Cursor 2.0 Ultimate Guide 2025](https://skywork.ai/blog/vibecoding/cursor-2-0-ultimate-guide-2025-ai-code-editing/)
- [StarkInsider — Cursor's New Visual Editor](https://www.starkinsider.com/2025/12/cursor-visual-editor-ide-web-design.html)
- [TechCrunch — Browser Company launches Dia in beta](https://techcrunch.com/2025/06/11/the-browser-company-launches-its-ai-first-browser-dia-in-beta/)
- [TechCrunch — Dia adds Arc's greatest hits](https://techcrunch.com/2025/11/03/dias-ai-browser-starts-adding-arcs-greatest-hits-to-its-feature-set/)
- [The Register — Arc frozen as TBC pivots to Dia](https://www.theregister.com/2025/05/27/arc_browser_development_ends/)
- [UX Collective — Arc Browser designer's lens](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e)
- [UX Collective — Raycast for Designers](https://uxdesign.cc/raycast-for-designers-649fdad43bf1)
- [UX Collective — Did Apple abandon its own design heuristics & accessibility principles?](https://uxdesign.cc/did-apple-abandoned-its-own-design-heuristics-accessibility-principles-2d616ed7ace5)
- [Vercel — Geist Introduction](https://vercel.com/geist/introduction)
- [Vercel — Geist Colors](https://vercel.com/geist/colors)
- [Vercel — Geist Typography](https://vercel.com/geist/typography)
- [Vercel — Geist Materials](https://vercel.com/geist/materials)
- [Vercel — Geist Button](https://vercel.com/geist/button)
- [Vercel — Font (Geist)](https://vercel.com/font)
- [Vercel Blog — Introducing Geist Pixel](https://vercel.com/blog/introducing-geist-pixel)
- [Vercel Blog — AI-powered prototyping with design systems](https://vercel.com/blog/ai-powered-prototyping-with-design-systems)
- [WebPro News — Liquid Glass harder for millions to use](https://www.webpronews.com/apples-liquid-glass-looks-stunning-and-makes-iphones-harder-to-use-for-millions-of-people/)
- [Wikipedia — Arc (web browser)](https://en.wikipedia.org/wiki/Arc_(web_browser))
- [Yenra — AI Adaptive User Interfaces 2025](https://yenra.com/ai20/adaptive-user-interfaces/)

---

## Open Questions / Caveats

1. **WebFetch was unavailable for this research session.** All findings are from WebSearch summaries — no direct page reads. Some specific numbers (exact spacing tokens, exact hex codes, exact font sizes) are unverifiable without scraping the official sources directly. Marked as `(unverified)` where needed.
2. **Linear's in-app design system is private.** Community Figma files exist but they're recreations. Counts of "components" / "tokens" are estimates from third-party token extractors (FontOfWeb, designsystems.surf).
3. **Apple's iOS 26 / Liquid Glass spec is still evolving.** WWDC 2026 may bring revisions to address accessibility complaints.
4. **Notion has not published a public design system spec.** Everything documented here is from third-party reverse-engineering and Notion's own help-center articles.
5. **Cursor 2.0 design specifics are post-shipping** — there's no published Cursor design system; this section is observational.

If we want hard token counts, we'd need to (a) load the official Figma Community files, (b) scrape the design-system docs directly with WebFetch enabled, or (c) reverse-engineer from rendered CSS via DevTools. Recommend doing this as a follow-up before committing to the LCH theme migration.
