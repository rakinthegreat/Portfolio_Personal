// Every image in the scene is drawn here at load time: no image downloads.
import * as THREE from 'three';

const INK = '#0f2a1f';
const MONO = '"Space Mono", ui-monospace, monospace';
const SANS = '"Inter Tight", system-ui, sans-serif';

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, pixel = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  if (pixel) g.imageSmoothingEnabled = false;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (pixel) t.magFilter = t.minFilter = THREE.NearestFilter;
  return t;
}

const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** Victus 16: a code editor with a terminal. */
export const victusScreen = () =>
  canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#1d1f21';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#26292c';
    g.fillRect(0, 0, 180, h);
    g.fillRect(0, 0, w, 34);
    g.font = `20px ${MONO}`;
    g.fillStyle = '#9aa29d';
    ['src', '  three', '    cat.ts', '    props.ts', '  render.ts', 'PLAN.md'].forEach((l, i) => g.fillText(l, 16, 72 + i * 30));
    g.fillStyle = '#e9e1d4';
    g.fillText('cat.ts', 200, 24);
    const lines: [string, string][] = [
      ['#c792ea', 'export class Cat {'],
      ['#82aaff', '  state = "sleep";'],
      ['#9aa29d', '  // all white, black ears-patch,'],
      ['#9aa29d', '  // broom tail. do not wake.'],
      ['#c3e88d', '  poke() { this.roll(); }'],
      ['#e9e1d4', '}'],
    ];
    lines.forEach(([c, l], i) => {
      g.fillStyle = '#5c6370';
      g.fillText(String(i + 1).padStart(2, ' '), 200, 80 + i * 32);
      g.fillStyle = c;
      g.fillText(l, 250, 80 + i * 32);
    });
    g.fillStyle = '#141516';
    g.fillRect(180, 400, w - 180, h - 400);
    g.fillStyle = '#6bd48a';
    g.fillText('rakin@victus:~/portfolio$ npm run dev', 200, 440);
    g.fillStyle = '#9aa29d';
    g.fillText('  VITE ready in 212 ms', 200, 474);
    g.fillText('  ➜ Local: http://localhost:5173/', 200, 506);
    g.fillStyle = '#e9e1d4';
    g.fillRect(200, 528, 12, 22);
  });

