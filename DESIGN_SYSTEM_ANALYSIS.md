# MindShift Design System & Component Architecture Analysis

## 1. CSS DESIGN TOKENS — STRONG SYSTEM ✅

### Color Palette (Coherent, Research-Validated)
- **Primary (Brand):** `#7B72FF` (indigo) — CTA, FAB, focus arc, struggle phase
- **Semantic Colors (Research #8):**
  - Teal `#4ECDC4` — easy tasks, release/flow phase, success states
  - Gold `#F59E0B` — hard tasks, carry-over badge, recovery phase, warnings (NO RED per ADHD research)
- **Surfaces:** Navy gradient dark to light
  - `#0F1117` — root bg (darkest)
  - `#1E2136` — card background
  - `#252840` — elevated/input background
  - `#171A2B` — nav/sheet background
- **Text:**
  - Primary: `#E8E8F0`
  - Muted: `#8B8BA7`
  - Subtle: `#6B6B8A` (3rd tier)
- **Borders:** Subtle rgba values at 6%, accent borders at 35% opacity
- **Extended Palette:** 14 derived colors (primary-dark, teal-dark, alpha variants, glass overlays)

**System Quality:** Excellent. Single source of truth in `tokens.ts` + CSS variables sync. Calm mode desaturation via `[data-mode="calm"]` works automatically across all components.

---

## 2. COMPONENT LIBRARY — INCONSISTENT, SCATTERED ⚠️

### Reusable Base Components
Located in `/src/shared/ui/`:

| Component | Status | API Consistency | Notes |
|-----------|--------|-----------------|-------|
| **Button** | ✅ Complete | Good | 4 variants (primary/secondary/ghost/danger), 3 sizes, consistent focus rings, motion-aware (useMotion) |
| **Card** | ✅ Complete | Excellent | 3 variants (elevated, accent, glass), CSS-var driven, role="button" when onClick |
| **Input** | ✅ Complete | Good | Label, hint, error support, icon slot, focus-visible, 150ms transition |
| **CoachMark** | ✅ Basic | Minimal | Tooltip primitive, no variants |
| **Confetti** | ✅ Complete | N/A | Task completion effect only |
| **CookieBanner** | ✅ Domain-specific | N/A | Fixed z-50, bottom positioning with safe-area |
| **InstallBanner** | ✅ Domain-specific | N/A | PWA install prompt, motion-aware |
| **ErrorBoundary** | ✅ Complete | N/A | Per-route fallback, RouteError component |
| **LoadingScreen** | ✅ Simple | N/A | Spinner + fade animation |
| **Mascot** | ✅ Mochi SVG | N/A | Psychotype-aware messaging |

**Issues:**
- No unified Toggle component (SettingsScreen has inline implementation)
- No Select/Dropdown component (workarounds in AddTaskModal, DueDateScreen)
- No Modal/Dialog wrapper (AddTaskModal is ad-hoc)
- No Badge/Pill component (inline styling across 15+ files)
- No List/ListItem standardization

### Feature Components (Not Truly Reusable)
- **TaskCard:** Memoized, complex, 150+ lines, includes snooze/complete/XP logic
- **EnergyCheckin:** Only used in OnboardingFlow
- **BentoGrid:** Drag grid with dnd-kit, only HomeScreen
- **ArcTimer:** SVG progress ring, FocusScreen-specific
- **MochiSessionCompanion:** Body-double during focus sessions

**Quality:** Mixed. Core UI primitives are solid; feature components lack reusability.

---

## 3. TYPOGRAPHY — AD-HOC, NOT SYSTEM ❌

### Token Definitions (tokens.ts)
```
sizeXs:   '0.75rem'  (12px) — labels, badges
sizeSm:   '0.875rem' (14px) — secondary text
sizeBase: '1rem'     (16px) — body
sizeLg:   '1.125rem' (18px) — card titles
sizeXl:   '1.25rem'  (20px) — screen headings
size2xl:  '1.5rem'   (24px) — hero numbers
size3xl:  '2rem'     (32px) — large stats
```

### Actual Usage (Audit)
- **Tailwind classes:** text-xs (228 uses), text-sm (111), text-base (18), text-lg (10), text-xl (13), text-2xl (16), text-3xl (4)
- **Custom overrides:** text-[10px] (9), text-[11px] (2) — breaks system
- **Font weights:** Hardcoded in components (font-bold, font-semibold, font-medium, font-normal)

**Issues:**
1. No heading hierarchy enforced (h1–h6 tags absent; styled divs instead)
2. No font-weight scale applied consistently (mix of 400/500/600/700)
3. Line-height not controlled (1.2, 1.5, 1.75 scattered inline)
4. Letter-spacing rarely used (widest appears on AuthScreen step label only)
5. Custom sizes break the 7-step scale

**Example Inconsistencies:**
- AuthScreen step label: `text-xs font-semibold tracking-widest uppercase` (explicit, good)
- HomeScreen section title: `<h2 className="text-base font-bold">` (no uppercase)
- Task input: no explicit weight (defaults to 400)

---

## 4. SPACING — TAILWIND 4-PX SCALE, MOSTLY CONSISTENT ✅

### Token Scale (tokens.ts)
Base 4px scale: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)

