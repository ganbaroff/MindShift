/**
 * features/evening/CharacterCard.jsx
 * Displays the user's current level, XP bar, and +XP float animation.
 * Bolt 2.4: Character Progress.
 *
 * Props:
 *   level      number   — current level (floor(total_xp / 100) + 1)
 *   totalXp    number   — cumulative XP
 *   xpEarned   number|null — XP just earned this review (triggers animation)
 *   lang       "en"|"ru"|"az"
 *
 * Animation: inline <style> keyframe (xpFloat) — no Framer Motion needed.
 * XP_PER_LEVEL = 100 (ADR 0008).
 *
 * Exports: CharacterCard
 */

import { useState, useEffect } from "react";
import { C } from "../../skeleton/design-system/tokens.js";

const XP_PER_LEVEL = 100;

const S = {
  en: { level: "Level", xpToNext: "xp to next level", justEarned: "just earned" },
  ru: { level: "Уровень", xpToNext: "до следующего уровня", justEarned: "получено" },
  az: { level: "Səviyyə", xpToNext: "növbəti səviyyəyə qədər", justEarned: "qazanıldı" },
};

export function CharacterCard({ level, totalXp, xpEarned, lang }) {
  const tx = S[lang] || S.en;

  // XP within the current level (0 → XP_PER_LEVEL)
  const xpInLevel  = totalXp % XP_PER_LEVEL;
  const xpProgress = xpInLevel / XP_PER_LEVEL; // 0–1

  // Show +XP badge for 2 seconds after award
  const [showAnim, setShowAnim] = useState(false);
  useEffect(() => {
    if (!xpEarned) return;
    setShowAnim(true);
    const t = setTimeout(() => setShowAnim(false), 2200);
    return () => clearTimeout(t);
  }, [xpEarned]);

  return (
    <>
      {/* Keyframe — scoped to this component */}
      <style>{`
        @keyframes xpFloat {
          0%   { opacity: 1; transform: translateY(0)    scale(1);   }
          60%  { opacity: 1; transform: translateY(-24px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-44px) scale(0.9); }
        }
        @keyframes xpBarGrow {
          from { width: 0%; }
        }
      `}</style>

      <div style={{
        background:   C.surface,
        border:       `1px solid ${C.border}`,
        borderRadius: 16,
        padding:      "16px 18px",
        marginBottom: 12,
        position:     "relative",
        overflow:     "hidden",
      }}>
        {/* +XP float animation */}
        {showAnim && xpEarned && (
          <div style={{
            position:   "absolute",
            top:        12,
            right:      16,
            color:      C.accentLit,
            fontWeight: 800,
            fontSize:   18,
            animation:  "xpFloat 2.2s ease forwards",
            pointerEvents: "none",
            zIndex:     10,
          }}>
            +{xpEarned} xp
          </div>
        )}

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {/* Level badge */}
          <div style={{
            width:        44,
            height:       44,
            borderRadius: 12,
            background:   C.accentDim,
            border:       `1.5px solid ${C.accentGlow}`,
            display:      "flex",
            flexDirection:"column",
            alignItems:   "center",
            justifyContent: "center",
            flexShrink:   0,
          }}>
            <span style={{ fontSize: 9, color: C.textSub, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {tx.level}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.accentLit, lineHeight: 1 }}>
              {level}
            </span>
          </div>

          {/* XP info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              {totalXp} XP
            </div>
            <div style={{
              height:       6,
              background:   C.border,
              borderRadius: 9999,
              overflow:     "hidden",
            }}>
              <div style={{
                height:     "100%",
                width:      `${Math.round(xpProgress * 100)}%`,
                background: `linear-gradient(90deg, ${C.accent}, ${C.accentLit})`,
                borderRadius: 9999,
                transition: "width 0.8s cubic-bezier(.22,1,.36,1)",
              }} />
            </div>
            <div style={{ color: C.textSub, fontSize: 11, marginTop: 4 }}>
              {XP_PER_LEVEL - xpInLevel} {tx.xpToNext}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
