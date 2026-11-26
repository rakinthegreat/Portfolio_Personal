// Proyash's mascot as a plushie: the green cat from the logo (v2/reference/proyash/pussy.svg), sitting up with its paws on
// a tablet that shows the Proyash wordmark. Its sewn-in tag says what I do there (from content.json).
// Built in the drawing's own units (1 unit = 1 px of the 1932 px tall artwork, y up from the feet) and
// scaled down to the desk at the end, so the proportions can be read straight off the drawing.
import * as THREE from 'three';

const GREEN = 0x119b35;
const LIGHT = 0x89c056;
const DARK = 0x1d6b35;
const OLIVE = 0x659638;
export const PROYASH_HEIGHT = 0.23; // metres, ear tips to feet

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const tex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const oval = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fill();
};

// Textures wrap a SphereGeometry: 1024 × 512, the front (+z) at x = 256, the top at y = 0. A point (x, y) on
// the drawing's face, as a fraction of the head's half-width / half-height, lands at
// φ = atan2(x, z) (256 + φ / 360° × 1024) and θ = acos(y) (θ / 180° × 512).

/** The face: pale mask (two lobes round the eyes, the forehead's green coming down to a point between them),
 *  closed smiling eyes, nose on its olive bridge, the w mouth with a tongue, blush, forehead spots, crown stripes. */
function faceTexture() {
  return tex(1024, 512, (g) => {
    const cx = 256;
    g.fillStyle = hex(GREEN);
    g.fillRect(0, 0, 1024, 512);
    // the pale lower face, right round to the cheeks, and everything below the chin
    g.fillStyle = hex(LIGHT);
    oval(g, cx, 405, 228, 100);
    g.fillRect(cx - 228, 405, 456, 107);
    for (const s of [-1, 1]) oval(g, cx + s * 74, 292, 66, 70);
    // spots: forehead, temples, the outer cheeks; three stripes over the crown
    g.fillStyle = hex(DARK);
    for (const [x, y, rx, ry, r] of [
      [256, 126, 11, 20, 0], [200, 132, 10, 19, -0.3], [312, 132, 10, 19, 0.3], [242, 172, 8, 13, -0.2], [272, 172, 8, 13, 0.2],
      [204, 178, 9, 14, -0.4], [308, 178, 9, 14, 0.4], [158, 160, 10, 15, -0.6], [354, 160, 10, 15, 0.6],
      [140, 202, 19, 14, 0.3], [372, 202, 19, 14, -0.3],
      [58, 262, 12, 9, 0.4], [64, 288, 10, 7, 0.2], [454, 262, 12, 9, -0.4], [448, 288, 10, 7, -0.2],
    ] as const) oval(g, x, y, rx, ry, r);
    g.lineCap = 'round';
    g.strokeStyle = hex(DARK);
    g.lineWidth = 15;
    for (const [x0, y0, x1, y1] of [[248, 40, 244, 98], [196, 58, 172, 108], [306, 58, 330, 108]] as const) {
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    // closed, smiling eyes: thick arches (∩), thinning at the ends
    for (const s of [-1, 1]) {
      const ex = cx + s * 74;
      g.beginPath();
      g.ellipse(ex, 306, 40, 24, 0, Math.PI * 1.08, Math.PI * 1.92);
      g.ellipse(ex, 312, 30, 14, 0, Math.PI * 1.9, Math.PI * 1.1, true);
      g.closePath();
      g.fill();
    }
    // blush, just below and outside the eyes
    g.fillStyle = hex(OLIVE);
    for (const s of [-1, 1]) oval(g, cx + s * 136, 348, 34, 24);
    // nose bridge, nose, tongue, mouth
    oval(g, cx, 322, 22, 15);
    g.fillStyle = hex(DARK);
    g.beginPath();
    g.moveTo(cx - 20, 326);
    g.bezierCurveTo(cx - 20, 318, cx - 8, 318, cx, 323);
    g.bezierCurveTo(cx + 8, 318, cx + 20, 318, cx + 20, 326);
    g.quadraticCurveTo(cx + 12, 340, cx, 345);
    g.quadraticCurveTo(cx - 12, 340, cx - 20, 326);
    g.fill();
    g.fillStyle = hex(OLIVE);
    oval(g, cx, 368, 9, 12);
    g.strokeStyle = hex(DARK);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(cx, 344);
    g.bezierCurveTo(cx, 358, cx - 10, 362, cx - 20, 358);
    g.quadraticCurveTo(cx - 28, 354, cx - 30, 346);
    g.moveTo(cx, 344);
    g.bezierCurveTo(cx, 358, cx + 10, 362, cx + 20, 358);
    g.quadraticCurveTo(cx + 28, 354, cx + 30, 346);
    g.stroke();
  });
}

/** The body: a pale belly down the front, dark stripes sweeping round the sides, spots on the back. */
const bodyTexture = () =>
  tex(1024, 512, (g) => {
    g.fillStyle = hex(GREEN);
    g.fillRect(0, 0, 1024, 512);
    g.fillStyle = hex(LIGHT);
    oval(g, 256, 330, 110, 230);
    g.fillStyle = hex(DARK);
    for (const s of [-1, 1])
      for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(256 + s * (170 + i * 34), 170 + i * 62);
        g.rotate(s * 0.5);
        oval(g, 0, 0, 52, 13);
        g.restore();
      }
    for (const [x, y] of [[700, 200], [740, 260], [680, 300], [770, 330], [720, 380]]) oval(g, x, y, 14, 18);
  });

