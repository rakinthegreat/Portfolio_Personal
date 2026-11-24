// The pinboard cards are real HTML (shown through holes in the 3D board, like the laptop and phone
// screens), so the browser draws the lettering at full screen resolution: sharp at any distance.
import content from '../content.json';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Card size in CSS px; the 3D card is 0.2 × 0.283 m (same aspect). */
export const CARD_PX = 600;

function card(n: string, label: string, heading: string, body: string) {
  const el = document.createElement('article');
  el.className = 'pin-card';
  el.style.width = `${CARD_PX}px`;
  el.style.height = `${Math.round(CARD_PX * 1.415)}px`;
  el.innerHTML = `
    <p class="pin-label">${n} · ${esc(label)}</p>
    <div class="pin-head"><span class="pin-ghost" aria-hidden="true">${n}</span><h3>${heading}</h3></div>
    ${body}`;
  return el;
}

export function buildPinCards() {
  const p = content.person;
  const about = card('01', 'ABOUT', p.aboutHeading.map(esc).join('<br>'), `<p class="pin-big">${esc(p.about)}</p>`);
  const academics = card(
    '02',
    'ACADEMICS',
    'Educational<br>Background',
    `<ul class="pin-list">${content.academics
      .map((a) => `<li><b>${esc(a.degree)}</b><span>${esc(a.inst)} · ${esc(a.period)}</span></li>`)
      .join('')}</ul>
    <p class="pin-scores">SAT 1530 · IELTS 8.0 · GPA 5.0</p>`,
  );
  const stack = card(
    '03',
    'EXPERTISE',
    'Tech Stack',
    `<ul class="pin-grid">${content.skills.map(([n]) => `<li>${esc(n)}</li>`).join('')}</ul>`,
  );
  const experiences = card(
    '05',
    'EXPERIENCES',
    'Experiences',
    `<ul class="pin-list">${content.experiences
      .map((e) => `<li><b>${esc(e.title)}</b><span>${esc(e.role)} · ${esc(e.period)}</span></li>`)
      .join('')}</ul>`,
  );
  return { about, academics, stack, experiences };
}

/**
 * The cards as images, drawn from their own HTML layout. Each card shown as live HTML in the 3D view cost
 * the browser ~10 ms a frame to layer over the canvas (even plain and empty), so they're laid out once,
 * off screen, and every box, rule and word is painted onto a canvas at the same place, in the same fonts.
 * `scale` canvas pixels per CSS pixel: 2 keeps the lettering crisp right up close.
 */
export async function rasterizeCards(els: Record<string, HTMLElement>, scale: number) {
  // the fonts the cards use, before measuring anything (capped: the system fallback is better than waiting)
  await Promise.race([
    Promise.all(["22px 'Patrick Hand'", "70px 'Caveat Brush'"].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 4000)),
  ]).catch(() => {});
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-20000px;top:0;pointer-events:none;contain:layout style';
  host.setAttribute('aria-hidden', 'true');
  document.body.append(host);
  const out: Record<string, HTMLCanvasElement> = {};
  for (const [id, el] of Object.entries(els)) {
    host.append(el);
    out[id] = paintCard(el, scale);
    el.remove();
  }
  host.remove();
  return out;
}

function paintCard(el: HTMLElement, scale: number) {
  const box = el.getBoundingClientRect();
  const W = box.width;
  const H = box.height;
  const c = document.createElement('canvas');
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  const at = (r: DOMRect) => ({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
  const cs = getComputedStyle(el);

  // paper: the card's gradient (CSS angle 170deg: towards the bottom, a little left)
  const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map((m) => m[0]);
  const a = (170 * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(W * dx) + Math.abs(H * dy);
  const grad = g.createLinearGradient(W / 2 - (dx * len) / 2, H / 2 - (dy * len) / 2, W / 2 + (dx * len) / 2, H / 2 + (dy * len) / 2);
  (stops.length ? stops : [cs.backgroundColor]).forEach((s, i, all) => grad.addColorStop(all.length > 1 ? i / (all.length - 1) : 0, s));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw) {
    g.strokeStyle = cs.borderTopColor;
    g.lineWidth = bw;
    g.strokeRect(bw / 2, bw / 2, W - bw, H - bw);
  }

  // rules above list items and the scores line; the dots before the tech-stack items
  for (const e of el.querySelectorAll<HTMLElement>('*')) {
    const s = getComputedStyle(e);
    const tw = parseFloat(s.borderTopWidth) || 0;
    if (tw && s.borderTopStyle !== 'none') {
      const r = at(e.getBoundingClientRect());
      g.strokeStyle = s.borderTopColor;
      g.lineWidth = tw;
      g.setLineDash(s.borderTopStyle === 'dashed' ? [tw * 3, tw * 3] : []);
      g.beginPath();
      g.moveTo(r.x, r.y + tw / 2);
      g.lineTo(r.x + r.w, r.y + tw / 2);
      g.stroke();
      g.setLineDash([]);
    }
    const b = getComputedStyle(e, '::before');
    if (b.content !== 'none' && b.content !== 'normal' && b.position === 'absolute') {
      const r = at(e.getBoundingClientRect());
      const bwid = parseFloat(b.width);
      g.fillStyle = b.backgroundColor;
      g.beginPath();
      g.arc(r.x + parseFloat(b.left) + bwid / 2, r.y + parseFloat(b.top) + bwid / 2, bwid / 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // the words, each where the browser put it (so the wrapping is the browser's)
  g.textBaseline = 'alphabetic';
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    const text = n.data;
    if (!text.trim()) continue;
    const s = getComputedStyle(n.parentElement!);
    g.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    g.fillStyle = s.color;
    g.letterSpacing = s.letterSpacing === 'normal' ? '0px' : s.letterSpacing;
    const ascent = g.measureText('Hg').fontBoundingBoxAscent;
    for (const m of text.matchAll(/\S+/g)) {
      range.setStart(n, m.index!);
      range.setEnd(n, m.index! + m[0].length);
      const r = range.getClientRects()[0];
      if (!r) continue;
      const p = at(r);
      g.fillText(m[0], p.x, p.y + ascent);
    }
  }
  return c;
}
