// Rakin's cat, modelled on his photos (v2/cat/): a slim, long-legged young white cat with big tall
// pink-lined ears, grey-green eyes and a pink nose; a dark tabby patch over the crown that sweeps over
// one ear; a grey smudge at the base of the tail; a broom tail that fades from white to near-black.
//
// One skinned mesh (body, legs, tail and head on a bone skeleton) with shell-rendered fur on top.
// Poses are procedural bone rotations: walk, jump, sleep curled, belly-up roll, and the hiss.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type CatState = 'sleep' | 'idle' | 'walk' | 'roll' | 'hiss';
type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const WHITE = new THREE.Color(0xf3f1ec);
const PATCH = new THREE.Color(0x4a433e);
const SMUDGE = new THREE.Color(0x9a938b);
const TIP = new THREE.Color(0x2c2825);

// ── skeleton (rest positions in rig space, metres; +z forward, ground at y = 0) ─────────
const REST: Record<string, [string | null, V3]> = {
  hips: [null, v(0, 0.165, -0.1)],
  spine: ['hips', v(0, 0.17, -0.02)],
  chest: ['spine', v(0, 0.168, 0.06)],
  neck: ['chest', v(0, 0.195, 0.105)],
  head: ['neck', v(0, 0.235, 0.135)],
};
for (let i = 0; i < 9; i++) REST[`tail${i}`] = [i ? `tail${i - 1}` : 'hips', v(0, 0.176, -0.138 - i * 0.03)]; // root at the end of the rump
for (const s of [-1, 1]) {
  const k = s < 0 ? 'L' : 'R';
  REST[`sh${k}`] = ['chest', v(s * 0.023, 0.15, 0.07)];
  REST[`el${k}`] = [`sh${k}`, v(s * 0.024, 0.085, 0.072)];
  REST[`wr${k}`] = [`el${k}`, v(s * 0.024, 0.022, 0.075)];
  REST[`pw${k}`] = [`wr${k}`, v(s * 0.024, 0.008, 0.09)];
  REST[`th${k}`] = ['hips', v(s * 0.029, 0.15, -0.112)]; // hip joint, high in the haunch
  REST[`kn${k}`] = [`th${k}`, v(s * 0.031, 0.098, -0.088)]; // knee: forward, at the belly line
  REST[`hk${k}`] = [`kn${k}`, v(s * 0.027, 0.038, -0.134)]; // hock: well back
  REST[`ft${k}`] = [`hk${k}`, v(s * 0.027, 0.009, -0.122)];
}
const NAMES = Object.keys(REST);
const IDX = Object.fromEntries(NAMES.map((n, i) => [n, i]));
const HEAD_C = v(0, 0.24, 0.142); // centre of the skull

// ── geometry helpers ─────────────────────────────────────────────────────────────────
interface Attrs { skin: (p: V3, t: number) => [number[], number[]]; color: (p: V3, t: number) => THREE.Color; fur: (p: V3, t: number) => number }

/** Weights that blend linearly between consecutive bones whose knots (params) bracket `x`. */
function chain(bones: string[], knots: number[], x: number): [number[], number[]] {
  if (x <= knots[0]) return [[IDX[bones[0]]], [1]];
  for (let i = 0; i < knots.length - 1; i++) {
    if (x <= knots[i + 1]) {
      const f = (x - knots[i]) / (knots[i + 1] - knots[i]);
      return [[IDX[bones[i]], IDX[bones[i + 1]]], [1 - f, f]];
    }
  }
  return [[IDX[bones[bones.length - 1]]], [1]];
}

function finish(g: THREE.BufferGeometry, a: Attrs, tOf: (i: number) => number) {
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const n = pos.count;
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  const fur = new Float32Array(n);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    const t = tOf(i);
    const [bi, bw] = a.skin(p, t);
    bi.forEach((b, j) => {
      si[i * 4 + j] = b;
      sw[i * 4 + j] = bw[j];
    });
    const c = a.color(p, t);
    col.set([c.r, c.g, c.b], i * 3);
    fur[i] = a.fur(p, t);
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('furLen', new THREE.BufferAttribute(fur, 1));
  g.setAttribute('rest', pos.clone());
  g.deleteAttribute('uv');
  return g;
}

