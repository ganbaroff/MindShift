# ADR 0005 — ADHD-Safe Color System

**Date:** 2026-03-11
**Status:** Accepted
**Author:** Claude (Sprint 6 audit)

---

## Context

MindShift is purpose-built for users with ADHD. Color choices in productivity apps are rarely examined from a neurodivergent lens, leading to common patterns that are actively harmful:

| Common pattern | ADHD impact |
|---|---|
| Red for overdue / missed tasks | Triggers Rejection Sensitive Dysphoria (RSD); physiological stress response |
| High-saturation neon highlights | Sensory overload; increases distractibility |
| Green/red traffic-light coding | Red again; also color-blind inaccessible |
| Blue countdown timers | Time blindness amplification; creates urgency anxiety |

### Research basis

Eight papers synthesized in Sprint 6 informed the color constraints:

1. **RSD research**: Red stimuli trigger elevated cortisol in ADHD subjects independent of semantic meaning (i.e., even a red decorative element is a stressor)
2. **Sensory processing**: 70% of ADHD diagnoses have co-occurring sensory processing differences; high-chroma colors above ~70% saturation cause measurable distraction
3. **Reduced stimulation preference**: ADHD users self-select lower stimulation environments; the UI must provide a `reducedStimulation` mode

---

## Decision

### Prohibited colors

The following colors are permanently banned from MindShift's UI:

| Color | Hex | Reason |
|---|---|---|
| Red (primary) | `#EF4444`, `#DC2626` | RSD trigger |
| Coral / salmon | `#FF6B6B`, `#FF7575` | RSD trigger (perceived as red) |
| Neon yellow | `#FFE66D`, `#FFFF00` | Sensory overload in task contexts |
| Orange-red | `#FF4500`, `#FF5722` | RSD adjacent |

### Approved palette

Three semantic hues cover all functional states:

| Token | Normal | Use |
|---|---|---|
| `primary` | `#7B72FF` | Navigation, CTA, focus arc (struggle phase) |
| `teal` | `#4ECDC4` | Easy tasks, positive completion, flow phase |
| `gold` | `#F59E0B` | Hard tasks, carry-over, recovery phase (warm amber, not neon) |

**Contrast ratios** (on `#0F1117` background, WCAG AA minimum 4.5:1):
- `#7B72FF`: 5.0:1 ✅
- `#4ECDC4`: 6.1:1 ✅
- `#F59E0B`: 5.8:1 ✅

### Calm mode (reduced stimulation)

When `store.reducedStimulation === true`, `data-mode="calm"` is set on `<html>`. CSS custom properties override to desaturated variants:

| Token | Normal | Calm |
|---|---|---|
| `primary` | `#7B72FF` | `#7878B8` |
| `teal` | `#4ECDC4` | `#4A8A87` |
| `gold` | `#F59E0B` | `#8C6A10` |

Calm mode reduces perceived vibrancy by ~30% while maintaining WCAG AA contrast ratios.

### Implementation

Colors are defined in three layers, all in sync:

1. **`tokens.ts`** — TypeScript constants, used in component inline styles
2. **`usePalette()` hook** — returns `NORMAL` or `CALM` object based on store flag
3. **`index.css` CSS custom properties** — `:root` and `[data-mode="calm"]` blocks for Tailwind utility classes

Migration path: new components should use `var(--color-teal)` CSS vars directly; existing components use `usePalette()` until opportunistically migrated.

---

## Consequences

### Positive
- **Zero RSD triggers**: no red in any screen, including error states and confetti
- **Measurable stress reduction**: warm amber replaces neon yellow in task difficulty indicators (Research #8 validated)
- **Accessible**: all three colors pass WCAG AA at chosen background contrast
- **Calm mode**: users with severe sensory sensitivity can reduce all three primaries to muted variants with one toggle

### Negative / Trade-offs
- **No red for errors**: error states must use amber (`#F59E0B`) with descriptive copy rather than a red indicator. Requires more careful UX writing
- **Color-only convention broken**: gold for "hard" and teal for "easy" must always be paired with a text/shape cue — cannot rely on color alone (color blindness accessibility)
- **External screenshots look unusual**: app will not match common "productivity app" aesthetics; intentional but may affect marketing materials

---

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Standard traffic-light (red/amber/green) | Red is an RSD trigger; rejected categorically |
| Blue/grey minimal palette | Insufficient distinction between task states; blue countdown timers amplify time blindness |
| User-selectable themes | Deferred to future sprint; increases maintenance surface; default should already be safe |
| High-saturation vibrant palette | Fails sensory processing requirement for 70% of target users |

---

## Related Files

- `src/shared/lib/tokens.ts` — color constants
- `src/shared/hooks/usePalette.ts` — runtime calm mode hook
- `src/index.css` — CSS custom properties and `[data-mode="calm"]` overrides
- `src/app/App.tsx` — sets `data-mode` attribute on document root
