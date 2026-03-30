/**
 * audioBuffers.ts — Noise + binaural beat buffer generators
 *
 * All functions are pure (no React/store deps) — safe to call from any context.
 * Buffer length: 15s (BUFFER_SECONDS). Seams occur 5× less frequently than 3s
 * buffers and are imperceptible in practice.
 *
 * Presets:
 *   pink    — Voss-McCartney 6-gen 1/f noise, validated for ADHD (g=0.249, p<0.0001)
 *   nature  — Pink + 3-rate organic AM (14s/6s/3s) → prevents neural habituation
 *   lofi    — Pink + wow/flutter/crackle → cassette warmth
 *   brown   — Leaky integrator (worklet preferred; this is the fallback buffer)
 *   gamma   — 40 Hz binaural beat (L:400 Hz / R:440 Hz), stereo
 *   gamma60 — 60 Hz binaural beat (L:430 Hz / R:490 Hz), gentler, stereo
 */

import type { AudioPreset } from '@/types'

export const BUFFER_SECONDS = 15

// ── Pink (Voss-McCartney 6-gen) ───────────────────────────────────────────────

export function fillPinkNoise(data: Float32Array): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
}

// ── Nature (pink + 3-rate organic AM) ────────────────────────────────────────

export function fillNatureNoise(data: Float32Array, sampleRate: number): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    const t = i / sampleRate
    // 14s swell + 6s variation + 3s detail — prevents neural habituation
    const mod = 0.70
      + 0.15 * Math.sin(2 * Math.PI * 0.07 * t)
      + 0.10 * Math.sin(2 * Math.PI * 0.17 * t)
      + 0.05 * Math.sin(2 * Math.PI * 0.31 * t)
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09 * mod
    b6 = w * 0.115926
  }
}

// ── Lo-fi (cassette: wow + flutter + crackle) ─────────────────────────────────

export function fillLofiNoise(data: Float32Array, sampleRate: number): void {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.96900 * b2 + w * 0.1538520
    b3 = 0.86650 * b3 + w * 0.3104856
    b4 = 0.55000 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.0168980
    const pink    = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
    const wow     = 1.0 + 0.08 * Math.sin(2 * Math.PI * 0.27 * t)
    const flutter = 1.0 + 0.04 * Math.sin(2 * Math.PI * 1.1  * t)
    const crackle = Math.random() < 0.000083 ? Math.random() * 0.18 : 0
    data[i] = pink * wow * flutter + crackle
  }
}

// ── Brown fallback buffer (when AudioWorklet unavailable) ─────────────────────

export function fillBrownFallback(data: Float32Array): void {
  let lastOut = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    lastOut = (lastOut + 0.02 * w) / 1.02
    data[i] = lastOut * 3.5
  }
}

// ── Gamma binaural beats ──────────────────────────────────────────────────────

/** 40 Hz gamma: L=400 Hz / R=440 Hz stereo. */
export function createGammaBuffer(ctx: AudioContext): AudioBuffer {
  const size  = ctx.sampleRate * BUFFER_SECONDS
  const buf   = ctx.createBuffer(2, size, ctx.sampleRate)
  const dataL = buf.getChannelData(0)
  const dataR = buf.getChannelData(1)
  for (let i = 0; i < size; i++) {
    const t   = i / ctx.sampleRate
    dataL[i]  = Math.sin(2 * Math.PI * 400 * t) * 0.25
    dataR[i]  = Math.sin(2 * Math.PI * 440 * t) * 0.25
  }
  return buf
}

/** 60 Hz gamma: L=430 Hz / R=490 Hz stereo. Gentler than 40 Hz for extended sessions. */
export function createGamma60Buffer(ctx: AudioContext): AudioBuffer {
  const size  = ctx.sampleRate * BUFFER_SECONDS
  const buf   = ctx.createBuffer(2, size, ctx.sampleRate)
  const dataL = buf.getChannelData(0)
  const dataR = buf.getChannelData(1)
  for (let i = 0; i < size; i++) {
    const t   = i / ctx.sampleRate
    dataL[i]  = Math.sin(2 * Math.PI * 430 * t) * 0.22
    dataR[i]  = Math.sin(2 * Math.PI * 490 * t) * 0.22
  }
  return buf
}

// ── Mono noise buffer dispatcher ──────────────────────────────────────────────

export function createNoiseBuffer(ctx: AudioContext, preset: AudioPreset): AudioBuffer {
  const size = ctx.sampleRate * BUFFER_SECONDS
  const buf  = ctx.createBuffer(1, size, ctx.sampleRate)
  const data = buf.getChannelData(0)
  switch (preset) {
    case 'pink':   fillPinkNoise(data);                break
    case 'nature': fillNatureNoise(data, ctx.sampleRate); break
    case 'lofi':   fillLofiNoise(data, ctx.sampleRate);  break
    default:       fillBrownFallback(data)
  }
  return buf
}
