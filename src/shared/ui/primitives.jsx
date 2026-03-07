/**
 * shared/ui/primitives.jsx
 * Tiny reusable UI atoms used across all screens.
 *
 * Exports: Spinner, Toast, Card, Toggle
 *
 * Bolt 1.5: extracted from mindflow.jsx lines 343–391.
 */

import { C } from "../../skeleton/design-system/tokens.js";

// ─────────────────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "white" }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}33`, borderTopColor: color,
      borderRadius: "50%", animation: "spin .7s linear infinite",
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: separate Toast animation from inline fadeIn
export function Toast({ msg, type = "success" }) {
  const bg = type === "error" ? C.high : type === "info" ? C.surfaceHi : C.accent;
  return (
    <div role="alert" aria-live="polite" style={{
      position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "white", padding: "9px 20px", borderRadius: 11,
      fontSize: 13, fontWeight: 600, zIndex: 9999, whiteSpace: "nowrap",
      boxShadow: `0 4px 24px ${bg}55`, animation: "toastIn .2s ease",
      border: type === "info" ? `1px solid ${C.border}` : "none",
      maxWidth: "90vw", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function Card({ title, children, action, icon }) {
  return (
    <div style={{ marginBottom: 10, background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon && <div style={{ opacity: 0.6 }}>{icon}</div>}
          <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 46, height: 26, borderRadius: 13, background: on ? C.accent : C.surfaceHi, border: `1px solid ${on ? C.accent : C.border}`, cursor: "pointer", position: "relative", transition: "all .2s", flexShrink: 0, boxShadow: on ? `0 0 12px ${C.accentGlow}` : "none" }}>
      <div style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .2s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
    </div>
  );
}