/** A tube through `centres` with elliptical cross-sections, closed at both ends. */
function loft(centres: V3[], radii: [number, number][], samples: number, ring: number, a: Attrs) {
  const curve = new THREE.CatmullRomCurve3(centres, false, 'centripetal');
  const verts: number[] = [];
  const ts: number[] = [];
  const idx: number[] = [];
  const X = v(1, 0, 0);
  // radius profile through the knots on a Catmull-Rom spline: no creases where one ring meets the next
  const cr = (a: number, b: number, c: number, d: number, k: number) =>
    0.5 * (2 * b + (c - a) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (3 * b - a - 3 * c + d) * k * k * k);
  const R = (t: number) => {
    const n = radii.length - 1;
    const f = t * n;
    const i = Math.min(n - 1, Math.floor(f));
    const k = f - i;
    const at = (j: number) => radii[Math.max(0, Math.min(n, j))];
    return [0, 1].map((c) => Math.max(0.002, cr(at(i - 1)[c], at(i)[c], at(i + 1)[c], at(i + 2)[c], k)));
  };
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    const c = curve.getPoint(t);
    const T = curve.getTangent(t).normalize();
    // every part lies in the body's mid-plane, so the lateral axis gives a frame that never flips
    const side = X.clone().addScaledVector(T, -X.dot(T)).normalize();
    const vup = new THREE.Vector3().crossVectors(T, side).normalize();
    const [rx, ry] = R(t);
    for (let j = 0; j < ring; j++) {
      const ang = (j / ring) * Math.PI * 2;
      const p = c.clone().addScaledVector(side, Math.cos(ang) * rx).addScaledVector(vup, Math.sin(ang) * ry);
      verts.push(p.x, p.y, p.z);
      ts.push(t);
    }
  }
  // end caps
  const c0 = curve.getPoint(0).addScaledVector(curve.getTangent(0), -0.004);
  const c1 = curve.getPoint(1).addScaledVector(curve.getTangent(1), 0.004);
  const i0 = verts.length / 3;
  verts.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z);
  ts.push(0, 1);
  for (let s = 0; s < samples; s++) {
    for (let j = 0; j < ring; j++) {
      const a0 = s * ring + j;
      const a1 = s * ring + ((j + 1) % ring);
      const b0 = a0 + ring;
      const b1 = a1 + ring;
      idx.push(a0, a1, b0, a1, b1, b0); // outward-facing (normals point away from the axis)
    }
  }
  for (let j = 0; j < ring; j++) {
    idx.push(i0, (j + 1) % ring, j);
    const last = samples * ring;
    idx.push(i0 + 1, last + j, last + ((j + 1) % ring));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  return finish(g, a, (i) => ts[i]);
}

/** An ellipsoid at `c`, rigidly bound to one bone. */
function ellipsoid(c: V3, r: [number, number, number], bone: string, a: Omit<Attrs, 'skin'>, seg = 28) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  g.scale(...r);
  g.translate(c.x, c.y, c.z);
  return finish(g, { ...a, skin: () => [[IDX[bone]], [1]] }, () => 0);
}

// ── fur: shells pushed out along the skinned normal, strands carved by a 3D hash ────────
function furMaterial(shell: number, density: number) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uShell = { value: shell };
    sh.uniforms.uDensity = { value: density };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 rest;\nattribute float furLen;\nuniform float uShell;\nvarying vec3 vRest;')
      .replace(
        '#include <skinning_vertex>',
        `#include <skinning_vertex>
        // clumps: fur length varies over the coat so the silhouette is never a clean curve
        vec3 cq = rest * 260.0;
        float clump = fract(sin(dot(floor(cq), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float len = furLen * (0.7 + 0.6 * clump);
        transformed += normalize(objectNormal) * (uShell * len);
        transformed.y -= uShell * uShell * len * 0.35;
        vRest = rest;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uShell; uniform float uDensity; varying vec3 vRest;
        float furHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uShell > 0.0) {
          vec3 q = vRest * uDensity;
          float r = furHash(floor(q));
          float d = length(fract(q) - 0.5);
          // strands taper to soft, dithered tips (alpha stays 1 for the screen holes; MSAA and the paint smooth it)
          float edge = 0.62 * (1.0 - uShell) + 0.08;
          float cover = (1.0 - smoothstep(edge - 0.12, edge + 0.04, d)) * smoothstep(uShell * 0.9 - 0.08, uShell * 0.9 + 0.08, r);
          float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          if (cover <= dither) discard;
        }`,
      )
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(0.62, 1.04, uShell);');
  };
  m.customProgramCacheKey = () => `fur-${shell.toFixed(3)}`;
  return m;
}