**Semantic aliases:**
- `cardPadding: '1rem'` (p-4)
- `screenPadding: '1.25rem'` (px-5)
- `sectionGap: '1rem'` (gap-4)
- `cardGap: '0.75rem'` (gap-3)
- `safeBottom: 'env(safe-area-inset-bottom)'`

### Usage Patterns
- **Padding:** Consistently p-4 on cards, px-5 on screens, p-3 on list items
- **Gaps:** Mostly gap-2 (8px) or gap-4 (16px)
- **Margins:** Inconsistent—mb-1, mb-2, mb-3, mb-4, mb-5, mb-6 all appear

**Good Patterns:**
- `pb-[calc(64px+env(safe-area-inset-bottom))]` in AppShell (safe-area for iOS)
- `pt-safe` custom class used on Onboarding
- Stacks use gap-2.5 (10px) for breathing room

**Issues:**
- No strict margin scale (ad-hoc mb/mt values)
- Safe-area only used in 2 places (AppShell, CookieBanner); should be more consistent

---

## 5. RESPONSIVE DESIGN — MOBILE-FIRST, LIMITED DESKTOP SUPPORT ⚠️

### Current Approach
- **Layout:** max-w-[480px] mx-auto (mobile phone constraint)
- **Safe-area:** Uses env(safe-area-inset-bottom) for notches/home indicators
- **Media Queries:** Only `@media (prefers-reduced-motion: reduce)` used site-wide
- **No breakpoints:** No sm:, md:, lg: variants in any component
- **Assumption:** App runs on 320px–480px viewports (iPhone SE → iPhone 14 Pro)

### Desktop Fallback
- Browser will center app in max-w-[480px], leaving white space on iPad/desktop
- No responsive grid system (BentoGrid is fixed-width mobile)
- Bottom navigation stays bottom on all sizes (should side-nav on desktop?)

**Assessment:** True mobile-first, but tablet/desktop support is non-existent. Acceptable for PWA, risky for web browser context.

---

## 6. FORM PATTERNS — INCONSISTENT VALIDATION & ERROR HANDLING ⚠️

### OnboardingFlow (Multi-Step)
- ✅ Progress bar (segmented, visual step indicator)
- ✅ Back button navigation with state management
- ✅ Step transitions with motion
- ❌ No validation feedback shown mid-form
- ❌ No error states for invalid inputs
- ❌ Sample tasks auto-populated per AppMode (no explicit validation)

### AddTaskModal
- ✅ Title input (required, no validation)
- ✅ Difficulty picker (visual, 3-state)
- ✅ Duration presets (5, 15, 25, 45, 60 min + custom field)
- ✅ Due date/time picker (bottom-sheet modal)
- ✅ Voice input classification (async, low-confidence detection)
- ✅ AI subtask decomposition (async, edge function)
- ❌ No form reset after submit
- ❌ No duplicate task detection
- ❌ No estimation validation (e.g., max 480min)
- ❌ Voice fallback not tested

### AuthScreen
- ✅ Email input (basic)
- ✅ Magic link sent flow (2-step: email → check)
- ✅ Consent checkbox for terms
- ✅ Age confirmation
- ❌ No email validation regex
- ❌ No rate-limiting feedback
- ❌ No error message display on failed OTP