/** Haunches: green, with a few dark spots on the outside (u = 0.5 faces +x; the left one is turned round). */
const haunchTexture = () =>
  tex(512, 256, (g) => {
    g.fillStyle = hex(GREEN);
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = hex(DARK);
    for (const [x, y, r] of [[0, 110, 11], [30, 140, 9], [-20, 150, 8], [10, 170, 7], [-30, 120, 7]]) oval(g, 256 + x, y, r, r * 1.3);
  });

/** Paws: pale, with two toe lines on the front. */
const pawTexture = () =>
  tex(512, 256, (g) => {
    g.fillStyle = hex(LIGHT);
    g.fillRect(0, 0, 512, 256);
    g.strokeStyle = hex(DARK);
    g.lineWidth = 7;
    g.lineCap = 'round';
    for (const x of [116, 140]) {
      g.beginPath();
      g.moveTo(x, 90);
      g.quadraticCurveTo(x - 4, 115, x, 140);
      g.stroke();
    }
  });

/** Stripes along the tail (the tube's u runs base → tip): dark bands, then the green tip. */
const tailTexture = () =>
  tex(1024, 16, (g) => {
    g.fillStyle = hex(GREEN);
    g.fillRect(0, 0, 1024, 16);
    g.fillStyle = hex(DARK);
    for (let i = 0; i < 6; i++) g.fillRect(70 + i * 128, 0, 62, 16);
    g.fillRect(840, 0, 110, 16);
  });

/** The sewn-in fabric tag: what I do there, and since when. */
const tagTexture = (lines: string[]) =>
  tex(320, 420, (g) => {
    g.fillStyle = '#fbf3df';
    g.fillRect(0, 0, 320, 420);
    g.strokeStyle = hex(GREEN);
    g.setLineDash([10, 8]);
    g.lineWidth = 5;
    g.strokeRect(14, 14, 292, 392); // stitching
    g.setLineDash([]);
    g.textAlign = 'center';
    const [a, b, c, d] = lines;
    g.fillStyle = hex(DARK);
    g.font = '700 50px "Space Grotesk", sans-serif';
    g.fillText(a, 160, 120);
    g.font = '700 64px "Space Grotesk", sans-serif';
    g.fillStyle = hex(GREEN);
    g.fillText(b, 160, 200);
    g.fillStyle = hex(DARK);
    g.font = '700 34px "Space Mono", monospace';
    g.fillText(c, 160, 280);
    g.font = '400 30px "Space Mono", monospace';
    g.fillText(d, 160, 350);
  });

/** One ear's outline, base on y = 0, leaning out towards +x with a rounded point: the drawing's long fennec ear. */
function earShape(w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.bezierCurveTo(-w * 0.62, h * 0.45, -w * 0.25, h * 0.92, w * 0.18, h * 0.995); // inner edge, up to the tip
  s.quadraticCurveTo(w * 0.42, h * 1.02, w * 0.5, h * 0.88); // the rounded point
  s.bezierCurveTo(w * 0.66, h * 0.62, w * 0.66, h * 0.25, w / 2, 0); // outer edge, back down
  s.lineTo(-w / 2, 0);
  return s;
}
/** The same outline above y = cut: the dark tip. */
const tipShape = (w: number, h: number, cut: number) => new THREE.Shape(earShape(w, h).getPoints(48).filter((p) => p.y >= cut));
const puffy = (shape: THREE.Shape, puff: number) =>
  new THREE.ExtrudeGeometry(shape, { depth: puff * 0.3, bevelEnabled: true, bevelThickness: puff, bevelSize: puff * 0.7, bevelSegments: 5, curveSegments: 24 });

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
};

