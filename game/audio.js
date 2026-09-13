import { pick, random, range } from "./utils.js";

const MIDI_META = 0xff;
const MIDI_META_TEMPO = 0x51;
const MIDI_NOTE_OFF = 0x80;
const MIDI_NOTE_ON = 0x90;
const MIDI_CTRL_CHANGE = 0xb0;
const MIDI_PROG_CHANGE = 0xc0;

const DRUM_KICK_1 = 0;
const DRUM_KICK_2 = 2;
const DRUM_BONE = 4;
const DRUM_RIM = 5;
const DRUM_CLICK = 7;

export const SFX_TAP = DRUM_RIM;
export const SFX_CLICK = DRUM_CLICK;
export const SFX_SLASH = DRUM_BONE;

let ctx = new AudioContext();
let sampleRate = ctx.sampleRate;
let started = false;
let reverb = Reverb();
let bypass = Gain({ gain: 3 });
let master = Gain({ gain: 0.5 });
let masterLowPass = Filter({ frequency: 0 });
let masterHighPass = Filter({ type: "highpass", frequency: 40 });
master
  .connect(masterHighPass)
  .connect(masterLowPass)
  .connect(reverb)
  .connect(ctx.destination);
bypass.connect(ctx.destination);

/**
 * @typedef {object} DrumParams
 * @prop {number} pitch
 * @prop {number} body
 * @prop {number} skin
 * @prop {number} snap
 */

/**
 * @type {Record<number, DrumParams>}
 */
const DRUMS = {
  [DRUM_KICK_1]: { pitch: 90, body: 0.6, skin: 0.6, snap: 0.1 },
  [DRUM_KICK_2]: { pitch: 60, body: 0.6, skin: 0.6, snap: 0.1 },
  [DRUM_BONE]: { pitch: 320, body: 0.02, skin: 0.8, snap: 1 },
  [DRUM_RIM]: { pitch: 180, body: 0.15, skin: 0.9, snap: 0.3 },
  [DRUM_CLICK]: { pitch: 2500, body: 0, skin: 0.3, snap: 0.7 },
};

/**
 * @callback Instrument
 * @param {number} time
 * @param {number} note
 * @param {number} velocity
 * @returns {void}
 */

/**
 * @type {Record<number, Instrument>}
 */
const INSTRUMENTS = {
  0: playDrum,
  1: pluck,
  2: playVocal,
  3: pluck,
};

/**
 * @param {number} type
 * @param {number} [time]
 */
export function sfx(type, time = ctx.currentTime) {
  playNoise(time, 0.05, 200, 3.5, bypass);
}

let midi = await fetch("ragnarok.mid")
  // For some reason this doesn't work in JS13K's headless chromium.
  // .then(r => r.bytes())
  .then((r) => r.arrayBuffer())
  .then((b) => new Uint8Array(b));

let i = 0;
let u8 = () => midi[i++];
let u16 = () => (u8() << 8) | u8();
let u24 = () => (u16() << 8) | u8();
let u32 = () => (u16() << 16) | u16();
/** @returns {number} */
let vlq = (a = 0, b = u8(), c = b & 0x7f, d = (a << 7) | c) =>
  c >= b ? d : vlq(d);

/**
 * Convert a midi note to a frequency in hertz.
 * @param {number} note
 * @returns {number}
 */
function hz(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * @param {OscillatorOptions} options
 * @returns {OscillatorNode}
 */
function Osc(options) {
  return new OscillatorNode(ctx, options);
}

/**
 * @param {GainOptions} options
 * @returns {GainNode}
 */
function Gain(options) {
  return new GainNode(ctx, options);
}

/**
 * @param {BiquadFilterOptions} options
 * @returns {BiquadFilterNode}
 */
function Filter(options) {
  return new BiquadFilterNode(ctx, options);
}

/**
 * @param {AudioBufferOptions} options
 * @returns {AudioBuffer}
 */
function Buffer(options) {
  return new AudioBuffer(options);
}

/**
 * @param {AudioBufferSourceOptions} options
 * @returns {AudioBufferSourceNode}
 */
function Source(options) {
  return new AudioBufferSourceNode(ctx, options);
}

function Reverb(duration = 3.5) {
  let length = sampleRate * duration;
  let buffer = Buffer({ length, sampleRate, numberOfChannels: 2 });
  let left = buffer.getChannelData(0);
  let right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    let decay = Math.exp(-i / sampleRate / 2);
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }

  let input = Gain({ gain: 1 });
  let convolver = new ConvolverNode(ctx, { buffer });
  let wet = Gain({ gain: 0.5 });
  let dry = Gain({ gain: 0.5 });
  input.connect(convolver).connect(wet).connect(ctx.destination);
  input.connect(dry).connect(ctx.destination);

  return input;
}

