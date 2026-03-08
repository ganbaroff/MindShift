/**
 * shared/ui/LevelUpToast.jsx
 * Bolt 4.1 — Level Up celebration toast (ADR 0013).
 *
 * Shows "Level Up! → Lv {newLevel}" when the user's XP causes a level change.
 * Auto-dismissed by the parent (useCharacterProgress sets levelUpPayload to
 * null after 2.5s). This component is stateless — just renders or not.
 *
 * Design:
 *   - Fixed, centered at top of viewport (z-index 9999)
 *   - Uses `toastIn` keyframe from global.css.js (no inline @keyframes)
 *   - prefers-reduced-motion: global.css.js sets animation-duration: 0.01ms
 *   - Archetype color ring (falls back to C.done green)
 *   - No emoji overload — single ⬆ icon, two short text spans
 *   - role="status" + aria-live="polite" for screen readers
 *   - pointer-events: none — never blocks interaction
 *
 * ADHD compliance:
 *   P2: positive, brief, auto-dismissing — no modal, no confirmation needed
 *   P7: no pressure language ("you need X more XP" etc.)
 *
 * Props:
 *   newLevel  — number  (the new level after leveling up)
 *   color     — string  (archetype hex color, optional — defaults to C.done)
 *   lang      — "en" | "ru" | "az"
 */

import { C } from "../../skeleton/design-system/tokens.js";

const LEVEL_UP_LABEL = {
  en: "Level Up!",
  ru: "Новый уровень!",
  az: "Yeni səviyyə!",
};

const LV_LABEL = {
  en: "Lv",
  ru: "Ур",
  az: "Sv",
};

export function LevelUpToast({ newLevel, color, lang = "en" }) {
  if (!newLevel) return null;

  const lvColor    = color || C.done;
  const levelLabel = LEVEL_UP_LABEL[lang] || LEVEL_UP_LABEL.en;
  const lvLabel    = LV_LABEL[lang]       || LV_LABEL.en;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position:      "fixed",
        top:           24,
        left:          "50%",
        transform:     "translateX(-50%)",
        zIndex:        9999,
        display:       "flex",
        alignItems:    "center",
        gap:           8,
        background:    C.surfaceHi,
        border:        `1.5px solid ${lvColor}`,
        borderRadius:  9999,
        padding:       "10px 20px",
        boxShadow:     `0 4px 24px ${lvColor}44`,
        animation:     "toastIn 300ms cubic-bezier(.22,1,.36,1) both",
        pointerEvents: "none",
        whiteSpace:    "nowrap",
        userSelect:    "none",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>⬆</span>

      <span style={{
        color:       lvColor,
        fontWeight:  800,
        fontSize:    15,
        letterSpacing: -0.3,
      }}>
        {levelLabel}
      </span>

      <span style={{ color: C.textSub, fontSize: 13 }}>→</span>

      <span style={{
        color:        lvColor,
        fontWeight:   700,
        fontSize:     14,
        background:   `${lvColor}18`,
        border:       `1px solid ${lvColor}44`,
        borderRadius: 9999,
        padding:      "2px 10px",
      }}>
        {lvLabel} {newLevel}
      </span>
    </div>
  );
}
