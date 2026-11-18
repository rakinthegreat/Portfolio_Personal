// The room, the desk and everything on it. Units are metres; the desk top is y = 0, the back wall is at
// z = -0.55, the viewer looks from +z. Every solid thing also registers a 3D box collider so the cat
// (and whatever he knocks over) can stand on it, bump into it and never pass through it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials';
import { holeMaterial } from './screens';
import { archWindow, consoleScreen } from './textures';
import { catPolaroid, resumeTexture } from './cards';

export interface Box { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
export interface Prop { id: string; object: THREE.Object3D; anchor: THREE.Vector3 }
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

  // ── HP Victus 16: keyboard of real keys, live screen ──
  const victus = new THREE.Group();
  victus.position.set(-0.02, 0, -0.12);
  const W = 0.36;
  const D = 0.255;
  block(W, 0.018, D, M.laptopShell, 0, 0, 0, 0.006, false, victus);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, D * 0.5), M.laptopKeys);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, 0.0181, -0.035);
  victus.add(deck);
  const keyGeo = rbox(0.0155, 0.004, 0.0155, 0.0015);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.55, emissive: 0xd8ecff, emissiveIntensity: 0.0 });
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, 15 * 5 + 1);
  let ki = 0;
  const mtx = new THREE.Matrix4();
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 15; c++) {
      mtx.makeTranslation(-0.142 + c * 0.0185 + (r % 2) * 0.004, 0.02, -0.085 + r * 0.019);
      keys.setMatrixAt(ki++, mtx);
    }
  }
  mtx.compose(new THREE.Vector3(0, 0.02, 0.01), new THREE.Quaternion(), new THREE.Vector3(6.5, 1, 1));
  keys.setMatrixAt(ki++, mtx); // space bar
  keys.castShadow = true;
  victus.add(keys);
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.065), new THREE.MeshStandardMaterial({ color: 0x2d2f33, roughness: 0.3, metalness: 0.4 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.0182, 0.075);
  victus.add(pad);
  // lid, tilted back ~15°
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.016, -D / 2 + 0.004);
  hinge.rotation.x = -0.26;
  const lidH = 0.238;
  block(W, lidH, 0.008, M.laptopShell, 0, 0, -0.004, 0.005, false, hinge);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.01, lidH - 0.008), M.blackPlastic);
  bezel.position.set(0, lidH / 2, 0.0002);
  hinge.add(bezel);
  const SCR_W = 0.345;
  const SCR_H = SCR_W / 1.6;
  const laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), holeMaterial());
  laptopScreen.position.set(0, 0.012 + SCR_H / 2, 0.0004);
  hinge.add(laptopScreen);
  victus.add(hinge);
  root.add(shadowed(victus));
  laptopScreen.castShadow = false;
  prop('laptop', victus, [-0.02, 0.12, -0.12]);
  collider(-0.02, -0.12, W, D, 0, 0.022); // base: walkable (warm keyboard!)
  collider(-0.02, -0.245, W, 0.06, 0, 0.24); // lid

  // ── left: the old Pavilion server on its crate, a stack of books, a wall shelf ──
  const server = new THREE.Group();
  block(0.38, 0.12, 0.28, M.crate, -0.62, 0, -0.32, 0.004, true, server);
  block(0.34, 0.024, 0.24, M.pavilion, -0.62, 0.12, -0.32, 0.006, true, server);
  block(0.012, 0.004, 0.003, M.led, -0.5, 0.13, -0.199, 0.001, false, server);
  block(0.012, 0.004, 0.003, M.led, -0.52, 0.13, -0.199, 0.001, false, server);
  root.add(server);
  prop('server', server, [-0.62, 0.2, -0.32]);
  const bookCols = [0x7a2e22, 0x2f5d4a, 0x24324f, 0xc9a15a, 0x5b3f6e];
  [0.07, 0.11, 0.08].reduce((y, h, i) => {
    block(0.2 - i * 0.012, h, 0.15, new THREE.MeshStandardMaterial({ color: bookCols[i], roughness: 0.7 }), -0.29 + i * 0.004, y, -0.35, 0.004);
    return y + h;
  }, 0);
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

  // ── right: the shelf unit (parkour!), phone dock + water glass, console + plant ──
  const hutch = new THREE.Group();
  const HX0 = 0.5;
  const HX1 = 0.98;
  const S1 = 0.28;
  const S2 = 0.58;
  block(0.02, S2 - 0.02, 0.3, M.shelf, HX0, 0, -0.35, 0.003, true, hutch);
  block(0.02, S2 - 0.02, 0.3, M.shelf, HX1, 0, -0.35, 0.003, true, hutch);
  block(HX1 - HX0 - 0.02, 0.02, 0.3, M.shelf, (HX0 + HX1) / 2, S1 - 0.02, -0.35, 0.002, true, hutch);
  block(HX1 - HX0 - 0.02, 0.02, 0.14, M.shelf, (HX0 + HX1) / 2, S2 - 0.02, -0.43, 0.002, true, hutch); // shallow: room to jump up from the shelf below
  block(HX1 - HX0 + 0.02, S2 - 0.02, 0.01, M.shelf, (HX0 + HX1) / 2, 0, -0.497, 0.001, false, hutch);
  root.add(hutch);
  // a full row of books along the bottom of the shelf unit
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
      x += w + 0.002;
      i++;
    }
  }
  // the plank: bridges the top shelf to the wall shelf, right under the pinboard
  block(HX0 + 0.47 + 0.01, 0.02, 0.12, M.shelf, (HX0 - 0.47) / 2, S2 - 0.02, -0.44, 0.003);
  block(0.02, 0.06, 0.1, M.metal, 0.0, S2 - 0.08, -0.45, 0.002, false); // bracket
  // phone in a dock on the lower shelf
  const phone = new THREE.Group();
  phone.position.set(0.64, S1, -0.3);
  block(0.06, 0.014, 0.05, M.blackPlastic, 0, 0, 0, 0.004, false, phone);
  const phoneBody = new THREE.Group();
  phoneBody.position.set(0, 0.008, 0.004);
  phoneBody.rotation.x = -0.18;
  block(0.075, 0.16, 0.008, M.blackPlastic, 0, 0, 0, 0.006, false, phoneBody);
  const PH_W = 0.069;
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(PH_W, PH_W * (844 / 390)), holeMaterial());
  phoneScreen.position.set(0, 0.08, 0.0042);
  phoneBody.add(phoneScreen);
  phone.add(phoneBody);
  root.add(shadowed(phone));
  phoneScreen.castShadow = false;
  prop('phone', phone, [0.64, S1 + 0.08, -0.3]);
  collider(0.64, -0.3, 0.08, 0.06, S1, S1 + 0.17);
  // HydroSync glass
  const glass = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.027, 0.1, 40, 1, true), M.glass);
  cup.position.set(0.86, S1 + 0.05, -0.32);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.07, 40), M.water);
  water.position.set(0.86, S1 + 0.036, -0.32);
  glass.add(cup, water);
  root.add(glass);
  prop('glass', glass, [0.86, S1 + 0.05, -0.32]);
  collider(0.86, -0.32, 0.07, 0.07, S1, S1 + 0.1);
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
  const pot2 = block(0.08, 0.08, 0.08, M.pot, 0.9, S2, -0.44, 0.012);
  void pot2;
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.plant);
    leaf.scale.set(0.4, 1.3, 0.2);
    leaf.position.set(0.9 + Math.cos(i * 1.3) * 0.02, S2 + 0.12 + (i % 3) * 0.015, -0.43 + Math.sin(i * 1.3) * 0.02);
    leaf.rotation.set(Math.sin(i) * 0.7, i * 0.8, Math.cos(i) * 0.7);
    leaf.castShadow = true;
    root.add(leaf);
  }
  collider(0.9, -0.43, 0.1, 0.1, S2, S2 + 0.2);

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
  printer.position.set(0.74, 0, 0.02); // right in front of the shelf books: desk → printer → lower shelf
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
  prop('printer', printer, [0.74, 0.06, 0.02]);
  collider(0.74, 0.02, 0.25, 0.19, 0, 0.088);
  collider(0.74, 0.17, 0.2, 0.12, 0, 0.016); // output tray

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
  lamp.add(lb, arm1, arm2, shade, lampLight, lampLight.target, lampGlow);
  root.add(shadowed(lamp));
  collider(-0.86, 0.18, 0.13, 0.13, 0, 0.016);
  collider(-0.86, 0.18, 0.03, 0.03, 0, 0.3);

  const nb = new THREE.Group();
  nb.position.set(-0.44, 0, 0.3);
  nb.rotation.y = 0.18;
  block(0.3, 0.01, 0.21, M.paper, 0, 0, 0, 0.003, false, nb);
  block(0.302, 0.003, 0.212, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }), 0, -0.002, 0, 0.002, false, nb);
  root.add(nb);
  collider(-0.44, 0.3, 0.32, 0.24, 0, 0.01);
  // the mug: knockable in play mode, clickable (it wobbles and clinks) on the tour
  const mug = new THREE.Group();
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.095, 40), M.ceramic);
  mugBody.position.y = 0.0025;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 10, 24), M.ceramic);
  handle.position.set(0.043, 0.005, 0);
  handle.rotation.y = Math.PI / 2;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.036, 32), new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.15 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.04;
  mug.add(mugBody, handle, coffee);
  shadowed(mug);

  // ── things a cat would knock off a desk ──
  const knock = (mesh: THREE.Object3D, radius: number, x: number, y: number, z: number, name?: string, roll = 1) => {
    mesh.position.set(x, y + radius, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    knockables.push({ mesh, radius, name, roll });
  };
  knock(mug, 0.045, 0.3, 0, 0.26, 'mug', 0.25);
  prop('mug', mug, [0.3, 0.05, 0.26]);
  const pen = new THREE.Mesh(new THREE.CapsuleGeometry(0.0045, 0.13, 6, 16), new THREE.MeshStandardMaterial({ color: 0x1a3d8f, roughness: 0.3 }));
  pen.rotation.set(0, 0.5, Math.PI / 2);
  knock(pen, 0.006, -0.36, 0.01, 0.33);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0xc9a15a, roughness: 0.4 })), 0.015, 0.12, 0, 0.32);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x7a2e22, roughness: 0.4 })), 0.015, 0.16, 0, 0.38);
  knock(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.008, 28), M.ledRed), 0.006, -0.12, 0, 0.42);
  knock(new THREE.Mesh(rbox(0.05, 0.012, 0.02, 0.003), M.metal), 0.008, 0.28, 0, 0.0);
  knock(new THREE.Mesh(rbox(0.045, 0.016, 0.025, 0.005), new THREE.MeshStandardMaterial({ color: 0xf2a2b0, roughness: 0.8 })), 0.009, -0.7, 0.145, -0.25);

  return { root, props, boxes, knockables, basketSpot, lampLight, lampGlow, keyMat, pinCards, PIN_W, laptopScreen, SCR_W, phoneScreen, PH_W, paper, printer, windowMesh: win };
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
