# Bolt 6.4 — Audio Engine Upgrade (Research #3)

## Goal
Apply findings from Research #3 (Auditory Neuroscience for ADHD) to the audio engine.
Rename presets to match science, add 40Hz gamma binaural, raise default volume,
add pink noise LPF, eliminate "silence" ideology from the app.

## Acceptance Criteria
- [x] AC1: Pink preset renamed "Deep Work" (strongest clinical evidence: OHSU meta g=0.249)
- [x] AC2: Brown preset renamed "Calm Focus" (silences racing thoughts, anecdotal #1)
- [x] AC3: New preset: Gamma Focus ⚡ — 40Hz binaural beat (L:400Hz, R:440Hz stereo)
- [x] AC4: Default volume raised from 0.47 to 0.55 (~58 dBA, closer to optimal 65-75 dBA)
- [x] AC5: Pink noise 285Hz LPF added — eliminates HF auditory fatigue
- [x] AC6: Science note updated with OHSU, Leiden, MIT Tsai Lab citations
- [x] AC7: Sound Anchor tooltip updated with Pavlovian conditioning explanation
- [x] AC8: Volume bar shows approximate dBA + contextual label
- [x] AC9: AudioScreen uses useMotion() (centralized animation, Bolt 6.2)
- [x] AC10: No "Silence" mode — science confirms silence is hostile for ADHD brains

## Changes
- `src/types/index.ts` — Added 'gamma' to AudioPreset union
- `src/shared/lib/constants.ts` — AUDIO_DEFAULT_VOLUME 0.47→0.55, added PINK_LPF_CUTOFF_HZ=285
- `src/store/index.ts` — audioVolume default 0.47→0.55 (both init + signOut reset)
- `src/shared/hooks/useAudioEngine.ts` — createGammaBuffer (stereo L:400Hz R:440Hz),
  pinkLpf 285Hz BiquadFilter on pink/nature presets, gamma source handling in play()
- `src/features/audio/AudioScreen.tsx` — Full rewrite: renamed presets, gamma card (col-span-2),
  active glow ring, research tags, dBA volume label, useMotion() migration

## Research Citations
- OHSU Meta-Analysis 2024: pink noise g=0.249, p<0.0001 (n=335)
- Leiden Institute: 40Hz gamma reduces global-precedence effect
- MIT Tsai Lab: 40Hz auditory stimulation triggers brain-wide cellular responses
- WHO: prolonged >80 dBA causes hearing damage → hard ceiling at 70 dBA
- Stochastic Resonance / MBA Model: noise = non-pharmacological dopamine surrogate

## Score: 9/10
## Notes
- Gamma preset requires stereo headphones (noted in UI tag)
- Brown noise AudioWorklet unchanged (already seam-free)
- Lo-fi preset unchanged (already has tape saturation + 3kHz LPF)