interface Leg { front: boolean; side: number; a: THREE.Bone; b: THREE.Bone; c: THREE.Bone; d: THREE.Bone; phase: number }

export class Cat {
  readonly root = new THREE.Group();
  private pivot = new THREE.Group();
  private rig = new THREE.Group();
  private bones: Record<string, THREE.Bone> = {};
  private legs: Leg[] = [];
  private ears: THREE.Group[] = [];
  private eyes: THREE.Group[] = [];
  private mouth!: THREE.Mesh;
  private base!: THREE.SkinnedMesh;

  state: CatState = 'sleep';
  /** in the air (jumping/falling): legs reach out */
  airborne = false;
  /** walk-cycle speed multiplier */
  gaitScale = 1;
  /** -1 walks the legs backwards (backing away from an edge) */
  gaitDir = 1;
  /** where the head wants to look, radians (yaw, pitch) */
  look = new THREE.Vector2();
  private prev: CatState = 'sleep';
  private timer = 0;
  private gait = 0;
  private tailPhase = 0; // accumulated, so speed changes never make the tail jump
  private breathPhase = 0;
  private blink = 2;
  private twitch = 3;
  private pose = { tuck: 1, curl: 1, roll: 0, walk: 0, air: 0, hiss: 0, awake: 0, sit: 0, lie: 0, groom: 0, stretch: 0, land: 0, scratch: 0 };
  /** In play mode he idles like a cat: stand, then sit (grooming now and then), then lie down sphinx-style. */
  autonomous = false;
  private idle: 'stand' | 'sit' | 'groom' | 'lie' = 'stand';
  private idleT = 0;
  private actT = 0;
  private stretchT = 0;
  private landT = 0;
  private scratchT = 0;

  /** Collision size for play mode (already scaled). */
  static readonly SCALE = 0.46; // kitten
  static readonly HEIGHT = 0.29 * Cat.SCALE;
  static readonly HALF_LEN = 0.14 * Cat.SCALE;

  constructor(shells = 12) {
    const PIVOT_Y = 0.12;
    this.pivot.position.y = PIVOT_Y;
    this.rig.position.y = -PIVOT_Y;
    this.root.add(this.pivot);
    this.pivot.add(this.rig);
    this.root.scale.setScalar(Cat.SCALE);

    // bones
    for (const n of NAMES) {
      const b = new THREE.Bone();
      b.name = n;
      this.bones[n] = b;
    }
    for (const n of NAMES) {
      const [parent, p] = REST[n];
      const b = this.bones[n];
      if (parent) {
        b.position.copy(p).sub(REST[parent][1]);
        this.bones[parent].add(b);
      } else {
        b.position.copy(p);
        this.rig.add(b);
      }
    }

    // ── skinned geometry ──
    const body = loft(
      // rump → chest: a round, full rear, one smooth back line; the waist tucks in under the belly, not on top
      [v(0, 0.162, -0.163), v(0, 0.164, -0.158), v(0, 0.167, -0.147), v(0, 0.169, -0.13), v(0, 0.17, -0.1), v(0, 0.17, -0.065), v(0, 0.172, -0.03), v(0, 0.169, 0.005), v(0, 0.165, 0.04), v(0, 0.176, 0.072), v(0, 0.194, 0.098), v(0, 0.214, 0.118), v(0, 0.234, 0.135)],
      [[0.008, 0.008], [0.027, 0.033], [0.039, 0.048], [0.045, 0.056], [0.05, 0.057], [0.047, 0.053], [0.044, 0.05], [0.045, 0.054], [0.047, 0.056], [0.042, 0.05], [0.035, 0.041], [0.029, 0.032], [0.026, 0.028]],
      96,
      40,
      {
        skin: (p) => chain(['hips', 'spine', 'chest', 'neck', 'head'], [-0.1, -0.02, 0.06, 0.105, 0.135], p.z),
        color: (p) => {
          // grey smudge on the back, just ahead of the tail
          const k = smooth(0.03, 0.045, p.y - 0.165) * smooth(0.06, 0.0, Math.abs(p.z + 0.1)) * smooth(-0.03, 0.0, p.x);
          return WHITE.clone().lerp(SMUDGE, k * 0.9);
        },
        fur: () => 0.012,
      },
    );
    const parts: THREE.BufferGeometry[] = [body];

    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R';
      const P = (n: string) => REST[n][1];
      parts.push(
        loft(
          [P(`sh${k}`).clone().add(v(-s * 0.008, 0.034, -0.004)), P(`sh${k}`), P(`el${k}`), P(`wr${k}`), P(`pw${k}`)],
          [[0.021, 0.026], [0.019, 0.021], [0.013, 0.014], [0.0105, 0.011], [0.011, 0.011]],
          36, 20,
          { skin: (_p, t) => chain([`sh${k}`, `sh${k}`, `el${k}`, `wr${k}`, `pw${k}`], [0, 0.25, 0.5, 0.78, 1], t), color: () => WHITE, fur: () => 0.004 },
        ),
        ellipsoid(P(`pw${k}`).clone().add(v(0, -0.001, 0.004)), [0.0145, 0.0085, 0.019], `pw${k}`, { color: () => WHITE, fur: () => 0.003 }, 18),
        loft(
          // the haunch: a broad, deep thigh that grows out of the flank and tapers to the knee
          [P(`th${k}`).clone().add(v(-s * 0.01, 0.03, -0.01)), P(`th${k}`), P(`kn${k}`), P(`hk${k}`), P(`ft${k}`)],
          [[0.026, 0.04], [0.027, 0.041], [0.0155, 0.018], [0.0105, 0.0115], [0.011, 0.011]],
          44, 22,
          { skin: (_p, t) => chain(['hips', `th${k}`, `th${k}`, `kn${k}`, `hk${k}`, `ft${k}`], [0.02, 0.22, 0.36, 0.5, 0.76, 1], t), color: () => WHITE, fur: () => 0.006 },
        ),
        ellipsoid(P(`ft${k}`).clone().add(v(0, -0.001, 0.006)), [0.0145, 0.0085, 0.021], `ft${k}`, { color: () => WHITE, fur: () => 0.003 }, 18),
      );
    }

