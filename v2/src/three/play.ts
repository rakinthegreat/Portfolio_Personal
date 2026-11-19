// Play mode: walk the desk as the cat. WASD / arrows, Shift to run, Space to jump; joystick on touch.
// He starts in his basket and leaps onto the desk; on exit he jumps back and curls up again.
// Physics is box-based in 3D: the cat is three body samples (chest, middle, rump) with real height, so
// he can't walk or turn through anything, bonks his head on shelf undersides, and lands on whatever is
// below. He refuses to leave the desk: push him over an edge and he backs away a few steps, then hisses at it.
// Six lost keycaps spell CATNIP (→ zoomies); some sit high up the shelves.
import * as THREE from 'three';
import { Cat } from './cat';
import { DESK, markText, type Box, type Knockable, type Prop, type ShelfBook } from './props';
import { keycapLegend } from './textures';
import { sfx } from '../sound';

const WORD = 'CATNIP';
// [x, z, surface y]: a parkour route up both sides
const KEY_SPOTS: [number, number, number][] = [
  [-0.62, -0.3, 0.144], // on the Pavilion
  [-0.86, -0.45, 0.606], // on the Plassey box, up on the wall shelf
  [-0.66, -0.45, 0.56], // wall shelf
  [0.74, -0.24, 0.28], // lower shelf, above the printer
  [0.78, -0.43, 0.58], // top shelf
  [0.02, -0.44, 0.58], // halfway along the plank, under the pinboard
];

const G = 5.5;
const JUMP_V = 1.95; // reaches ~0.34 m: shelf to shelf
const STEP = 0.03;
const K = Cat.SCALE / 0.85; // collision sizes were tuned at 0.85
const R = 0.045 * K; // body half-width
const H = Cat.HEIGHT;
const FRONT = 0.12 * K;
const BACK = 0.11 * K;
const NOSE = 0.165 * K; // nose tip (whiskers spread from here)
const FLOOR = -0.76;
const STORE = 'desk-progress-v2';

interface Saved { keys: number[]; knocked: number }
const load = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? '');
    if (Array.isArray(s.keys) && typeof s.knocked === 'number') return s;
  } catch { /* private mode or nothing saved */ }
  return { keys: [], knocked: 0 };
};
const save = (s: Saved) => {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ }
};

interface KeyCap { mesh: THREE.Group; base: THREE.Vector3; got: boolean; anim: number }
interface Scratched { b: ShelfBook; dmg: number; canvas?: HTMLCanvasElement; tex?: THREE.CanvasTexture; ruined: boolean }
interface Heart { s: THREE.Sprite; t: number; vx: number; ph: number }
interface Bit { m: THREE.Object3D; v: THREE.Vector3; w: THREE.Vector3; rest: boolean; h: number; floor: number }
interface Body { k: Knockable; vel: THREE.Vector3; fallen: boolean; resting: boolean; broken?: boolean; tip?: { axis: THREE.Vector3; a: number; v: number }; spilled?: boolean }
interface Puddle { mesh: THREE.Mesh; t: number; delay: number; size: number; x: number; y: number; z: number; drip?: Drip }
interface Drip { x: number; z: number; nx: number; nz: number; t: number; run: THREE.Mesh; floor: THREE.Mesh | null; drops: { m: THREE.Mesh; vy: number }[]; next: number }
interface Leap { from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; apex: number; then: 'play' | 'sleep' }

export class Play {
  active = false;
  private keys = new Set<string>();
  private vel = new THREE.Vector3();
  private vy = 0;
  private grounded = true;
  private yaw = 0;
  private stick = new THREE.Vector2();
  private jumpQueued = false;
  private caps: KeyCap[] = [];
  private bodies: Body[];
  private saved = load();
  private zoomies = false;
  private nearProp: string | null = null;
  private hud: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;
  private hissCool = 0;
  private backoff: { t: number; dir: THREE.Vector2; hissFirst?: boolean; lines?: string[] } | null = null; // reverse-walking away from an edge before the hiss
  private meowCool = 0;
  private puddles: Puddle[] = [];
  private wetCool = 0;
  private hearts: Heart[] = [];
  private heartTex: THREE.Texture | null = null;
  private loveT = 0; // how long he's been gazing at the plaque
  private heartNext = 0;
  private purrNext = 0;
  private bits: Bit[] = [];
  private books: Scratched[] = [];
  private scratchT = 0;
  private thoughtEl: HTMLElement;
  private thoughtT = 0;
  /** Called with the nearby prop's id when F is pressed (and it isn't a book to scratch). */
  onInteract: (id: string) => void = () => {};
  /** The thing F would act on right now: 'book' or a prop id. */
  interactable: string | null = null;
  private leap: Leap | null = null;
  private landing = new THREE.Vector3(-0.78, 0, 0.36);
  private mode: 'free' | 'plank' = 'free';
  private plankZone(p: THREE.Vector3) {
    return p.y > 0.5 && p.z < -0.3 && p.x > -0.46 && p.x < 0.5;
  }
  private modeT = 0; // time since the control mode last changed: the camera catches up fast

