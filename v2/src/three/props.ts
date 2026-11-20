// The room, the desk and everything on it. Units are metres; the desk top is y = 0, the back wall is at
// z = -0.55, the viewer looks from +z. Every solid thing also registers a 3D box collider so the cat
// (and whatever he knocks over) can stand on it, bump into it and never pass through it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials';
import { holeMaterial } from './screens';
import { archWindow, consoleScreen } from './textures';
import { catPolaroid, resumeTexture } from './cards';
import { SCRIBBLES } from './scribbles';
import content from '../content.json';
const SOCIALS = content.socials;

export interface Box { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
export interface Prop { id: string; object: THREE.Object3D; anchor: THREE.Vector3 }
export interface ShelfBook { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; w: number; h: number; d: number; x: number; front: number }
export interface Knockable { mesh: THREE.Object3D; radius: number; name?: string; roll?: number }

export const DESK = { minX: -1, maxX: 1, minZ: -0.5, maxZ: 0.5 };
/** Layer for anything with readable text: the painted filter keeps these pixels sharp. */
export const TEXT_LAYER = 1;
export const markText = <T extends THREE.Object3D>(o: T) => {
  o.layers.enable(TEXT_LAYER);
  return o;
};

const geoCache = new Map<string, THREE.BufferGeometry>();
const rbox = (w: number, h: number, d: number, r: number) => {
  const k = [w, h, d, r].join();
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2))));
  return g;
};

/** A rounded rectangle centred on the origin, in the XY plane. */
const roundRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