/** Phone: WaitLess, the anti-doomscroll app. */
export const phoneScreen = () =>
  canvasTex(360, 760, (g, w, h) => {
    g.fillStyle = '#f3eee6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = INK;
    g.font = `600 22px ${SANS}`;
    g.fillText('9:41', 28, 44);
    g.font = `800 52px ${SANS}`;
    g.fillText('WaitLess', 28, 150);
    g.font = `22px ${SANS}`;
    g.fillStyle = '#4a5a52';
    g.fillText('You picked up your phone', 28, 196);
    g.fillText('11 times this hour.', 28, 226);
    for (let i = 4; i > 0; i--) {
      g.beginPath();
      g.arc(w / 2, 430, 40 + i * 26, 0, Math.PI * 2);
      g.fillStyle = `rgba(63,107,85,${0.08 + (4 - i) * 0.05})`;
      g.fill();
    }
    g.fillStyle = '#f3eee6';
    g.font = `700 26px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('breathe', w / 2, 440);
    g.fillStyle = INK;
    g.beginPath();
    g.roundRect(28, 620, w - 56, 72, 36);
    g.fill();
    g.fillStyle = '#f3eee6';
    g.font = `600 24px ${SANS}`;
    g.fillText('Do one small thing', w / 2, 665);
  });

/** Handheld console: a 16-bit boxing match. */
export const consoleScreen = () =>
  canvasTex(160, 128, (g, w, h) => {
    const P = 4; // pixel size
    g.fillStyle = '#c4cfa1';
    g.fillRect(0, 0, w, h);
    const px = (x: number, y: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(x * P, y * P, P, P);
    };
    const dark = '#2f3b2a', mid = '#5f7350', glove = '#b5483d';
    // ring ropes
    for (let x = 0; x < 40; x++) [18, 22].forEach((y) => px(x, y, mid));
    // two boxers: head, body, gloves
    const boxer = (ox: number, flip: number) => {
      for (let y = 6; y < 10; y++) for (let x = 0; x < 4; x++) px(ox + x, y, dark);
      for (let y = 10; y < 18; y++) for (let x = 0; x < 4; x++) px(ox + x, y, mid);
      for (let y = 18; y < 26; y++) [0, 3].forEach((x) => px(ox + x, y, dark));
      for (let y = 11; y < 14; y++) for (let x = 0; x < 3; x++) px(ox + (flip > 0 ? 4 : -3) + x, y, glove);
    };
    boxer(12, 1);
    boxer(24, -1);
    g.fillStyle = dark;
    g.font = 'bold 12px monospace';
    g.fillText('KO!', 66, 16);
    g.fillText('PUNCH IT OUT', 4, 124);
  }, true);

/** Pinboard printouts. */
export const sarsightSheet = () =>
  canvasTex(300, 400, (g, w, h) => {
    g.fillStyle = '#fbf8f2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = INK;
    g.font = `800 34px ${SANS}`;
    g.fillText('SARsight', 20, 50);
    g.font = `13px ${MONO}`;
    g.fillStyle = '#6a746f';
    g.fillText('NISAR L-band · ground motion', 20, 74);
    // a radar map: terrain contours with a red sinking zone
    g.save();
    g.beginPath();
    g.rect(20, 92, w - 40, 220);
    g.clip();
    g.fillStyle = '#e8e2d4';
    g.fillRect(20, 92, w - 40, 220);
    const r = rand(7);
    g.strokeStyle = '#b9b09c';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      const cy = 110 + i * 24;
      g.moveTo(20, cy);
      for (let x = 20; x <= w - 20; x += 20) g.lineTo(x, cy + Math.sin(x * 0.03 + i) * 10 + (r() - 0.5) * 6);
      g.stroke();
    }
    const grad = g.createRadialGradient(170, 210, 4, 170, 210, 70);
    grad.addColorStop(0, 'rgba(214,72,60,0.85)');
    grad.addColorStop(1, 'rgba(214,72,60,0)');
    g.fillStyle = grad;
    g.fillRect(20, 92, w - 40, 220);
    g.restore();
    g.fillStyle = INK;
    g.font = `600 15px ${SANS}`;
    g.fillText('Sinking: 26 cm / year', 20, 340);
    g.font = `13px ${SANS}`;
    g.fillStyle = '#6a746f';
    g.fillText('Plain answers from radar data.', 20, 362);
  });

export const chartSheet = () =>
  canvasTex(300, 400, (g, w, h) => {
    g.fillStyle = '#fbf8f2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = INK;
    g.font = `700 22px ${SANS}`;
    g.fillText('Coherence loss', 20, 44);
    g.strokeStyle = '#ddd4c6';
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(20, 90 + i * 45);
      g.lineTo(w - 20, 90 + i * 45);
      g.stroke();
    }
    const r = rand(3);
    g.strokeStyle = '#3f6b55';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 20, y = 300; x <= w - 20; x += 13) g.lineTo(x, (y = Math.max(100, y - r() * 18 + 4)));
    g.stroke();
    g.fillStyle = '#c47a3a';
    for (let i = 0; i < 6; i++) g.fillRect(30 + i * 42, 360 - (i % 3) * 8 - 20, 26, 20 + (i % 3) * 8);
  });

export const stickyNote = (text: string[], color = '#f6dd7a') =>
  canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3b3326';
    g.font = `italic 600 28px Georgia, serif`;
    text.forEach((l, i) => g.fillText(l, 20, 62 + i * 40));
  });

export const catPolaroid = () =>
  canvasTex(260, 300, (g, w, h) => {
    g.fillStyle = '#fdfcf8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9c7aa';
    g.fillRect(16, 16, w - 32, 220);
    // him: slim white cat curled up, tall ears, tabby patch over one ear, tail fading white → dark
    const tail = g.createLinearGradient(110, 180, 30, 150);
    tail.addColorStop(0, '#f6f1e8');
    tail.addColorStop(1, '#35302d');
    g.fillStyle = tail;
    g.beginPath();
    g.ellipse(70, 175, 54, 18, -0.35, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f6f1e8';
    g.beginPath();
    g.ellipse(140, 172, 70, 40, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9a948d';
    g.beginPath();
    g.ellipse(96, 150, 18, 7, -0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f6f1e8';
    g.beginPath();
    g.arc(192, 138, 32, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(168, 120); g.lineTo(170, 74); g.lineTo(188, 110);
    g.fill();
    g.fillStyle = '#4b4541';
    g.beginPath();
    g.moveTo(198, 108); g.lineTo(216, 72); g.lineTo(220, 118);
    g.fill();
    g.beginPath();
    g.ellipse(200, 112, 16, 8, 0.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ec9fa6';
    g.beginPath(); g.moveTo(172, 112); g.lineTo(172, 84); g.lineTo(184, 108); g.fill();
    g.beginPath(); g.arc(192, 150, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#26221f';
    g.lineWidth = 2;
    [[180, 138], [204, 138]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0.2, Math.PI - 0.2); g.stroke(); });
    g.fillStyle = '#3b3326';
    g.font = `italic 22px Georgia, serif`;
    g.fillText('the boss', 80, 276);
  });

/** Polashi box art. */
export const polashiLid = () =>
  canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f1e7d2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3f6b55';
    g.lineWidth = 10;
    g.strokeRect(22, 22, w - 44, h - 44);
    g.lineWidth = 2;
    g.strokeRect(40, 40, w - 80, h - 80);
    // mango grove silhouettes
    g.fillStyle = '#3f6b55';
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 70;
      g.fillRect(x - 4, 330, 8, 50);
      g.beginPath();
      g.arc(x, 320, 34, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#7a2e22';
    g.textAlign = 'center';
    g.font = `800 82px Georgia, serif`;
    g.fillText('POLASHI', w / 2, 170);
    g.font = `600 40px Georgia, serif`;
    g.fillStyle = INK;
    g.fillText('· 1757 ·', w / 2, 230);
    g.font = `20px ${MONO}`;
    g.fillText('a game of quiet betrayals', w / 2, 450);
  });

/** Notebook pages: lined paper with notes. */
export const notebookPage = (lines: string[], doodle = false) =>
  canvasTex(420, 300, (g, w, h) => {
    g.fillStyle = '#fbf8f2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c9d6e0';
    for (let y = 40; y < h; y += 28) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = '#2d3b6b';
    g.font = `italic 21px Georgia, serif`;
    lines.forEach((l, i) => g.fillText(l, 22, 34 + i * 28));
    if (doodle) {
      g.strokeStyle = '#2d3b6b';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(330, 230, 40, 26, 0, 0, Math.PI * 2);
      g.moveTo(352, 214); g.arc(362, 210, 18, Math.PI, Math.PI * 3);
      g.stroke();
    }
  });

/** Arched window: soft sky with clay clouds, cream mullions, transparent outside the arch. */
export const archWindow = () =>
  canvasTex(512, 768, (g, w, h) => {
    const r = w / 2;
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, r);
    g.arc(r, r, r, Math.PI, 0);
    g.lineTo(w, h);
    g.closePath();
    g.save();
    g.clip();
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#a9c4dc');
    sky.addColorStop(1, '#e8eef0');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const cloud = (x: number, y: number, s: number) => {
      g.fillStyle = 'rgba(255,255,255,0.92)';
      [[0, 0, 1], [0.9, -0.3, 0.8], [1.7, 0.1, 0.7], [-0.8, 0.2, 0.7]].forEach(([dx, dy, k]) => {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, s * k, 0, Math.PI * 2);
        g.fill();
      });
    };
    cloud(140, 330, 46);
    cloud(360, 520, 38);
    cloud(260, 690, 52);
    g.restore();
    // frame and mullions
    g.strokeStyle = '#efe7da';
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(13, h);
    g.lineTo(13, r);
    g.arc(r, r, r - 13, Math.PI, 0);
    g.lineTo(w - 13, h);
    g.stroke();
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(r, 10);
    g.lineTo(r, h);
    for (const y of [r + 60, r + 260, r + 460]) {
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke();
  });

/** A keycap legend. */
export const keycapLegend = (ch: string) =>
  canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f4eee4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = INK;
    g.font = `800 76px ${SANS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, w / 2, h / 2 + 4);
  });