  constructor(
    private scene: THREE.Scene,
    private cat: Cat,
    private boxes: Box[],
    knockables: Knockable[],
    private props: Prop[],
    private basketSpot: THREE.Vector3,
    private ui: HTMLElement,
    private onNear: (propId: string | null) => void,
    private onToggle: (on: boolean) => void,
  ) {
    this.bodies = knockables.map((k) => ({ k, vel: new THREE.Vector3(), fallen: false, resting: true }));
    this.zoomies = this.saved.keys.length === WORD.length;

    const capGeo = new THREE.BoxGeometry(0.03, 0.018, 0.03);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.45 });
    KEY_SPOTS.forEach(([x, z, y], i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(capGeo, capMat);
      body.castShadow = true;
      const top = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.026), new THREE.MeshStandardMaterial({ map: keycapLegend(WORD[i]), roughness: 0.5 }));
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.0091;
      g.add(body, markText(top));
      const base = new THREE.Vector3(x, y + 0.04, z);
      g.position.copy(base);
      g.visible = false;
      scene.add(g);
      this.caps.push({ mesh: g, base, got: this.saved.keys.includes(i), anim: 0 });
    });

    this.hud = document.createElement('div');
    this.hud.className = 'play-hud';
    this.hud.innerHTML = `
      <div class="play-stats">
        <p>LOST KEYCAPS</p>
        <p class="play-word" data-word></p>
        <p>KNOCKED OFF THE DESK: <b data-knocked>0</b></p>
      </div>
      <p class="play-help"><kbd>WASD</kbd> move · <kbd>⇧</kbd> run · <kbd>Space</kbd> jump · <kbd>F</kbd> interact · <kbd>1–9</kbd> caption · <kbd>H</kbd> all keys · <kbd>Esc</kbd> stop</p>
      <button class="btn play-exit" type="button" data-exit>Stop playing</button>
      <div class="play-stick" data-stick aria-hidden="true"><span></span></div>
      <button class="play-jump" type="button" data-jump aria-label="Jump">JUMP</button>`;
    ui.append(this.hud);
    this.toastEl = document.createElement('p');
    this.toastEl.className = 'play-toast';
    ui.append(this.toastEl);
    this.thoughtEl = document.createElement('p');
    this.thoughtEl.className = 'cat-thought';
    this.thoughtEl.setAttribute('aria-live', 'polite');
    ui.append(this.thoughtEl);
    this.hud.querySelector('[data-exit]')!.addEventListener('click', () => this.exit());
    this.bindInput();
    this.renderHud();
  }

  // ── input ──────────────────────────────────────────
  private bindInput() {
    addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]');
      if (typing || document.querySelector('dialog[open]') || document.querySelector('.tour.screen-focus')) return;
      if (!this.active) {
        if (e.key === 'e' || e.key === 'E') {
          const r = this.ui.closest('[data-tour]')?.getBoundingClientRect();
          if (r && r.top <= 0 && r.bottom >= innerHeight) this.enter();
        }
        return;
      }
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') return this.exit();
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (e.key === ' ' && !e.repeat) this.jumpQueued = true;
      if ((e.key === 'f' || e.key === 'F') && !e.repeat) this.interact();
      this.keys.add(e.key.toLowerCase());
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    const stick = this.hud.querySelector<HTMLElement>('[data-stick]')!;
    const knob = stick.querySelector('span')!;
    let id: number | null = null;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const r = stick.getBoundingClientRect();
      const v = new THREE.Vector2(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      const max = r.width / 2;
      if (v.length() > max) v.setLength(max);
      knob.style.transform = `translate(${v.x}px, ${v.y}px)`;
      this.stick.set(v.x / max, v.y / max);
    };
    stick.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      stick.setPointerCapture(id);
      move(e);
    });
    stick.addEventListener('pointermove', move);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      this.stick.set(0, 0);
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
    this.hud.querySelector('[data-jump]')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.jumpQueued = true;
    });
  }

  enter() {
    if (this.active || this.leap) return;
    this.active = true;
    this.caps.forEach((c) => (c.mesh.visible = !c.got));
    this.cat.setState('idle');
    this.cat.autonomous = true;
    this.cat.stretch();
    this.onToggle(true);
    // wake up, then leap from the basket onto the desk
    this.startLeap(this.cat.root.position.clone(), this.landing.clone(), 'play', 1.4); // stretch, then leap
    this.toast(this.zoomies ? 'Zoomies are on. Go fast.' : 'Find the six lost keycaps. Or just knock things over.');
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    this.stick.set(0, 0);
    this.vel.set(0, 0, 0);
    this.cat.gaitScale = 1;
    this.cat.autonomous = false;
    this.caps.forEach((c) => (c.mesh.visible = false));
    this.onNear(null);
    this.onToggle(false);
    // back to the basket for a nap
    this.startLeap(this.cat.root.position.clone(), this.basketSpot.clone(), 'sleep', 0);
  }

  private startLeap(from: THREE.Vector3, to: THREE.Vector3, then: Leap['then'], delay: number) {
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    this.leap = { from, to, t: -delay, dur: 0.45 + dist * 0.5, apex: Math.max(from.y, to.y) + 0.16, then };
    this.yaw = Math.atan2(to.x - from.x, to.z - from.z);
  }

  /** Scripted basket ↔ desk jumps. Returns true while one is running. */
  updateLeap(dt: number) {
    const L = this.leap;
    if (!L) return false;
    const c = this.cat;
    L.t += dt;
    if (L.t < 0) {
      c.setState('idle'); // stretch awake before jumping
      return true;
    }
    if (L.t === dt || (L.t > 0 && L.t - dt <= 0)) sfx.jump();
    const k = Math.min(1, L.t / L.dur);
    // parabola through from → apex → to
    const p = c.root.position;
    p.x = THREE.MathUtils.lerp(L.from.x, L.to.x, k);
    p.z = THREE.MathUtils.lerp(L.from.z, L.to.z, k);
    const y0 = L.from.y;
    const y1 = L.to.y;
    const a = L.apex;
    p.y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * (2 * a - (y0 + y1) / 2) + k * k * y1;
    c.airborne = k < 1;
    let d = this.yaw - c.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    c.root.rotation.y += d * Math.min(1, dt * 12);
    if (k >= 1) {
      c.airborne = false;
      this.leap = null;
      if (L.then === 'sleep') {
        c.root.rotation.y = 1.1;
        c.setState('sleep');
      } else {
        this.grounded = true;
        this.vy = 0;
        c.landed();
        c.setState('idle');
        this.meow(0.85); // hello
      }
    }
    return true;
  }

  // ── world queries ──────────────────────────────────
  private samples(x: number, z: number, yaw: number) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    return [
      [x + fx * FRONT, z + fz * FRONT],
      [x, z],
      [x - fx * BACK, z - fz * BACK],
    ];
  }
  private touches(b: Box, x: number, z: number, r: number) {
    const dx = x - Math.max(b.minX, Math.min(x, b.maxX));
    const dz = z - Math.max(b.minZ, Math.min(z, b.maxZ));
    return dx * dx + dz * dz < r * r;
  }
  /** Highest surface under the cat at or just below `y`. */
  private support(x: number, z: number, yaw: number, y: number) {
    let f = FLOOR;
    for (const [sx, sz] of this.samples(x, z, yaw))
      for (const b of this.boxes) if (b.maxY <= y + STEP && b.maxY > f && this.touches(b, sx, sz, R * 0.8)) f = b.maxY;
    return f;
  }
  /** Would the cat's body intersect anything at this pose? */
  private blocked(x: number, z: number, yaw: number, y: number) {
    for (const [sx, sz] of this.samples(x, z, yaw))
      for (const b of this.boxes) if (b.maxY > y + STEP && b.minY < y + H && this.touches(b, sx, sz, R)) return true;
    // nose and whiskers: they reach past the chest, so keep them out of tall things (the Victus lid, walls)
    const nx = x + Math.sin(yaw) * NOSE;
    const nz = z + Math.cos(yaw) * NOSE;
    for (const b of this.boxes) if (b.minY < y + H * 0.6 && b.maxY > y + H * 0.55 && this.touches(b, nx, nz, R * 0.75)) return true;
    return false;
  }
  private ceiling(x: number, z: number, yaw: number, y: number) {
    let c = Infinity;
    for (const [sx, sz] of this.samples(x, z, yaw))
      for (const b of this.boxes) if (b.minY >= y + H - 0.02 && b.minY < c && this.touches(b, sx, sz, R)) c = b.minY;
    return c;
  }
  /** How far past the desk edge he'd be: front paws on the ground, body centre in the air. */
  private overhang(x: number, z: number, yaw: number, air: boolean) {
    const fx = air ? x : x + Math.sin(yaw) * FRONT;
    const fz = air ? z : z + Math.cos(yaw) * FRONT;
    const m = air ? R : 0;
    return Math.max(0, DESK.minX + m - fx, fx - (DESK.maxX - m), fz - (DESK.maxZ - m));
  }
  /** Only refuse moves that take him further over the edge, so he can walk along it, turn, or back away. */
  private offDesk(nx: number, nz: number, x: number, z: number, yaw: number) {
    const air = !this.grounded;
    const after = this.overhang(nx, nz, yaw, air);
    return after > 0 && after > this.overhang(x, z, yaw, air) + 1e-6;
  }

  /** At an edge: eyes on the drop, he reverse-walks a few steps toward the middle of the desk, then hisses at it. */
  private tryHiss() {
    if (this.hissCool > 0 || this.backoff) return;
    const pos = this.cat.root.position;
    const back = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const inward = new THREE.Vector2((DESK.minX + DESK.maxX) / 2 - pos.x, (DESK.minZ + DESK.maxZ) / 2 - pos.z).normalize();
    this.backoff = { t: 0.65, dir: back.multiplyScalar(0.6).add(inward.multiplyScalar(0.4)).normalize() };
    this.vel.set(0, 0, 0);
  }
  private hissNow(lines = ['Not leaving the desk.', 'That is a long way down.', 'The desk is home.']) {
    this.hissCool = 2.2;
    this.cat.hiss();
    sfx.hiss();
    this.think(lines[Math.floor(Math.random() * lines.length)]);
  }
  /** Cats don't do wet paws: refuse any step that takes his front paws further into a coffee puddle. */
  private wetStep(nx: number, nz: number, x: number, z: number, y: number) {
    const fx = Math.sin(this.yaw) * FRONT;
    const fz = Math.cos(this.yaw) * FRONT;
    for (const p of this.puddles) {
      const r = p.mesh.scale.x * 1.1 + 0.01;
      if (r < 0.02 || Math.abs(p.y - y) > 0.03) continue;
      const dNew = Math.hypot(nx + fx - p.x, nz + fz - p.z);
      if (dNew < r && dNew < Math.hypot(x + fx - p.x, z + fz - p.z) - 1e-6) return true;
    }
    return false;
  }
  /** Paw touches coffee: an instant hiss at it, and one step straight back. */
  private refuseWet() {
    if (this.backoff) return;
    const back = new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    this.backoff = { t: 0.32, dir: back, hissFirst: true };
    this.vel.set(0, 0, 0);
    this.cat.look.y = 0.35; // eyes on the puddle
    if (this.wetCool <= 0) {
      this.wetCool = 1.2;
      this.hissNow(['Wet. Absolutely not.', 'Not stepping in that.', 'Coffee is for humans.']);
    }
  }
  /** Now and then, not every time: a meow for something he did. */
  private meow(chance: number) {
    if (this.meowCool > 0 || Math.random() > chance) return;
    this.meowCool = 3.5;
    sfx.meow();
  }

  // ── per frame ──────────────────────────────────────
  update(dt: number, t: number, camPos: THREE.Vector3, camLook: THREE.Vector3, narrow: boolean) {
    const pos = this.cat.root.position;
    this.hissCool -= dt;
    this.meowCool -= dt;
    this.wetCool -= dt;
    this.updatePuddles(dt);
    const leaping = this.updateLeap(dt);

    if (!leaping && this.active) {
      const k = this.keys;
      const ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + this.stick.x;
      const iz = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0) + this.stick.y;
      const input = new THREE.Vector2(ix, iz);
      if (input.length() > 1) input.normalize();
      // up on the plank (or the shelves at that height): a 2D platformer, left/right only; S hops down
      const onPlank = this.plankZone(pos);
      const mode = onPlank ? 'plank' : 'free';
      if (mode !== this.mode) this.modeT = 0;
      this.mode = mode;
      this.modeT += dt;
      if (onPlank) input.y = 0; // strictly left/right
      const hissing = this.cat.state === 'hiss' || this.cat.state === 'roll'; // rolled over: he stays put
      const run = k.has('shift') || this.stick.length() > 0.9;
      const speed = hissing ? 0 : (run ? 0.62 : 0.32) * (this.zoomies ? 1.6 : 1);
      const want = new THREE.Vector3(input.x * speed, 0, input.y * speed);
      if (this.scratchT > 0) {
        this.scratchT -= dt;
        want.set(0, 0, 0);
      }
      const bo = this.backoff;
      if (bo) {
        // backing away: no steering, slow reverse steps, still facing the edge
        want.set(bo.dir.x * 0.17, 0, bo.dir.y * 0.17);
        bo.t -= dt;
        if (bo.t <= 0) {
          this.backoff = null;
          want.set(0, 0, 0);
          this.vel.set(0, 0, 0);
          if (!bo.hissFirst) this.hissNow(bo.lines);
        }
      }
      this.cat.gaitDir = this.backoff ? -1 : 1;
      // stay on the line of the platform
      if (onPlank) want.z = THREE.MathUtils.clamp((-0.44 - pos.z) * 10, -0.4, 0.4);
      this.vel.lerp(want, 1 - Math.exp(-dt * (this.grounded ? 10 : 5)));

      // turn toward the motion, but only if the body fits at the new heading
      const hs = Math.hypot(this.vel.x, this.vel.z);
      // face along the platform, not toward the small corrective drift
      const fx = this.vel.x;
      const fz = onPlank ? 0 : this.vel.z;
      if (!this.backoff && !hissing && Math.hypot(fx, fz) > 0.03) {
        let d = Math.atan2(fx, fz) - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const ny = this.yaw + d * Math.min(1, dt * 10);
        if (!this.blocked(pos.x, pos.z, ny, pos.y)) this.yaw = ny;
      }

      // move one axis at a time so he slides along things; refuse to step off the desk
      const nx = pos.x + this.vel.x * dt;
      if (this.offDesk(nx, pos.z, pos.x, pos.z, this.yaw)) {
        this.vel.x = 0;
        if (this.grounded && Math.abs(input.x) > 0.3) this.tryHiss();
      } else if (this.grounded && this.wetStep(nx, pos.z, pos.x, pos.z, pos.y)) {
        this.vel.x = 0;
        this.refuseWet();
      } else if (!this.blocked(nx, pos.z, this.yaw, pos.y)) pos.x = nx;
      else this.vel.x = 0;
      const nz = pos.z + this.vel.z * dt;
      if (this.offDesk(pos.x, nz, pos.x, pos.z, this.yaw)) {
        this.vel.z = 0;
        if (this.grounded && Math.abs(input.y) > 0.3) this.tryHiss();
      } else if (this.grounded && this.wetStep(pos.x, nz, pos.x, pos.z, pos.y)) {
        this.vel.z = 0;
        this.refuseWet();
      } else if (!this.blocked(pos.x, nz, this.yaw, pos.y)) pos.z = nz;
      else this.vel.z = 0;

      // jump + gravity, with head bonks and proper landings
      if (this.jumpQueued && this.grounded && !hissing && !this.backoff) {
        // a jump that would land off the desk is refused (with a hiss); anything else is fine, even to the very edge
        const air = (2 * JUMP_V) / G;
        const lx = pos.x + this.vel.x * air;
        const lz = pos.z + this.vel.z * air;
        if (this.overhang(lx, lz, this.yaw, true) > R) {
          this.vel.set(0, 0, 0);
          this.tryHiss();
        } else {
          this.vy = JUMP_V;
          this.grounded = false;
          sfx.jump();
          this.meow(0.06);
        }
      }
      this.jumpQueued = false;
      this.vy -= G * dt;
      let ny = pos.y + this.vy * dt;
      if (this.vy > 0) {
        const c = this.ceiling(pos.x, pos.z, this.yaw, pos.y);
        if (ny + H > c) {
          ny = c - H;
          this.vy = 0;
        }
      }
      const floor = this.support(pos.x, pos.z, this.yaw, pos.y);
      if (ny <= floor) {
        if (!this.grounded) {
          if (this.vy < -1.2) {
            sfx.thud();
            this.meow(0.25);
          }
          this.cat.landed();
        }
        ny = floor;
        this.vy = 0;
        this.grounded = true;
      } else if (ny - floor > 0.004) this.grounded = false;
      pos.y = ny;

      this.cat.root.rotation.y = this.yaw;
      this.cat.airborne = !this.grounded;
      this.cat.setState(hs > 0.05 && this.grounded ? 'walk' : 'idle');
      this.cat.gaitScale = THREE.MathUtils.clamp(hs / 0.32, 0.6, 2.4);
    }

    // camera: behind and above, looking toward the wall
    if (this.active || leaping) {
      const back = narrow ? 0.85 : 0.66;
      let desired = new THREE.Vector3(pos.x * 0.85, pos.y + (narrow ? 0.46 : 0.34), Math.min(pos.z + back, 1.4));
      let look = new THREE.Vector3(pos.x, pos.y + 0.1, pos.z - 0.06);
      const byBoard = this.mode === 'plank' && pos.x > -0.75 && pos.x < 0.6;
      if (byBoard) {
        // pull back and centre on the board, with him walking along the plank beneath it
        const cx = THREE.MathUtils.clamp(pos.x * 0.6, -0.2, 0.2);
        desired = new THREE.Vector3(cx, 0.88, narrow ? 0.75 : 0.42);
        look = new THREE.Vector3(cx * 0.6, 0.83, -0.54); // board 0.59–1.13 m and the plank both in frame
      }
      const kc = 1 - Math.exp(-dt * (this.modeT < 0.7 ? 10 : 4.5)); // snap to a new view quickly
      camPos.lerp(desired, kc);
      camLook.lerp(look, kc);
    }

    this.updateCaps(dt, t, pos);
    this.updateBodies(dt, pos, Math.hypot(this.vel.x, this.vel.z));

    // look at whatever's nearby, and show its caption
    let near: Prop | null = null;
    let best = 0.24;
    for (const p of this.props) {
      const dy = p.anchor.y - pos.y;
      if (dy < -0.2 || dy > 0.35) continue; // things on another level aren't 'nearby'
      const d = Math.hypot(p.anchor.x - pos.x, p.anchor.z - pos.z, dy * 0.8);
      if (d < best) {
        best = d;
        near = p;
      }
    }
    if (this.active) {
      if (near) {
        const a = Math.atan2(near.anchor.x - pos.x, near.anchor.z - pos.z) - this.yaw;
        this.cat.look.x = Math.atan2(Math.sin(a), Math.cos(a));
        this.cat.look.y = THREE.MathUtils.clamp(-(near.anchor.y - pos.y - 0.2) * 1.5, -0.4, 0.4);
      } else this.cat.look.set(0, 0);
      const id = near?.id ?? null;
      if (id !== this.nearProp) {
        this.nearProp = id;
        this.onNear(id);
      }
    }
    this.interactable = this.active ? (this.facingBook(pos) ? 'book' : this.nearProp) : null;
    if (this.thoughtT > 0 && (this.thoughtT -= dt) <= 0) this.thoughtEl.classList.remove('on');
    this.updateLove(dt, pos, near);
    this.updateBits(dt);
    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.toastEl.classList.remove('on');
  }

  /** Still, close to the plaque and facing it: little hearts drift up out of his head (and he purrs). */
  private updateLove(dt: number, pos: THREE.Vector3, near: Prop | null) {
    let gazing = false;
    if (this.active && near?.id === 'plaque' && this.grounded && !this.backoff && Math.hypot(this.vel.x, this.vel.z) < 0.05) {
      const a = Math.atan2(near.anchor.x - pos.x, near.anchor.z - pos.z) - this.yaw;
      gazing = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.75;
    }
    const was = this.loveT;
    this.loveT = gazing ? this.loveT + dt : 0;
    if (was <= 0.6 && this.loveT > 0.6) this.think(['My humans. ♥', 'Them again. ♥', 'Best photo.'][Math.floor(Math.random() * 3)]);
    if (this.loveT > 0.6) {
      this.cat.look.y = -0.15; // chin up, eyes on the photo
      if ((this.heartNext -= dt) <= 0) {
        this.heartNext = 0.38 + Math.random() * 0.25;
        this.heartTex ??= heartTexture();
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heartTex, transparent: true, depthWrite: false }));
        const fx = Math.sin(this.yaw);
        const fz = Math.cos(this.yaw);
        s.position.set(pos.x + fx * 0.035 + (Math.random() - 0.5) * 0.02, pos.y + H + 0.01, pos.z + fz * 0.035);
        s.scale.setScalar(0.001);
        this.scene.add(s);
        this.hearts.push({ s, t: 0, vx: (Math.random() - 0.5) * 0.03, ph: Math.random() * 6 });
      }
      if ((this.purrNext -= dt) <= 0) {
        this.purrNext = 1.45;
        sfx.purr(0.06);
      }
    }
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.t += dt;
      const k = h.t / 1.8;
      h.s.position.y += dt * 0.06;
      h.s.position.x += (h.vx + Math.sin(h.t * 4 + h.ph) * 0.012) * dt;
      h.s.scale.setScalar(0.022 * Math.min(1, h.t * 4) * (1 + k * 0.3));
      (h.s.material as THREE.SpriteMaterial).opacity = Math.min(1, (1 - k) * 2.2);
      if (k >= 1) {
        this.scene.remove(h.s);
        (h.s.material as THREE.SpriteMaterial).dispose();
        this.hearts.splice(i, 1);
      }
    }
  }

  /** The mouse hits the floor and comes apart: its parts scatter and settle. */
  private shatter(b: Body) {
    b.broken = true;
    const m = b.k.mesh;
    const hardFloor = m.position.y - b.k.radius > FLOOR + 0.05 ? m.position.y - b.k.radius : FLOOR; // broke on a shelf or the desk, not the floor
    m.updateMatrixWorld(true);
    const parts = [...m.children];
    const body = m.getObjectByName('potbody') as THREE.Mesh | undefined;
    if (body) {
      body.updateMatrixWorld(true);
      const at = new THREE.Vector3().setFromMatrixPosition(body.matrixWorld);
      parts.splice(parts.indexOf(body), 1);
      m.remove(body);
      const soil = new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 1 });
      for (let i = 0; i < 9; i++) {
        const shard = new THREE.Mesh(new THREE.BoxGeometry(0.018 + Math.random() * 0.02, 0.006, 0.014 + Math.random() * 0.018), i < 7 ? body.material : soil);
        shard.position.copy(at).add(new THREE.Vector3((Math.random() - 0.5) * 0.05, Math.random() * 0.04, (Math.random() - 0.5) * 0.05));
        m.add(shard);
        parts.push(shard);
      }
    }
    for (const c of parts) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const sc = new THREE.Vector3();
      c.matrixWorld.decompose(p, q, sc);
      m.remove(c);
      c.position.copy(p);
      c.quaternion.copy(q);
      c.scale.copy(sc);
      this.scene.add(c);
      const a = Math.random() * Math.PI * 2;
      const sp = 0.25 + Math.random() * 0.6;
      const box = new THREE.Box3().setFromObject(c);
      this.bits.push({
        m: c,
        v: new THREE.Vector3(Math.cos(a) * sp + b.vel.x * 0.4, 0.6 + Math.random() * 0.9, Math.sin(a) * sp + b.vel.z * 0.4),
        w: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18),
        rest: false,
        h: Math.max(0.002, (box.max.y - box.min.y) / 2),
        floor: hardFloor,
      });
    }
    m.visible = false;
    b.resting = true;
    b.vel.set(0, 0, 0);
    const pot = b.k.name === 'pot';
    if (pot) sfx.smash();
    else sfx.glass();
    this.meow(0.5);
    this.toast(pot ? 'The plant is now on the floor. All of it.' : 'The mouse is now several mice.');
    this.think(pot ? ['It was in my way.', 'Gardening.', 'The plant looked at me.'][Math.floor(Math.random() * 3)] : ['Got it.', 'It had it coming.', 'Best mouse yet.'][Math.floor(Math.random() * 3)]);
  }
  private updateBits(dt: number) {
    for (const bit of this.bits) {
      if (bit.rest) continue;
      bit.v.y -= G * 1.6 * dt;
      bit.m.position.addScaledVector(bit.v, dt);
      bit.m.rotation.x += bit.w.x * dt;
      bit.m.rotation.y += bit.w.y * dt;
      bit.m.rotation.z += bit.w.z * dt;
      if (bit.m.position.y - bit.h < bit.floor) {
        bit.m.position.y = bit.floor + bit.h;
        bit.v.y = Math.abs(bit.v.y) > 0.3 ? -bit.v.y * 0.35 : 0;
        bit.v.x *= 0.7;
        bit.v.z *= 0.7;
        bit.w.multiplyScalar(0.6);
        if (bit.v.lengthSq() < 0.002) bit.rest = true;
      }
    }
  }

  private updateCaps(dt: number, t: number, pos: THREE.Vector3) {
    this.caps.forEach((c, i) => {
      if (c.got) {
        if (c.anim > 0) {
          c.anim -= dt;
          c.mesh.position.y += dt * 0.6;
          c.mesh.scale.setScalar(Math.max(0.01, c.anim / 0.5));
          if (c.anim <= 0) c.mesh.visible = false;
        }
        return;
      }
      c.mesh.position.set(c.base.x, c.base.y + Math.sin(t * 2 + i) * 0.008, c.base.z);
      c.mesh.rotation.y = t * 1.2 + i;
      if (!this.active) return;
      const d = Math.hypot(c.base.x - pos.x, c.base.z - pos.z);
      if (d < 0.09 && c.base.y > pos.y - 0.02 && c.base.y < pos.y + H) {
        c.got = true;
        c.anim = 0.5;
        sfx.keycap();
        this.meow(0.5);
        this.saved.keys.push(i);
        save(this.saved);
        const n = this.saved.keys.length;
        if (n === WORD.length) {
          this.zoomies = true;
          this.toast('CATNIP! Zoomies unlocked.');
        } else this.toast(`Keycap ${WORD[i]} found (${n}/${WORD.length})`);
        this.renderHud();
      }
    });
  }

  private updateBodies(dt: number, catPos: THREE.Vector3, catSpeed: number) {
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const paw = new THREE.Vector3(catPos.x + fx * FRONT, catPos.y, catPos.z + fz * FRONT);
    for (const b of this.bodies) {
      const m = b.k.mesh;
      const r = b.k.radius;
      if (this.active && !b.fallen) {
        const dx = m.position.x - paw.x;
        const dz = m.position.z - paw.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.055 * K + r && m.position.y > catPos.y - 0.03 && m.position.y < catPos.y + 0.12 && catSpeed > 0.05) {
          if (b.resting) {
            sfx.knock();
            this.meow(0.3);
          }
          const push = catSpeed * 1.3 + 0.22;
          const ux = dx / (d || 1);
          const uz = dz / (d || 1);
          b.vel.set(ux * push, 0.3, uz * push);
          b.resting = false;
          // a proper shove tips the mug over, toward where it was pushed
          if ((b.k.name === 'mug' || b.k.name === 'pot') && !b.tip && push > 0.5) b.tip = { axis: new THREE.Vector3(uz, 0, -ux), a: 0, v: 0 };
        }
      }
      if (b.resting) continue;
      b.vel.y -= G * dt;
      m.position.addScaledVector(b.vel, dt);
      // collide with boxes: push out along the shallowest axis
      let hard = false;
      for (const box of this.boxes) {
        const cx = Math.max(box.minX, Math.min(m.position.x, box.maxX));
        const cy = Math.max(box.minY, Math.min(m.position.y, box.maxY));
        const cz = Math.max(box.minZ, Math.min(m.position.z, box.maxZ));
        const dx = m.position.x - cx;
        const dy = m.position.y - cy;
        const dz = m.position.z - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 1e-4;
        const nx = dx / d;
        const ny = d2 > 0 ? dy / d : 1;
        const nz = dz / d;
        m.position.x += nx * (r - d);
        m.position.y += ny * (r - d);
        m.position.z += nz * (r - d);
        const vn = b.vel.x * nx + b.vel.y * ny + b.vel.z * nz;
        if (b.k.name === 'pot' && !b.broken && ny > 0.6 && vn < -1.4) hard = true;
        if (vn < 0) {
          b.vel.x -= 1.4 * vn * nx;
          b.vel.y -= 1.4 * vn * ny;
          b.vel.z -= 1.4 * vn * nz;
        }
        if (ny > 0.7) {
          b.vel.x *= Math.exp(-dt * 7);
          b.vel.z *= Math.exp(-dt * 7);
        }
      }
      if (hard || ((b.k.name === 'mouse' || b.k.name === 'pot') && !b.broken && m.position.y - r < FLOOR)) {
        if (!hard) m.position.y = FLOOR + r;
        this.shatter(b);
        continue;
      }
      if (b.k.name === 'mug' && !b.broken && m.position.y - r < FLOOR) {
        b.broken = true;
        sfx.glass();
      }
      if (m.position.y - r < FLOOR) {
        m.position.y = FLOOR + r;
        b.vel.y = Math.abs(b.vel.y) > 0.4 ? -b.vel.y * 0.3 : 0;
        b.vel.x *= Math.exp(-dt * 5);
        b.vel.z *= Math.exp(-dt * 5);
      }
      if (b.k.name === 'mug' || b.k.name === 'pot') {
        // over the edge it tumbles too
        if (!b.tip && m.position.y < -0.02) {
          const h = Math.hypot(b.vel.x, b.vel.z) || 1;
          b.tip = { axis: new THREE.Vector3(b.vel.z / h, 0, -b.vel.x / h), a: 0, v: 1 };
        }
        if (b.tip) {
          const tp = b.tip;
          tp.v += dt * 16;
          tp.a += tp.v * dt;
          const lim = m.position.y < -0.05 ? 3.1 : Math.PI / 2; // on its side on the desk; anything in the air
          if (tp.a > lim) {
            tp.a = lim;
            tp.v = -tp.v * 0.15;
          }
          m.quaternion.setFromAxisAngle(tp.axis, tp.a);
          m.userData.tipped = true;
          if (b.k.name === 'mug' && !b.spilled && tp.a > 0.75) this.spill(b);
        }
      } else {
        const roll = b.k.roll ?? 1; // pens and pots roll
        m.rotation.x += b.vel.z * dt * 10 * roll;
        m.rotation.z -= b.vel.x * dt * 10 * roll;
      }
      if (b.vel.lengthSq() < 4e-4 && Math.abs(b.vel.y) < 0.05) {
        b.vel.set(0, 0, 0);
        b.resting = true;
      }
      if (!b.fallen && m.position.y < -0.3) {
        b.fallen = true;
        if (b.k.name !== 'mug' && b.k.name !== 'mouse') sfx.thud(); // the mug and mouse break when they land
        this.saved.knocked++;
        save(this.saved);
        this.renderHud();
        const lines = ['Gravity: confirmed.', 'It had to be done.', 'No regrets.', 'Desk is cleaner now.', 'Purely scientific.'];
        if (b.k.name === 'mug') this.toast('The mug. He knocked off the mug.');
        else this.think(lines[(this.saved.knocked - 1) % lines.length]);
      }
    }
  }

  /** The mug's gone over: the coffee leaves it and spreads into a puddle on whatever is below. */
  private spill(b: Body) {
    b.spilled = true;
    const m = b.k.mesh;
    m.userData.spilled = true;
    const coffee = m.getObjectByName('coffee');
    if (coffee) coffee.visible = false;
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    const x = m.position.x + dir.x * 0.07;
    const z = m.position.z + dir.z * 0.07;
    // the surface below: the desk top (y = 0) or anything standing on it, else the floor
    let y = FLOOR;
    const onDesk = x >= DESK.minX && x <= DESK.maxX && z >= DESK.minZ && z <= DESK.maxZ;
    if (onDesk && m.position.y > -0.02) y = 0;
    for (const box of this.boxes)
      if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ && box.maxY <= m.position.y + 0.01 && box.maxY > y) y = box.maxY;
    // a lumpy, organic outline
    const shape = new THREE.Shape();
    const ph = Math.random() * 6;
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = 1 + 0.16 * Math.sin(3 * a + ph) + 0.09 * Math.sin(5 * a + ph * 2) + 0.05 * Math.sin(9 * a);
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 4),
      new THREE.MeshStandardMaterial({ color: 0x2b150a, roughness: 0.06, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI;
    const size = 0.06 + Math.random() * 0.025;
    // close to an open edge of the desk (front, left, right; the back is the wall): it runs over and drips
    let drip: Drip | undefined;
    let px = x;
    let pz = z;
    if (Math.abs(y) < 1e-6) {
      const edges: [number, number, number, number, number][] = [
        [DESK.maxZ - z, 0, 1, x, DESK.maxZ], // front: dist, nx, nz, edge x, edge z
        [x - DESK.minX, -1, 0, DESK.minX, z],
        [DESK.maxX - x, 1, 0, DESK.maxX, z],
      ];
      const [dist, enx, enz, ex, ez] = edges.reduce((a, b) => (b[0] < a[0] ? b : a));
      if (dist < size * 0.95) {
        // the puddle reaches the edge and stops there; the rest goes over
        px = ex - enx * size * 1.0;
        pz = ez - enz * size * 1.0;
        const run = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.042), mesh.material);
        run.position.set(ex + enx * 0.0012, -0.021, ez + enz * 0.0012);
        run.rotation.y = Math.atan2(enx, enz);
        run.scale.set(1, 0.001, 1);
        this.scene.add(run);
        drip = { x: ex + enx * 0.004, z: ez + enz * 0.004, nx: enx, nz: enz, t: 0, run, floor: null, drops: [], next: 0 };
      }
    }
    mesh.position.set(px, y + 0.0015, pz);
    mesh.scale.setScalar(0.001);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    const fall = Math.max(0, m.position.y - y);
    this.puddles.push({ mesh, t: 0, delay: Math.sqrt((2 * fall) / G) * 0.6, size, x: px, y, z: pz, drip });
    sfx.spill();
    this.meow(0.6);
    this.toast('Coffee. Everywhere.');
    this.think(['Oops.', 'Not sorry.', 'That was a full mug.'][Math.floor(Math.random() * 3)]);
  }
  private updatePuddles(dt: number) {
    for (const p of this.puddles) {
      p.t += dt;
      const k = Math.max(0, Math.min(1, (p.t - p.delay) / 1.2));
      p.mesh.scale.setScalar(Math.max(0.001, p.size * (1 - Math.pow(1 - k, 3))));
      if (p.drip && k > 0.5) this.updateDrip(p.drip, dt, p.mesh.material as THREE.Material);
    }
  }
  /** A run of coffee down the desk's edge, then drops falling to a growing puddle on the floor. */
  private updateDrip(d: Drip, dt: number, mat: THREE.Material) {
    d.t += dt;
    d.run.scale.y = Math.min(1, d.t / 0.5);
    d.run.position.y = -0.021 * d.run.scale.y + 0.0001;
    const pouring = d.t < 7;
    d.next -= dt;
    if (pouring && d.t > 0.4 && d.next <= 0) {
      d.next = 0.12 + d.t * 0.06; // a stream at first, slowing to the odd drop
      const m = new THREE.Mesh(this.dropGeo, mat);
      m.position.set(d.x, -0.042, d.z);
      this.scene.add(m);
      d.drops.push({ m, vy: 0 });
    }
    for (let i = d.drops.length - 1; i >= 0; i--) {
      const dr = d.drops[i];
      dr.vy -= 9.8 * dt;
      dr.m.position.y += dr.vy * dt;
      dr.m.scale.y = 1 + Math.min(2.5, -dr.vy * 0.6); // stretched as it falls
      if (dr.m.position.y <= FLOOR + 0.002) {
        this.scene.remove(dr.m);
        d.drops.splice(i, 1);
        if (!d.floor) {
          const shape = new THREE.Shape();
          for (let j = 0; j <= 32; j++) {
            const a = (j / 32) * Math.PI * 2;
            const r = 1 + 0.12 * Math.sin(4 * a + 1.3) + 0.07 * Math.sin(7 * a);
            if (j === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          d.floor = new THREE.Mesh(new THREE.ShapeGeometry(shape, 3), mat);
          d.floor.rotation.x = -Math.PI / 2;
          d.floor.position.set(d.x + d.nx * 0.01, FLOOR + 0.0015, d.z + d.nz * 0.01);
          d.floor.scale.setScalar(0.004);
          d.floor.receiveShadow = true;
          this.scene.add(d.floor);
        }
        d.floor.scale.setScalar(Math.min(0.07, d.floor.scale.x + 0.0016));
        if (Math.random() < 0.3) sfx.drip();
      }
    }
  }
  private dropGeo = new THREE.SphereGeometry(0.0035, 8, 6);

  private renderHud() {
    const got = new Set(this.saved.keys);
    this.hud.querySelector('[data-word]')!.innerHTML = [...WORD].map((ch, i) => `<span class="${got.has(i) ? 'got' : ''}">${got.has(i) ? ch : '·'}</span>`).join('');
    this.hud.querySelector('[data-knocked]')!.textContent = String(this.saved.knocked);
  }

  /** His own thoughts: a cloud over his head (the HUD toast is for what happens in the game). */
  think(msg: string) {
    this.thoughtEl.textContent = msg;
    this.thoughtEl.classList.add('on');
    this.thoughtT = 2.4;
  }
  /** Keep the thought cloud over his head. */
  placeThought(camera: THREE.Camera, w: number, h: number) {
    if (!this.thoughtEl.classList.contains('on')) return;
    const p = this.cat.root.position.clone();
    p.y += H + 0.05;
    p.project(camera);
    this.thoughtEl.style.transform = `translate(${(p.x * 0.5 + 0.5) * w}px, ${(-p.y * 0.5 + 0.5) * h}px) translate(-30%, -100%)`;
  }

  setBooks(books: ShelfBook[]) {
    this.books = books.map((b) => ({ b, dmg: 0, ruined: false }));
  }
  /** A shelf book right in front of his nose, at his level, while he faces it. */
  private facingBook(pos: THREE.Vector3) {
    if (!this.grounded || pos.y > 0.05) return null;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    if (fz > -0.55) return null; // facing the wall
    const px = pos.x + fx * FRONT;
    const pz = pos.z + fz * FRONT;
    for (const s of this.books) if (Math.abs(px - s.b.x) < s.b.w / 2 + 0.012 && pz < s.b.front + 0.07 && pz > s.b.front - 0.04) return s;
    return null;
  }
  /** F: scratch the book in front of him, or use whatever he's next to. */
  interact() {
    if (!this.active || this.leap || this.backoff || this.scratchT > 0) return;
    const pos = this.cat.root.position;
    const s = this.facingBook(pos);
    if (s) return this.scratchBook(s);
    if (this.nearProp) this.onInteract(this.nearProp);
  }
  private scratchBook(s: Scratched) {
    this.scratchT = 1.05;
    this.vel.set(0, 0, 0);
    this.cat.scratch();
    sfx.scratch();
    const b = s.b;
    if (!s.canvas) {
      s.canvas = document.createElement('canvas');
      s.canvas.width = 96;
      s.canvas.height = Math.min(1024, Math.round((96 * b.h) / b.w));
      s.tex = new THREE.CanvasTexture(s.canvas);
      s.tex.colorSpace = THREE.SRGBColorSpace;
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.99, b.h * 0.99), new THREE.MeshStandardMaterial({ map: s.tex, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }));
      decal.position.z = b.d / 2 + 0.0009;
      b.mesh.add(markText(decal)); // sharp: the watercolour filter would smear thin claw marks away
    }
    // claw gouges: four torn furrows of pale paper with dark, ragged edges, low on the spine where his
    // paws reach (the canvas is 96 px across the spine, so these are bold)
    const g = s.canvas.getContext('2d')!;
    const W2 = s.canvas.width;
    const H2 = s.canvas.height;
    const top = H2 * (0.4 + Math.random() * 0.3);
    const lean = (Math.random() - 0.5) * 22;
    g.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const x = 12 + k * 22 + (Math.random() - 0.5) * 6;
      const len = H2 * (0.18 + Math.random() * 0.12);
      const path = () => {
        g.beginPath();
        g.moveTo(x, top + k * 4);
        for (let j = 1; j <= 6; j++) g.lineTo(x + (lean * j) / 6 + (Math.random() - 0.5) * 3, top + k * 4 + (len * j) / 6);
      };
      path();
      g.strokeStyle = 'rgba(38, 22, 12, 0.85)';
      g.lineWidth = 15;
      g.stroke();
      path();
      g.strokeStyle = '#f3e9d4';
      g.lineWidth = 8;
      g.stroke();
      g.strokeStyle = 'rgba(190, 170, 140, 0.9)'; // fibres in the torn paper
      g.lineWidth = 2;
      g.stroke();
    }
    // the edges fray more with each round
    g.fillStyle = 'rgba(243, 233, 212, 0.95)';
    for (let i = 0; i < 6 + s.dmg * 5; i++) {
      const side = Math.random() < 0.5 ? 0 : W2;
      const y = H2 * (0.25 + Math.random() * 0.7);
      g.beginPath();
      g.moveTo(side, y);
      g.lineTo(side + (side ? -1 : 1) * (6 + Math.random() * 12), y + 4 + Math.random() * 8);
      g.lineTo(side, y + 10 + Math.random() * 10);
      g.fill();
    }
    s.tex!.needsUpdate = true;
    // a few shreds flick out with every scratch
    const bitMat = new THREE.MeshStandardMaterial({ color: 0xf1e7d2, roughness: 0.9, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.005 + Math.random() * 0.006, 0.01 + Math.random() * 0.01), bitMat);
      m.position.set(b.x + (Math.random() - 0.5) * b.w, 0.03 + Math.random() * 0.06, b.front + 0.006);
      this.scene.add(m);
      this.bits.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.15 + Math.random() * 0.25, 0.08 + Math.random() * 0.2), w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), rest: false, h: 0.0008, floor: 0 });
    }
    s.dmg++;
    this.meow(0.15);
    if (s.dmg >= 4 && !s.ruined) {
      // ruined: the spine darkens and frays, the book slumps, shreds of paper drift to the desk
      s.ruined = true;
      b.mat.color.multiplyScalar(0.55);
      b.mesh.rotation.z = (Math.random() < 0.5 ? -1 : 1) * 0.12;
      b.mesh.rotation.x = 0.05;
      const shred = new THREE.MeshStandardMaterial({ color: 0xf1e7d2, roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.006 + Math.random() * 0.008, 0.012 + Math.random() * 0.012), shred);
        m.position.set(b.x + (Math.random() - 0.5) * b.w, 0.03 + Math.random() * 0.08, b.front + 0.006);
        this.scene.add(m);
        this.bits.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.2 + Math.random() * 0.3, 0.1 + Math.random() * 0.25), w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9), rest: false, h: 0.0008, floor: 0 });
      }
      this.toast('Book ruined.');
      this.think(['Worth it.', 'Best scratching post.', 'It was a bad book.'][Math.floor(Math.random() * 3)]);
    } else if (s.dmg === 1) this.think(['Mine now.', 'Good scratching.', 'Ahh. That spot.'][Math.floor(Math.random() * 3)]);
  }

  toast(msg: string) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('on');
    this.toastTimer = 2.6;
  }

  get busy() {
    return this.active || !!this.leap;
  }
}

/** A plain, glossy pink heart. */
function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  // the heart
  g.translate(64, 66);
  g.scale(1.9, 1.9);
  g.shadowColor = 'rgba(255, 90, 140, 0.6)';
  g.shadowBlur = 6;
  g.fillStyle = '#ff4f86';
  g.beginPath();
  g.moveTo(0, 22);
  g.bezierCurveTo(-34, 0, -26, -30, 0, -14);
  g.bezierCurveTo(26, -30, 34, 0, 0, 22);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255, 255, 255, 0.6)';
  g.beginPath();
  g.ellipse(-11, -10, 5, 3, -0.6, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
