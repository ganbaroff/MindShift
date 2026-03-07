/**
 * shared/ui/PersonaCard.jsx
 * Bolt 3.1 — Persona / Character UI
 *
 * Displays the user's archetype avatar, name, level, XP bar, and a
 * mood-aware phrase. Used on TodayScreen above DayPlanDump.
 *
 * Mood states (AC3):
 *   "idle"       — grey (#888888) ring, resting phrase
 *   "active"     — archetype colour ring, active phrase  (default)
 *   "celebrated" — gold (#FFD700) ring + 300ms pulse, celebrated phrase;
 *                  auto-resets to "active" after animation
 *
 * Animation: scoped <style> keyframe (personaPulse) — no Framer Motion.
 * prefers-reduced-motion: global.css.js disables all keyframes automatically.
 *
 * Props:
 *   archetype  — "explorer" | "builder" | "dreamer" | "guardian"
 *   name       — display name string
 *   user       — Supabase User object (passed to useCharacterProgress)
 *   lang       — "en" | "ru" | "az"
 *   mood       — "idle" | "active" | "celebrated"  (optional, default "active")
 */

import { useState, useEffect, useRef } from "react";
import { C }                from "../../skeleton/design-system/tokens.js";
import { useCharacterProgress } from "../hooks/useCharacterProgress.js";
import { ArchetypeSVG }     from "./ArchetypeSVG.jsx";
import {
  ARCHETYPES,
  getMoodColor,
  getPhrase,
} from "../lib/archetypes.js";

const XP_PER_LEVEL = 100; // ADR 0008

const LEVEL_LABEL = { en: "Lv", ru: "Ур", az: "Sv" };

// ─── Component ─────────────────────────────────────────────────────────────

export function PersonaCard({ archetype = "explorer", name, user, lang, mood: moodProp = "active" }) {
  const { totalXp, level, progressLoading } = useCharacterProgress(user);

  // Local mood — "celebrated" auto-resets to "active" after animation
  const [mood,      setMood]      = useState(moodProp);
  const [isPulsing, setIsPulsing] = useState(false);
  const celebrateTimer = useRef(null);

  // Sync external mood prop
  useEffect(() => {
    if (moodProp === "celebrated") {
      setMood("celebrated");
      setIsPulsing(true);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => {
        setIsPulsing(false);
        setMood("active");
      }, 1400); // pulse plays at 300ms, then lingers briefly
    } else {
      setMood(moodProp);
    }
    return () => clearTimeout(celebrateTimer.current);
  }, [moodProp]);

  // Defensive archetype fallback (AC9)
  const arc         = ARCHETYPES[archetype] || ARCHETYPES.explorer;
  const moodColor   = getMoodColor(archetype, mood);
  const phrase      = getPhrase(archetype, mood, lang);
  const displayName = name || arc.defaultName[lang] || arc.defaultName.en;
  const levelLabel  = LEVEL_LABEL[lang] || LEVEL_LABEL.en;

  // XP within current level
  const xpInLevel  = progressLoading ? 0 : (totalXp % XP_PER_LEVEL);
  const xpProgress = xpInLevel / XP_PER_LEVEL; // 0–1

  return (
    <>
      {/* Scoped keyframes — personaPulse is feature-specific, not in global.css.js */}
      <style>{`
        @keyframes personaPulse {
          0%   { box-shadow: 0 0 0 0   ${moodColor}55; }
          50%  { box-shadow: 0 0 0 10px ${moodColor}22; }
          100% { box-shadow: 0 0 0 0   ${moodColor}00; }
        }
      `}</style>

      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        background:   C.surface,
        border:       `1px solid ${C.border}`,
        borderRadius: 16,
        padding:      "14px 16px",
        marginBottom: 12,
        animation:    isPulsing ? "personaPulse 300ms ease-out 1" : "none",
      }}>
        {/* Avatar ring */}
        <div style={{
          flexShrink:   0,
          width:        56,
          height:       56,
          borderRadius: "50%",
          border:       `2.5px solid ${moodColor}`,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          background:   `${moodColor}14`,
          transition:   "border-color .3s, background .3s",
        }}
          aria-hidden="true"
        >
          <div style={{ color: moodColor, transition: "color .3s" }}>
            <ArchetypeSVG id={archetype} size={32} />
          </div>
        </div>

        {/* Text column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{
            display:    "flex",
            alignItems: "baseline",
            gap:        6,
            marginBottom: 2,
          }}>
            <span style={{
              fontSize:    15,
              fontWeight:  700,
              color:       C.text,
              whiteSpace:  "nowrap",
              overflow:    "hidden",
              textOverflow:"ellipsis",
            }}>
              {displayName}
            </span>

            {/* Level badge */}
            {!progressLoading && (
              <span style={{
                fontSize:   11,
                fontWeight: 700,
                color:      moodColor,
                background: `${moodColor}18`,
                border:     `1px solid ${moodColor}44`,
                borderRadius: 9999,
                padding:    "1px 6px",
                flexShrink: 0,
                transition: "color .3s, background .3s, border-color .3s",
              }}>
                {levelLabel} {level}
              </span>
            )}
          </div>

          {/* Mood phrase */}
          <p style={{
            fontSize:   12,
            color:      C.textSub,
            margin:     "0 0 6px",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            overflow:   "hidden",
            textOverflow: "ellipsis",
          }}>
            {phrase}
          </p>

          {/* XP bar */}
          {!progressLoading && (
            <div style={{
              height:       4,
              background:   C.border,
              borderRadius: 9999,
              overflow:     "hidden",
            }}>
              <div style={{
                height:       "100%",
                width:        `${Math.round(xpProgress * 100)}%`,
                background:   `linear-gradient(90deg, ${moodColor}, ${moodColor}cc)`,
                borderRadius: 9999,
                transition:   "width 0.7s cubic-bezier(.22,1,.36,1), background .3s",
              }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
