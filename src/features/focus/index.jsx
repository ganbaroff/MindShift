/**
 * features/focus/index.jsx
 * FocusScreen — full-screen zero-distraction focus mode.
 *
 * Bolt 5.2 (ADR 0018): New vertical slice. Launched from TodayScreen.
 * Completely overlays the app; BottomNav is hidden while active.
 *
 * Architecture:
 *   - useFocusTimer: hybrid Date.now() timer (no drift across tab switches)
 *   - useFocusAudio: Web Audio API (pink/brown noise + sonic anchor)
 *   - FocusTimer:    SVG diminishing arc (Time Timer, clinical evidence)
 *   - BodyDoubling:  Persona presence during session (Proteus Effect)
 *
 * ADHD design principles (docs/research/neuroscience-adhd-flow-reference.md):
 *   - Full-screen = remove ALL visual noise (no BottomNav, no AppBar, no cards)
 *   - Completion = dopamine micro-celebration (confetti emoji, warm message)
 *   - Break reminder = gentle, not a countdown timer (no new urgency)
 *   - Pause = feature (hyperfocus has natural pauses) — not hidden or shamed
 *   - Audio = opt-in, start on first interaction (browser AudioContext policy)
 *
 * Props:
 *   task             {Object|null}  optional task being focused on
 *   lang             {string}
 *   personaArchetype {string}
 *   personaName      {string}
 *   onClose          {Function}
 */

import { useState, useEffect, useCallback } from "react";
import { C }              from "../../skeleton/design-system/tokens.js";
import { logError }       from "../../shared/lib/logger.js";
import { ARCHETYPE_COLORS } from "../../shared/lib/archetypes.js";
import { useFocusTimer }  from "./useFocusTimer.js";
import { useFocusAudio, AUDIO_MODES, AUDIO_MODE_LABELS } from "./useFocusAudio.js";
import { FocusTimer }     from "./FocusTimer.jsx";
import { BodyDoubling }   from "./BodyDoubling.jsx";

// ── Focus screen i18n strings ───────────────────────────────────────────────
const TX = {
  en: {
    title:         "Focus Mode",
    breakTitle:    "Great work! 🎉",
    breakMsg:      "Take a breather. Step away, hydrate, stretch.",
    breakBtn:      "Start again",
    closeBtn:      "Exit Focus",
    audioLabel:    "Background audio",
    volumeLabel:   "Volume",
    taskLabel:     "Focusing on",
    noTask:        "Open focus session",
    doneMsg:       "Session complete! You showed up.",
  },
  ru: {
    title:         "Режим фокуса",
    breakTitle:    "Отличная работа! 🎉",
    breakMsg:      "Сделай паузу. Выйди, попей воды, потянись.",
    breakBtn:      "Начать снова",
    closeBtn:      "Выйти из фокуса",
    audioLabel:    "Фоновый звук",
    volumeLabel:   "Громкость",
    taskLabel:     "Фокусируюсь на",
    noTask:        "Свободная фокус-сессия",
    doneMsg:       "Сессия завершена! Ты справился.",
  },
  az: {
    title:         "Fokus rejimi",
    breakTitle:    "Əla iş! 🎉",
    breakMsg:      "Fasilə ver. Çıx, su iç, uzan.",
    breakBtn:      "Yenidən başla",
    closeBtn:      "Fokusdan çıx",
    audioLabel:    "Arxa plan sesi",
    volumeLabel:   "Səs",
    taskLabel:     "Fokuslanıram",
    noTask:        "Açıq fokus sessiyası",
    doneMsg:       "Sessiya tamamlandı! Etdin.",
  },
};

// ── Audio mode icons ─────────────────────────────────────────────────────────
const AUDIO_ICONS = { pink: "🌊", brown: "🌲", off: "🔇" };

// ── Component ────────────────────────────────────────────────────────────────