export function buildDesk(M: Materials, aniso: number) {
  const root = new THREE.Group();
  const props: Prop[] = [];
  const boxes: Box[] = [];
  const knockables: Knockable[] = [];

  const shadowed = <T extends THREE.Object3D>(o: T) => {
    o.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.castShadow = c.receiveShadow = true;
    });
    return o;
  };
  /** A rounded box whose bottom sits at y; optionally registered as a collider. */
  const block = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0.003, solid = true, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(rbox(w, h, d, r), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    if (solid) boxes.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
    return m;
  };
  const collider = (cx: number, cz: number, w: number, d: number, y0: number, y1: number) =>
    boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minY: y0, maxY: y1, minZ: cz - d / 2, maxZ: cz + d / 2 });
  const prop = (id: string, object: THREE.Object3D, anchor: [number, number, number]) => {
    object.userData.propId = id;
    props.push({ id, object, anchor: new THREE.Vector3(...anchor) });
  };

  // ── room ──────────────────────────────────────────────
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), M.plaster);
  wall.position.set(0, 0.74, -0.55);
  wall.receiveShadow = true;
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), M.plaster);
  side.rotation.y = Math.PI / 2;
  side.position.set(-1.75, 0.74, 1);
  side.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.76;
  floor.receiveShadow = true;
  root.add(wall, side, floor);
  block(6, 0.08, 0.015, M.whitePlastic, 0, -0.76, -0.542, 0.002, false); // skirting
  boxes.push({ minX: -3, maxX: 3, minY: -1, maxY: 2.5, minZ: -0.8, maxZ: -0.55 }); // back wall
  boxes.push({ minX: -2.2, maxX: -1.75, minY: -1, maxY: 2.5, minZ: -1, maxZ: 3 }); // left wall
  // window in the left wall: sky + clouds, the light source for the sun
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.92), new THREE.MeshBasicMaterial({ map: archWindow(), transparent: true }));
  win.rotation.y = Math.PI / 2;
  win.position.set(-1.745, 0.55, 0.35);
  win.userData.window = true;
  root.add(win);

  // ── desk ──────────────────────────────────────────────
  block(2.0, 0.04, 1.0, M.desk, 0, -0.04, 0, 0.004);
  for (const [x, z] of [[-0.96, -0.46], [0.96, -0.46], [-0.96, 0.46], [0.96, 0.46]]) block(0.05, 0.72, 0.05, M.desk, x, -0.76, z, 0.004, false);

  // ── the stool and the basket he sleeps in (like the photo) ──
  const stool = new THREE.Group();
  stool.position.set(-1.33, 0, 0.12);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 48), M.shelf);
  seat.position.y = -0.3 - 0.0175;
  stool.add(seat);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.43, 12), M.shelf);
    leg.position.set(Math.cos(a) * 0.15, -0.55, Math.sin(a) * 0.15);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    stool.add(leg);
  }
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.13, 64, 1, true), M.wicker);
  basket.position.y = -0.3 + 0.065;
  (basket.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 12, 64), M.wicker);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.17;
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.03, 48), M.fabric);
  cushion.position.y = -0.285;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.19, 48), M.wicker);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.298;
  stool.add(basket, rim, cushion, bottom);
  root.add(shadowed(stool));
  prop('basket', stool, [-1.33, -0.2, 0.12]);
  const basketSpot = new THREE.Vector3(-1.33, -0.27, 0.12);

  // ── HP Victus 16: full-size backlit keyboard with a numpad, big off-centre touchpad, vented hinge spine,
  //    "victus" on the chin, V on the lid. The screen is live HTML. ──
  /** A small canvas texture (kept sharp by the paint filter when used on a markText mesh). */
  const label = (wPx: number, hPx: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cv = document.createElement('canvas');
    cv.width = wPx;
    cv.height = hPx;
    draw(cv.getContext('2d')!, wPx, hPx);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const victus = new THREE.Group();
  victus.position.set(-0.02, 0, -0.12);
  const W = 0.36;
  const D = 0.255;
  block(W, 0.018, D, M.laptopShell, 0, 0, 0, 0.006, false, victus);
  // the keyboard: 15 units of main block, then a narrower numpad; a half-height function row on top
  const KU = 0.0176;
  const NU = 0.0155;
  const KB_W = 15 * KU + 0.005 + 4 * NU;
  const KX0 = -KB_W / 2;
  const KZ0 = -0.104; // back edge of the function row
  const NX0 = KX0 + 15 * KU + 0.005;
  const rowZ = (r: number) => (r === 0 ? KZ0 + 0.006 : KZ0 + 0.012 + (r - 0.5) * KU);
  type K = { x: number; z: number; w: number; d: number; t: string };
  const kb: K[] = [];
  const ones = (str: string) => str.split(' ').map((t) => [1, t] as [number, string]);
  const mainRows: [number, string][][] = [
    [[1, 'esc'], ...ones('f1 f2 f3 f4 f5 f6 f7 f8 f9 f10 f11 f12'), [1, 'ins'], [1, 'del']],
    [...ones('` 1 2 3 4 5 6 7 8 9 0 - ='), [2, '⌫']],
    [[1.5, 'tab'], ...ones('Q W E R T Y U I O P [ ]'), [1.5, '\\']],
    [[1.75, 'caps'], ...ones("A S D F G H J K L ; '"), [2.25, 'enter']],
    [[2.25, 'shift'], ...ones('Z X C V B N M , . /'), [1.75, 'shift'], [1, '▲']],
    [[1, 'ctrl'], [1, 'fn'], [1, '⊞'], [1, 'alt'], [6, ''], [1, 'alt'], [1, 'ctrl'], [1, '◀'], [1, '▼'], [1, '▶']],
  ];
  mainRows.forEach((row, r) => {
    let x = KX0;
    for (const [w, t] of row) {
      kb.push({ x: x + (w * KU) / 2, z: rowZ(r), w: w * KU - 0.0028, d: r === 0 ? 0.0085 : KU - 0.0028, t });
      x += w * KU;
    }
  });
  // numpad: [col, row, cols, rows, legend]
  const numpad: [number, number, number, number, string][] = [
    [0, 0, 1, 1, 'home'], [1, 0, 1, 1, 'pgup'], [2, 0, 1, 1, 'pgdn'], [3, 0, 1, 1, '⏻'],
    [0, 1, 1, 1, 'num'], [1, 1, 1, 1, '/'], [2, 1, 1, 1, '*'], [3, 1, 1, 1, '-'],
    [0, 2, 1, 1, '7'], [1, 2, 1, 1, '8'], [2, 2, 1, 1, '9'], [3, 2, 1, 2, '+'],
    [0, 3, 1, 1, '4'], [1, 3, 1, 1, '5'], [2, 3, 1, 1, '6'],
    [0, 4, 1, 1, '1'], [1, 4, 1, 1, '2'], [2, 4, 1, 1, '3'], [3, 4, 1, 2, '↵'],
    [0, 5, 2, 1, '0'], [2, 5, 1, 1, '.'],
  ];
  for (const [c, r, cw, rh, t] of numpad) {
    const z = r === 0 ? rowZ(0) : (rowZ(r) + rowZ(r + rh - 1)) / 2;
    kb.push({ x: NX0 + (c + cw / 2) * NU, z, w: cw * NU - 0.0026, d: r === 0 ? 0.0085 : rh * KU - 0.0028, t });
  }
  const well = new THREE.Mesh(new THREE.PlaneGeometry(KB_W + 0.008, 0.108), M.laptopKeys);
  well.rotation.x = -Math.PI / 2;
  well.position.set(0, 0.0181, KZ0 + 0.05);
  victus.add(well);
  const KEY = 0.0148;
  const keyGeo = rbox(KEY, 0.004, KEY, 0.0014);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.55 });
  const keys = new THREE.InstancedMesh(keyGeo, capMat, kb.length);
  const mtx = new THREE.Matrix4();
  kb.forEach((k, i) => keys.setMatrixAt(i, mtx.compose(new THREE.Vector3(k.x, 0.02, k.z), new THREE.Quaternion(), new THREE.Vector3(k.w / KEY, 1, k.d / KEY))));
  keys.castShadow = true;
  victus.add(keys);
  // legends: white, and they're what lights up at night (the backlight), not the whole cap
  const PXM = 3200; // canvas px per metre
  const legendTex = label(Math.round((KB_W + 0.004) * PXM), Math.round(0.104 * PXM), (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#f4f6f8';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const k of kb) {
      if (!k.t) continue;
      const big = k.t.length === 1 || k.t === '⌫' || k.t === '↵';
      g.font = `${big ? 600 : 500} ${big ? 17 : k.d < 0.01 ? 9 : 10}px "Space Grotesk", Arial, sans-serif`;
      const px = (k.x - KX0 + 0.002) * PXM;
      const pz = (k.z - KZ0 + 0.002) * PXM;
      if (big || k.d < 0.01) g.fillText(k.t, px, pz);
      else g.fillText(k.t, px - (k.w * PXM) / 2 + g.measureText(k.t).width / 2 + 7, pz + (k.d * PXM) / 2 - 11); // modifiers: bottom-left
    }
  });
  const keyMat = new THREE.MeshStandardMaterial({ map: legendTex, transparent: true, roughness: 0.6, emissive: 0xd8ecff, emissiveMap: legendTex, emissiveIntensity: 0, depthWrite: false });
  const legends = new THREE.Mesh(new THREE.PlaneGeometry(KB_W + 0.004, 0.104), keyMat);
  legends.rotation.x = -Math.PI / 2;
  legends.position.set(0, 0.02215, KZ0 - 0.002 + 0.052);
  victus.add(markText(legends));
  // touchpad: wide, centred under the spacebar (so left of the laptop's middle), glass-smooth with a chamfered rim
  const padX = KX0 + 7.5 * KU;
  const padRim = new THREE.Mesh(new THREE.PlaneGeometry(0.128, 0.081), new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.25, metalness: 0.8 }));
  padRim.rotation.x = -Math.PI / 2;
  padRim.position.set(padX, 0.01805, 0.066);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.125, 0.078), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.18, metalness: 0.35 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(padX, 0.0181, 0.066);
  victus.add(padRim, pad);
  // finger notch to lift the lid, front-centre
  block(0.07, 0.002, 0.004, M.blackPlastic, 0, 0.0165, D / 2 - 0.0015, 0.001, false, victus);
  // ports down the sides, vents at the back corners
  const portMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.7 });
  for (const [z, w, h] of [[-0.06, 0.016, 0.009], [-0.035, 0.013, 0.005], [-0.012, 0.015, 0.006], [0.008, 0.009, 0.0035], [0.03, 0.006, 0.006]])
    block(0.0012, h, w, portMat, -W / 2 + 0.0004, 0.009 - h / 2, z, 0.0004, false, victus); // left: RJ45, USB-A, HDMI, USB-C, audio
  for (const [z, w, h] of [[-0.05, 0.013, 0.005], [-0.028, 0.013, 0.005], [-0.005, 0.009, 0.0035], [0.018, 0.024, 0.0025]])
    block(0.0012, h, w, portMat, W / 2 - 0.0004, 0.009 - h / 2, z, 0.0004, false, victus); // right: USB-A ×2, USB-C, SD
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) block(0.0012, 0.0085, 0.0028, portMat, side * (W / 2 - 0.0004), 0.0045, -0.118 + i * 0.0055, 0.0005, false, victus); // side vents
    for (let i = 0; i < 16; i++) block(0.0028, 0.0085, 0.0012, portMat, side * (0.06 + i * 0.0068), 0.0045, -D / 2 + 0.0004, 0.0005, false, victus); // rear exhausts
  }
  // hinge spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, W * 0.78, 20), M.laptopShell);
  spine.rotation.z = Math.PI / 2;
  spine.position.set(0, 0.016, -D / 2 + 0.006);
  victus.add(spine);
  // lid, tilted back ~15°
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.016, -D / 2 + 0.004);
  hinge.rotation.x = -0.26;
  const lidH = 0.25;
  block(W, lidH, 0.0075, M.laptopShell, 0, 0, -0.004, 0.005, false, hinge);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.008, lidH - 0.006), M.blackPlastic);
  bezel.position.set(0, lidH / 2, 0.0002);
  hinge.add(bezel);
  const SCR_W = 0.345;
  const SCR_H = SCR_W / 1.6;
  const laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), holeMaterial());
  laptopScreen.position.set(0, 0.023 + SCR_H / 2, 0.0004);
  hinge.add(laptopScreen);
  // chin wordmark and webcam
  const chin = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.008),
    new THREE.MeshBasicMaterial({
      transparent: true,
      map: label(400, 64, (g, w, h) => {
        g.fillStyle = '#9ea2a8';
        g.font = '600 44px "Space Grotesk", Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.letterSpacing = '6px';
        g.fillText('victus', w / 2, h / 2 + 2);
      }),
    }),
  );
  chin.position.set(0, 0.0115, 0.0005);
  hinge.add(markText(chin));
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 16), new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 0.1, metalness: 0.5 }));
  cam.position.set(0, lidH - 0.0068, 0.0005);
  hinge.add(cam);
  // the V on the back of the lid
  const vLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.05),
    new THREE.MeshStandardMaterial({
      transparent: true,
      roughness: 0.2,
      metalness: 0.9,
      map: label(256, 256, (g) => {
        g.fillStyle = '#d7dade';
        g.beginPath();
        g.moveTo(40, 52);
        g.lineTo(96, 52);
        g.lineTo(128, 150);
        g.lineTo(160, 52);
        g.lineTo(216, 52);
        g.lineTo(150, 214);
        g.lineTo(106, 214);
        g.closePath();
        g.fill();
      }),
    }),
  );
  vLogo.rotation.y = Math.PI;
  vLogo.position.set(0, lidH * 0.55, -0.0081);
  hinge.add(vLogo);
  victus.add(hinge);
  root.add(shadowed(victus));
  laptopScreen.castShadow = false;
  legends.castShadow = chin.castShadow = vLogo.castShadow = false;
  prop('laptop', victus, [-0.02, 0.12, -0.12]);
  collider(-0.02, -0.12, W, D, 0, 0.022); // base: walkable (warm keyboard!)
  // lid: a wall, not a ledge (he can't perch on an open screen). It leans back ~15°, so the box runs from just
  // in front of the hinge to behind the top edge: nothing of his (head, tail, whiskers) gets into the glass
  collider(-0.02, -0.2665, W, 0.103, 0, 1.2);

  // ── the glass plaque at the Victus's right corner: their photo, the song, its Spotify code ──
  const plaque = new THREE.Group();
  plaque.position.set(0.27, 0, -0.2);
  plaque.rotation.y = -0.38;
  const PLQ_W = 0.12;
  const PLQ_H = 0.2;
  block(0.15, 0.014, 0.05, new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.6 }), 0, 0, 0, 0.004, false, plaque); // wooden foot
  const slab = new THREE.Mesh(
    rbox(PLQ_W + 0.012, PLQ_H + 0.012, 0.006, 0.0015),
    new THREE.MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55 }),
  );
  slab.position.set(0, 0.008 + (PLQ_H + 0.012) / 2, 0);
  plaque.add(slab);
  const plaqueFace = new THREE.Mesh(new THREE.PlaneGeometry(PLQ_W, PLQ_H), holeMaterial());
  plaqueFace.position.set(0, slab.position.y, 0.0032);
  plaque.add(plaqueFace);
  // fairy lights draped over it: a thin wire with warm bulbs
  const wire = new THREE.CatmullRomCurve3([
    [-0.1, 0.03, 0.03], [-0.075, 0.12, 0.015], [-0.07, 0.2, 0.012], [-0.03, 0.225, 0.01], [0.02, 0.212, 0.012], [0.07, 0.226, 0.012],
    [0.078, 0.15, 0.014], [0.068, 0.08, 0.016], [0.09, 0.02, 0.03],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  plaque.add(new THREE.Mesh(new THREE.TubeGeometry(wire, 120, 0.0007, 5, false), new THREE.MeshStandardMaterial({ color: 0xc89b5a, roughness: 0.4, metalness: 0.6 })));
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb347, emissiveIntensity: 3 });
  const bulbGeo = new THREE.SphereGeometry(0.0032, 10, 8);
  for (let i = 1; i < 12; i++) {
    const b = new THREE.Mesh(bulbGeo, bulbMat);
    b.position.copy(wire.getPoint(i / 12));
    plaque.add(b);
  }
  const fairyLight = new THREE.PointLight(0xffb560, 0.35, 0.45, 1.6);
  fairyLight.position.set(0, 0.13, 0.05);
  plaque.add(fairyLight);
  root.add(plaque);
  slab.castShadow = true;
  plaqueFace.castShadow = plaqueFace.receiveShadow = false;
  prop('plaque', plaque, [0.27, 0.12, -0.2]);
  collider(0.27, -0.2, 0.15, 0.06, 0, 1.2); // glass on edge: walk round it, don't stand on it

  // ── left: the old HP Pavilion on its crate, lid shut, running headless 24/7: brushed-silver lid with the
  //    chrome hp disc, charcoal base, hinge barrel, status LEDs on the front lip, an exhaust grille, a blue
  //    Ethernet cable and the charger lead trailing off the back ──
  const server = new THREE.Group();
  block(0.38, 0.12, 0.28, M.crate, -0.62, 0, -0.32, 0.004, true, server);
  const pav = new THREE.Group();
  pav.position.set(-0.62, 0.12, -0.32);
  const PW = 0.36;
  const PD = 0.245;
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.55, metalness: 0.15 });
  for (const [x, z] of [[-0.15, -0.095], [0.15, -0.095], [-0.15, 0.1], [0.15, 0.1]]) block(0.034, 0.003, 0.008, M.blackPlastic, x, 0, z, 0.0015, false, pav); // rubber feet
  block(PW, 0.0135, PD, charcoal, 0, 0.003, 0, 0.005, false, pav); // base
  const brushed = label(512, 512, (g, w, h) => {
    g.fillStyle = '#9a9ca1';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * h;
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,42,48'}, ${0.04 + Math.random() * 0.07})`;
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (Math.random() - 0.5) * 2);
      g.stroke();
    }
  });
  const lidMat = M.pavilion;
  lidMat.map = brushed;
  lidMat.color.set(0xffffff);
  lidMat.needsUpdate = true;
  block(PW - 0.002, 0.0075, PD - 0.008, lidMat, 0, 0.0165, 0.003, 0.0045, false, pav); // lid, top at 0.024
  // seam between lid and base: a dark line all round
  block(PW - 0.004, 0.0012, PD - 0.01, M.blackPlastic, 0, 0.0158, 0.003, 0.0005, false, pav);
  // hinge barrel across the back
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, PW * 0.62, 24), charcoal);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 0.0135, -PD / 2 + 0.002);
  pav.add(barrel);
  // the chrome hp disc on the lid
  const hp = new THREE.Mesh(
    new THREE.CircleGeometry(0.019, 40),
    new THREE.MeshStandardMaterial({
      roughness: 0.15,
      metalness: 0.95,
      map: label(256, 256, (g, w) => {
        const r = w / 2;
        const grad = g.createLinearGradient(0, 0, w, w);
        grad.addColorStop(0, '#f4f5f7');
        grad.addColorStop(0.5, '#a9adb3');
        grad.addColorStop(1, '#e4e6ea');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(r, r, r - 2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#3b3e44';
        g.font = 'italic 700 150px Georgia, "Times New Roman", serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('hp', r + 4, r - 6);
      }),
    }),
  );
  hp.rotation.x = -Math.PI / 2;
  hp.rotation.z = Math.PI; // reads the right way up when the lid is opened toward the viewer
  hp.position.set(0, 0.0242, 0.01);
  pav.add(markText(hp));
  // status LEDs on the front lip: power (steady) and drive (flickers with Docker's disk writes)
  const serverLed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe8f0ff, emissiveIntensity: 2 });
  block(0.006, 0.002, 0.0015, M.led, 0.12, 0.007, PD / 2 + 0.0002, 0.0006, false, pav);
  block(0.006, 0.002, 0.0015, serverLed, 0.135, 0.007, PD / 2 + 0.0002, 0.0006, false, pav);
  // right side, toward you: exhaust grille, USB ×2, HDMI, Ethernet (cable in)
  const hole = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.8 });
  for (let i = 0; i < 11; i++) block(0.0012, 0.008, 0.0026, hole, PW / 2 - 0.0004, 0.0055, -0.105 + i * 0.0052, 0.0004, false, pav);
  for (const [z, w, h] of [[-0.02, 0.013, 0.005], [0.0, 0.013, 0.005], [0.022, 0.015, 0.006]]) block(0.0012, h, w, hole, PW / 2 - 0.0004, 0.0095 - h / 2, z, 0.0004, false, pav);
  block(0.0012, 0.009, 0.016, hole, PW / 2 - 0.0004, 0.005, -0.045, 0.0005, false, pav); // RJ45
  block(0.012, 0.009, 0.014, new THREE.MeshStandardMaterial({ color: 0xcfd8e6, roughness: 0.3, transparent: true, opacity: 0.85 }), PW / 2 + 0.006, 0.005, -0.045, 0.002, false, pav); // the plug
  server.add(pav);
  const cable = (pts: [number, number, number][], color: number, r: number) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 64, r, 8, false), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    m.castShadow = true;
    server.add(m);
  };
  // Ethernet: out of the right side, round the back of the crate, down to the desk and off to the router
  cable([[-0.428, 0.129, -0.365], [-0.41, 0.127, -0.39], [-0.42, 0.124, -0.45], [-0.43, 0.09, -0.475], [-0.43, 0.02, -0.49], [-0.4, 0.004, -0.52], [-0.3, 0.004, -0.54]], 0x2f6fd6, 0.0026);
  // charger lead from the back-left, down behind the crate
  cable([[-0.76, 0.128, -0.442], [-0.77, 0.126, -0.46], [-0.78, 0.09, -0.47], [-0.79, 0.02, -0.485], [-0.82, 0.004, -0.52], [-0.95, 0.004, -0.54]], 0x151517, 0.0024);
  root.add(server);
  collider(-0.62, -0.32, PW, PD, 0.12, 0.144);
  prop('server', server, [-0.62, 0.2, -0.32]);
  // wall shelf with the Plassey box
  block(0.5, 0.025, 0.2, M.shelf, -0.72, 0.535, -0.45, 0.003);
  for (const x of [-0.93, -0.51]) block(0.02, 0.06, 0.16, M.metal, x, 0.475, -0.47, 0.002, false);
  const plassey = new THREE.Group();
  block(0.2, 0.045, 0.17, new THREE.MeshStandardMaterial({ color: 0x2f5d4a, roughness: 0.6 }), -0.86, 0.56, -0.45, 0.003, true, plassey);
  const lidTex = new THREE.CanvasTexture(plasseyLid());
  lidTex.colorSpace = THREE.SRGBColorSpace;
  lidTex.anisotropy = aniso;
  const lidTop = new THREE.Mesh(new THREE.PlaneGeometry(0.195, 0.165), new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.7 }));
  lidTop.rotation.x = -Math.PI / 2;
  lidTop.position.set(-0.86, 0.6055, -0.45);
  plassey.add(markText(lidTop));
  root.add(plassey);
  prop('boardgame', plassey, [-0.86, 0.61, -0.45]);

  // ── right: the shelf unit (parkour!), phone dock, calculator, socials sign, console + plant ──
  const hutch = new THREE.Group();
  const HX0 = 0.5;
  const HX1 = 0.98;
  const S1 = 0.28;
  const S2 = 0.58;
  // the sides and lower shelf run 8 cm deeper than the wall behind the phone and books: a walkway along the front
  block(0.02, S2 - 0.02, 0.38, M.shelf, HX0, 0, -0.31, 0.003, true, hutch);
  block(0.02, S2 - 0.02, 0.38, M.shelf, HX1, 0, -0.31, 0.003, true, hutch);
  block(HX1 - HX0 - 0.02, 0.02, 0.38, M.shelf, (HX0 + HX1) / 2, S1 - 0.02, -0.31, 0.002, true, hutch);
  block(HX1 - HX0 - 0.02, 0.02, 0.14, M.shelf, (HX0 + HX1) / 2, S2 - 0.02, -0.43, 0.002, true, hutch); // shallow: room to jump up from the shelf below
  block(HX1 - HX0 + 0.02, S2 - 0.02, 0.01, M.shelf, (HX0 + HX1) / 2, 0, -0.497, 0.001, false, hutch);
  root.add(hutch);
  // a full row of books along the bottom of the shelf unit (he can scratch them to ribbons)
  const shelfBooks: ShelfBook[] = [];
  {
    const cols = [0x7a2e22, 0x2f5d4a, 0x24324f, 0xc9a15a, 0x5b3f6e, 0x8c5a2b, 0x3d6f73, 0xa8432f, 0x2b2b2b, 0xd6c7a1];
    let x = HX0 + 0.015;
    let i = 0;
    while (x < HX1 - 0.03) {
      const w = 0.02 + ((i * 37) % 13) / 1000;
      const h = 0.17 + ((i * 53) % 7) / 100;
      const d = 0.17 + ((i * 29) % 4) / 100;
      const mat = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.65 });
      const book = block(w, h, d, mat, x + w / 2, 0, -0.495 + d / 2 + 0.005, 0.002);
      // a pale band on the spine reads as a title at a distance
      const band = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 0.012), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 }));
      band.position.set(0, h * 0.25, d / 2 + 0.0005);
      book.add(band);
      shelfBooks.push({ mesh: book, mat, w, h, d, x: x + w / 2, front: -0.495 + d + 0.005 });
      x += w + 0.002;
      i++;
    }
  }
  // the plank: bridges the top shelf to the wall shelf, right under the pinboard
  block(HX0 + 0.47 + 0.01, 0.02, 0.12, M.shelf, (HX0 - 0.47) / 2, S2 - 0.02, -0.44, 0.003);
  block(0.02, 0.06, 0.1, M.metal, 0.0, S2 - 0.08, -0.45, 0.002, false); // bracket
  // a Galaxy S25 in a dock on the lower shelf: 146.9 × 70.5 × 7.2 mm, flat aluminium frame, flat 6.2" screen with
  // thin even bezels and a centred punch-hole, three separate rear lenses top-left, keys on the right
  const phone = new THREE.Group();
  phone.position.set(0.64, S1, -0.325); // against the wooden wall
  block(0.06, 0.014, 0.05, M.blackPlastic, 0, 0, 0, 0.004, false, phone);
  const phoneBody = new THREE.Group();
  phoneBody.position.set(0, 0.008, 0.004);
  phoneBody.rotation.x = -0.18;
  const S25 = { w: 0.0705, h: 0.1469, t: 0.0072, r: 0.0095 };
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b3448, roughness: 0.32, metalness: 0.75 }); // Navy
  const phoneSlab = new THREE.ExtrudeGeometry(roundRect(S25.w - 0.0016, S25.h - 0.0016, S25.r - 0.0008), {
    depth: S25.t - 0.0016,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0008,
    bevelSegments: 3,
    curveSegments: 12,
  });
  phoneSlab.translate(0, S25.h / 2, -(S25.t - 0.0016) / 2);
  phoneBody.add(new THREE.Mesh(phoneSlab, frameMat));
  // front glass (black, edge to edge) and back glass (the colour)
  const front = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(S25.w - 0.0012, S25.h - 0.0012, S25.r - 0.0006), 12), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.08, metalness: 0.2 }));
  front.position.set(0, S25.h / 2, S25.t / 2 + 0.00005);
  phoneBody.add(front);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(S25.w - 0.0012, S25.h - 0.0012, S25.r - 0.0006), 12), new THREE.MeshStandardMaterial({ color: 0x27304a, roughness: 0.2, metalness: 0.3 }));
  back.rotation.y = Math.PI;
  back.position.set(0, S25.h / 2, -S25.t / 2 - 0.00005);
  phoneBody.add(back);
  // three lenses in a column, top-left of the back (top-right seen from behind the phone), each in its own ring
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3a4460, roughness: 0.25, metalness: 0.9 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0016, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.0205, S25.h - 0.017 - i * 0.0145, -S25.t / 2 - 0.0008);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0046, 24), lensMat);
    lens.rotation.y = Math.PI;
    lens.position.set(ring.position.x, ring.position.y, -S25.t / 2 - 0.0017);
    phoneBody.add(ring, lens);
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 16), new THREE.MeshStandardMaterial({ color: 0xf2e8c8, roughness: 0.3 }));
  flash.rotation.y = Math.PI;
  flash.position.set(0.0095, S25.h - 0.017, -S25.t / 2 - 0.0001);
  phoneBody.add(flash);
  // volume rocker and side key on the right edge
  block(0.0012, 0.022, 0.0028, frameMat, S25.w / 2 + 0.0003, S25.h - 0.052, 0, 0.0005, false, phoneBody);
  block(0.0012, 0.012, 0.0028, frameMat, S25.w / 2 + 0.0003, S25.h - 0.077, 0, 0.0005, false, phoneBody);
  // the display: 6.2", 19.5:9, ~1.4 mm bezels, rounded to match the screen's own corners (in the CSS)
  const PH_W = 0.0648;
  const phoneScreen = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(PH_W, PH_W * (844 / 390), PH_W * (40 / 390)), 12), holeMaterial());
  phoneScreen.position.set(0, S25.h / 2, S25.t / 2 + 0.0002);
  phoneBody.add(phoneScreen);
  phone.add(phoneBody);
  root.add(shadowed(phone));
  phoneScreen.castShadow = false;
  prop('phone', phone, [0.64, S1 + 0.075, -0.325]);
  collider(0.64, -0.325, 0.08, 0.06, S1, S2 - 0.02); // upright in its dock: a wall, not something to stand on
  // a scientific calculator lying next to the phone, back edge raised a touch; its face is real HTML
  const calc = new THREE.Group();
  calc.position.set(0.755, S1 + 0.0075, -0.281); // fills the shelf from the wooden wall to the front edge
  calc.rotation.set(0.1, 0, 0);
  // fx-991CW: the whole top is the HTML face (rounded to match), so only the dark grey sides are 3D
  block(0.08, 0.012, 0.16, new THREE.MeshStandardMaterial({ color: 0x2e3035, roughness: 0.5 }), 0, -0.006, 0, 0.0015, false, calc);
  const CALC_W = 0.0776; // 320 CSS px across: the full flat top of the 80 × 160 mm body
  const calcFace = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(CALC_W, CALC_W * 2, CALC_W * (18 / 320)), 12), holeMaterial());
  calcFace.rotation.x = -Math.PI / 2;
  calcFace.position.y = 0.0062;
  calc.add(calcFace);
  root.add(shadowed(calc));
  calcFace.castShadow = calcFace.receiveShadow = false;
  prop('calc', calc, [0.755, S1 + 0.03, -0.281]);
  collider(0.755, -0.281, 0.08, 0.158, S1, S1 + 0.018); // he can stand on it
  // the socials, as a row of books on the lower shelf: each spine is a profile, click one to visit it
  const socials = new THREE.Group();
  {
    const palette: Record<string, [string, string]> = {
      GitHub: ['#24292f', '#ffffff'], LinkedIn: ['#0a66c2', '#ffffff'], 'Twitter / X': ['#111111', '#ffffff'],
      Instagram: ['grad', '#ffffff'], Facebook: ['#1877f2', '#ffffff'],
    };
    let x = 0.83;
    SOCIALS.forEach((s, i) => {
      const w = 0.024 + (i % 2) * 0.004;
      const h = 0.17 - (i % 3) * 0.012;
      const d = 0.12;
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = Math.round((160 * h) / w);
      const g = c.getContext('2d')!;
      const [bg, ink] = palette[s.label] ?? ['#444', '#fff'];
      if (bg === 'grad') {
        const gr = g.createLinearGradient(0, c.height, c.width, 0);
        gr.addColorStop(0, '#f9ce34');
        gr.addColorStop(0.5, '#ee2a7b');
        gr.addColorStop(1, '#6228d7');
        g.fillStyle = gr;
      } else g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(255,255,255,0.18)'; // head and tail bands
      g.fillRect(0, 40, c.width, 10);
      g.fillRect(0, c.height - 50, c.width, 10);
      g.save();
      g.translate(c.width / 2, c.height / 2);
      g.rotate(-Math.PI / 2);
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 ${Math.round(c.width * 0.42)}px 'Space Grotesk', system-ui, sans-serif`;
      g.fillText(s.label === 'Twitter / X' ? 'X' : s.label, 0, -c.width * 0.08);
      g.font = `400 ${Math.round(c.width * 0.2)}px 'Space Mono', monospace`;
      g.globalAlpha = 0.85;
      g.fillText(s.handle, 0, c.width * 0.27);
      g.restore();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      const cover = new THREE.MeshStandardMaterial({ color: bg === 'grad' ? 0xc1357a : new THREE.Color(bg).getHex(), roughness: 0.7 });
      const book = block(w, h, d, cover, x + w / 2, S1, -0.3, 0.002, false, socials);
      const spine = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
      spine.position.z = d / 2 + 0.0006;
      book.add(markText(spine));
      book.userData.propId = `social:${s.label}`;
      book.userData.url = s.url;
      x += w + 0.002;
    });
    root.add(socials);
  }
  prop('socials', socials, [0.89, S1 + 0.1, -0.3]);
  collider(0.895, -0.3, 0.14, 0.12, S1, S1 + 0.17);

  // ── a planked wooden wall closing the back of the lower shelf, right behind the phone, calculator and books ──
  {
    const wall = new THREE.Group();
    const WZ = -0.362; // front face: flush with the top shelf's front edge, so everything under it is wall
    const x0 = HX0 + 0.01;
    const x1 = HX1 - 0.01;
    const y0 = S1;
    const y1 = S2 - 0.02;
    // dark backing, so the gaps between planks read as grooves
    const deep = WZ + 0.492; // from the hutch's back panel forward
    block(x1 - x0, y1 - y0, deep - 0.006, new THREE.MeshStandardMaterial({ color: 0x3a2516, roughness: 0.9 }), (x0 + x1) / 2, y0, WZ - 0.006 - (deep - 0.006) / 2, 0.001, false, wall);
    // vertical tongue-and-groove planks, each a slightly different tone and standing a hair proud or shy
    const N = 8;
    const pw = (x1 - x0) / N;
    const tones = [0xffffff, 0xf0e4d6, 0xfff4e6, 0xe6d6c4, 0xfaf0e2, 0xeadccb, 0xfff8ee, 0xe9dccd];
    for (let i = 0; i < N; i++) {
      const mat = M.shelf.clone();
      mat.color.set(tones[i % tones.length]);
      block(pw - 0.0025, y1 - y0 - 0.002, 0.012, mat, x0 + pw * (i + 0.5), y0 + 0.001, WZ - 0.006 + ((i * 3) % 4) * 0.0004, 0.0015, false, wall);
    }
    // a rail along the top, where the wall meets the top shelf
    block(x1 - x0, 0.018, 0.016, M.shelf, (x0 + x1) / 2, y1 - 0.018, WZ - 0.004, 0.002, false, wall);
    root.add(shadowed(wall));
    collider((x0 + x1) / 2, WZ - deep / 2, x1 - x0, deep, y0, y1); // solid: nothing (and no cat) gets behind it
  }
  // console + plant on the top shelf
  const gb = new THREE.Group();
  gb.position.set(0.63, S2, -0.43);
  gb.rotation.x = 0;
  gb.rotation.y = 1.25;
  block(0.08, 0.018, 0.14, M.whitePlastic, 0, 0, 0, 0.01, false, gb);
  const gbScr = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.05), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffffff, emissiveMap: consoleScreen(), emissiveIntensity: 0.8 }));
  gbScr.rotation.x = -Math.PI / 2;
  gbScr.position.set(0, 0.0185, -0.03);
  gb.add(markText(gbScr));
  block(0.022, 0.004, 0.007, M.blackPlastic, -0.02, 0.018, 0.035, 0.001, false, gb);
  block(0.007, 0.004, 0.022, M.blackPlastic, -0.02, 0.018, 0.035, 0.001, false, gb);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16), M.ledRed);
  btn.position.set(0.02, 0.02, 0.035);
  gb.add(btn);
  root.add(shadowed(gb));
  prop('console', gb, [0.63, S2 + 0.02, -0.43]);
  collider(0.63, -0.43, 0.15, 0.1, S2, S2 + 0.018);
  // the potted plant where the plank meets the top shelf: he can shove it off (it breaks where it lands)
  const plantPot = new THREE.Group(); // origin = the knockable's centre, 0.045 above the shelf
  {
    const body = new THREE.Mesh(rbox(0.08, 0.08, 0.08, 0.012), M.pot);
    body.position.y = -0.005;
    body.name = 'potbody';
    plantPot.add(body);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.plant);
      leaf.scale.set(0.4, 1.3, 0.2);
      leaf.position.set(Math.cos(i * 1.3) * 0.02, 0.075 + (i % 3) * 0.015, 0.01 + Math.sin(i * 1.3) * 0.02);
      leaf.rotation.set(Math.sin(i) * 0.7, i * 0.8, Math.cos(i) * 0.7);
      plantPot.add(leaf);
    }
  }

  // ── pinboard on the wall: About, Academics, Tech Stack, Experiences, and a polaroid of the boss ──
  const pin = new THREE.Group();
  pin.position.set(0.0, 0.86, -0.545); // just above the plank: the cat can sit and read it
  const board = new THREE.Mesh(rbox(0.84, 0.54, 0.02, 0.004), M.cork);
  board.position.z = 0.01;
  board.castShadow = board.receiveShadow = true;
  const frame = new THREE.Mesh(rbox(0.86, 0.56, 0.015, 0.003), M.shelf);
  frame.position.z = 0.005;
  pin.add(frame, board);
  // cards are HTML seen through holes (see pincards.ts): browser-sharp lettering; pins stay 3D on top
  const PIN_W = 0.2;
  const cardList: [string, number, number, number][] = [
    ['about', -0.315, 0.0, -0.02],
    ['academics', -0.105, -0.005, 0.015],
    ['stack', 0.105, 0.0, -0.01],
    ['experiences', 0.315, -0.003, 0.02],
  ];
  const pinCards: { id: string; mesh: THREE.Mesh }[] = [];
  for (const [id, x, y, rz] of cardList) {
    const cardMesh = new THREE.Mesh(new THREE.PlaneGeometry(PIN_W, PIN_W * 1.415), holeMaterial());
    cardMesh.position.set(x, y, 0.0212);
    cardMesh.rotation.z = rz;
    const tack = new THREE.Mesh(new THREE.SphereGeometry(0.006, 14, 10), M.ledRed);
    tack.position.set(x, y + 0.13, 0.026);
    tack.castShadow = true;
    pin.add(cardMesh, tack);
    pinCards.push({ id, mesh: cardMesh });
  }
  const pol = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.108), new THREE.MeshStandardMaterial({ map: catPolaroid(aniso), roughness: 0.6 }));
  pol.position.set(0.37, -0.215, 0.024);
  pol.rotation.z = -0.12;
  pin.add(markText(pol));
  root.add(pin);
  prop('pinboard', pin, [0.0, 0.62, -0.47]);

  // ── printer on the desk, with the résumé ready to come out ──
  const printer = new THREE.Group();
  printer.position.set(0.74, 0, 0.16); // out in front of the shelf (the lower shelf is still one jump up from the desk)
  printer.rotation.y = 0;
  block(0.25, 0.085, 0.19, M.whitePlastic, 0, 0, 0, 0.012, false, printer);
  block(0.2, 0.004, 0.1, M.blackPlastic, 0, 0.085, -0.03, 0.001, false, printer); // top lid seam
  block(0.18, 0.006, 0.008, M.blackPlastic, 0, 0.045, 0.095, 0.002, false, printer); // output slot
  block(0.2, 0.004, 0.12, M.whitePlastic, 0, 0.012, 0.15, 0.002, false, printer); // output tray
  const pLed = block(0.008, 0.003, 0.003, M.led, 0.09, 0.07, 0.096, 0.001, false, printer);
  void pLed;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.24), new THREE.MeshStandardMaterial({ map: resumeTexture(aniso), roughness: 0.9, side: THREE.DoubleSide }));
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, 0.047, -0.03); // tucked inside
  paper.visible = false;
  paper.castShadow = true;
  printer.add(markText(paper));
  root.add(shadowed(printer));
  prop('printer', printer, [0.74, 0.06, 0.16]);
  collider(0.74, 0.16, 0.25, 0.19, 0, 0.088);
  collider(0.74, 0.31, 0.2, 0.12, 0, 0.016); // output tray

  // ── desk lamp, notebook, mug ──
  const lamp = new THREE.Group();
  lamp.position.set(-0.86, 0, 0.18);
  const lampLight = new THREE.SpotLight(0xffd6a0, 0, 1.6, 0.7, 0.5, 2);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.016, 40), M.blackPlastic);
  lb.position.y = 0.008;
  const arm1 = rod(new THREE.Vector3(0, 0.016, 0), new THREE.Vector3(0.03, 0.26, -0.02), 0.006, M.metal);
  const arm2 = rod(new THREE.Vector3(0.03, 0.26, -0.02), new THREE.Vector3(0.16, 0.3, 0.02), 0.006, M.metal);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.4, side: THREE.DoubleSide }));
  shade.position.set(0.18, 0.28, 0.03);
  shade.rotation.z = 0.7;
  lampLight.position.set(0.19, 0.26, 0.03);
  lampLight.target.position.set(0.35, 0, 0.05);
  const lampGlow = new THREE.PointLight(0xffa860, 0, 3.2, 1.3);
  lampGlow.position.set(0.18, 0.24, 0.05);
  // the beam: a soft additive cone from the shade to the desk, brightest near the bulb, edges feathered,
  // dust motes drifting through it (shown only when the lamp is on)
  const beamFrom = lampLight.position.clone();
  const beamTo = lampLight.target.position.clone();
  const beamLen = beamFrom.distanceTo(beamTo);
  const beamGeo = new THREE.CylinderGeometry(0.012, Math.tan(0.62) * beamLen, beamLen, 48, 24, true);
  beamGeo.translate(0, -beamLen / 2, 0); // apex at the origin, opening down -y
  const lampBeam = new THREE.Mesh(
    beamGeo,
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLen: { value: beamLen }, uStrength: { value: 0 }, uColor: { value: new THREE.Color(0xffc98a) } },
      vertexShader: `
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        uniform float uLen;
        void main() {
          vH = -position.y / uLen;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        varying float vH; varying vec3 vN; varying vec3 vV; varying vec3 vW;
        uniform float uTime; uniform float uStrength; uniform vec3 uColor;
        float h(vec3 p) { p = fract(p * 0.3183 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x) {
          vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);   // feathered silhouette
          float fall = (1.0 - smoothstep(0.0, 1.0, vH)) * smoothstep(0.0, 0.06, vH); // bright near the bulb, gone at the desk
          float haze = 0.75 + 0.5 * n3(vW * 9.0 + vec3(0.0, uTime * 0.05, uTime * 0.03));
          float motes = smoothstep(0.86, 0.97, n3(vW * 70.0 + vec3(uTime * 0.12, -uTime * 0.08, 0.0))) * 1.6;
          float a = edge * fall * (haze + motes) * uStrength;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  lampBeam.position.copy(beamFrom);
  lampBeam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beamTo.clone().sub(beamFrom).normalize());
  lampBeam.renderOrder = 10;
  lampBeam.castShadow = lampBeam.receiveShadow = false;
  lamp.add(lb, arm1, arm2, shade, lampLight, lampLight.target, lampGlow);
  root.add(shadowed(lamp));
  lamp.add(lampBeam); // after shadowed(): the beam casts no shadow
  collider(-0.86, 0.18, 0.13, 0.13, 0, 0.016);
  collider(-0.86, 0.18, 0.03, 0.03, 0, 0.3);

  const nb = new THREE.Group();
  nb.position.set(-0.44, 0, 0.3);
  nb.rotation.y = 0.18;
  block(0.3, 0.01, 0.21, M.paper, 0, 0, 0, 0.003, false, nb);
  block(0.302, 0.003, 0.212, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }), 0, -0.002, 0, 0.002, false, nb);
  // an open exercise book: ruled pages, a gutter, and a pen sketch on each page (traced to vectors)
  {
    const cw = 2400;
    const ch = Math.round((cw * 0.206) / 0.296);
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f6f1e6';
    g.fillRect(0, 0, cw, ch);
    // faint blue rules and a red margin on each page
    g.strokeStyle = 'rgba(70, 110, 170, 0.28)';
    g.lineWidth = 2;
    for (let y = 140; y < ch - 30; y += 52) {
      g.beginPath();
      g.moveTo(24, y);
      g.lineTo(cw - 24, y);
      g.stroke();
    }
    g.strokeStyle = 'rgba(200, 70, 70, 0.4)';
    for (const x of [150, cw / 2 + 150]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, ch);
      g.stroke();
    }
    // the gutter: a soft shadow down the middle
    const gut = g.createLinearGradient(cw / 2 - 60, 0, cw / 2 + 60, 0);
    gut.addColorStop(0, 'rgba(0,0,0,0)');
    gut.addColorStop(0.5, 'rgba(60,40,20,0.28)');
    gut.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gut;
    g.fillRect(cw / 2 - 60, 0, 120, ch);
    // the sketches, in pen
    // near-black ink, thickened: fill the traced outlines, then stroke them so every line gets bolder
    g.fillStyle = '#060608';
    g.strokeStyle = '#060608';
    g.lineJoin = 'round';
    g.lineCap = 'round';
    SCRIBBLES.forEach((s, i) => {
      const box = [cw / 2 - 260, ch - 200];
      const k = Math.min(box[0] / s.w, box[1] / s.h);
      g.save();
      g.translate(i * (cw / 2) + 200 + (box[0] - s.w * k) / 2, 100 + (box[1] - s.h * k) / 2);
      g.rotate(i ? 0.02 : -0.04);
      g.scale(k, k);
      const path = new Path2D(s.d);
      g.fill(path, 'evenodd');
      g.lineWidth = 5.5; // in sketch pixels: adds ~2.75 px of ink either side of every line
      g.stroke(path);
      g.restore();
    });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.296, 0.206), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    page.rotation.x = -Math.PI / 2;
    page.position.y = 0.0102;
    page.receiveShadow = true;
    nb.add(markText(page)); // pen lines stay crisp under the paint filter
  }
  root.add(nb);
  collider(-0.44, 0.3, 0.32, 0.24, 0, 0.01);
  // the mug: knockable in play mode, clickable (it wobbles and clinks) on the tour
  const mug = new THREE.Group();
  // open-topped (a capped cylinder hid the coffee), with a rim, an inside wall and a base
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.095, 40, 1, true), M.ceramic);
  mugBody.position.y = 0.0025;
  const mugInside = new THREE.Mesh(new THREE.CylinderGeometry(0.0365, 0.0345, 0.09, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.25, side: THREE.BackSide }));
  mugInside.position.y = 0.005;
  const mugBase = new THREE.Mesh(new THREE.CircleGeometry(0.038, 40), M.ceramic);
  mugBase.rotation.x = Math.PI / 2;
  mugBase.position.y = -0.045;
  // the inside floor faces up (the outside base faces down): empty, the mug still has a bottom
  const mugFloor = new THREE.Mesh(new THREE.CircleGeometry(0.0346, 40), mugInside.material);
  mugFloor.material = new THREE.MeshStandardMaterial({ color: 0xe6e1d8, roughness: 0.25 });
  mugFloor.rotation.x = -Math.PI / 2;
  mugFloor.position.y = -0.0398;
  const mugRim = new THREE.Mesh(new THREE.TorusGeometry(0.0383, 0.0018, 8, 48), M.ceramic);
  mugRim.rotation.x = Math.PI / 2;
  mugRim.position.y = 0.05;
  // the handle: a D-shaped loop standing out from the side, in the plane of the mug's axis
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0062, 12, 28, Math.PI), M.ceramic);
  handle.rotation.z = -Math.PI / 2; // the half-ring opens toward the mug
  handle.scale.set(1.25, 1, 1);
  handle.position.set(0.039, 0.004, 0);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0362, 40), new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.08, metalness: 0.05 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.036; // a finger below the rim
  const crema = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.0362, 40), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.3 }));
  crema.position.z = 0.0003;
  coffee.add(crema);
  coffee.name = 'coffee';
  mug.add(mugBody, mugInside, mugBase, mugFloor, mugRim, handle, coffee);
  shadowed(mug);

  // ── things a cat would knock off a desk ──
  const knock = (mesh: THREE.Object3D, radius: number, x: number, y: number, z: number, name?: string, roll = 1) => {
    mesh.position.set(x, y + radius, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    knockables.push({ mesh, radius, name, roll });
  };
  knock(mug, 0.045, 0.3, 0, 0.26, 'mug', 0);
  prop('mug', mug, [0.3, 0.05, 0.26]);
  // a transparent mouse (smoked shell, the insides on show), right of the Victus and in front: knock it
  // off the desk and it comes apart on the floor
  const mouse = new THREE.Group();
  mouse.rotation.y = -0.22;
  {
    const r = 0.03; // the knockable's centre sits r above the desk
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.005, 48), new THREE.MeshStandardMaterial({ color: 0x3b3e44, roughness: 0.6 }));
    base.scale.set(0.0295, 1, 0.0555); // the same oval as the shell's rim
    base.position.y = -r + 0.0025;
    base.name = 'base';
    const pcb = new THREE.Mesh(rbox(0.04, 0.006, 0.06, 0.001), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5 }));
    pcb.position.set(0, -r + 0.008, 0.008);
    pcb.name = 'pcb';
    const strip = new THREE.Mesh(rbox(0.012, 0.004, 0.04, 0.0015), new THREE.MeshStandardMaterial({ color: 0xd9dadc, roughness: 0.25, metalness: 0.8 }));
    strip.position.set(0, -r + 0.013, 0.026);
    strip.name = 'strip';
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.007, 20), new THREE.MeshStandardMaterial({ color: 0xb8b2a6, roughness: 0.35, metalness: 0.85 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, -r + 0.017, 0.032);
    wheel.name = 'wheel';
    const dongle = new THREE.Mesh(rbox(0.013, 0.005, 0.02, 0.001), new THREE.MeshStandardMaterial({ color: 0xc9c9c9, roughness: 0.3, metalness: 0.9 }));
    dongle.position.set(0, -r + 0.009, -0.02);
    dongle.name = 'dongle';
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x9da3aa, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    shell.scale.set(0.03, 0.024, 0.056);
    shell.position.y = -r + 0.004;
    shell.name = 'shell';
    shell.renderOrder = 2;
    mouse.add(base, pcb, strip, wheel, dongle, shell);
  }
  knock(mouse, 0.03, 0.25, 0, 0.12, 'mouse', 0);
  knock(plantPot, 0.045, 0.9, S2, -0.44, 'pot', 0);
  shadowed(plantPot);
  const pen = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.13, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1a3d8f, roughness: 0.3 }));
  pen.rotation.set(0, 0.5, Math.PI / 2);
  knock(pen, 0.006, -0.36, 0.01, 0.33);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0xc9a15a, roughness: 0.4 })), 0.015, 0.12, 0, 0.32);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x7a2e22, roughness: 0.4 })), 0.015, 0.16, 0, 0.38);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.008, 28), M.ledRed), 0.006, -0.12, 0, 0.42);
  knock(new THREE.Mesh(rbox(0.05, 0.012, 0.02, 0.003), M.metal), 0.008, 0.28, 0, 0.0);
  knock(new THREE.Mesh(rbox(0.045, 0.016, 0.025, 0.005), new THREE.MeshStandardMaterial({ color: 0xf2a2b0, roughness: 0.8 })), 0.009, -0.7, 0.145, -0.25);

  return { root, props, boxes, knockables, shelfBooks, serverLed, basketSpot, lampLight, lampGlow, lampBeam, fairyLight, keyMat, pinCards, PIN_W, laptopScreen, SCR_W, phoneScreen, PH_W, calcFace, CALC_W, plaqueFace, PLQ_W, paper, printer, windowMesh: win };
}

function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 14), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

/** Plassey 1757 box art. */
function plasseyLid() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 868;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe6d0';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#2f5d4a';
  g.lineWidth = 18;
  g.strokeRect(34, 34, c.width - 68, c.height - 68);
  g.fillStyle = '#2f5d4a';
  for (let i = 0; i < 7; i++) {
    const x = 140 + i * 125;
    g.fillRect(x - 6, 560, 12, 90);
    g.beginPath();
    g.arc(x, 540, 56, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#7a2e22';
  g.textAlign = 'center';
  g.font = '800 150px Georgia, serif';
  g.fillText('PLASSEY', c.width / 2, 300);
  g.fillStyle = '#111';
  g.font = '600 76px Georgia, serif';
  g.fillText('· 1757 ·', c.width / 2, 400);
  g.font = '36px "Space Mono", monospace';
  g.fillText('a game of quiet betrayals', c.width / 2, 760);
  return c;
}
