import { random } from "./utils.js";

let ctx = new AudioContext();
let { sampleRate } = ctx;

let master = new GainNode(ctx, { gain: 0.5 });
master.connect(ctx.destination);

export const SFX_TAP = 0;
export const SFX_CLICK = 1;
export const SFX_SLASH = 2;

/**
 * @typedef {typeof SFX_TAP | typeof SFX_CLICK | typeof SFX_SLASH} SfxType
 */

function createNoise(duration = 0.5) {
  let length = Math.floor(duration * sampleRate);
  let buffer = new AudioBuffer({ length, sampleRate });
  let channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) channel[i] = random(-1, 1);
  return new AudioBufferSourceNode(ctx, { buffer });
}

/**
 * @param {SfxType} type
 */
export function sfx(type) {
  let duration = 0.11;
  let t = ctx.currentTime;

  let osc = new OscillatorNode(ctx);
  let env = new GainNode(ctx);
  let filter = new BiquadFilterNode(ctx);

  osc.connect(env).connect(filter).connect(master);

  if (type === SFX_TAP) {
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.001);
    env.gain.setValueAtTime(0.8, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  } else if (type === SFX_CLICK) {
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.01);
    env.gain.setValueAtTime(0.8, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  } else if (type === SFX_SLASH) {
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
    filter.Q.value = 1.2;
    env.gain.setValueAtTime(0.8, t);
    env.gain.linearRampToValueAtTime(0.35, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    let noise = createNoise();
    noise.connect(env);
    noise.start();
    noise.stop(t + duration);
    osc.disconnect(env);
  }

  osc.start();
  osc.stop(t + duration);

  osc.onended = () => {
    filter.disconnect();
    env.disconnect();
  };
}
