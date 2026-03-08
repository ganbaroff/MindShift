/**
 * features/focus/BodyDoubling.jsx
 * Persona Body Doubling — the avatar "works alongside" the user during focus.
 *
 * Bolt 5.2 (ADR 0018):
 *   Based on Focusmate research: synchronized virtual presence increases
 *   task completion rates by 32%. Body doubling compensates for ADHD
 *   executive dysfunction by externalising accountability.
 *
 *   Proteus Effect (Yee & Bailenson, 2007): avatar primes real behaviour.
 *   The persona working silently alongside the user reinforces their
 *   chosen archetype identity during the session.
 *
 * Phase messages at 0% / 25% / 50% / 75% / 100% progress:
 *   - Start (idle → running): "Let's begin"
 *   - Quarter (75% progress remaining → 25% done): encouragement
 *   - Half (50%): midpoint acknowledgment
 *   - Three-quarters (25%): final stretch
 *   - Done: celebration
 *
 * ADHD design:
 *   - Avatar never "dies", never shows disappointment, never nags
 *   - Messages are short (< 8 words), warm, never urgent
 *   - Idle state shows archetype posture (working, not waiting impatiently)
 *
 * Props:
 *   archetype     {string}  explorer|builder|dreamer|guardian
 *   personaName   {string}  user-chosen name
 *   archetypeColor {string} hex
 *   timerState    {string}  idle|running|paused|done
 *   progress      {number}  0→1
 *   lang          {string}
 */

import { useState, useEffect, useRef, memo } from "react";
import { C } from "../../skeleton/design-system/tokens.js";

// ── Focus Body Doubling Phrases ─────────────────────────────────────────────
// Feature-specific: do not move to shared/lib/archetypes.js (used only here)

const FOCUS_PHRASES = {
  explorer: {
    start:   { en: "Into the unknown — let's go.",  ru: "В неизведанное — вперёд.",   az: "Naməluma doğru — gedək." },
    quarter: { en: "Good pace. Keep exploring.",    ru: "Хороший темп. Продолжай.",   az: "Yaxşı temp. Davam et." },
    half:    { en: "Halfway through the expedition.", ru: "Половина пути пройдена.", az: "Yarı yolda." },
    stretch: { en: "Almost there. Final stretch.",  ru: "Почти готово. Финал.",       az: "Az qaldı. Son mərhələ." },
    done:    { en: "Mission complete. Well done.",  ru: "Миссия выполнена.",          az: "Missiya tamamlandı." },
    working: { en: "Working alongside you.",        ru: "Работаю рядом с тобой.",     az: "Yanında işləyirəm." },
  },
  builder: {
    start:   { en: "Let's build something today.",  ru: "Строим вместе.",             az: "Bu gün bir şey quraq." },
    quarter: { en: "Piece by piece, it takes shape.", ru: "Кирпичик за кирпичиком.", az: "Addım-addım formalaşır." },
    half:    { en: "Halfway. The shape is clear.",  ru: "Половина. Форма ясна.",      az: "Yarı yolda. Forma aydındır." },
    stretch: { en: "Almost built. Keep going.",     ru: "Почти готово. Давай.",       az: "Az qaldı. Davam et." },
    done:    { en: "Solid work. You built that.",   ru: "Крепкая работа. Построено.", az: "Möhkəm iş. Qurdun." },
    working: { en: "Building alongside you.",       ru: "Строю рядом с тобой.",       az: "Yanında qururam." },
  },
  dreamer: {
    start:   { en: "Dream it. Now do it.",          ru: "Мечтай. Теперь делай.",      az: "Xəyal et. İndi et." },
    quarter: { en: "Ideas in motion. Nice.",        ru: "Идеи в движении.",           az: "Fikirlər hərəkətdədir." },
    half:    { en: "Halfway. The vision is real.",  ru: "Половина. Видение реально.", az: "Yarı yolda. Xəyal realdır." },
    stretch: { en: "Almost there. Stay with it.",   ru: "Почти готово. Держись.",     az: "Az qaldı. Davam et." },
    done:    { en: "Dream became real today.",      ru: "Мечта стала реальностью.",   az: "Xəyal gerçəkləşdi." },
    working: { en: "Dreaming and doing with you.",  ru: "Мечтаю и делаю рядом.",      az: "Seninlə xəyal edirəm." },
  },
  guardian: {
    start:   { en: "Steady. Let's protect this.",   ru: "Спокойно. Защитим это.",     az: "Sakit. Bunu qoruyaq." },
    quarter: { en: "Steady pace. One step at a time.", ru: "Спокойно. Шаг за шагом.", az: "Sakit. Addım-addım." },
    half:    { en: "Halfway. Holding the line.",    ru: "Половина. Держим позицию.",  az: "Yarı. Mövqeyi saxlayırıq." },
    stretch: { en: "Almost done. Stay steady.",     ru: "Почти всё. Держись.",        az: "Az qaldı. Sabit qal." },
    done:    { en: "You held it together. Good.",   ru: "Ты справился. Хорошо.",      az: "Dözdün. Yaxşı iş." },
    working: { en: "Holding the line with you.",    ru: "Держу позицию рядом.",       az: "Yanında mövqeyimi saxlayıram." },
  },
};

