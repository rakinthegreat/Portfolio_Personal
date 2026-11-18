// Tiny synthesized sound effects (no audio files). Off until the visitor turns sound on.
const KEY = 'desk-sound';
let ctx: AudioContext | null = null;
let enabled = (() => {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
})();
const listeners = new Set<(on: boolean) => void>();

export const soundOn = () => enabled;
export function setSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (on) ac();
  listeners.forEach((f) => f(on));
}
export const onSoundChange = (f: (on: boolean) => void) => listeners.add(f);

function ac() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
  if (!enabled) return;
  const a = ac();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, freq: number, q: number, gain: number) {
  if (!enabled) return;
  const a = ac();
  const t = a.currentTime;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
  g.gain.setValueAtTime(gain, t + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  click: () => tone(1800, 0.05, 'square', 0.05),
  keycap: () => {
    tone(880, 0.09, 'triangle', 0.12);
    tone(1320, 0.12, 'triangle', 0.1, undefined, 0.07);
  },
  jump: () => tone(320, 0.18, 'sine', 0.12, 640),
  knock: () => tone(520, 0.25, 'triangle', 0.12, 140),
  thud: () => tone(90, 0.2, 'sine', 0.2, 50),
  /** A short purr: low sawtooth, amplitude-wobbled. */
  purr: () => {
    if (!enabled) return;
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator();
    const lfo = a.createOscillator();
    const lfoGain = a.createGain();
    const g = a.createGain();
    const lp = a.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = 48;
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lfo.frequency.value = 24;
    lfoGain.gain.value = 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.7);
    lfo.stop(t + 1.7);
  },
  /** A cat hiss: a burst of band-passed noise with a fast attack. */
  hiss: () => noise(0.9, 3800, 1.2, 0.22),
  /** Printer: stepper-motor whirr in short pulses for `secs`. */
  print: (secs: number) => {
    for (let t = 0; t < secs; t += 0.32) {
      tone(220, 0.22, 'sawtooth', 0.025, 260, t);
      tone(110, 0.22, 'square', 0.015, undefined, t);
    }
  },
  punch: () => tone(160, 0.12, 'square', 0.12, 60),
  /** Ceramic: a bright clink, and a crash for when it meets the floor. */
  clink: () => {
    tone(2600, 0.35, 'sine', 0.06);
    tone(3900, 0.25, 'sine', 0.03, undefined, 0.01);
  },
  smash: () => {
    noise(0.45, 5200, 0.8, 0.25);
    tone(1800, 0.2, 'triangle', 0.05, 900);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, undefined, i * 0.1)),
};