    // tail: thin root, bushy broom end, white fading to near-black
    const tailPts = Array.from({ length: 9 }, (_, i) => REST[`tail${i}`][1].clone());
    tailPts.push(tailPts[8].clone().add(v(0, 0, -0.02)));
    parts.push(
      loft(
        [REST.hips[1].clone().add(v(0, 0.008, -0.03)), ...tailPts],
        [[0.02, 0.02], [0.015, 0.015], [0.013, 0.013], [0.013, 0.013], [0.015, 0.015], [0.018, 0.018], [0.021, 0.021], [0.023, 0.023], [0.022, 0.022], [0.017, 0.017], [0.006, 0.006]],
        80, 20,
        {
          skin: (_p, t) => chain(['hips', ...Array.from({ length: 9 }, (_, i) => `tail${i}`)], [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], t),
          color: (_p, t) => WHITE.clone().lerp(TIP, smooth(0.25, 0.85, t)),
          fur: (_p, t) => 0.006 + smooth(0.3, 0.8, t) * 0.016,
        },
      ),
    );

    // head: skull, muzzle, cheeks, chin, with the tabby patch painted into the vertex colours
    const headColor = (p: V3) => {
      const q = p.clone().sub(HEAD_C);
      // crown patch: on top, biased toward the +x ear, not reaching the face or far down the back
      const crown = smooth(0.012, 0.024, q.y) * smooth(-0.022, 0.004, q.x) * smooth(0.042, 0.022, q.z) * smooth(-0.04, -0.018, q.z);
      // sweeping down the +x side, above that eye
      const side = smooth(0.012, 0.026, q.x) * smooth(-0.006, 0.01, q.y) * smooth(0.04, 0.022, q.z) * smooth(-0.03, -0.01, q.z);
      return WHITE.clone().lerp(PATCH, Math.min(1, crown + side));
    };
    parts.push(
      ellipsoid(HEAD_C, [0.046, 0.041, 0.044], 'head', { color: headColor, fur: () => 0.004 }, 32),
      ellipsoid(HEAD_C.clone().add(v(0, -0.017, 0.036)), [0.021, 0.016, 0.02], 'head', { color: () => WHITE, fur: () => 0.002 }),
      ellipsoid(HEAD_C.clone().add(v(-0.021, -0.014, 0.019)), [0.023, 0.02, 0.022], 'head', { color: headColor, fur: () => 0.004 }),
      ellipsoid(HEAD_C.clone().add(v(0.021, -0.014, 0.019)), [0.023, 0.02, 0.022], 'head', { color: headColor, fur: () => 0.004 }),
      ellipsoid(HEAD_C.clone().add(v(0, -0.029, 0.028)), [0.012, 0.008, 0.013], 'head', { color: () => WHITE, fur: () => 0.002 }),
    );

