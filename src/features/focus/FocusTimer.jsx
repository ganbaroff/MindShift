/**
 * features/focus/FocusTimer.jsx
 * Visual Time Timer — SVG diminishing arc, not digits.
 *
 * Bolt 5.2 (ADR 0018): Time Timer concept from clinical research:
 *   - Gunther et al. (2019): TPA p=0.019, DTM p=0.01 — clinically significant
 *   - Diminishing coloured sector = spatial/visual quantity of time remaining
 *   - Peripheral glance sufficient — no cognitive conversion required
 *   - Digit display is secondary (small, accessible, not dominant)
 *
 * ADHD design principles:
 *   - No red for "almost done" — use the archetype accent colour throughout
 *   - Soft pulse animation when running (tactile "heartbeat" of the timer)
 *   - Completion = dopamine celebration animation (not a failure sound)
 *   - Pause state = dimmed arc, no shame language
 *
 * Props:
 *   progress          {number}   0.0 (done) → 1.0 (full)
 *   remaining         {number}   seconds remaining
 *   state             {string}   'idle'|'running'|'paused'|'done'
 *   duration          {number}   current sprint in minutes
 *   archetypeColor    {string}   hex color from ARCHETYPE_COLORS
 *   onStart           {Function}
 *   onPause           {Function}
 *   onResume          {Function}
 *   onReset           {Function}
 *   onSetDuration     {Function} (minutes: number) => void
 *   lang              {string}
 */

import { memo } from "react";
import { C }    from "../../skeleton/design-system/tokens.js";
import { SPRINT_OPTIONS, formatRemaining } from "./useFocusTimer.js";

// ── SVG arc geometry ────────────────────────────────────────────────────────

const SIZE   = 220;  // SVG viewport size (px)
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const RADIUS = 88;   // arc radius
const STROKE = 14;   // ring stroke width

/**
 * Polar → Cartesian conversion.
 * Angles in degrees, 0° = 12 o'clock (top), clockwise.
 */
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * SVG arc path for a sector (filled pie segment).
 * @param {number} progress  0 → 1
 * @param {string} color
 * @returns {string} SVG path d attribute
 */
