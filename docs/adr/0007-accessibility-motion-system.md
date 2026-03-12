# ADR-0007: Accessibility & Motion System Standardisation

**Status:** Accepted
**Date:** 2026-03-12
**Deciders:** Yusif (product), Claude (engineering/design)
**Sprint:** 9

---

## Context

MindShift targets neurodivergent users with ADHD, anxiety, and sensory processing differences.
Despite having a centralized `useMotion()` hook designed for dual reduced-motion support
(OS `prefers-reduced-motion` + app `reducedStimulation` toggle), an audit found:

- 4 components bypassing `useMotion()` entirely: CookieBanner, InstallBanner, LoadingScreen, EnergyCheckin
- 4 uncontrolled `animate-spin` instances in critical screens (LoadingScreen, FocusScreen,
  RecoveryProtocol, AudioToggle)
- No keyboard focus rings — full keyboard navigation was non-functional
- Missing `aria-label` descriptors on emoji buttons, decorative icons, and state-dependent elements

WCAG 2.1 Success Criteria violated:
- SC 2.3.3 (Level AAA): Animation from Interactions — motion not stoppable
- SC 2.4.7 (Level AA): Focus Visible — keyboard focus not visible
- SC 1.1.1 (Level A): Non-text Content — emoji buttons lack text alternatives
- SC 1.4.1 (Level A): Use of Color — energy level communicated by emoji only

## Decision

**Standardise all animation through `useMotion()`; fix all WCAG Level AA violations; achieve
Level AAA on motion specifically given our user population.**

### Changes made

1. **CookieBanner, InstallBanner, LoadingScreen, EnergyCheckin** — wired to `useMotion()`.
   All Framer Motion props now conditionally animated: `initial={shouldAnimate ? {...} : false}`.

2. **All `animate-spin` instances** — added `motion-reduce:animate-none` Tailwind variant.
   Where applicable, replaced spinning indicators with static alternatives in reduced-motion mode.

3. **Button.tsx** — added `focus-visible:ring-2 focus-visible:ring-offset-2` with offset matching
   surface color and ring using primary color at 60% opacity. Using `focus-visible:` (not `focus:`)
   preserves visual cleanliness for pointer users while enabling keyboard navigation.

4. **ArcTimer** — aria-label now updates based on phase state:
   - Default: "Focus timer — tap to hide/show digits"
   - Flow phase (disableToggle=true): "Focus timer — digits hidden in flow phase"

5. **EnergyCheckin emoji buttons** — added descriptive `aria-label` for each level:
   "Energy level 1 — Exhausted" through "Energy level 5 — High energy"

6. **AppShell skip link** — converted inline `#7B72FF` to CSS variable / Tailwind class,
   ensuring calm-mode desaturation applies.

## Consequences

**Positive:**
- App now passes WCAG 2.1 AA on focus visibility and non-text content
- Users with vestibular disorders no longer experience uncontrolled spinning animations
- Screen reader users can navigate energy picker and timer state changes
- Consistent design system — no more bypass of established patterns

**Negative / Trade-offs:**
- None. Changes are purely additive; no visual regression for users without accessibility needs.

## References

- WCAG 2.1: https://www.w3.org/TR/WCAG21/
- Vestibular Disorders Association: https://vestibular.org/article/diagnosis-treatment/
- MindShift Research #8: Calm palette, no red, sensory regulation
- `useMotion()` implementation: `src/shared/hooks/useMotion.ts`
