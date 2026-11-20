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

let master: GainNode | null = null;
function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    // louder overall, with a limiter so stacked sounds (purr + meow + knock) never clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master = ctx.createGain();
    master.gain.value = 2.6;
    master.connect(limiter).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}
const toMaster = () => master!;

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
  o.connect(g).connect(toMaster());
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, freq: number, q: number, gain: number, delay = 0) {
  if (!enabled) return;
  const a = ac();
  const t = a.currentTime + delay;
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
  src.connect(bp).connect(g).connect(toMaster());
  src.start(t);
}

// the hiss yields: any other sound cuts a hiss that's still going
let hissing: { src: AudioBufferSourceNode; g: GainNode } | null = null;
function cutHiss() {
  if (!hissing || !ctx) return;
  const now = ctx.currentTime;
  const { src, g } = hissing;
  hissing = null;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(Math.min(g.gain.value, 0.26), now);
  g.gain.linearRampToValueAtTime(0, now + 0.03);
  try { src.stop(now + 0.035); } catch { /* already stopped */ }
}

const fx = {
  click: () => tone(1800, 0.05, 'square', 0.05),
  keycap: () => {
    tone(880, 0.09, 'triangle', 0.12);
    tone(1320, 0.12, 'triangle', 0.1, undefined, 0.07);
  },
  jump: () => tone(320, 0.18, 'sine', 0.12, 640),
  knock: () => tone(520, 0.25, 'triangle', 0.12, 140),
  thud: () => tone(90, 0.2, 'sine', 0.2, 50),
  /** A short purr: low sawtooth, amplitude-wobbled. Back to back, they make a steady rumble. */
  purr: (level = 0.09) => {
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
    lfoGain.gain.value = level * 0.66;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(lp).connect(g).connect(toMaster());
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.7);
    lfo.stop(t + 1.7);
  },
  /** A kitten's meow: a buzzy voice through two sliding formants, pitch up then down ("mi-aow"). */
  meow: () => {
    if (!enabled) return;
    const a = ac();
    const t = a.currentTime;
    const d = 0.42 + Math.random() * 0.3;
    const f0 = 640 + Math.random() * 180; // kitten: high
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * 0.82, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.2, t + d * 0.35);
    o.frequency.linearRampToValueAtTime(f0 * 0.72, t + d);
    const vib = a.createOscillator();
    const vibG = a.createGain();
    vib.frequency.value = 6.5;
    vibG.gain.value = f0 * 0.018;
    vib.connect(vibG).connect(o.frequency);
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.1, t + 0.05);
    out.gain.setValueAtTime(0.1, t + d * 0.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + d);
    // mouth opening: "i" → "a" → "u"
    for (const [from, mid, to, q, g] of [[900, 1300, 650, 6, 1], [2300, 1700, 1100, 8, 0.55]] as const) {
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(from, t);
      bp.frequency.linearRampToValueAtTime(mid, t + d * 0.4);
      bp.frequency.linearRampToValueAtTime(to, t + d);
      const fg = a.createGain();
      fg.gain.value = g;
      o.connect(bp).connect(fg).connect(out);
    }
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    out.connect(lp).connect(toMaster());
    o.start(t);
    vib.start(t);
    o.stop(t + d + 0.05);
    vib.stop(t + d + 0.05);
  },
  /** Coffee over the edge of a mug: a splash and a couple of glugs. */
  spill: () => {
    noise(0.55, 700, 0.7, 0.16);
    tone(190, 0.12, 'sine', 0.08, 120, 0.05);
    tone(160, 0.12, 'sine', 0.07, 100, 0.2);
  },
  /** Glass (or ceramic) breaking on the floor: a bright crash, then shards tinkling down. */
  glass: () => {
    noise(0.22, 7200, 0.6, 0.32);
    noise(0.5, 3200, 0.8, 0.12, 0.03);
    for (let i = 0; i < 11; i++) {
      const d = 0.03 + Math.pow(Math.random(), 1.6) * 0.65;
      tone(3000 + Math.random() * 4200, 0.07 + Math.random() * 0.12, 'sine', 0.035 + Math.random() * 0.03, undefined, d);
    }
  },
  /** Plastic meets floor: a sharp crack and some skittering bits. */
  crack: () => {
    noise(0.18, 6500, 0.9, 0.3);
    [0.06, 0.13, 0.21, 0.3].forEach((d, i) => tone(2400 - i * 300 + Math.random() * 400, 0.05, 'triangle', 0.05, 1200, d));
  },
  /** Claws raking a book spine: quick rasps, alternating paws. */
  scratch: () => [0, 0.17, 0.34, 0.51, 0.68].forEach((d, i) => noise(0.11, 2600 + (i % 2) * 900, 1.4, 0.16, d)),
  /** One drop landing in a puddle. */
  drip: () => tone(1400 + Math.random() * 500, 0.06, 'sine', 0.03, 600),
  /** A cat hiss: one short, sharp burst, timed to land as his back arches (the pose takes ~0.06 s to rise). */
  hiss: () => {
    if (!enabled) return;
    const a = ac();
    const t = a.currentTime + 0.05;
    const dur = 0.42;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(4200, t);
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur); // a slight drop as the breath runs out
    bp.Q.value = 1.1;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.26, t + 0.025); // snaps on with the arch
    g.gain.setValueAtTime(0.26, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(bp).connect(g).connect(toMaster());
    src.start(t);
    hissing = { src, g };
    src.onended = () => { if (hissing?.src === src) hissing = null; };
  },
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
  /** A terracotta pot hitting the floor: a dull body thump, the clay cracking apart, shards skittering,
   *  and the soil spilling out in a soft hiss of grit. */
  potBreak: () => {
    tone(140, 0.22, 'sine', 0.3, 60); // the thump
    noise(0.09, 900, 0.9, 0.42); // the crack
    noise(0.16, 1800, 1.2, 0.26, 0.015);
    for (let i = 0; i < 9; i++) {
      const d = 0.05 + Math.pow(Math.random(), 1.4) * 0.55;
      noise(0.03 + Math.random() * 0.04, 1200 + Math.random() * 1800, 3, 0.1 + Math.random() * 0.08, d); // shards
      if (i % 3 === 0) tone(700 + Math.random() * 600, 0.06, 'triangle', 0.03, 400, d); // dull clay tinks
    }
    noise(0.6, 600, 0.5, 0.08, 0.08); // soil
  },
  smash: () => {
    noise(0.45, 5200, 0.8, 0.25);
    tone(1800, 0.2, 'triangle', 0.05, 900);
  },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, undefined, i * 0.1)),
};

type Fx = typeof fx;
/** Every sound (bar the hiss itself and the background purr) first cuts a hiss that's still playing. */
export const sfx = Object.fromEntries(
  Object.entries(fx).map(([k, f]) => [k, k === 'hiss' || k === 'purr' ? f : (...args: unknown[]) => { cutHiss(); return (f as (...a: unknown[]) => unknown)(...args); }]),
) as Fx;
