---
name: mobile-review
description: "Mobile Expert Add-On — strict mobile architecture and ergonomics review. Use ON TOP of ui-ux-design when you need maximum rigor on: thumb zones, safe areas, gesture conflicts, iOS/Android platform differences, PWA install UX, touch target density, scroll behavior, viewport units, and HIG/Material compliance. Triggers on: 'mobile review', 'iOS issues', 'Android issues', 'PWA', 'thumb zone', 'safe area', 'touch target audit', or 'is this mobile-ready'."
version: "1.0"
updated: "2026-03-09"
---

# Mobile Expert Add-On

Strict mobile UX and engineering review layer. Apply on top of `ui-ux-design` skill for deep mobile audits.

---

## 1. Thumb Zone Map (375px / 430px phones)

```
┌─────────────────────┐
│  ⚠ Stretch zone     │  y: 0–120px   — avoid critical actions here
│  (top corners worst)│
├─────────────────────┤
│  ✓ Comfortable zone │  y: 120–480px — primary content
│                     │
│                     │
├─────────────────────┤
│  ✓ Natural zone     │  y: 480–700px — ideal for CTAs, FAB, nav
│  (easiest reach)    │
├─────────────────────┤
│  ⚠ Bottom system UI │  Reserved for OS home indicator
└─────────────────────┘
```

**Rules:**
- Primary CTAs → bottom 30% of screen
- Destructive actions → require deliberate reach (top half) or confirmation modal
- FAB → `bottom: calc(80px + env(safe-area-inset-bottom))` — above BottomNav
- Settings, back → top-left accepted (muscle memory), but not primary

---

## 2. Safe Area Audit

Check every element that appears at screen edges:

```tsx
// BottomNav
paddingBottom: 'env(safe-area-inset-bottom)'

// Bottom sheet / modal
paddingBottom: 'calc(24px + env(safe-area-inset-bottom))'

// Main content scroll area
paddingBottom: 'calc(64px + env(safe-area-inset-bottom))'

// Fixed banners above nav (CookieBanner)
bottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)'

// Full-screen overlays (RecoveryProtocol)
// Use padding-top: env(safe-area-inset-top) for notch
```

**Test targets:** iPhone 14 Pro (Dynamic Island), iPhone SE (small), iPhone 14 (standard notch), Samsung S24 (punch-hole)

---

## 3. Touch Target Density Audit

Minimum: **44×44px** (Apple HIG). Comfortable: **48×48px** (Material Design).

**High-risk components to always check:**
- Icon-only buttons (X close, ←, ⋮ more)
- Checkbox / radio with small visual size but must have large hit area
- List item trailing actions (delete, archive)
- Duration/difficulty preset chips (small text chips)
- Bottom nav items (must span full tab width)

**Audit technique:**
```tsx
// Temporarily add to find small targets
'outline outline-2 outline-red-500'
// Or use browser DevTools → Layers → check hit areas
```

---

## 4. Scroll Behavior

**Rules:**
- Never use `overflow: hidden` on `body` without `position: fixed` workaround (iOS scroll lock bug)
- Scroll containers: `overflow-y-auto` with `-webkit-overflow-scrolling: touch`
- Sticky headers: use `position: sticky` not `fixed` inside scroll containers
- Pull-to-refresh: if implemented, must not conflict with swipe-to-go-back (iOS)
- Infinite scroll: must have a visual loading indicator at the bottom

**Momentum scrolling:**
```css
-webkit-overflow-scrolling: touch;  /* iOS momentum */
overscroll-behavior: contain;       /* Prevent scroll chaining */
```

---

## 5. Viewport Units — The iOS Problem

```css
/* ❌ Broken on iOS Safari (100vh includes browser chrome) */
height: 100vh;

/* ✓ Correct — uses visual viewport */
height: 100dvh;     /* dynamic viewport height */
min-height: 100svh; /* small viewport height */

/* For full-screen overlays */
.overlay {
  position: fixed;
  inset: 0;
  /* Do NOT use height: 100vh */
}
```

---

## 6. iOS vs. Android Platform Differences

| Feature | iOS Safari | Android Chrome | Fix |
|---------|------------|----------------|-----|
| `100vh` | Buggy | Fine | Use `100dvh` |
| AudioWorklet | Requires user gesture | Works | Gate behind first tap |
| Web Push | iOS 16.4+ PWA only | Works | Feature-detect + educate |
| CSS `overscroll-behavior` | Partial | Full | Test both |
| `position: sticky` | Has bugs | Fine | Test in Safari |
| PWA standalone | Full screen, custom | Full screen, custom | Test both |
| Bottom nav overlap | Safe area varies | Less aggressive | `env(safe-area-inset-bottom)` |
| Font size | Default 16px | Default 16px | Never go below 12px |
| Tap highlight | `rgba(0,0,0,0.18)` | Platform dependent | `-webkit-tap-highlight-color: transparent` |

---

## 7. Gesture Architecture

**Principle:** Every gesture must have a tap-equivalent alternative.

| Gesture | Alternative | Conflict risk |
|---------|------------|---------------|
| Swipe right to dismiss | "Park it →" button | iOS swipe-to-go-back |
| Long press for options | ⋮ overflow menu | — |
| Pull to refresh | Manual refresh button | iOS overscroll |
| Pinch to zoom | — | Browser default zoom |
| Drag to reorder (dnd-kit) | Manual reorder buttons | Scroll conflict |

**dnd-kit configuration for MindShift:**
```tsx
// Must include both sensors for mobile
const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,      // ms — prevents accidental drag on scroll
      tolerance: 5,    // px — small movement tolerance
    },
  }),
  useSensor(KeyboardSensor),
)
```

---

## 8. PWA Install UX Checklist

- [ ] `manifest.json`: `display: "standalone"`, `start_url: "/?source=pwa"`, all icon sizes
- [ ] Maskable icon: content within 80% safe zone (check with [maskable.app](https://maskable.app))
- [ ] `theme_color` matches status bar on Android
- [ ] `background_color` matches splash screen
- [ ] Service worker handles offline with `/offline.html` fallback
- [ ] Install prompt (InstallBanner) only after user has had 30s to see value
- [ ] On iOS: educate user with "Share → Add to Home Screen" (no native prompt)
- [ ] After install: `?source=pwa` param tracked to know PWA vs browser users

---

## 9. Performance — Perceived vs. Actual

**ADHD users abandon slow apps faster than neurotypical users** (executive function cost of waiting is higher).

Targets:
- First Contentful Paint: < 1.5s on 4G
- Time to Interactive: < 3s on 4G
- Interaction to Next Paint (INP): < 200ms

**MindShift-specific:**
- AudioWorklet initializes lazily (not on app load)
- dnd-kit imported in separate chunk (`vendor-dnd`)
- Heavy screens (FocusScreen, ProgressScreen) load their Supabase data lazily
- Confetti component: mount only on task completion, unmount after animation

---

## 10. Mobile Audit Output Format

When performing a mobile review, output:

```
## Mobile Review: [Component/Screen]

### Thumb Zone
[What's in the natural zone / what's in the stretch zone]
[Issues found]

### Safe Areas
[Which edges need safe area handling]
[Missing or incorrect implementations]

### Touch Targets
[List of elements below 44px]
[Recommended fix]

### Scroll Behavior
[Issues found / all clear]

### Platform Differences
[iOS-specific issues]
[Android-specific issues]

### Gestures
[Gesture inventory + conflicts]

### Verdict: ✅ PASS / ⚠️ NEEDS FIXES / ❌ FAIL
[Priority fix list]
```
