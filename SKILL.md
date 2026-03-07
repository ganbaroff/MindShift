---
name: mindflow-ui
description: "MindFlow design system and UI rules. Use when building, editing, or reviewing any UI component, screen, or style in MindFlow. Contains C color object, SVG icon system, typography rules, component patterns, and accessibility requirements."
---

# MindFlow UI Design System

## Color Object (src/constants/colors.ts)

```typescript
export const C = {
  bg:         "#0A0A12",   // void base — main background
  bgMid:      "#0E0E1A",   // cards, list items
  bgHi:       "#141422",   // elevated surfaces, inputs
  bgGlass:    "rgba(20,20,34,0.75)",
  bgBlur:     "rgba(10,10,18,0.92)",
  text:       "#E8E4FF",   // 13.2:1 contrast ✅
  textSub:    "#7B7899",   // 4.8:1 contrast ✅
  textDim:    "#3D3A55",   // non-essential, decorative
  textInverse:"#0A0A12",   // text on lime/bright
  lime:       "#D4FF00",   // primary CTA, streak, badges
  limeDim:    "rgba(212,255,0,0.1)",
  limeGlow:   "rgba(212,255,0,0.25)",
  purple:     "#7C6EFF",   // secondary accent, active states
  purpleDim:  "rgba(124,110,255,0.12)",
  purpleGlow: "rgba(124,110,255,0.3)",
  border:     "#1E1E30",
  borderHi:   "#2E2E4A",
  // Semantic type colors
  task:       "#7C6EFF",
  idea:       "#FF9F43",
  reminder:   "#26D0B2",
  expense:    "#FF6B6B",
  memory:     "#74B9FF",
  note:       "#A29BBE",
  done:       "#00D68F",
  high:       "#FF4757",
  medium:     "#FFA502",
  low:        "#00D68F",
}
```

## Typography

**Fonts:** Clash Display (headings, numbers) + Satoshi (body, UI)
```html
<link href="https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;600;700;800&family=Satoshi:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- Body text: minimum **16px** (mobile rule)
- Line height body: **1.65–1.75**
- Headings: Clash Display, weight 700–800, letter-spacing -0.5 to -1.5px
- Labels/badges: Satoshi, weight 700, letter-spacing 0.4–1px, uppercase

## Component Rules

### Buttons
- Minimum height: **48px** (touch target ≥ 44px)
- `cursor: pointer` — ALWAYS
- `fontFamily: "inherit"` on all buttons
- Disabled state: `cursor: not-allowed`, reduced opacity
- Loading state: disable button + show Spinner
- Transition: `all .15s` or `all .2s`

### Cards
- Background: `C.bgMid`, hover: `C.bgHi`
- Border radius: 14–18px
- No layout shift on hover — no transform scale that changes layout
- Priority stripe: 3px left border in priority color

### Inputs / Textarea
- Background: `C.bgHi` or `C.bgGlass`
- Border: `C.border`, focus: `C.purple + "66"` with `box-shadow: 0 0 0 3px purpleGlow`
- `font-size: 16px` minimum (prevents iOS zoom)
- `outline: none` + custom focus-visible ring via CSS

### Badges / Tags
- Height: 20–28px
- Border radius: 6–8px
- Always include SVG icon + text
- Background: `type.color + "10"`, border: `type.color + "30"`

## Icon System (NO EMOJI)

All icons are inline SVG functions: `Ico.task(color, size)`

Available icons: dump, focus, moon, settings, send, mic, check, sparkle, tag, trash, export, close, arrowR, fire, brain, task, idea, reminder, expense, memory, note

**Adding new icons:**
```typescript
iconName: (c: string, s=22) => <svg width={s} height={s} viewBox="0 0 24 24" 
  fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
  {/* Lucide icon paths */}
</svg>
```

Source for paths: https://lucide.dev

## Accessibility Checklist

- `aria-label` on icon-only buttons
- `aria-pressed` on toggle buttons  
- `aria-busy` on loading buttons
- `aria-current="page"` on active nav items
- `role="alert"` on toasts
- `htmlFor` + `id` on all form labels
- `prefers-reduced-motion` — disable animations

## Skeleton Loading Pattern

```typescript
const SkeletonCard = () => (
  <div style={{ background:C.bgMid, borderRadius:16, padding:"14px 16px", 
    marginBottom:8, border:`1px solid ${C.border}` }}>
    <div style={{ width:60, height:20, borderRadius:6, background:C.bgHi, 
      animation:"shimmer 1.5s infinite" }} />
    <div style={{ height:16, borderRadius:6, background:C.bgHi, marginTop:10,
      animation:"shimmer 1.5s infinite" }} />
  </div>
)
```

Always show 3 skeleton cards during AI processing.

## Screen Layout Pattern

```
<div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
  {/* Header — flexShrink:0 */}
  <div style={{ background:C.bgMid, borderBottom:`1px solid ${C.border}`, 
    padding:"22px 20px 18px", flexShrink:0 }}>
  </div>
  
  {/* Scrollable content */}
  <div style={{ flex:1, overflowY:"auto", padding:"10px 16px 88px" }}>
    {/* 88px bottom padding = nav height + safe area */}
  </div>
</div>
```
