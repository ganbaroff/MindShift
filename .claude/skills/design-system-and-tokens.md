# Skill: design-system-and-tokens

> Read this file before touching any visual style, color, animation, or typography in the
> app. The golden rule: **no raw hex strings in component files, ever.**

---

## Token File Location

```
src/skeleton/design-system/tokens.js
```

This is the **single source of truth** for all design tokens. Changes here affect every
screen in the app. Changing `tokens.js` requires a skeleton bolt (see
`project-architecture.md`).

---

## Color Tokens — `C` Object

| Token | Value | Usage |
|-------|-------|-------|
| `C.bg` | `#0d0d0d` | App background |
| `C.surface` | `#1a1a1a` | Cards, panels, bottom sheets |
| `C.surfaceHi` | `#252525` | Elevated cards, hover states |
| `C.border` | `#2a2a2a` | Dividers, card borders |
| `C.borderHi` | `#3a3a3a` | Focused / active borders |
| `C.text` | `#f0f0f0` | Primary body text |
| `C.textSub` | `#a0a0a0` | Secondary / supporting text |
| `C.textDim` | `#606060` | Disabled, placeholder, hint |
| `C.accent` | `#6c5ce7` | Primary action color |
| `C.accentLit` | `#a29bfe` | Lighter accent (active icons, labels) |
| `C.accentDim` | `rgba(108,92,231,0.15)` | Glow pills, active backgrounds |
| `C.accentGlow` | `rgba(108,92,231,0.35)` | Box-shadow glow |
| `C.high` | `#e17055` | Errors, warnings, critical priority |
| `C.med` | `#fdcb6e` | Medium priority |
| `C.low` | `#00b894` | Low priority, success |
| `C.idea` | `#f5a623` | Idea type thoughts |

### Priority Color Map — `P_COLOR`

```js
import { P_COLOR } from "../../skeleton/design-system/tokens.js";

P_COLOR.critical  // C.high   — red-orange
P_COLOR.high      // C.high
P_COLOR.medium    // C.med    — yellow
P_COLOR.low       // C.low    — green
P_COLOR.none      // C.textDim
```

---

## Typography

| Role | Family | Size | Weight | Notes |
|------|--------|------|--------|-------|
| Display / headings | Syne | 26–34px | 800 | `font-family: 'Syne', sans-serif` |
| Sub-headings | Syne | 18–24px | 700 | |
| Body | DM Sans | 14–16px | 400–500 | Default on `html, body` |
| Labels / metadata | DM Sans | 11–13px | 500–700 | letter-spacing 0.2–0.4 |
| Input text | inherit | 15px | 400 | Match body |

Google Fonts are loaded in `global.css.js`. Both fonts are **already in the bundle** — do
not add additional `@import` statements without checking performance impact.

---

## Spacing Scale

Use only these values for `margin`, `padding`, and `gap`:

`4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 44 · 48 · 52 · 64` px

Avoid arbitrary values like `17px`, `22px`, `37px`. Stick to the scale.

---

## Border Radius Scale

`8 · 12 · 16 · 20 · 24 · 9999` px

| Context | Radius |
|---------|--------|
| Tight inputs / badges | 8 px |
| Default cards | 12 px |
| Large cards / sheets | 16–20 px |
| Bottom sheets | 24 px (top corners only) |
| Pills / tags | 9999 px |

---

## Shadows & Glows

Use `C.accentGlow` for accent shadows, not arbitrary `rgba()` values:

```js
boxShadow: `0 8px 28px ${C.accentGlow}`     // CTA buttons
boxShadow: `0 0 8px ${C.accentGlow}`         // active badges
boxShadow: `0 12px 40px ${C.accentGlow}, 0 0 0 1px ${C.accent}33`  // hover cards
```

---

## Animations (Keyframes)

All keyframes are defined in `skeleton/design-system/global.css.js` and injected into
`<head>` by `App()`. Reference by name in inline styles:

| Name | Duration | Use for |
|------|----------|---------|
| `spin` | varies | Loading spinners |
| `fadeIn` | 0.3s | Modal / sheet entrance |
| `slideUp` | 0.45–0.55s | Screen content entrance |
| `scaleIn` | 0.25s | Card pop-in |
| `navPop` | 0.2s | BottomNav active glow pill |
| `badgePop` | 0.3s | Notification badge appearance |
| `toastIn` | 0.25s | Toast notifications |
| `shimmer` | 0.6s | Skeleton loading shimmer |
| `micPulse` | 1s loop | Microphone active indicator |
| `pulse` | 1s loop | Generic pulse (loading) |

```jsx
// Usage example
style={{ animation: "slideUp .45s cubic-bezier(.22,1,.36,1) .1s both" }}
```

---

## Easing Curves

| Curve | Value | Character |
|-------|-------|-----------|
| Spring | `cubic-bezier(.34,1.56,.64,1)` | Bouncy — badges, hover lift |
| Smooth out | `cubic-bezier(.22,1,.36,1)` | Gentle decel — screen entrances |
| Standard | `ease` | Simple transitions |

---

## Glassmorphism Pattern

For translucent panels (BottomNav, modals):

```js
background: `${C.surface}F0`,  // ~94% opacity
backdropFilter: "blur(20px)",
WebkitBackdropFilter: "blur(20px)",
borderTop: `1px solid ${C.border}`,
```

---

## Rules — What NOT to Do

```jsx
// ❌ raw hex in a component
style={{ color: "#6c5ce7" }}

// ✅ use the token
style={{ color: C.accent }}

// ❌ arbitrary spacing
style={{ padding: "17px 22px" }}

// ✅ use the scale
style={{ padding: "16px 20px" }}

// ❌ inline @keyframes
style={{ animation: "@keyframes spin { to { transform: rotate(360deg) } } 1s linear" }}

// ✅ reference the name (already defined in global.css.js)
style={{ animation: "spin 1s linear infinite" }}

// ❌ adding new @keyframes in a component file
const MyScreen = () => (
  <style>{`@keyframes myAnim { … }`}</style>  // ← wrong
);

// ✅ add to global.css.js and reference by name
```

---

## Adding a New Token

1. Add to `src/skeleton/design-system/tokens.js` (requires skeleton bolt)
2. Document it in this file (table row)
3. Update `CLAUDE.md` color table
4. Write a one-line ADR entry explaining the token's purpose