### SettingsScreen
- ✅ Toggle switches (reducedStimulation, etc.)
- ✅ Avatar selector grid
- ✅ Dropdown pickers (AppMode, EnergyLevel, SeasonalMode, TimerStyle)
- ✅ Delete confirmation dialog (email verification)
- ❌ No inline validation
- ❌ Confirm dialogs are custom modals (not standardized)

**Validation System:** Minimal. No centralized validator. Error states only on Input component (error prop changes border to gold). No form-level constraints.

---

## 7. ANIMATION SYSTEM — EXCELLENT, WELL-ARCHITECTED ✅

### Centralized Motion Hook (useMotion)
```
useMotion() → {
  shouldAnimate: boolean  // OS prefers-reduced-motion OR store.reducedStimulation
  t(mode): Transition    // 'standard' → SPRING | 'expressive' → SPRING_EXPRESSIVE
  slideUp, fadeOnly, scaleIn, slideHorizontal(): VariantPreset
  duration, ease, spring, springExpressive, fade, instant
}
```

### Spring Profiles (Research #2)
- **SPRING (Standard):** stiffness 300, damping 30 (ζ≈1.0, zero bounce)
- **SPRING_EXPRESSIVE (Celebration):** stiffness 260, damping 20 (ζ<1.0, minor bounce) — ONLY for task completion
- **FADE:** 200ms ease-out (when motion reduced)
- **INSTANT:** 0ms (critical accessibility)

### Duration Guidelines
- Micro: 150ms (hover, tap, toggle)
- Standard: 250ms (menus, modals, drawers)
- Reveal: 400ms (screen transitions, large reveals)

### Variant Presets
```
slideUp:     { opacity 0→1, y 16→0 }
fadeOnly:    { opacity 0→1 } (fallback for motion-reduced)
scaleIn:     { opacity 0→1, scale 0.95→1 }
slideHorizontal: { opacity 0→1, x ±28→0 }
```

### Implementation Quality
- ✅ All components use useMotion()
- ✅ Reduced-motion respected everywhere (CSS @media rule + store toggle)
- ✅ No linear easing (all ease-out per ADHD research)
- ✅ No loops without user control
- ✅ Spring damping scientifically justified
- ⚠️ A few hardcoded transitions remain (ArcTimer 1.2s phase shrink, RecoveryProtocol fade)

**Consistency:** Excellent. Single point of truth in motion.ts + useMotion hook.

---

## 8. NAVIGATION ARCHITECTURE — CLEAR, PWA-OPTIMIZED ✅

### Route Hierarchy
```
/                  HomeScreen (BentoGrid, pools, NowPoolWidget)
/tasks             TasksScreen (all pools, "Done recently")
/focus             FocusScreen (ArcTimer, SessionControls, PostSessionFlow)
/calendar          DueDateScreen (due tasks grouped by date)
/settings          SettingsScreen (appMode, energy, avatar, toggles, GDPR)
/auth              AuthScreen (email → magic link → consent)
/onboarding        OnboardingFlow (psychotype, appMode, avatar, energy)
/progress          ProgressScreen (stats, burnout alert, avatar stage)
/privacy, /terms   Legal pages
```

### Bottom Navigation (BottomNav.tsx)
- 5 items: Home, Tasks, Focus, Upcoming (Calendar), Settings
- Active indicator with layoutId (Framer Motion shared)
- Icon color changes (muted → primary on active)
- Min touch target: 44px (WCAG 2.1 AA)
- Glow effect in normal mode (disabled in calm mode)
- Safe-area padding for notches

### Lazy Loading Strategy
```
main bundle:      App, Auth, Onboarding, Home, Tasks, Focus, Settings
lazy chunks:      RecoveryProtocol, ContextRestore, BentoGrid, Progress, Calendar, Legal
```

### AppShell Layout
- Flex column: main (flex-1 overflow-y-auto) + BottomNav fixed bottom
- pb-[calc(64px+env(safe-area-inset-bottom))] (account for nav height + iPhone notch)
- Skip-to-content link for keyboard users (sr-only, focus:not-sr-only)
- Offline indicator (top sticky bar, teal when reconnecting, gold when offline)

**Quality:** Solid. Mobile-first, accessible, lazy-loading optimized.

---

## KEY FINDINGS SUMMARY

