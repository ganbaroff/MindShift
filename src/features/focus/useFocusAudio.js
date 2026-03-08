/**
 * features/focus/useFocusAudio.js
 * Web Audio API hook for Focus Mode.
 *
 * Bolt 5.2 (ADR 0018):
 *   - Pink noise (default): broadband + low-frequency energy, safe for all users
 *   - Brown noise: deeper, more low-frequency, preferred for ADHD/burnout states
 *   - Silence: no audio playback
 *   - Sonic Anchor: 2-sec 396 Hz triangle tone played at focus session start
 *     (Pavlovian conditioning — after 10-15 sessions triggers reflexive focus)
 *
 * Neuroscience basis (docs/research/focus-audio-neuroscience.md):
 *   - Pink noise: g=0.249 effect on cognition for ADHD, safe default
 *   - Brown noise: deeper spectrum, preferred by ADHD users for burnout/fog
 *   - 500ms logarithmic fade on all transitions (prevents cortisol spike)
 *   - Hard limiter at 0.7 gain (safe listening, avoids >85 dB damage)
 *   - High-pass filter at 60 Hz mandatory (LFN hurts cognition)
 *   - AudioContext lazy-init: created on first user gesture (browser policy)
 *
 * Usage:
 *   const { mode, setMode, volume, setVolume, isPlaying, playAnchor } = useFocusAudio();
 */

import { useState, useRef, useCallback, useEffect } from "react";

/** Audio modes. 'off' = silence. */
export const AUDIO_MODES = ["pink", "brown", "off"];

/** Mode labels (i18n handled at component level). */
export const AUDIO_MODE_LABELS = {
  pink:  { en: "Pink noise",  ru: "Розовый шум",  az: "Çəhrayı küy"  },
  brown: { en: "Brown noise", ru: "Коричневый шум", az: "Qəhvəyi küy" },
  off:   { en: "Silence",     ru: "Тишина",       az: "Sükut"        },
};

// ── Noise generation ────────────────────────────────────────────────────────

/**
 * Generates a looped AudioBufferSourceNode with pink noise.
 * Voss-McCartney algorithm (6-generator approximation).
 *
 * @param {AudioContext} ctx
 * @returns {AudioBufferSourceNode}
 */
function createPinkNoiseSource(ctx) {
  const rate   = ctx.sampleRate;
  const frames = rate * 2; // 2-second looping buffer
  const buffer = ctx.createBuffer(1, frames, rate);
  const data   = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < frames; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) / 6;
    b6 = w * 0.115926;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop   = true;
  return src;
}

/**
 * Generates a looped AudioBufferSourceNode with brown (Brownian) noise.
 * Integration of white noise → 1/f² spectrum (deeper than pink).
 *
 * @param {AudioContext} ctx
 * @returns {AudioBufferSourceNode}
 */
function createBrownNoiseSource(ctx) {
  const rate   = ctx.sampleRate;
  const frames = rate * 2;
  const buffer = ctx.createBuffer(1, frames, rate);
  const data   = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < frames; i++) {
    const w  = Math.random() * 2 - 1;
    lastOut  = (lastOut + 0.02 * w) / 1.02;
    data[i]  = lastOut * 3.5; // scale to near-full amplitude
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop   = true;
  return src;
}

/**
 * Creates a 60 Hz high-pass IIR filter.
 * Mandatory per neuroscience research: LFN below 60 Hz impairs cognition.
 *
 * @param {AudioContext} ctx
 * @returns {BiquadFilterNode}
 */
function createHpf60(ctx) {
  const hpf = ctx.createBiquadFilter();
  hpf.type            = "highpass";
  hpf.frequency.value = 60;
  hpf.Q.value         = 0.7;
  return hpf;
}

// ── Fade helpers ─────────────────────────────────────────────────────────────

const FADE_DURATION = 0.5; // 500ms logarithmic fade
const HARD_LIMIT    = 0.70; // ≈ safe listening level (no >85 dB at default)

/**
 * Logarithmic fade-in to targetGain over FADE_DURATION.
 * Uses exponentialRampToValueAtTime (cannot reach 0 — start from 0.0001).
 */
function fadeIn(gainNode, targetGain, ctx) {
  const now = ctx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, targetGain),
    now + FADE_DURATION
  );
}

/**
 * Logarithmic fade-out over FADE_DURATION.
 * Schedules disconnect/stop after fade completes.
 *
 * @param {GainNode}     gainNode
 * @param {AudioContext} ctx
 * @param {Function}     [afterFade] — called ~600ms later
 */