function arcPath(progress) {
  if (progress <= 0) return "";
  if (progress >= 1) {
    // Full circle — use two arcs (single arc can't span 360°)
    const top = polar(CX, CY, RADIUS, 0);
    return [
      `M ${CX} ${CY}`,
      `L ${top.x} ${top.y}`,
      `A ${RADIUS} ${RADIUS} 0 1 1 ${top.x - 0.001} ${top.y}`,
      "Z",
    ].join(" ");
  }

  const endAngle = progress * 360; // degrees
  const end      = polar(CX, CY, RADIUS, endAngle);
  const start    = polar(CX, CY, RADIUS, 0);
  const large    = endAngle > 180 ? 1 : 0;

  return [
    `M ${CX} ${CY}`,
    `L ${start.x} ${start.y}`,
    `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

// ── Sprint selector ─────────────────────────────────────────────────────────

const SPRINT_LABELS = {
  5:  { en: "5 min",  ru: "5 мин",  az: "5 dəq"  },
  25: { en: "25 min", ru: "25 мин", az: "25 dəq" },
  45: { en: "45 min", ru: "45 мин", az: "45 dəq" },
  90: { en: "90 min", ru: "90 мин", az: "90 dəq" },
};

const STATE_LABELS = {
  idle:    { en: "Start Focus", ru: "Начать фокус",  az: "Fokus başlat" },
  running: { en: "Pause",       ru: "Пауза",         az: "Dayandır"     },
  paused:  { en: "Resume",      ru: "Продолжить",    az: "Davam et"     },
  done:    { en: "Start again", ru: "Снова начать",  az: "Yenidən başla" },
};

const RESET_LABELS = { en: "Reset", ru: "Сбросить", az: "Sıfırla" };

// ── Component ───────────────────────────────────────────────────────────────

export const FocusTimer = memo(function FocusTimer({
  progress,
  remaining,
  state,
  duration,
  archetypeColor,
  onStart,
  onPause,
  onResume,
  onReset,
  onSetDuration,
  lang = "en",
}) {
  const color     = archetypeColor || C.accent;
  const isDone    = state === "done";
  const isRunning = state === "running";
  const isPaused  = state === "paused";
  const isIdle    = state === "idle";
  const canChange = isIdle || isDone;

  // Arc opacity: dim when paused
  const arcOpacity = isPaused ? 0.4 : 1;

  // Main action
  function handleMainAction() {
    if (isIdle || isDone) onStart?.();
    else if (isRunning)   onPause?.();
    else if (isPaused)    onResume?.();
  }

  const mainLabel  = (STATE_LABELS[state]?.[lang] ?? STATE_LABELS[state]?.en) || "Start";
  const resetLabel = RESET_LABELS[lang] ?? RESET_LABELS.en;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

      {/* ── Sprint selector ─────────────────────────────────────────────── */}
      <div style={{
        display:  "flex",
        gap:       8,
        opacity:   canChange ? 1 : 0.35,
        pointerEvents: canChange ? "auto" : "none",
        transition: "opacity .2s",
      }}>
        {SPRINT_OPTIONS.map(min => {
          const isSelected = duration === min;
          return (
            <button
              key={min}
              onClick={() => onSetDuration?.(min)}
              disabled={!canChange}
              aria-pressed={isSelected}
              style={{
                minWidth:   54,
                minHeight:  36,
                padding:    "4px 10px",
                background:  isSelected ? `${color}22` : "transparent",
                border:     `1px solid ${isSelected ? color : C.border}`,
                borderRadius: 8,
                color:       isSelected ? color : C.textSub,
                fontSize:    12,
                fontWeight:  isSelected ? 700 : 500,
                cursor:      canChange ? "pointer" : "default",
                fontFamily:  "inherit",
                transition:  "all .15s",
              }}
            >
              {SPRINT_LABELS[min]?.[lang] ?? `${min}m`}
            </button>
          );
        })}
      </div>

      {/* ── SVG Time Timer ──────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-label={`${formatRemaining(remaining)} remaining`}
          role="img"
        >
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke={`${color}18`}
            strokeWidth={STROKE}
          />

          {/* Filled arc sector (diminishes as time passes) */}
          {progress > 0 && (
            <path
              d={arcPath(progress)}
              fill={color}
              fillOpacity={arcOpacity}
              style={{
                transition: isRunning
                  ? "none" // live update via rAF — no CSS transition needed
                  : "fill-opacity .3s ease",
              }}
            />
          )}

          {/* Thin stroke ring on top (framing) */}
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke={`${color}30`}
            strokeWidth={1.5}
          />

          {/* Done ring glow */}
          {isDone && (
            <circle
              cx={CX}
              cy={CY}
              r={RADIUS + STROKE / 2}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeOpacity={0.5}
              style={{ animation: "focusDoneRing 1s ease forwards" }}
            />
          )}
        </svg>

        {/* Time readout — center of circle */}
        <div style={{
          position:   "absolute",
          top:        "50%",
          left:       "50%",
          transform:  "translate(-50%, -50%)",
          textAlign:  "center",
          userSelect: "none",
          pointerEvents: "none",
        }}>
          {isDone ? (
            <div style={{ fontSize: 40, lineHeight: 1 }}>✅</div>
          ) : (
            <>
              <div style={{
                fontSize:   36,
                fontWeight: 700,
                color:      isRunning ? color : C.textSub,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: 1,
                transition: "color .3s",
              }}>
                {formatRemaining(remaining)}
              </div>
              <div style={{
                fontSize:  11,
                color:     C.textDim,
                marginTop:  2,
                fontWeight: 500,
              }}>
                {isPaused
                  ? (lang === "ru" ? "пауза" : lang === "az" ? "fasilə" : "paused")
                  : isRunning
                    ? (lang === "ru" ? "фокус" : lang === "az" ? "fokus" : "focus")
                    : ""}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* Reset — visible when running/paused/done */}
        {!isIdle && (
          <button
            onClick={onReset}
            aria-label={resetLabel}
            style={{
              width:        44,
              height:       44,
              borderRadius: "50%",
              background:   "transparent",
              border:       `1px solid ${C.border}`,
              color:        C.textSub,
              fontSize:     18,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              cursor:       "pointer",
              fontFamily:   "inherit",
              transition:   "border-color .15s, color .15s",
            }}
          >
            ↺
          </button>
        )}

        {/* Main CTA */}
        <button
          onClick={handleMainAction}
          aria-label={mainLabel}
          style={{
            minWidth:     160,
            height:        52,
            borderRadius:  26,
            background:   `${color}22`,
            border:       `1.5px solid ${color}`,
            color:         color,
            fontSize:      16,
            fontWeight:    700,
            cursor:        "pointer",
            fontFamily:    "inherit",
            letterSpacing: 0.3,
            transition:   "background .15s, transform .1s",
            // Active press scale
            WebkitTapHighlightColor: "transparent",
          }}
          onPointerDown={e => { e.currentTarget.style.transform = "scale(0.96)"; }}
          onPointerUp={e   => { e.currentTarget.style.transform = "scale(1)"; }}
          onPointerLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {mainLabel}
        </button>
      </div>
    </div>
  );
});
