// Pinboard cards (About, Academics, Tech Stack, Experiences) and the printed résumé page, drawn in the
// original portfolio's black-and-white style. High resolution so they stay sharp up close.
import * as THREE from 'three';
import content from '../content.json';

const SANS = '"Space Grotesk", system-ui, sans-serif';
const MONO = '"Space Mono", ui-monospace, monospace';
/** Painted lettering for the pinboard: a brush script for headings, a clean hand for body text. */
const BRUSH = '"Caveat Brush", "Patrick Hand", cursive';
const HAND = '"Patrick Hand", "Caveat Brush", cursive';
const RES = 1.5; // drawn at 1.5x so the lettering stays crisp up close

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}
function toTex(c: HTMLCanvasElement, aniso: number) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Word-wraps `text` into `maxW`, returns the y after the last line. */
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lh;
      line = word;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

/** Card frame with the original section header: mono label, ghost number, bold heading. */
function card(n: string, label: string, heading: string[], body: (g: CanvasRenderingContext2D, y: number, w: number) => void) {
  const W = 1200;
  const H = 1700;
  const [c, g] = canvas(W * RES, H * RES);
  g.scale(RES, RES);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#000';
  g.lineWidth = 6;
  g.strokeRect(3, 3, W - 6, H - 6);
  g.fillStyle = '#5a5a5a';
  g.font = `400 34px ${HAND}`;
  g.fillText(`${n}  ·  ${label}`, 80, 120);
  g.fillStyle = '#ececec';
  g.font = `400 320px ${BRUSH}`;
  g.fillText(n, 64, 400);
  g.fillStyle = '#000';
  g.font = `400 118px ${BRUSH}`;
  heading.forEach((h, i) => g.fillText(h, 80, 300 + i * 104));
  body(g, 300 + heading.length * 104 + 40, W);
  return c;
}

export function buildCards(aniso: number) {
  const about = card('01', 'ABOUT', ['Building things', 'that matter.'], (g, y, w) => {
    g.fillStyle = '#2b2b2b';
    g.font = `400 49px ${HAND}`;
    y = wrap(g, content.person.about, 80, y + 20, w - 160, 66);
    g.fillStyle = '#000';
    g.font = `400 32px ${HAND}`;
    content.person.heroMeta.forEach((m, i) => g.fillText(m, 80, y + 60 + i * 46));
  });

  const academics = card('02', 'ACADEMICS', ['Educational', 'Background'], (g, y, w) => {
    for (const a of content.academics) {
      g.fillStyle = '#eee';
      g.fillRect(80, y, w - 160, 3);
      y += 56;
      g.fillStyle = '#5a5a5a';
      g.font = `400 29px ${HAND}`;
      g.fillText(`${a.period}  ·  Batch ${a.batch}`, 80, y);
      g.fillStyle = '#000';
      g.font = `700 44px ${HAND}`;
      y = wrap(g, a.degree, 80, y + 52, w - 160, 48);
      g.fillStyle = '#444';
      g.font = `400 33px ${HAND}`;
      y = wrap(g, a.inst, 80, y, w - 160, 40) + 10;
    }
    g.fillStyle = '#000';
    g.fillRect(80, y + 10, w - 160, 4);
    g.font = `400 29px ${HAND}`;
    g.fillText('TEST SCORES', 80, y + 70);
    g.font = `700 44px ${HAND}`;
    g.fillText('SAT 1530  ·  IELTS 8.0  ·  GPA 5.0 / 5.0', 80, y + 130);
  });

  const stack = card('03', 'EXPERTISE', ['Tech Stack'], (g, y, w) => {
    const col = (w - 200) / 2;
    content.skills.forEach(([name, cat], i) => {
      const x = 80 + (i % 2) * (col + 40);
      const yy = y + Math.floor(i / 2) * 92;
      g.fillStyle = '#eee';
      g.fillRect(x, yy - 52, col, 2);
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(x + 8, yy - 12, 6, 0, Math.PI * 2);
      g.fill();
      g.font = `700 38px ${HAND}`;
      g.fillText(name.length > 22 ? name.slice(0, 21) + '…' : name, x + 30, yy);
      g.fillStyle = '#5a5a5a';
      g.font = `400 22px ${HAND}`;
      g.fillText(cat.length > 40 ? cat.slice(0, 39) + '…' : cat, x + 30, yy + 28);
    });
  });

  const experiences = card('05', 'EXPERIENCES', ['Experiences'], (g, y, w) => {
    for (const e of content.experiences) {
      g.fillStyle = '#eee';
      g.fillRect(80, y, w - 160, 3);
      g.fillStyle = '#000';
      g.font = `700 49px ${HAND}`;
      y = wrap(g, e.title, 80, y + 70, w - 160, 52);
      g.fillStyle = '#444';
      g.font = `400 35px ${HAND}`;
      y = wrap(g, e.role, 80, y, w - 160, 42);
      g.fillStyle = '#5a5a5a';
      g.font = `400 29px ${HAND}`;
      g.fillText(e.period, 80, y + 4);
      y += 50;
    }
  });

  return {
    about: toTex(about, aniso),
    academics: toTex(academics, aniso),
    stack: toTex(stack, aniso),
    experiences: toTex(experiences, aniso),
  };
}

