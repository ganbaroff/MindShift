/**
 * skeleton/design-system/global.css.js
 * Dynamic global CSS string — injected via <style>{CSS}</style> in App.
 * References design tokens so animations and base styles stay in sync.
 *
 * Exports: CSS
 *
 * Bolt 1.7: extracted from mindflow.jsx lines 851–918.
 */

import { C } from "./tokens.js";

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  html, body {
    background: ${C.bg};
    font-family: 'DM Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    scroll-behavior: smooth;
    overscroll-behavior: none;
  }

  h1, h2, h3, .font-display {
    font-family: 'Syne', system-ui, sans-serif;
  }

  textarea::placeholder, input::placeholder { color: ${C.textDim}; }

  /* Focus-visible: only show focus ring on keyboard navigation (WCAG 2.4.11) */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid ${C.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Text selection */
  ::selection { background: ${C.accent}44; color: ${C.text}; }

  ::-webkit-scrollbar { width: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.borderHi}; border-radius: 2px; }

  /* Prevent text size adjust on orientation change (mobile) */
  html { -webkit-text-size-adjust: 100%; }

  /* Touch action optimization for swipeable cards */
  [data-testid="thought-card"] { touch-action: pan-y; }

  button { -webkit-user-select: none; user-select: none; }
  button:active { opacity: 0.85; }

  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes toastIn    { from { opacity:0; transform:translateX(-50%) translateY(-10px) scale(.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
  @keyframes fadeIn     { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes navPop     { from { opacity:0; transform:translateX(-50%) scale(.7); } to { opacity:1; transform:translateX(-50%) scale(1); } }
  @keyframes badgePop   { 0% { transform:scale(0); } 70% { transform:scale(1.2); } 100% { transform:scale(1); } }
  @keyframes micPulse   { 0%,100%{ box-shadow:0 0 0 0 ${C.high}66 } 50%{ box-shadow:0 0 0 8px transparent } }
  @keyframes shimmer    { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  @keyframes slideUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn    { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
  @keyframes pulse      { 0%,100%{ opacity:1; } 50%{ opacity:0.5; } }

  /* Bolt 5.2: Focus Mode animations */
  @keyframes focusDoneRing    { from { opacity:0; transform:scale(.7); } to { opacity:1; transform:scale(1); } }
  @keyframes bodyDoublePulse  { 0%,100%{ opacity:.3; } 50%{ opacity:.7; } }
  @keyframes bodyDoubleBreath { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.25); } }
  @keyframes focusSlideUp     { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }

  input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }

  /* High contrast media query */
  @media (prefers-contrast: high) {
    :focus-visible { outline-width: 3px; }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;
