/**
 * shared/ui/ArchetypeSVG.jsx
 * Bolt 3.1 — Persona / Character UI
 *
 * Renders a geometric SVG avatar for a given archetype id.
 * All shapes are abstract / geometric — no faces, no human forms.
 * Used by: OnboardingPersona (features/onboarding) + PersonaCard (shared/ui).
 *
 * Color is inherited via CSS `color` / `currentColor` so the parent can
 * control mood-based coloring without prop drilling.
 *
 * Props:
 *   id     — "explorer" | "builder" | "dreamer" | "guardian"
 *   size   — number, default 48 (px)
 *   color  — explicit hex override; if omitted, inherits CSS currentColor
 */

import { memo } from "react";

export const ArchetypeSVG = memo(function ArchetypeSVG({ id, size = 48, color }) {
  const svgProps = {
    width:   size,
    height:  size,
    viewBox: "0 0 64 64",
    fill:    "none",
    stroke:  color || "currentColor",
    strokeWidth:   "2.5",
    strokeLinecap: "round",
    style: { display: "block" },
    "aria-hidden": "true",
  };

  switch (id) {
    // Explorer — circle with centre dot (movement, curiosity, navigation)
    case "explorer":
      return (
        <svg {...svgProps}>
          <circle cx="32" cy="32" r="21" />
          <circle cx="32" cy="32" r="4" fill={color || "currentColor"} stroke="none" />
          {/* cardinal cross lines */}
          <line x1="32" y1="11" x2="32" y2="17" />
          <line x1="32" y1="47" x2="32" y2="53" />
          <line x1="11" y1="32" x2="17" y2="32" />
          <line x1="47" y1="32" x2="53" y2="32" />
        </svg>
      );

    // Builder — square with a diagonal accent (construction, precision)
    case "builder":
      return (
        <svg {...svgProps}>
          <rect x="10" y="10" width="44" height="44" rx="3" />
          <line x1="10" y1="10" x2="54" y2="54" />
          <line x1="32" y1="10" x2="32" y2="54" />
        </svg>
      );

    // Dreamer — 4-pointed star (imagination, light, possibility)
    case "dreamer":
      return (
        <svg {...svgProps}>
          <path
            d="M32 7L36.5 27.5L57 32L36.5 36.5L32 57L27.5 36.5L7 32L27.5 27.5Z"
            strokeLinejoin="round"
          />
        </svg>
      );

    // Guardian — shield pentagon (protection, steadiness, reliability)
    case "guardian":
      return (
        <svg {...svgProps}>
          <path
            d="M32 6L54 18V36Q54 52 32 58Q10 52 10 36V18Z"
            strokeLinejoin="round"
          />
          {/* inner shield line for depth */}
          <path
            d="M32 14L47 23V36Q47 47 32 52Q17 47 17 36V23Z"
            strokeLinejoin="round"
            strokeOpacity="0.4"
          />
        </svg>
      );

    // Fallback: explorer
    default:
      return (
        <svg {...svgProps}>
          <circle cx="32" cy="32" r="21" />
          <circle cx="32" cy="32" r="4" fill={color || "currentColor"} stroke="none" />
        </svg>
      );
  }
});
