# MindShift Design System

> Version 1.0 — Established 2026-03-09
> Source of truth: `src/shared/lib/tokens.ts`

---

## Philosophy

MindShift is designed for ADHD brains. Every decision follows:

1. **Non-punitive** — no red, no shame, no urgency, no countdowns on tasks
2. **Calm palette** — warm neutrals + purposeful accents (Research #8)
3. **Progressive disclosure** — show less, not more
4. **Variable ratio rewards** — VR schedule (8/17/75%) for dopamine
5. **Phase-aware focus** — struggle→release→flow, not a countdown timer

---

## Color Tokens

### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `color.primary` | `#7B72FF` | CTA buttons, FAB, focus arc (struggle phase), primary accent |
| `color.teal` | `#4ECDC4` | Easy tasks, release/flow phase, complete button |
| `color.gold` | `#F59E0B` | Hard tasks, carry-over badge, recovery phase, warnings |

> **Rule:** Red is banned. Gold (#F59E0B) replaces red for all warnings/errors. Research #8: red triggers anxiety in ADHD users.

### Surfaces (Dark Navy Family)

| Token | Value | Usage |
|-------|-------|-------|
| `color.bg` | `#131525` | Root background |
| `color.surface` | `#1E2136` | Card background (primary) |
| `color.surfaceRaised` | `#252840` | Inputs, disabled states, arc track |
| `color.surfaceOverlay` | `#2D3150` | Hover states, selected rows |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `color.textPrimary` | `#E8E8F0` | Body text, headings |
| `color.textMuted` | `#8B8BA7` | Labels, secondary text, placeholders |
| `color.textInverse` | `#FFFFFF` | Text on colored backgrounds |

### Semantic (Focus Phases)

| Phase | Color | Notes |
|-------|-------|-------|
| Idle | `#252840` | surface-raised |
| Struggle (0–7m) | `#7B72FF` | primary — getting started |
| Release (7–15m) | `#4ECDC4` | teal — resistance fading |
| Flow (15m+) | `#4ECDC4` | teal — deep work, digits hidden |
| Recovery | `#F59E0B` | gold — rest warmly |

---

## Typography

System font stack — no custom fonts (PWA performance + offline support).

| Scale | Size | Usage |
|-------|------|-------|
| `xs` | 12px | Labels, badges, section headers (`tracking-widest uppercase`) |
| `sm` | 14px | Secondary text, button labels, toasts |
| `base` | 16px | Body text (default) |
| `lg` | 18px | Card titles |
| `xl` | 20px | Screen section headings |
| `2xl` | 24px | Hero values (XP total, focus timer) |
| `3xl` | 32px | Large stats |

**Weights:** `font-medium` (500) for labels, `font-semibold` (600) for headings, `font-bold` (700) for hero numbers.

**Timer:** `font-mono tabular-nums` — prevents layout shift during countdown.

---

## Spacing

4px base scale (Tailwind-compatible). Key semantic aliases:

| Alias | Value | Usage |
|-------|-------|-------|
| `cardPadding` | 16px / `p-4` | Standard card internal padding |
| `screenPadding` | 20px / `px-5` | Screen horizontal margins |
| `sectionGap` | 16px / `gap-4` | Between major sections |
| `safeBottom` | `env(safe-area-inset-bottom)` | iOS notch/home bar |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `border.radiusSm` | 8px / `rounded-lg` | Small chips, badges |
| `border.radiusMd` | 12px / `rounded-xl` | Buttons, inputs, cards (standard) |
| `border.radiusLg` | 16px / `rounded-2xl` | Task cards, modals, bento cells |
| `border.radiusFull` | 9999px / `rounded-full` | Avatars, pill tags, FAB |

---

## Elevation & Borders

Cards use a combination of background + border, not box-shadow:
```css
background: #1E2136;
border: 1px solid rgba(255,255,255,0.06);
```

Focus ring (accessibility): `0 0 0 2px #7B72FF`

---

## Touch Targets

**Minimum: 44×44px** — WCAG 2.1 AA + iOS Human Interface Guidelines.

Pattern for visually small buttons:
```tsx
// ✅ Correct — 44×44 hit area, visual circle stays small
<button className="min-w-[44px] min-h-[44px] flex items-center justify-center">
  <div className="w-6 h-6 rounded-full" style={{ background: tokens.color.primary }}>
    <Plus size={13} />
  </div>
</button>

// ❌ Wrong — only 24px tap area
<button className="w-6 h-6 rounded-full">
  <Plus size={13} />
</button>
```

Button height guide:
- Primary CTA: `py-3.5` = 56px
- Standard action: `py-3` = 44px+
- Minimum acceptable: `min-h-[44px]`

---

## Z-Index Stack

| Layer | Value | Components |
|-------|-------|-----------|
| Base | 0 | Content |
| Cards | 10 | Elevated cards, badges |
| Sticky | 20 | Sticky section headers |
| **Nav** | **30** | **BottomNav** |
| **Banner** | **40** | **InstallBanner, ContextRestore** |
| **Overlay** | **50** | **CookieBanner, RecoveryProtocol, modals** |

---

## Motion

All animations respect `prefers-reduced-motion` via `useMotion()` → `shouldAnimate`.

| Name | Duration | Usage |
|------|----------|-------|
| Instant | 0ms | Reduced motion fallback |
| Fast | 150ms | Hover states |
| Normal | 200ms | Button transitions |
| Slow | 500ms | Page transitions, fade in/out |
| XSlow | 1200ms | Arc timer phase size change |

Spring presets:
- `springBouncy` — microinteractions (confetti, FAB tap)
- `springSmooth` — banners, modals sliding in
- `springStiff` — quick snappy responses

---

## Component Inventory

### Atoms
| Component | Status | Notes |
|-----------|--------|-------|
| Button (CTA) | ✅ Inline | `py-3.5 rounded-2xl font-semibold` |
| Button (action) | ✅ Inline | `py-3 rounded-xl` |
| Input | ✅ Inline | `h-[46px] rounded-xl px-10` |
| Toggle | ✅ Inline | `min-h-[44px]` wrapper |
| Badge | ✅ Inline | `px-2 py-0.5 rounded-lg text-xs` |
| Avatar | ✅ Inline | `w-24 h-24 rounded-full` |
| FAB | ✅ Inline | `w-14 h-14 rounded-2xl fixed bottom-24 right-5 z-30` |

### Molecules
| Component | Status | File |
|-----------|--------|------|
| TaskCard | ✅ | `features/tasks/TaskCard.tsx` |
| ArcTimer | ✅ | `features/focus/ArcTimer.tsx` |
| CoachMark | ✅ | `shared/ui/CoachMark.tsx` |
| Confetti | ✅ | `shared/ui/Confetti.tsx` |
| Mascot | ✅ | `shared/ui/Mascot.tsx` |
| InstallBanner | ✅ | `shared/ui/InstallBanner.tsx` |
| CookieBanner | ✅ | `shared/ui/CookieBanner.tsx` |
| AddTaskModal | ✅ | `features/tasks/AddTaskModal.tsx` |

### Organisms
| Component | Status | File |
|-----------|--------|------|
| BentoGrid | ✅ | `features/home/BentoGrid.tsx` |
| BottomNav | ✅ | `app/BottomNav.tsx` |
| AppShell | ✅ | `app/AppShell.tsx` |
| FocusScreen | ✅ | `features/focus/FocusScreen.tsx` |
| RecoveryProtocol | ✅ | `features/tasks/RecoveryProtocol.tsx` |

---

## Migration Roadmap

### Phase 1 (Done) — Audit
- [x] All touch targets ≥ 44px
- [x] Z-index stack documented and consistent
- [x] Safe area handling in AppShell

### Phase 2 (Next) — Token adoption
- [ ] Create CSS custom properties in `src/index.css` from tokens.ts
- [ ] Update Tailwind config to reference CSS vars
- [ ] Migrate `usePalette()` to return token values (not raw hex)
- [ ] Replace hardcoded `#7B72FF` → `var(--color-primary)` across components

### Phase 3 (Future) — Component library
- [ ] Extract Button component from inline styles
- [ ] Extract Input component
- [ ] Extract Card component (surface + border pattern)
- [ ] Storybook / component explorer

---

## Design Tokens Usage (Current State)

As of 2026-03-09, tokens are defined in `src/shared/lib/tokens.ts` but components still use hardcoded hex values. Migration is incremental.

**Priority migration candidates:**
1. `usePalette.ts` — already abstracted, update to use tokens
2. `ArcTimer.tsx` — PHASE_COLORS object → tokens.color.phase*
3. `TaskCard.tsx` — difficulty accents → tokens.color.*
4. `BottomNav.tsx` — active/inactive colors → tokens.color.*