function Noise(duration = 1) {
  let length = Math.floor(sampleRate * duration);
  let buffer = Buffer({ sampleRate, length });
  let data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * @param {number} time
 * @param {number} duration
 * @param {number} frequency
 * @param {number} Q
 * @param {AudioNode} dest
 */
function playNoise(time, duration, frequency, Q, dest = master) {
  let buffer = Noise(duration);
  let source = Source({ buffer });
  let filter = Filter({ type: "bandpass", Q });
  let gain = Gain({});
  gain.gain.setValueAtTime(1.5, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  filter.frequency.setValueAtTime(frequency, time);
  source.connect(filter).connect(gain).connect(dest);
  source.start(time);
  source.stop(time + duration);
}

/**
 * @param {number} time
 * @param {number} note
 * @param {number} velocity
 */
function playDrum(time = ctx.currentTime, note = 0, velocity = 1) {
  if (velocity === 0) return;
  let { pitch, body, skin, snap } = DRUMS[note];

  if (body > 0) {
    let osc = Osc({ type: pitch > 800 ? "sine" : "triangle" });
    let gain = Gain({});
    let decay = 0.03 + 1.5 * body;

    osc.frequency.setValueAtTime(pitch * 2.2, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, time + 0.05 * body);

    gain.gain.setValueAtTime(1.2 * body * velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + decay);
  }

  if (skin > 0) {
    let freq = Math.min(pitch * 3 + 300, 3500);
    playNoise(time, 0.015 + 0.05 * skin, freq, 2.5);
  }

  if (snap > 0) {
    let freq = 2000 + snap * 2500;
    playNoise(time, 0.01 + 0.02 * snap, freq, 4.0);
  }
}

const FORMANTS = [
  [300, 1.0, 9],
  [870, 0.35, 10],
  [2240, 0.12, 14],
];

let voices = range(0, 16).map(() => {
  let detune = random(-8, 8);
  let osc = Osc({ type: "sawtooth", detune });
  let sub = Osc({ detune });
  let subGain = Gain({ gain: 0.18 });
  sub.connect(subGain);

  let vib = Osc({ frequency: 4 + random(0.3, 0.9) });
  let vibGain = Gain({ gain: 3.5 });
  vib.connect(vibGain).connect(osc.detune);

  let mix = Gain({ gain: 1 / 6 });
  osc.connect(mix);
  subGain.connect(mix);

  for (let [frequency, gain, Q] of FORMANTS) {
    let bp = Filter({ type: "bandpass", frequency, Q });
    let g = Gain({ gain });
    mix.connect(bp).connect(g).connect(master);
  }

  return { osc, sub, vib, mix };
});

function playVocal(time = ctx.currentTime, note = 36, velocity = 1) {
  for (let voice of voices) {
    let frequency = hz(note);
    voice.osc.frequency.setTargetAtTime(frequency, time, 0.02);
    voice.sub.frequency.setTargetAtTime(frequency / 2, time, 0.02);
  }
}

/**
 * @type {Record<string, AudioBuffer>}
 */
let karplusStrongCache = {};

/**
 * A Karplus-Strong stringed instrument pluck, based heavily on the concepts
 * and code from this article: https://amid.fish/karplus-strong.
 * @param {number} time Time in seconds
 * @param {number} note Midi note
 * @param {number} velocity Velocity (0-1)
 */
function pluck(time, note, velocity, smoothing = 0.9) {
  if (velocity === 0) return;
  let buffer = karplusStrongCache[note];
  let duration = 2;

  if (!buffer) {
    let freq = hz(note);

    let period = 1 / freq;
    let samples = Math.floor(period * sampleRate);
    let length = duration * sampleRate;
    buffer = Buffer({ length, sampleRate });
    karplusStrongCache[note] = buffer;
    let target = buffer.getChannelData(0);
    let tail = (length * 0.9) | 0;

    for (let i = 0; i < length; i++) {
      let seed = target[i - samples];
      let prev = target[i - 1];
      let curr = smoothing * seed + (1 - smoothing) * prev;
      let fade = Math.min(1, (length - i) / (length - tail - 1));
      target[i] = i < samples ? random(-1, 1) : curr * fade;
    }
  }

  let source = Source({ buffer });
  let gain = Gain({ gain: 0.1 });
  source.start(time);
  source.stop(time + duration);
  source.connect(gain).connect(master);
}

function play() {
  i = 10; // skip midi header

  let tracks = u16();
  let division = u16();
  let tempo = 500_000;
  let now = ctx.currentTime;
  let last = now;

  for (let n = 0; n < tracks; n++) {
    i += 4; // skip track header

    let length = u32();
    let end = i + length;
    let status = 0;
    let ticks = 0;

    while (i < end) {
      let time = vlq();
      let peek = midi[i];
      if (peek >= 0x80) status = u8();
      ticks += time;

      // Meta events
      if (status === MIDI_META) {
        let type = u8();
        let length = u8();
        type === MIDI_META_TEMPO ? (tempo = u24()) : (i += length);
      } else {
        let event = status & 0xf0;

        if (event === MIDI_NOTE_ON || event === MIDI_NOTE_OFF) {
          let note = u8();
          let pressure = u8();
          let seconds = now + ticks * (tempo / division / 1_000_000);
          let velocity = pressure / 127;
          let instr = INSTRUMENTS[n - 1];
          instr(seconds, note, event === MIDI_NOTE_ON ? velocity : 0);
          if (seconds > last) last = seconds;
        } else {
          throw event;
        }
      }
    }
  }

  if (!started) {
    started = true;

    // Fade the soundtrack in with a gentle low pass.
    masterLowPass.frequency.setValueAtTime(0, now);
    masterLowPass.frequency.linearRampToValueAtTime(8_000, now + 20);

    for (let voice of voices) {
      voice.osc.start();
      voice.sub.start();
      voice.vib.start();
    }
  }

  let looper = new OscillatorNode(ctx);
  looper.start(now);
  looper.stop(last);
  looper.onended = () => play();
}

export function mute() {
  if (ctx.state === "suspended") {
    ctx.resume();
  } else {
    ctx.suspend();
  }
}

// Audio start must come from a user interaction.
addEventListener("click", play, { once: true });