/** The résumé, A4 at 150 dpi, laid out like the original generated PDF. */
export function resumeTexture(aniso: number) {
  const W = 1240;
  const H = 1754;
  const [c, g] = canvas(W, H);
  const p = content.person;
  const r = p.resume;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#111';
  g.font = `700 62px ${SANS}`;
  g.fillText(`${p.fullName}.`, 100, 150);
  g.font = `700 30px ${SANS}`;
  g.fillText(r.title, 100, 200);
  g.font = `400 22px ${SANS}`;
  let y = wrap(g, r.summary, 100, 250, W - 200, 32);
  const top = y + 30;
  g.fillStyle = '#2a2a2a';
  g.fillRect(0, top, W, H - top);
  const cols = [100, 420, 780];
  const head = (t: string, x: number, yy: number) => {
    g.fillStyle = '#fff';
    g.font = `700 26px ${SANS}`;
    g.fillText(t, x, yy);
  };
  // expertise
  head('Expertise', cols[0], top + 60);
  g.font = `400 19px ${SANS}`;
  content.skills.forEach(([n], i) => {
    const yy = top + 100 + i * 46;
    g.fillStyle = '#fff';
    g.fillText(n.length > 24 ? n.slice(0, 23) + '…' : n, cols[0], yy);
    g.fillStyle = '#666';
    g.fillRect(cols[0], yy + 12, 280, 1);
  });
  // education + experiences
  head('Education', cols[1], top + 60);
  y = top + 100;
  for (const a of content.academics) {
    g.fillStyle = '#fff';
    g.font = `700 19px ${SANS}`;
    y = wrap(g, a.degree, cols[1], y, 320, 26);
    g.fillStyle = '#ccc';
    g.font = `400 17px ${SANS}`;
    y = wrap(g, `${a.inst} · ${a.period}`, cols[1], y, 320, 24) + 14;
  }
  head('Experiences', cols[1], y + 30);
  y += 70;
  for (const e of content.experiences) {
    g.fillStyle = '#fff';
    g.font = `700 19px ${SANS}`;
    y = wrap(g, e.title, cols[1], y, 320, 26);
    g.fillStyle = '#ccc';
    g.font = `400 17px ${SANS}`;
    y = wrap(g, `${e.role} · ${e.period}`, cols[1], y, 320, 24) + 14;
  }
  // projects + contact
  head('Projects', cols[2], top + 60);
  y = top + 100;
  for (const x of content.projects.slice(0, 8)) {
    g.fillStyle = '#fff';
    g.font = `700 20px ${SANS}`;
    g.fillText(x.name, cols[2], y);
    g.fillStyle = '#ccc';
    g.font = `400 17px ${SANS}`;
    y = wrap(g, x.description, cols[2], y + 26, 360, 24) + 16;
  }
  head('Contact', cols[2], y + 24);
  g.fillStyle = '#ccc';
  g.font = `400 18px ${SANS}`;
  [r.phone, r.email, r.website, r.github, r.linkedin].forEach((l, i) => g.fillText(l, cols[2], y + 64 + i * 28));
  return toTex(c, aniso);
}