    const geo = mergeGeometries(parts)!;
    const skeleton = new THREE.Skeleton(NAMES.map((n) => this.bones[n]));
    this.base = new THREE.SkinnedMesh(geo, furMaterial(0, 900));
    this.base.castShadow = true;
    this.base.receiveShadow = true;
    this.base.frustumCulled = false;
    this.rig.add(this.base);
    // bones must have real world matrices before binding, or the inverse bind matrices are identity
    this.root.updateMatrixWorld(true);
    this.base.bind(skeleton);
    for (let i = 1; i <= shells; i++) {
      const sh = new THREE.SkinnedMesh(geo, furMaterial(i / shells, 900));
      sh.frustumCulled = false;
      sh.receiveShadow = true;
      this.rig.add(sh);
      sh.bind(skeleton, this.base.bindMatrix);
    }

    this.buildFace();
    this.buildBeans();
    this.bones.head.scale.setScalar(1.2); // kitten: big head for the body

    for (const s of [-1, 1]) {
      const k = s < 0 ? 'L' : 'R';
      const phase = (s < 0 ? 0 : Math.PI);
      this.legs.push({ front: true, side: s, a: this.bones[`sh${k}`], b: this.bones[`el${k}`], c: this.bones[`wr${k}`], d: this.bones[`pw${k}`], phase });
      this.legs.push({ front: false, side: s, a: this.bones[`th${k}`], b: this.bones[`kn${k}`], c: this.bones[`hk${k}`], d: this.bones[`ft${k}`], phase: phase + Math.PI * 0.9 });
    }
  }

  /** Eyes, nose, mouth, whiskers and ears ride on the head bone. */
  private buildFace() {
    const head = this.bones.head;
    const local = (p: V3) => p.clone().sub(REST.head[1]);
    const c = local(HEAD_C);
    const iris = new THREE.MeshPhysicalMaterial({ color: 0x9aa47f, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 0.1 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xe9a0a6, roughness: 0.6 });
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.copy(c).add(v(s * 0.019, 0.006, 0.037));
      eye.rotation.y = s * 0.42;
      const ball = new THREE.Mesh(sphere, iris);
      ball.scale.set(0.0105, 0.0105, 0.006);
      const slit = new THREE.Mesh(sphere, pupil);
      slit.scale.set(0.0028, 0.0085, 0.002);
      slit.position.z = 0.0052;
      eye.add(ball, slit);
      this.eyes.push(eye);
      head.add(eye);

      // big, tall, cupped ears; the one under the patch is dark on the back
      const ear = new THREE.Group();
      ear.position.copy(c).add(v(s * 0.026, 0.03, -0.004));
      ear.rotation.set(-0.15, 0, -s * 0.32);
      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.021, 0.05, 18, 1, true, Math.PI * 0.5, Math.PI),
        new THREE.MeshStandardMaterial({ color: s > 0 ? PATCH : WHITE, roughness: 0.9, side: THREE.DoubleSide }),
      );
      outer.position.y = 0.025;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 18, 1, true, Math.PI * 0.5, Math.PI), new THREE.MeshStandardMaterial({ color: 0xeaa0a6, roughness: 0.8, side: THREE.DoubleSide }));
      inner.position.set(0, 0.021, 0.0025);
      outer.castShadow = true;
      ear.add(outer, inner);
      this.ears.push(ear);
      head.add(ear);
    }
    const nose = new THREE.Mesh(sphere, pink);
    nose.scale.set(0.0062, 0.0042, 0.004);
    nose.position.copy(c).add(v(0, -0.009, 0.056));
    head.add(nose);
    this.mouth = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({ color: 0x3a1f22, roughness: 0.7 }));
    this.mouth.scale.set(0.008, 0.001, 0.004);
    this.mouth.position.copy(c).add(v(0, -0.024, 0.048));
    head.add(this.mouth);
    // whiskers
    const w: number[] = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const o = c.clone().add(v(s * 0.012, -0.016 - i * 0.003, 0.05));
        w.push(o.x, o.y, o.z, o.x + s * 0.06, o.y + 0.006 - i * 0.008, o.z - 0.012);
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(w, 3));
    head.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xf8f8f6, transparent: true, opacity: 0.85 })));
  }

  /** Pink toe beans under each paw, visible when he rolls over. */
  private buildBeans() {
    const pink = new THREE.MeshStandardMaterial({ color: 0xea9aa2, roughness: 0.55 });
    const g = new THREE.SphereGeometry(1, 12, 8);
    for (const k of ['pwL', 'pwR', 'ftL', 'ftR']) {
      const bone = this.bones[k];
      const at = (x: number, z: number, r: number) => {
        const m = new THREE.Mesh(g, pink);
        m.scale.set(r, r * 0.4, r);
        m.position.set(x, -0.0085, z);
        bone.add(m);
      };
      at(0, 0.0, 0.0075);
      [-0.0085, -0.003, 0.003, 0.0085].forEach((x, i) => at(x, 0.013 + (i === 1 || i === 2 ? 0.003 : 0), 0.0035));
    }
  }

  /** Lying down or asleep: purring territory. */
  get resting() {
    return this.state === 'sleep' || this.state === 'roll' || (this.state === 'idle' && !this.airborne && this.idle === 'lie');
  }

  get hitTargets() {
    return [this.base];
  }

  poke() {
    if (this.state === 'roll' || this.state === 'hiss') return;
    this.prev = this.state;
    this.state = 'roll';
    this.timer = 2.6;
  }

  hiss() {
    if (this.state === 'hiss') return;
    if (this.state !== 'roll') this.prev = this.state === 'walk' ? 'idle' : this.state;
    this.state = 'hiss';
    this.timer = 1.1;
  }

  setState(s: CatState) {
    if (this.state === 'roll' || this.state === 'hiss') this.prev = s;
    else this.state = s;
  }

  /** Front legs forward, rump up: on waking. */
  stretch() {
    this.stretchT = 1.5;
  }
  /** Up on his hind legs, front paws raking whatever is in front of him. */
  scratch() {
    this.scratchT = 1.05;
  }
  /** Absorb a landing. */
  landed() {
    this.landT = 0.18;
  }

  /** Idle behaviour: what a cat does when nobody is steering it. */
  private think(dt: number) {
    const idle = this.state === 'idle' && !this.airborne;
    if (!idle || !this.autonomous) {
      this.idle = 'stand';
      this.idleT = 0;
      this.actT = 0;
      return;
    }
    this.idleT += dt;
    this.actT += dt;
    if (this.idle === 'stand' && this.idleT > 2.5) [this.idle, this.actT] = ['sit', 0];
    else if (this.idle === 'sit' && this.idleT > 14) [this.idle, this.actT] = ['lie', 0];
    else if (this.idle === 'sit' && this.actT > 3.5 && Math.random() < dt * 0.35) [this.idle, this.actT] = ['groom', 0];
    else if (this.idle === 'groom' && this.actT > 2.8) [this.idle, this.actT] = ['sit', 0];
  }

  update(dt: number, t: number) {
    const p = this.pose;
    const s = this.state;
    if ((s === 'roll' || s === 'hiss') && (this.timer -= dt) <= 0) this.state = this.prev;
    this.think(dt);
    this.stretchT = Math.max(0, this.stretchT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.scratchT = Math.max(0, this.scratchT - dt);

    const sleeping = s === 'sleep';
    const idling = s === 'idle' && !this.airborne;
    p.tuck = damp(p.tuck, sleeping ? 1 : s === 'roll' ? 0.38 : 0, 5, dt);
    p.curl = damp(p.curl, sleeping ? 1 : 0, 3, dt);
    p.roll = damp(p.roll, s === 'roll' ? 1 : 0, 6, dt);
    p.walk = damp(p.walk, s === 'walk' && !this.airborne ? 1 : 0, 8, dt);
    p.air = damp(p.air, this.airborne ? 1 : 0, 12, dt);
    p.hiss = damp(p.hiss, s === 'hiss' ? 1 : 0, 14, dt);
    p.awake = damp(p.awake, sleeping ? 0 : 1, 5, dt);
    p.sit = damp(p.sit, idling && (this.idle === 'sit' || this.idle === 'groom') ? 1 : 0, 4, dt);
    p.lie = damp(p.lie, idling && this.idle === 'lie' ? 1 : 0, 2.5, dt);
    p.groom = damp(p.groom, idling && this.idle === 'groom' ? 1 : 0, 5, dt);
    p.stretch = damp(p.stretch, this.stretchT > 0.25 ? 1 : 0, 6, dt);
    p.land = damp(p.land, this.landT > 0 ? 1 : 0, 25, dt);
    p.scratch = damp(p.scratch, this.scratchT > 0.12 ? 1 : 0, 12, dt);
    const Sc = p.scratch;
    const S = p.sit;
    const Lp = p.lie;
    const G = p.groom;
    const St = p.stretch;
    const low = Math.max(p.tuck, Lp); // hind legs folded under
    const B = this.bones;

    // ── spine: curl asleep, pitch up to sit, arch to hiss, stretch rump-up, breathe ──
    this.breathPhase += dt * (sleeping || Lp > 0.5 ? 1.6 : 2.4);
    this.tailPhase += dt * (1.3 + p.walk * 1.4 * Math.min(this.gaitScale, 1.6));
    const breath = Math.sin(this.breathPhase) * 0.5 + 0.5;
    // pelvis rolls and sways with the hind legs when walking
    const pelvis = Math.sin(this.gait + Math.PI * 0.9) * p.walk;
    B.hips.rotation.set(-0.28 * p.hiss - 0.78 * S + 0.3 * St - 0.75 * Sc, 0.14 * p.curl + pelvis * 0.07, pelvis * 0.05);
    B.spine.rotation.set(-0.08 * p.hiss - 0.05 * S, 0.16 * p.curl, 0);
    B.chest.rotation.set(0.34 * p.hiss - 0.05 * p.air + 0.05 * S - 0.15 * St, 0.16 * p.curl, 0);
    B.chest.scale.set(1 + breath * 0.025, 1 + breath * 0.03, 1);

    // ── head and neck ──
    this.look.x = THREE.MathUtils.clamp(this.look.x, -0.9, 0.9);
    const lookYaw = this.look.x * p.awake * (1 - p.hiss) * (1 - G);
    const bob = Math.sin(this.gait * 2) * 0.03 * p.walk;
    const lick = Math.sin(t * 9) * 0.09 * G;
    B.neck.rotation.set(0.3 * p.curl - 0.12 * p.awake + 0.25 * p.hiss + 0.52 * S + 0.55 * Sc - 0.12 * Lp - 0.3 * St + 0.3 * G + bob, 0.35 * p.curl + lookYaw * 0.4 + 0.25 * G, 0);
    B.head.rotation.set(0.12 * p.curl + this.look.y * p.awake + 0.15 * p.hiss + 0.15 * S + 0.25 * G + lick, 0.55 * p.curl + lookYaw * 0.6 + 0.35 * G, -0.3 * p.curl + 0.15 * G);

    // ── legs ──
    this.gait += dt * 10 * p.walk * this.gaitScale * this.gaitDir;
    for (const L of this.legs) {
      const ph = this.gait + L.phase;
      const swing = Math.sin(ph) * 0.5 * p.walk;
      const lift = Math.max(0, Math.cos(ph)) * p.walk;
      const knead = Math.sin(t * 7 + L.phase) * 0.35 * p.roll;
      const g = L.side > 0 ? G : 0; // he grooms with his right paw
      if (L.front) {
        // folded front legs disappear into the loaf; in the sphinx pose they stay out in front
        const fold = 1 - (0.6 * Math.max(0, p.tuck - 0.4)) / 0.6;
        L.a.scale.set(fold / B.chest.scale.x, fold / B.chest.scale.y, fold); // breathing moves the chest, not the paws
        // sit: straight, upright legs, paws under the chest. lie (sphinx): elbows tucked back under the chest,
        // forearms flat along the ground. groom: the elbow flexes the paw forward and up to the mouth.
        const rake = Math.sin(t * 15 + (L.side > 0 ? 0 : Math.PI)) * Sc; // alternate paws, down the spine
        L.a.rotation.x = 1.35 * p.tuck + swing - 0.85 * p.air + knead + 0.84 * S + 1.02 * Lp - 1.2 * St - 1.75 * g - 0.55 * Sc + 0.35 * rake;
        L.b.rotation.x = -2.45 * p.tuck - 0.6 * lift + 0.3 * p.air - 2.55 * Lp + 0.2 * St - 1.35 * g;
        L.c.rotation.x = 1.0 * p.tuck + 0.45 * lift + 0.95 * Lp + 0.3 * St - 0.5 * g + 0.6 * Sc;
        L.a.rotation.z = -L.side * 0.06 * p.hiss - L.side * 0.25 * p.tuck - 0.22 * g;
        L.d.rotation.x = 0.5 * lift; // paw flicks forward as it swings through
      } else {
        L.a.scale.setScalar(1 - (0.6 * Math.max(0, low - 0.4)) / 0.6);
        // sit: thigh forward along the ground, shin back, foot flat; stretch: legs long behind
        // same stride as the front legs, mirrored: swing, knee folds back as the foot lifts, foot flicks
        L.a.rotation.x = -0.75 * low - swing + 0.85 * p.air - knead * 0.6 - 0.5 * S + 0.35 * St + 0.42 * p.hiss + 0.75 * Sc; // scratching: stays planted, body upright // hissing: up on straight legs
        L.b.rotation.x = 1.75 * low + 0.6 * lift - 0.5 * p.air + 1.6 * S - 0.2 * St - 0.25 * p.hiss;
        L.c.rotation.x = -1.15 * low - 0.45 * lift + 0.3 * p.air - 1.7 * S + 0.1 * p.hiss;
        L.d.rotation.x = 0.5 * lift + 0.2 * p.air;
        L.a.rotation.z = -L.side * 0.05 * p.hiss - L.side * 0.55 * low - L.side * 0.12 * S;
      }
    }
    this.rig.position.y = -0.12 - 0.1 * low - 0.099 * S + Math.abs(Math.sin(this.gait)) * 0.006 * p.walk + 0.012 * p.hiss - 0.02 * St - 0.018 * p.land + 0.0075 * Sc;
    this.pivot.rotation.z = Math.PI * 0.6 * p.roll; // over onto his side, belly to you, paws up and kneading
    this.pivot.position.y = 0.12 - 0.068 * p.roll;
    this.rig.rotation.y = 0.5 * p.hiss; // turns side-on to look bigger

    // ── tail: up awake, wrapped round the feet sitting, along his side asleep or lying, bottle-brush to hiss ──
    const rest = Math.max(p.curl, S, Lp);
    for (let i = 0; i < 9; i++) {
      const b = B[`tail${i}`];
      const wave = Math.sin(this.tailPhase - i * 0.5) * (0.1 + 0.14 * (1 - rest)) * (1 - p.hiss * 0.8);
      const upAwake = i === 0 ? 0.75 : i < 5 ? 0.08 : -0.06; // up with a soft hook
      const upHiss = i === 0 ? 1.25 : 0.04;
      const upLow = i === 0 ? -0.6 : i === 1 ? 0.35 : 0.04; // down to the ground, then flat
      const awakeUp = p.awake * (1 - p.hiss) * (1 - Math.max(S, Lp));
      b.rotation.x = upAwake * awakeUp + upHiss * p.hiss + upLow * Math.max(1 - p.awake, S, Lp);
      const wrapSleep = i === 0 ? 1.15 : i === 1 ? 0.45 : 0.13;
      const wrapSit = i === 0 ? 1.0 : i === 1 ? 0.4 : 0.17;
      b.rotation.y = wave * (1 - 0.8 * rest) - p.curl * wrapSleep - Math.max(S, Lp * 0.7) * wrapSit;
    }
    const puff = 1 + 0.7 * p.hiss;
    B.tail0.scale.set(puff, puff, 1);

    // ── face ──
    this.twitch -= dt;
    const tw = this.twitch < 0.15 ? 0.5 : 0;
    if (this.twitch <= 0) this.twitch = 2 + Math.random() * 4;
    this.ears.forEach((e, i) => {
      const sd = i === 0 ? -1 : 1;
      e.rotation.set(-0.15 - 1.05 * p.hiss - 0.25 * p.curl, sd * 0.5 * p.hiss, -sd * (0.32 + 0.55 * p.hiss) - sd * tw * (i === 1 ? 1 : 0));
    });
    this.blink -= dt;
    const blink = this.blink < 0.11 ? 0.1 : 1;
    if (this.blink <= 0) this.blink = 2.5 + Math.random() * 3;
    const open = Math.max(0.06, p.awake * blink * (1 - 0.45 * p.hiss) * (1 - 0.45 * Lp) * (1 - 0.6 * G));
    this.eyes.forEach((e) => (e.scale.y = open));
    this.mouth.scale.y = 0.001 + 0.009 * p.hiss + 0.003 * G * (lick > 0 ? 1 : 0);
  }
}