function fadeOut(gainNode, ctx, afterFade) {
  const now = ctx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(Math.max(gainNode.gain.value, 0.0001), now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + FADE_DURATION);
  if (afterFade) {
    setTimeout(afterFade, (FADE_DURATION + 0.1) * 1000);
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {'pink'|'brown'|'off'} AudioMode
 *
 * @returns {{
 *   mode:       AudioMode,
 *   setMode:    (m: AudioMode) => void,
 *   volume:     number,
 *   setVolume:  (v: number) => void,
 *   isPlaying:  boolean,
 *   playAnchor: () => void,
 *   startNoise: () => void,
 *   stopNoise:  () => void,
 * }}
 */
export function useFocusAudio() {
  const [mode,      setModeState] = useState(/** @type {AudioMode} */ ("pink"));
  const [volume,    setVolumeState] = useState(0.6); // 0–1
  const [isPlaying, setIsPlaying]   = useState(false);

  // Audio graph refs
  const ctxRef        = useRef(null); // AudioContext
  const masterRef     = useRef(null); // master GainNode (hard limit)
  const noiseGainRef  = useRef(null); // per-noise GainNode
  const noiseRef      = useRef(null); // active BufferSourceNode

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { ctxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Lazy init AudioContext ─────────────────────────────────────────────────
  const ensureCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }

    if (!masterRef.current) {
      const master    = ctxRef.current.createGain();
      master.gain.value = Math.min(HARD_LIMIT, HARD_LIMIT); // hard cap
      master.connect(ctxRef.current.destination);
      masterRef.current = master;
    }
    return ctxRef.current;
  }, []);

  // ── Stop current noise source ──────────────────────────────────────────────
  const stopNoise = useCallback(() => {
    if (!noiseGainRef.current || !ctxRef.current) return;
    const gainNode  = noiseGainRef.current;
    const src       = noiseRef.current;
    fadeOut(gainNode, ctxRef.current, () => {
      try { src?.stop(); } catch {}
      try { gainNode.disconnect(); } catch {}
    });
    noiseGainRef.current = null;
    noiseRef.current     = null;
    setIsPlaying(false);
  }, []);

  // ── Start noise for a given mode ───────────────────────────────────────────
  const startNoiseForMode = useCallback((targetMode, targetVolume) => {
    if (targetMode === "off") {
      stopNoise();
      return;
    }
    const ctx = ensureCtx();

    // Build noise source
    const src = targetMode === "brown"
      ? createBrownNoiseSource(ctx)
      : createPinkNoiseSource(ctx);

    // HPF 60 Hz (mandatory)
    const hpf     = createHpf60(ctx);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0001;

    src.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(masterRef.current);
    src.start();

    noiseRef.current     = src;
    noiseGainRef.current = noiseGain;

    // Update master volume and fade in
    masterRef.current.gain.value = Math.min(HARD_LIMIT, targetVolume * HARD_LIMIT);
    fadeIn(noiseGain, 1.0, ctx);
    setIsPlaying(true);
  }, [ensureCtx, stopNoise]);

  // ── Public: startNoise (current mode + volume) ─────────────────────────────
  const startNoise = useCallback(() => {
    startNoiseForMode(mode, volume);
  }, [startNoiseForMode, mode, volume]);

  // ── Mode change ────────────────────────────────────────────────────────────
  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    if (isPlaying) {
      // Stop old, start new with crossfade feel
      stopNoise();
      setTimeout(() => startNoiseForMode(newMode, volume), (FADE_DURATION + 0.1) * 1000);
    }
  }, [isPlaying, stopNoise, startNoiseForMode, volume]);

  // ── Volume change ──────────────────────────────────────────────────────────
  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (masterRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime;
      masterRef.current.gain.cancelScheduledValues(now);
      masterRef.current.gain.setTargetAtTime(
        Math.min(HARD_LIMIT, v * HARD_LIMIT),
        now,
        0.05 // 50ms smooth ramp
      );
    }
  }, []);

  // ── Sonic Anchor ──────────────────────────────────────────────────────────
  /**
   * Plays a 2-second 396 Hz triangle-wave tone (Pavlovian focus cue).
   * Called at the moment the focus timer starts.
   * After 10-15 sessions this tone reflexively triggers DMN suppression.
   */
  const playAnchor = useCallback(() => {
    const ctx = ensureCtx();

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type            = "triangle";
    osc.frequency.value = 396; // Hz — calm, focus-associated frequency

    osc.connect(gain);
    gain.connect(masterRef.current);

    const now = ctx.currentTime;
    // Fade in 100ms, hold 1.6s, fade out 300ms (total ~2s)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.1);
    gain.gain.setValueAtTime(0.25, now + 1.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    osc.start(now);
    osc.stop(now + 2.1);
    osc.onended = () => { try { gain.disconnect(); } catch {} };
  }, [ensureCtx]);

  return {
    mode,
    setMode,
    volume,
    setVolume,
    isPlaying,
    playAnchor,
    startNoise,
    stopNoise,
  };
}
