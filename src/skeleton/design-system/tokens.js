/**
 * skeleton/design-system/tokens.js
 * Design tokens — the single source of truth for all colors in MindFlow.
 * Human-owned file. Changes require ADR.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 324–353.
 */

export const C = {
  bg:        "#07070D",
  surface:   "#0F0F18",
  surfaceHi: "#171724",
  border:    "#1E1E2E",
  borderHi:  "#2E2E48",
  accent:    "#6C5CE7",
  accentLit: "#8B7FFF",
  accentDim: "#6C5CE715",
  accentGlow:"#6C5CE740",
  text:      "#F0F0F8",
  textSub:   "#6868A0",
  textDim:   "#2E2E48",
  task:      "#6C5CE7",
  idea:      "#F0A500",
  reminder:  "#9B7FE8",
  expense:   "#FF6B6B",
  memory:    "#00CEC9",
  note:      "#636380",
  done:      "#00B894",
  high:      "#FF6B6B",
  medium:    "#FDCB6E",
  low:       "#00B894",
  // glow colors for cards
  glowTask:    "rgba(108,92,231,0.12)",
  glowIdea:    "rgba(240,165,0,0.10)",
  glowDone:    "rgba(0,184,148,0.10)",
};

export const P_COLOR = { critical: C.high, high: C.high, medium: C.medium, low: C.low, none: "transparent" };