export function buildProyashFigure(exp: { title: string; role: string; period: string; url?: string }) {
  const fig = new THREE.Group(); // on the desk, in metres
  const toy = new THREE.Group(); // in drawing units
  toy.scale.setScalar(PROYASH_HEIGHT / 1932);
  fig.add(toy);

  // plush: matte fabric with a faint sheen at the edges, like minky
  const fabric = (color: number, map?: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      color: map ? 0xffffff : color,
      map,
      roughness: 1,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color(map ? LIGHT : color).multiplyScalar(0.6),
    });
  const green = fabric(GREEN);
  const light = fabric(LIGHT);
  const dark = fabric(DARK);
  const olive = fabric(OLIVE);
  const paw = fabric(0, pawTexture());
  const ball = new THREE.SphereGeometry(1, 40, 28);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s: [number, number, number] = [1, 1, 1], r: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = toy) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...p);
    o.scale.set(...s);
    o.rotation.set(...r);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // head: wider than tall (1100 × 930 on the drawing), over the body
  const HEAD_Y = 1290;
  add(ball, fabric(0, faceTexture()), [0, HEAD_Y, 30], [550, 465, 440], [0.06, 0, 0]);

  // ears: long, set low on the sides of the head and leaning out ~28°; pale rim, olive inside, dark tip
  const EW = 330;
  const EH = 640;
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * 330, HEAD_Y + 150, -20);
    ear.rotation.set(-0.12, sx * -0.28, sx * -0.5);
    ear.scale.x = sx; // the left ear is the right one mirrored
    add(puffy(earShape(EW, EH), 34), green, [0, 0, -40], [1, 1, 1], [0, 0, 0], ear);
    add(puffy(earShape(EW * 0.8, EH * 0.84), 16), light, [0, 30, 6], [1, 1, 1], [0, 0, 0], ear);
    add(puffy(earShape(EW * 0.58, EH * 0.66), 12), olive, [-10, 60, 30], [1, 1, 1], [0, 0, 0], ear);
    add(puffy(tipShape(EW, EH, EH * 0.76), 36), dark, [0, 0, -38], [1.04, 1, 1], [0, 0, 0], ear);
    toy.add(ear);
  }

  // body: a sitting bean with a pale belly down the front
  add(ball, fabric(0, bodyTexture()), [0, 430, -20], [400, 430, 350]);
  // big round haunches, with the pale feet poking out in front (the tablet stands on them)
  const haunch = fabric(0, haunchTexture());
  for (const sx of [-1, 1]) {
    add(ball, haunch, [sx * 290, 230, 10], [230, 230, 270], [0, sx > 0 ? 0 : Math.PI, 0]);
    add(ball, paw, [sx * 230, 75, 330], [150, 75, 150], [0, sx * 0.25, 0]);
  }
  // arms: one piece each from the shoulder down to the paw, which rests on the top edge of the tablet
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Vector3(sx * 300, 800, 80);
    const hand = new THREE.Vector3(sx * 112, 868, 372);
    const along = hand.clone().sub(shoulder);
    const limb = add(new THREE.CapsuleGeometry(88, along.length(), 8, 20), green, [0, 0, 0]);
    limb.position.copy(shoulder).add(hand).multiplyScalar(0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
    add(ball, paw, [hand.x, hand.y, hand.z], [104, 88, 96], [0.3, 0, 0]);
  }

  // tail: thick, out to the side and up in a hook beside the body, the tip curling over
  const tailCurve = new THREE.CatmullRomCurve3(
    [[-260, 140, -200], [-560, 170, -250], [-800, 360, -260], [-860, 700, -240], [-900, 980, -220], [-1040, 1120, -200], [-1180, 1080, -180]].map(
      ([x, y, z]) => new THREE.Vector3(x, y, z),
    ),
  );
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 96, 150, 20, false), fabric(0, tailTexture()));
  tail.castShadow = tail.receiveShadow = true;
  toy.add(tail);
  add(ball, green, [-1180, 1080, -180], [175, 160, 165]); // the round tip

  // the sewn-in tag on its hip: "Co-founder / Proyash / SINCE 2026 / proyash.study"
  const since = exp.period.match(/\d{4}/)?.[0];
  const domain = (exp.url ?? '').replace(/^https?:\/\//, '');
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(270, 355),
    new THREE.MeshStandardMaterial({ map: tagTexture([exp.title, exp.role, since ? `SINCE ${since}` : exp.period, domain]), roughness: 0.9, side: THREE.DoubleSide }),
  );
  tag.position.set(505, 200, 120);
  tag.rotation.set(0, 1.15, -0.2);
  toy.add(tag);

  // the tablet it holds up (a real, hard one), landscape like the logo's: pale green frame, a dark button on the
  // right, and the wordmark on a cream screen, unlit so the room's light doesn't wash it out
  const tab = new THREE.Group();
  const TW = 1120;
  const TH = 660;
  // standing on its feet (bottom edge at y = 150), leaning back a little against its chest
  const LEAN = 0.12;
  tab.position.set(0, 150 + (TH / 2) * Math.cos(LEAN), 380);
  tab.rotation.x = -LEAN;
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(TW, TH, 70), { depth: 40, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: LIGHT, roughness: 0.4 }),
  );
  frame.position.z = -48;
  frame.castShadow = true;
  tab.add(frame);
  const shot = new THREE.TextureLoader().load('/proyash/tablet.png');
  shot.colorSpace = THREE.SRGBColorSpace;
  shot.anisotropy = 8;
  const SW = TW - 190;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, (SW * 900) / 1600), new THREE.MeshBasicMaterial({ map: shot, color: 0xf2efe6 }));
  screen.position.set(-30, 0, 1.5);
  tab.add(screen);
  const btn = new THREE.Mesh(new THREE.CircleGeometry(34, 24), new THREE.MeshStandardMaterial({ color: DARK, roughness: 0.4 }));
  btn.position.set(TW / 2 - 62, 0, 1.5);
  tab.add(btn);
  toy.add(tab);
  // screen and tag: the desk keeps these out of its painterly filter, so they stay sharp
  return { fig, tablet: tab, sharp: [screen, tag] };
}