/**
 * Get the appropriate focus phrase based on timer phase.
 * @param {string} archetype
 * @param {'idle'|'running'|'paused'|'done'} timerState
 * @param {number} progress  0→1
 * @param {string} lang
 * @returns {string}
 */
function getFocusPhrase(archetype, timerState, progress, lang) {
  const phrases = FOCUS_PHRASES[archetype] || FOCUS_PHRASES.explorer;

  if (timerState === "idle")   return phrases.working[lang] || phrases.working.en;
  if (timerState === "done")   return phrases.done[lang]    || phrases.done.en;
  if (timerState === "paused") return phrases.working[lang] || phrases.working.en;

  // Running — phase based on how much is left (progress goes 1 → 0)
  const done = 1 - progress;
  if (done < 0.05)  return phrases.start[lang]   || phrases.start.en;
  if (done < 0.35)  return phrases.quarter[lang]  || phrases.quarter.en;
  if (done < 0.60)  return phrases.half[lang]     || phrases.half.en;
  if (done < 0.85)  return phrases.stretch[lang]  || phrases.stretch.en;
  return phrases.done[lang] || phrases.done.en;
}

// ── Archetype avatar (simple geometric SVG — same style as PersonaCard) ─────

function AvatarSVG({ archetype, color, size = 64 }) {
  const c = size / 2;
  const r = size * 0.36;

  const shapes = {
    explorer: (
      // Diamond / compass rose
      <polygon
        points={`${c},${c - r} ${c + r * 0.7},${c} ${c},${c + r} ${c - r * 0.7},${c}`}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={1.5}
      />
    ),
    builder: (
      // Square (structure)
      <rect
        x={c - r * 0.72}
        y={c - r * 0.72}
        width={r * 1.44}
        height={r * 1.44}
        rx={4}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={1.5}
      />
    ),
    dreamer: (
      // Star (aspiration)
      <polygon
        points={[0,1,2,3,4].map(i => {
          const outer = polar(c, c, r, i * 72);
          const inner = polar(c, c, r * 0.45, i * 72 + 36);
          return `${outer.x},${outer.y} ${inner.x},${inner.y}`;
        }).join(" ")}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={1.5}
      />
    ),
    guardian: (
      // Shield / hexagon
      <polygon
        points={[0,1,2,3,4,5].map(i => {
          const pt = polar(c, c, r, i * 60);
          return `${pt.x},${pt.y}`;
        }).join(" ")}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={1.5}
      />
    ),
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {shapes[archetype] || shapes.explorer}
    </svg>
  );
}

// Helper for AvatarSVG polygon calculations
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Component ────────────────────────────────────────────────────────────────

export const BodyDoubling = memo(function BodyDoubling({
  archetype     = "explorer",
  personaName   = "",
  archetypeColor,
  timerState    = "idle",
  progress      = 1,
  lang          = "en",
}) {
  const color   = archetypeColor || C.accent;
  const phrase  = getFocusPhrase(archetype, timerState, progress, lang);

  // Animate phrase changes
  const [displayed, setDisplayed] = useState(phrase);
  const [fade,      setFade]      = useState(true);
  const prevPhraseRef = useRef(phrase);

  useEffect(() => {
    if (phrase === prevPhraseRef.current) return;
    setFade(false);
    const t = setTimeout(() => {
      setDisplayed(phrase);
      prevPhraseRef.current = phrase;
      setFade(true);
    }, 200);
    return () => clearTimeout(t);
  }, [phrase]);

  const isActive = timerState === "running";
  const isDone   = timerState === "done";

  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      gap:             12,
      padding:        "16px 20px",
      background:     `${color}08`,
      border:         `1px solid ${color}20`,
      borderRadius:    16,
      minWidth:        220,
      position:       "relative",
      overflow:       "hidden",
    }}>
      {/* Subtle pulse ring when running */}
      {isActive && (
        <div style={{
          position:     "absolute",
          inset:         0,
          borderRadius:  16,
          border:       `1px solid ${color}`,
          opacity:       0.3,
          animation:    "bodyDoublePulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <AvatarSVG archetype={archetype} color={color} size={56} />

        {/* "Working" indicator dot */}
        <div style={{
          position:     "absolute",
          bottom:        2,
          right:         2,
          width:         10,
          height:        10,
          borderRadius: "50%",
          background:    isActive ? color : isDone ? C.done : C.textDim,
          boxShadow:     isActive ? `0 0 6px ${color}` : "none",
          transition:   "background .3s, box-shadow .3s",
          animation:     isActive ? "bodyDoubleBreath 2s ease-in-out infinite" : "none",
        }} />
      </div>

      {/* Name */}
      {personaName && (
        <div style={{
          fontSize:   11,
          fontWeight:  600,
          color:       color,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}>
          {personaName}
        </div>
      )}

      {/* Phrase */}
      <div style={{
        fontSize:    13,
        color:       C.textSub,
        textAlign:   "center",
        maxWidth:    180,
        lineHeight:  1.4,
        opacity:     fade ? 1 : 0,
        transition: "opacity .2s ease",
        fontStyle:  "italic",
        minHeight:   36,
      }}>
        {displayed}
      </div>
    </div>
  );
});
