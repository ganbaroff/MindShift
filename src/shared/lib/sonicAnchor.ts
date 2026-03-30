/**
 * sonicAnchor.ts — C Major 9th chord focus cue
 *
 * Plays a soft Cmaj9 chord (C4–E4–G4–B4–D5) as a Pavlovian conditioning cue.
 * Replaces the pseudoscientific 396 Hz solfeggio triangle wave.
 *
 * Research: Consistent acoustic cue = conditioned stimulus. 1-2 weeks of daily
 * use → faster attentional engagement (classical conditioning, Pavlov 1927).
 *
 * 50ms attack: avoids click transient
 * 1.5s release: natural piano-like decay
 */

const MAJ9_FREQS  = [261.63, 329.63, 392.00, 493.88, 587.33]  // C4 E4 G4 B4 D5
const MAJ9_LEVELS = [0.50,   0.40,   0.40,   0.30,   0.25  ]  // root loudest, 9th softest

export function playSonicAnchor(ctx: AudioContext): void {
  const now    = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.linearRampToValueAtTime(0.06, now + 0.05)
  master.gain.setValueAtTime(0.06,          now + 0.05)
  master.gain.linearRampToValueAtTime(0.0001, now + 1.55)
  master.connect(ctx.destination)

  MAJ9_FREQS.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type            = 'sine'
    osc.frequency.value = freq
    gain.gain.value     = MAJ9_LEVELS[i]
    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + 2.0)
  })
}
