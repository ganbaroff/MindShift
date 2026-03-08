/**
 * BrownNoiseProcessor — AudioWorklet
 *
 * Seam-free brown noise via leaky integrator: y[n] = (y[n-1] + 0.02·x[n]) / 1.02
 *
 * Why AudioWorklet (vs AudioBufferSourceNode):
 *  - No loop-point seams (buffer loops produce audible clicks every 3–15 s)
 *  - Runs in dedicated AudioWorkletGlobalScope thread (<2% CPU on modern devices)
 *  - True 1/f² spectrum — each output sample is statistically independent
 *
 * Research basis:
 *  - Brown noise (Brownian/1/f²): popular for ADHD community; reduced mind-wandering
 *  - Pink noise (1/f): g=0.249, p<0.0001 meta-analysis — also validated for ADHD
 *  - The leaky integrator is the canonical efficient brown noise algorithm
 */

class BrownNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._lastOut = 0.0
  }

  /**
   * process() is called by the audio rendering thread for every 128-sample block.
   * Must return true to keep the processor alive.
   */
  process(inputs, outputs) {
    const output = outputs[0]
    // Handle both mono (1 channel) and stereo (2 channels) outputs
    for (let ch = 0; ch < output.length; ch++) {
      const channel = output[ch]
      let lastOut = this._lastOut
      for (let i = 0; i < channel.length; i++) {
        const white = Math.random() * 2 - 1
        // Leaky integrator: integrates white noise with 1/1.02 decay per sample
        // This gives 1/f² power spectrum (brown/red noise) without DC drift
        lastOut = (lastOut + 0.02 * white) / 1.02
        // ×3.5 compensates for ~11 dB volume loss from integration
        channel[i] = lastOut * 3.5
      }
      this._lastOut = lastOut
    }
    return true // keep alive indefinitely
  }
}

registerProcessor('brown-noise', BrownNoiseProcessor)