### ✅ What Exists (Strong)
1. **Color tokens:** Complete, research-validated, no-red ADHD principle
2. **CSS variable system:** Calm mode works flawlessly
3. **Motion system:** Centralized, spring-based, respects prefers-reduced-motion
4. **Base UI components:** Button, Card, Input are solid primitives
5. **Navigation:** Clear routing, accessible bottom nav, lazy chunks
6. **Spacing scale:** Tailwind 4px base, mostly consistent
7. **Typography tokens:** 7-step scale defined, but not enforced

### ❌ What's Missing or Inconsistent
1. **Typography enforcement:**
   - No heading hierarchy (h1–h6 absent)
   - Font-weight scale not applied (hardcoded 400/500/600/700)
   - Custom sizes break the 7-step scale (text-[10px], text-[11px])
   - Line-height not controlled per level

2. **Component library gaps:**
   - No Toggle component (SettingsScreen has inline version)
   - No Select/Dropdown standardization
   - No Modal/Dialog wrapper
   - No Badge/Pill component
   - No form validation framework

3. **Form handling:**
   - No centralized validator
   - No form-level constraints (min/max values, patterns)
   - Error states only at Input component level
   - No duplicate detection, rate-limiting feedback
   - Confirmation dialogs are ad-hoc modals

4. **Responsive design:**
   - Mobile-only (max-w-[480px])
   - No tablet/desktop breakpoints
   - Safe-area only used in 2 places
   - BentoGrid is fixed-width mobile

5. **Consistency issues:**
   - Margin scale is ad-hoc (mb-1 through mb-6)
   - Some components have inline styles, others use Tailwind
   - Card styling repeated inline ~20 times before Card component created
   - Difficulty color logic hardcoded in multiple places (should be single source)

### ⚠️ Code Quality Notes
- **DIFFICULTY_MAP:** Good—single source of truth in types/index.ts (Sprint B A-2)
- **SEASONAL_MODE_CONFIG + getNowPoolMax():** Composable modal config (Sprint B H-4)
- **usePalette hook:** Correctly desaturates colors based on calm mode
- **Focus rings:** Consistent focus-visible:ring-2 pattern across all interactive elements
- **Min touch targets:** 44px enforced on buttons, nav items (WCAG 2.1 AA)

---

## RECOMMENDATIONS

### High Priority
1. **Create missing base components:**
   - Toggle.tsx (standardize SettingsScreen pattern)
   - Select.tsx (dropdown wrapper with keyboard nav)
   - Badge.tsx (pill, difficulty, status badges)
   - Modal.tsx / Dialog.tsx (wrapper for AddTaskModal, confirmations)

2. **Enforce typography scale:**
   - Create <H1>, <H2>, <H3>, <P>, <Caption> semantic components
   - Map to font-size + font-weight + line-height
   - Migrate hardcoded `className="text-sm font-bold"` to `<H2>`
   - Remove custom sizes (text-[10px], text-[11px])

3. **Add form validation framework:**
   - Export validator from shared/lib
   - Add constraints to Input (min/max, pattern, required)
   - Implement form-level error display
   - Add duplicate task detection before submit

### Medium Priority
4. **Extend responsive design:**
   - Add sm:, md:, lg: breakpoints to Tailwind config
   - Create responsive grid for BentoGrid on tablet+
   - Design desktop nav (side-nav instead of bottom?)
   - Test on iPad, desktop browsers

5. **Margin scale standardization:**
   - Define semantic margin aliases (spacingY.section, spacingX.card, etc.)
   - Prefer gap over margin in flex containers
   - Audit existing mb-* usage, consolidate to 4, 8, 16, 24, 32 only

6. **Consolidate color/difficulty logic:**
   - Move getDifficultyAccent, getDueDateBadge to shared/lib
   - Create TaskCardTheme helper (color palette per difficulty + status)
   - DRY across TaskCard, NowPoolWidget, TasksScreen

### Low Priority
7. **Documentation:**
   - Storybook or design tokens doc site (Chromatic, Zeroheight)
   - Component API reference for each primitive
   - Animation guidelines doc (when to use expressive vs. standard)

---

## Coherence Score: 7.5/10
**Strong:** Color, motion, navigation, core spacing  
**Weak:** Typography enforcement, form patterns, responsive design, component library completeness  
**Opportunity:** Invest in semantic component wrappers + form validation layer for 9/10.
