# ADR-002: AudioWorklet for Brown Noise (vs. Pre-recorded Buffer)

**Status:** Accepted
**Date:** 2026-03-09
**Deciders:** Yusif (sole owner)
**Context area:** Web Audio / background audio engine

---

## Context

MindShift provides ambient audio (brown noise, pink noise, lo-fi, nature, binaural gamma) during focus sessions. Users expect audio to play continuously for 25–90 minutes without any audible glitches, loops, or seams.

The primary challenge is **brown noise** specifically: it cannot be trivially pre-recorded and looped because buffer boundaries produce an audible click or spectral seam. The other presets (pink noise, lo-fi, nature) can tolerate buffer-based playback with crossfade.

**Research #3 context:** Pink noise is low-pass filtered at 285 Hz to eliminate HF fatigue (per EEG research). Brown noise requires 1/f² spectral density, which is hard to achieve cleanly with loop points.

---

## Decision

Use an **AudioWorklet processor** for brown noise (seam-free leaky integrator algorithm running on the audio thread), and **buffer-based playback** with 1.5s constant-power crossfade for all other presets.

---

## Options Considered

### Option A: Pre-recorded MP3/OGG files for all presets
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | Very low |
| Bundle/network cost | High — ~5–15 MB audio assets |
| Audio quality | Medium — compression artifacts, loop seams |
| Offline support | Requires caching all audio files in service worker |
| CPU impact | Low |

**Pros:** Simple, widely understood, no Web Audio expertise needed
**Cons:** Audible loop seams on brown noise; requires large audio assets in the bundle/cache; compression artifacts from MP3 degrade pink noise LPF precision

### Option B: AudioWorklet (brown) + buffer synthesis (others) ✅ CHOSEN
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | High (AudioWorklet is complex API) |
| Bundle/network cost | Effectively zero — no audio assets |
| Audio quality | Excellent — algorithmically generated, seamless |
| Offline support | Works offline by design (no network assets) |
| CPU impact | Medium — runs on audio thread (isolated, no jank) |

**Pros:** Zero audio assets; true seam-free generation; pink noise LPF at exact 285 Hz; no loop artifacts; works perfectly offline; HPF at 60 Hz protects speakers
**Cons:** AudioWorklet requires `new URL(...)` module syntax which needs Vite config; not all browsers support it equally; significantly more complex to debug

### Option C: Web Workers (ScriptProcessorNode — deprecated)
| Dimension | Assessment |
|-----------|------------|
| Implementation complexity | Medium |
| Audio quality | Poor — ScriptProcessorNode runs on main thread, causes jank |

**Pros:** Wider browser compatibility (older browsers)
**Cons:** Deprecated since 2021; runs on main thread; causes UI jank during generation; audio dropouts under load

---

## Trade-off Analysis

The primary tension is **implementation complexity vs. audio quality and asset cost**.

For an ADHD productivity app, audio quality directly affects the therapeutic value. Research #3 documents that HF components above 285 Hz in pink noise cause measurable EEG fatigue markers. Pre-recorded audio compressed with MP3 at typical bitrates cannot guarantee the filter cutoff precision needed.

The AudioWorklet approach eliminates the ~10 MB of audio assets that would otherwise need to be cached for offline support (the app is a PWA with service worker). This matters significantly for mobile users with limited storage.

The implementation complexity is real but one-time — once the Worklet is written, it requires no maintenance.

**Key fallback:** The `useAudioEngine` hook has a test tone fallback for browsers without Web Audio API support. The `AudioWorklet` itself gracefully falls back to an `OscillatorNode`-based approximation if the Worklet fails to load.

---

## Consequences

**Easier:**
- Full offline audio (no service worker cache for audio files)
- Bundle stays at ~98 kB gzip (zero audio assets)
- Precise frequency filtering (285 Hz LPF, 60 Hz HPF) at generation time
- Seam-free continuous playback for any session length

**Harder:**
- Debugging (Worklet runs on audio thread, limited DevTools support)
- Testing (Web Audio is not available in jsdom — tests must mock it)
- Vite config: requires `new URL('./processor.js', import.meta.url)` pattern

**Revisit if:**
- A future browser removes AudioWorklet support (highly unlikely)
- Users on iOS <15 report audio failures (Safari AudioWorklet had bugs pre-15.4)

---

## Action Items
- [x] Implement `AudioWorkletProcessor` for brown noise (leaky integrator algorithm)
- [x] Implement HPF 60 Hz on all channels
- [x] Implement LPF 285 Hz on pink noise channel (Research #3)
- [x] Implement constant-power crossfade (1.5s, sine/cos curves)
- [x] Log gain mapping (slider 0–1 → gain 0.001–0.10)
- [x] dBA warning at >80% slider (~65 dBA estimate)
- [ ] Add E2E audio test using AudioContext mock (testing gap TD-010)
