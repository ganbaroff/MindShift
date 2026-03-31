/**
 * breathCue.ts — soft audio tones for BreathworkRitual
 *
 * Inhale: gentle rising sine C4 → E4 (261 → 330 Hz) over 1.4s
 * Exhale: gentle falling sine E4 → C4 (330 → 261 Hz) over 1.4s
 *
 * Very low amplitude (gain 0.06) — purely a directional cue,
 * not a sound design statement. Respects the same "calm palette"
 * principle as the visual design.
 *
 * Uses standalone AudioContext managed by the caller (BreathworkRitual).
 * Does NOT go through useAudioEngine — breathwork is independent of
 * the ambient focus audio and must not interfere with it.
 */

const INHALE_START_HZ = 261.63  // C4
const INHALE_END_HZ   = 329.63  // E4
const EXHALE_START_HZ = 329.63  // E4
const EXHALE_END_HZ   = 261.63  // C4
const CUE_GAIN        = 0.06    // soft, non-intrusive
const ATTACK_S        = 0.04    // click-free attack
const DURATION_S      = 1.3     // slightly shorter than phase so silence gap is audible

export function playInhaleCue(ctx: AudioContext): void {
  const now  = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(CUE_GAIN, now + ATTACK_S)
  gain.gain.linearRampToValueAtTime(0.0001, now + DURATION_S)
  gain.connect(ctx.destination)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(INHALE_START_HZ, now)
  osc.frequency.linearRampToValueAtTime(INHALE_END_HZ, now + DURATION_S)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + DURATION_S + 0.05)
}

export function playExhaleCue(ctx: AudioContext): void {
  const now  = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(CUE_GAIN, now + ATTACK_S)
  gain.gain.linearRampToValueAtTime(0.0001, now + DURATION_S)
  gain.connect(ctx.destination)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(EXHALE_START_HZ, now)
  osc.frequency.linearRampToValueAtTime(EXHALE_END_HZ, now + DURATION_S)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + DURATION_S + 0.05)
}