export function FocusScreen({
  task             = null,
  lang             = "en",
  personaArchetype = "explorer",
  personaName      = "",
  onClose,
}) {
  const tx           = TX[lang] || TX.en;
  const color        = ARCHETYPE_COLORS[personaArchetype] || C.accent;

  // ── Audio (initialised first so handleDone can reference stopNoise) ──────
  const audioHook = useFocusAudio();

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [showBreak, setShowBreak] = useState(false);

  const handleDone = useCallback(() => {
    setShowBreak(true);
    audioHook.stopNoise();
  }, [audioHook.stopNoise]); // eslint-disable-line react-hooks/exhaustive-deps

  const timer = useFocusTimer({ duration: 25, onDone: handleDone });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    try {
      // Sonic Anchor: plays at the moment focus begins (Pavlovian cue)
      audioHook.playAnchor();
      // Start noise after anchor settles (2s delay)
      setTimeout(() => {
        if (audioHook.mode !== "off") audioHook.startNoise();
      }, 2100);
    } catch (e) {
      logError("FocusScreen.handleStart.audio", e);
    }
    timer.start();
    setShowBreak(false);
  }, [audioHook, timer]);

  const handlePause = useCallback(() => {
    timer.pause();
    if (audioHook.isPlaying) audioHook.stopNoise();
  }, [timer, audioHook]);

  const handleResume = useCallback(() => {
    timer.resume();
    if (audioHook.mode !== "off") audioHook.startNoise();
  }, [timer, audioHook]);

  const handleReset = useCallback(() => {
    timer.reset();
    audioHook.stopNoise();
    setShowBreak(false);
  }, [timer, audioHook]);

  const handleClose = useCallback(() => {
    timer.reset();
    audioHook.stopNoise();
    onClose?.();
  }, [timer, audioHook, onClose]);

  const handleBreakRestart = useCallback(() => {
    setShowBreak(false);
    timer.reset();
  }, [timer]);

  // ── Keyboard shortcut: Escape = exit focus ─────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") handleClose();
      if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        if (timer.state === "running")       handlePause();
        else if (timer.state === "paused")   handleResume();
        else if (timer.state === "idle" || timer.state === "done") handleStart();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timer.state, handleClose, handlePause, handleResume, handleStart]);

  // ── Break screen ──────────────────────────────────────────────────────────
  if (showBreak) {
    return (
      <FullScreenShell color={color}>
        <div style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          justifyContent: "center",
          flex:           1,
          gap:            24,
          padding:       "32px 24px",
          textAlign:     "center",
        }}>
          {/* Celebration */}
          <div style={{ fontSize: 64, lineHeight: 1, animation: "focusDoneRing 0.6s ease forwards" }}>
            🎉
          </div>

          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>
              {tx.breakTitle}
            </div>
            <div style={{ fontSize: 15, color: C.textSub, lineHeight: 1.5, maxWidth: 280 }}>
              {tx.breakMsg}
            </div>
          </div>

          {/* Session stats */}
          <div style={{
            background:   `${color}12`,
            border:       `1px solid ${color}30`,
            borderRadius:  12,
            padding:      "12px 20px",
            fontSize:      13,
            color:         C.textSub,
          }}>
            ⏱ {timer.duration} {lang === "ru" ? "мин" : lang === "az" ? "dəq" : "min"} •{" "}
            {task?.title
              ? `${tx.taskLabel}: ${task.title}`
              : tx.noTask}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 240 }}>
            <button
              onClick={handleBreakRestart}
              style={primaryBtn(color)}
            >
              {tx.breakBtn}
            </button>
            <button
              onClick={handleClose}
              style={ghostBtn}
            >
              {tx.closeBtn}
            </button>
          </div>
        </div>
      </FullScreenShell>
    );
  }

  // ── Main focus screen ─────────────────────────────────────────────────────
  return (
    <FullScreenShell color={color}>
      {/* Close button (top-right) */}
      <button
        onClick={handleClose}
        aria-label={tx.closeBtn}
        style={{
          position:     "absolute",
          top:           16,
          right:         16,
          width:         40,
          height:        40,
          borderRadius: "50%",
          background:   "transparent",
          border:       `1px solid ${C.border}`,
          color:         C.textSub,
          fontSize:      18,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          cursor:        "pointer",
          fontFamily:   "inherit",
          zIndex:        10,
        }}
      >
        ✕
      </button>

      {/* Task label (top) */}
      {task?.title && (
        <div style={{
          position:    "absolute",
          top:          20,
          left:         20,
          right:        64,
          fontSize:     12,
          color:        C.textDim,
          fontWeight:   500,
          overflow:     "hidden",
          textOverflow: "ellipsis",
          whiteSpace:   "nowrap",
        }}>
          {tx.taskLabel}: <span style={{ color: C.textSub }}>{task.title}</span>
        </div>
      )}

      {/* Main content — centered column */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        justifyContent: "center",
        flex:           1,
        gap:            32,
        padding:       "60px 24px 24px",
      }}>
        {/* Visual Time Timer */}
        <FocusTimer
          progress={timer.progress}
          remaining={timer.remaining}
          state={timer.state}
          duration={timer.duration}
          archetypeColor={color}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onSetDuration={timer.setDuration}
          lang={lang}
        />

        {/* Body Doubling — Persona presence */}
        <BodyDoubling
          archetype={personaArchetype}
          personaName={personaName}
          archetypeColor={color}
          timerState={timer.state}
          progress={timer.progress}
          lang={lang}
        />
      </div>

      {/* Audio controls (bottom) */}
      <div style={{
        padding:        "16px 24px 32px",
        borderTop:     `1px solid ${C.border}`,
        display:        "flex",
        flexDirection:  "column",
        gap:             12,
      }}>
        {/* Mode selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, minWidth: 60 }}>
            {tx.audioLabel}
          </span>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {AUDIO_MODES.map(m => {
              const isActive = audioHook.mode === m;
              const label    = AUDIO_MODE_LABELS[m]?.[lang] ?? AUDIO_MODE_LABELS[m]?.en;
              return (
                <button
                  key={m}
                  onClick={() => audioHook.setMode(m)}
                  aria-pressed={isActive}
                  title={label}
                  style={{
                    flex:         1,
                    height:       36,
                    background:   isActive ? `${color}20` : "transparent",
                    border:      `1px solid ${isActive ? color : C.border}`,
                    borderRadius: 8,
                    color:        isActive ? color : C.textSub,
                    fontSize:     16,
                    cursor:       "pointer",
                    fontFamily:   "inherit",
                    transition:  "all .15s",
                  }}
                >
                  {AUDIO_ICONS[m]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Volume slider — hidden when muted */}
        {audioHook.mode !== "off" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600, minWidth: 60 }}>
              {tx.volumeLabel}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audioHook.volume}
              onChange={e => audioHook.setVolume(Number(e.target.value))}
              aria-label={tx.volumeLabel}
              style={{
                flex:       1,
                accentColor: color,
                height:     4,
                cursor:    "pointer",
              }}
            />
          </div>
        )}
      </div>
    </FullScreenShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FullScreenShell({ color, children }) {
  return (
    <div style={{
      position:       "fixed",
      inset:           0,
      background:      C.bg,
      display:        "flex",
      flexDirection:  "column",
      zIndex:          200, // above BottomNav (z=100)
      maxWidth:        480,
      left:           "50%",
      transform:      "translateX(-50%)",
      // Subtle archetype glow from edges
      boxShadow:      `inset 0 0 80px ${color}08`,
    }}>
      {children}
    </div>
  );
}

function primaryBtn(color) {
  return {
    width:        "100%",
    height:        52,
    borderRadius:  26,
    background:   `${color}22`,
    border:       `1.5px solid ${color}`,
    color:         color,
    fontSize:      16,
    fontWeight:    700,
    cursor:        "pointer",
    fontFamily:    "inherit",
    transition:   "background .15s",
  };
}

const ghostBtn = {
  width:        "100%",
  height:        44,
  borderRadius:  22,
  background:   "transparent",
  border:       `1px solid ${C.border}`,
  color:         C.textSub,
  fontSize:      14,
  cursor:        "pointer",
  fontFamily:    "inherit",
};
