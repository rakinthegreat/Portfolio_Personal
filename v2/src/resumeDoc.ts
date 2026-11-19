// The résumé, exactly as the original site generated it (pdf package, A4, Inter): a white header and a
// dark three-column body. One layout, in PDF points, drawn three ways: the popup preview, a 300 dpi PNG,
// and a PDF (the same 300 dpi page with an invisible, searchable text layer on top). No dependencies.
import content from './content.json';

const W = 595.28; // A4 in points
const H = 841.89;
const ASC = 0.96875; // Inter's ascender / line box, as the pdf package lays text out
const LINE = 1.2109375;
const DARK = '#2a2a2a';
const INK = '#111111';
const WHITE = '#ffffff';
const GREY = '#cccccc';

interface Run { text: string; x: number; base: number; size: number; bold?: boolean; italic?: boolean; color: string; clip?: number }
interface Op { rect?: [number, number, number, number, string]; line?: [number, number, number, number, string, number]; run?: Run }

const font = (size: number, bold?: boolean, italic?: boolean, family = "'Inter'") => `${italic ? 'italic ' : ''}${bold ? 700 : 400} ${size}px ${family}`;
let meas: CanvasRenderingContext2D | null = null;
const width = (t: string, size: number, bold?: boolean, italic?: boolean, family?: string) => {
  meas ??= document.createElement('canvas').getContext('2d')!;
  meas.font = font(size, bold, italic, family);
  return meas.measureText(t).width;
};
/** Greedy word wrap, like the pdf package. */
const wrap = (t: string, size: number, w: number, bold?: boolean) => {
  const out: string[] = [];
  let line = '';
  for (const word of t.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(next, size, bold) > w) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
};

function layout(): Op[] {
  const p = content.person;
  const r = p.resume;
  const ops: Op[] = [];
  const text = (t: string, x: number, top: number, size: number, color: string, bold?: boolean, italic?: boolean, clip?: number) =>
    ops.push({ run: { text: t, x, base: top + ASC * size, size, bold, italic, color, clip } });
  /** Wrapped paragraph; returns its height. */
  const para = (t: string, x: number, top: number, size: number, w: number, color: string, opts: { bold?: boolean; spacing?: number; maxLines?: number; draw?: boolean } = {}) => {
    let lines = wrap(t, size, w, opts.bold);
    if (opts.maxLines) lines = lines.slice(0, opts.maxLines);
    const sp = opts.spacing ?? 0;
    if (opts.draw !== false) lines.forEach((l, i) => text(l, x, top + i * (size * LINE + sp), size, color, opts.bold));
    return lines.length * size * LINE + (lines.length - 1) * sp;
  };

  // ── top (white) ──
  const L = 48;
  const CW = W - 96;
  let y = 56;
  text(`${p.fullName}.`, L, y, 30, INK, true);
  y += 30 * LINE + 4;
  text(r.title, L, y, 14, INK, true);
  y += 14 * LINE + 16;
  y += para(r.summary, L, y, 10, CW, INK, { spacing: 1.5 });
  const topH = y + 32;

  // ── body (dark): Expertise 3 | Education + Experiences 4 | Projects + Contact 4 ──
  ops.push({ rect: [0, topH, W, H - topH, DARK] });
  const y0 = topH + 32;
  const y1 = H - 32;
  const flex = (CW - 48) / 11;
  const cols = [L, L + flex * 3 + 24, L + flex * 7 + 48];
  const cw = [flex * 3, flex * 4, flex * 4];
  const HEAD = 12 * LINE;

  // column 1: heading and skills spread over the full height (spaceBetween)
  {
    const x = cols[0];
    const w = cw[0];
    const items = content.skills.map(([n]) => ({ n, h: para(n, x, 0, 9, w, WHITE, { draw: false }) + 2 + 0.5 + 2 }));
    const gap = (y1 - y0 - HEAD - items.reduce((s, i) => s + i.h, 0)) / items.length;
    text('Expertise', x, y0, 12, WHITE, true);
    let yy = y0 + HEAD;
    for (const it of items) {
      yy += gap;
      const th = para(it.n, x, yy, 9, w, WHITE);
      ops.push({ line: [x, yy + th + 2 + 0.25, x + w, yy + th + 2 + 0.25, GREY, 0.5] });
      yy += it.h;
    }
  }
  // an entry: bold line, grey line, grey date
  const entry = (x: number, w: number, top: number, a: string, b: string, c: string, draw = true) => {
    let h = para(a, x, top, 9, w, WHITE, { bold: true, draw }) + 2;
    h += para(b, x, top + h, 8, w, GREY, { draw }) + 1;
    h += para(c, x, top + h, 8, w, GREY, { draw });
    return h + 12;
  };
  // column 2: Education at the top, Experiences pinned to the bottom
  {
    const x = cols[1];
    const w = cw[1];
    text('Education', x, y0, 12, WHITE, true);
    let yy = y0 + HEAD + 16;
    for (const a of content.academics) yy += entry(x, w, yy, a.degree, a.inst, a.period);
    const ex = content.experiences;
    const exH = HEAD + 16 + ex.reduce((s, e) => s + entry(x, w, 0, e.role, e.title, e.period, false), 0);
    yy = y1 - exH;
    text('Experiences', x, yy, 12, WHITE, true);
    yy += HEAD + 16;
    for (const e of ex) yy += entry(x, w, yy, e.role, e.title, e.period);
  }
  // column 3: Projects at the top, Contact pinned to the bottom
  {
    const x = cols[2];
    const w = cw[2];
    text('Projects', x, y0, 12, WHITE, true);
    let yy = y0 + HEAD + 16;
    // the original fitted ten projects; with more, the oldest get one-line descriptions until all fit
    const contactH = HEAD + 16 + 5 * 8 * LINE + 4 * 4;
    const room = y1 - contactH - 12 - yy;
    const lines = content.projects.map(() => 2);
    const blockH = () =>
      content.projects.reduce((s, pr, i) => s + 9 * LINE + 2 + para(pr.description, x, 0, 7, w, GREY, { spacing: 1.2, maxLines: lines[i], draw: false }) + 6, 0);
    for (let i = lines.length - 1; i >= 0 && blockH() > room; i--) lines[i] = 1;
    for (const [pi, pr] of content.projects.entries()) {
      // one line: name, then "  |  type" in small italics, clipped to the column
      text(pr.name, x, yy, 9, WHITE, true, false, x + w);
      const nw = width(pr.name, 9, true);
      ops.push({ run: { text: `  |  ${pr.type}`, x: x + nw, base: yy + ASC * 9, size: 7, italic: true, color: GREY, clip: x + w } });
      yy += 9 * LINE + 2;
      yy += para(pr.description, x, yy, 7, w, GREY, { spacing: 1.2, maxLines: lines[pi] }) + 6;
    }
    const contact = [r.website, r.email, r.phone, r.github, r.linkedin];
    let cy = y1 - (HEAD + 16 + contact.length * 8 * LINE + (contact.length - 1) * 4);
    text('Contact', x, cy, 12, WHITE, true);
    cy += HEAD + 16;
    for (const c of contact) {
      text(c, x, cy, 8, GREY);
      cy += 8 * LINE + 4;
    }
  }
  return ops;
}

let fontsReady: Promise<unknown> | null = null;
const loadFonts = () =>
  (fontsReady ??= Promise.all(['400 10px Inter', '700 10px Inter', 'italic 400 10px Inter'].map((f) => document.fonts.load(f))));

/** Draw the page at `k` pixels per point. */
function draw(k: number) {
  const ops = layout();
  const c = document.createElement('canvas');
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  const g = c.getContext('2d')!;
  g.scale(k, k);
  g.fillStyle = WHITE;
  g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  for (const o of ops) {
    if (o.rect) {
      const [x, y, w, h, col] = o.rect;
      g.fillStyle = col;
      g.fillRect(x, y, w, h);
    } else if (o.line) {
      const [x0, y0, x1, y1, col, lw] = o.line;
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    } else if (o.run) {
      const r = o.run;
      g.save();
      if (r.clip) {
        g.beginPath();
        g.rect(0, 0, r.clip, H);
        g.clip();
      }
      g.font = font(r.size, r.bold, r.italic);
      g.fillStyle = r.color;
      g.fillText(r.text, r.x, r.base);
      g.restore();
    }
  }
  return { canvas: c, runs: ops.filter((o) => o.run).map((o) => o.run!) };
}

// ── PDF: the 300 dpi page as a JPEG, with invisible Helvetica text over it (selectable, searchable) ──
const WIN: Record<string, number> = { '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '…': 0x85 };
const pdfStr = (s: string) => {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const b = WIN[ch] ?? (c < 256 ? c : 63);
    const x = String.fromCharCode(b);
    out += x === '(' || x === ')' || x === '\\' ? `\\${x}` : x;
  }
  return out;
};
function buildPdf(jpeg: Uint8Array, pxW: number, pxH: number, runs: Run[]) {
  const enc = (s: string) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
  let stream = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q\n`;
  for (const r of runs) {
    const hw = width(r.text, r.size, r.bold, false, 'Helvetica, Arial');
    const iw = width(r.text, r.size, r.bold, r.italic);
    const tz = hw > 0 ? Math.max(20, Math.min(300, (iw / hw) * 100)) : 100;
    stream += `BT /${r.bold ? 'F2' : 'F1'} ${r.size.toFixed(2)} Tf 3 Tr ${tz.toFixed(1)} Tz 1 0 0 1 ${r.x.toFixed(2)} ${(H - r.base).toFixed(2)} Tm (${pdfStr(r.text)}) Tj ET\n`;
  }
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array) => {
    parts.push(b);
    len += b.length;
  };
  const obj = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = len;
    if (typeof body === 'string') push(enc(`${n} 0 obj\n${body}\nendobj\n`));
    else {
      push(enc(`${n} 0 obj\n`));
      body.forEach(push);
      push(enc('\nendobj\n'));
    }
  };
  push(enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R >>`);
  obj(4, [enc(`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, enc('\nendstream')]);
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const cs = enc(stream);
  obj(7, [enc(`<< /Length ${cs.length} >>\nstream\n`), cs, enc('\nendstream')]);
  obj(8, `<< /Title (${pdfStr(`Resume - ${content.person.fullName}`)}) /Producer (rakin-talukder.me) >>`);
  const xref = len;
  let x = `xref\n0 9\n0000000000 65535 f \n`;
  for (let i = 1; i <= 8; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(enc(`${x}trailer\n<< /Size 9 /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

const save = (blob: Blob, name: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
const DPI = 300;
export async function downloadPdf() {
  await loadFonts();
  const { canvas, runs } = draw(DPI / 72);
  const data = atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1]);
  const jpeg = Uint8Array.from(data, (c) => c.charCodeAt(0));
  save(buildPdf(jpeg, canvas.width, canvas.height, runs), 'Rakin_Talukder_Resume.pdf');
}
export async function downloadPng() {
  await loadFonts();
  const { canvas } = draw(DPI / 72);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (blob) save(blob, 'Rakin_Talukder_Resume.png');
}

// ── the popup: preview on the left, downloads on the right (a top bar on phones), like the original ──
const ICON = {
  pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><text x="8.6" y="17.6" font-size="5.6" font-weight="700" font-family="sans-serif" fill="currentColor">PDF</text></svg>',
  png: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 17l4.5-5 3 3.2 2-2.2L19 17z" fill="currentColor"/><circle cx="15.5" cy="9" r="1.6" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
let dialog: HTMLDialogElement | null = null;

function build() {
  const d = document.createElement('dialog');
  d.className = 'cvd';
  d.setAttribute('aria-label', 'Résumé preview');
  d.innerHTML = `
    <div class="cvd-bar"><p class="cvd-label">PREVIEW</p>
      <button type="button" class="cvd-icon" data-pdf title="Download PDF" aria-label="Download PDF">${ICON.pdf}</button>
      <button type="button" class="cvd-icon" data-png title="Download PNG" aria-label="Download PNG">${ICON.png}</button>
      <button type="button" class="cvd-icon" data-close title="Close" aria-label="Close">${ICON.close}</button></div>
    <div class="cvd-view" data-view><div class="cvd-page" data-page></div></div>
    <aside class="cvd-side">
      <button type="button" class="cvd-icon cvd-x" data-close title="Close" aria-label="Close">${ICON.close}</button>
      <p class="cvd-label">DOWNLOADS</p>
      <button type="button" class="cvd-dl" data-pdf>${ICON.pdf}<span>PDF</span><kbd>P</kbd></button>
      <button type="button" class="cvd-dl" data-png>${ICON.png}<span>PNG</span><kbd>I</kbd></button>
      <p class="cvd-keys"><kbd>Esc</kbd> close</p>
    </aside>`;
  document.body.append(d);
  const busy = async (sel: string, f: () => Promise<void>) => {
    const bs = d.querySelectorAll<HTMLButtonElement>(sel);
    bs.forEach((b) => (b.disabled = true, b.classList.add('busy')));
    try {
      await f();
    } finally {
      bs.forEach((b) => (b.disabled = false, b.classList.remove('busy')));
    }
  };
  d.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === d || t.closest('[data-close]')) d.close();
    else if (t.closest('[data-pdf]')) void busy('[data-pdf]', downloadPdf);
    else if (t.closest('[data-png]')) void busy('[data-png]', downloadPng);
  });
  d.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'p' || e.key === 'P') void busy('[data-pdf]', downloadPdf);
    if (e.key === 'i' || e.key === 'I') void busy('[data-png]', downloadPng);
  });
  const page = d.querySelector<HTMLElement>('[data-page]')!;
  const view = d.querySelector<HTMLElement>('[data-view]')!;
  const render = async () => {
    if (!d.open) return;
    await loadFonts();
    const cssW = Math.min(view.clientWidth - 32, 760);
    const { canvas } = draw((cssW * Math.min(devicePixelRatio, 2.5)) / W);
    canvas.style.width = `${cssW}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Résumé of ${content.person.fullName}`);
    page.replaceChildren(canvas);
  };
  new ResizeObserver(() => void render()).observe(view);
  d.addEventListener('close', () => document.documentElement.classList.remove('cvd-open'));
  (d as HTMLDialogElement & { render?: () => Promise<void> }).render = render;
  return d;
}

/** Open the résumé popup; `then` starts a download straight away. */
export function openResume(then?: 'pdf' | 'png') {
  dialog ??= build();
  if (!dialog.open) dialog.showModal();
  document.documentElement.classList.add('cvd-open');
  void (dialog as HTMLDialogElement & { render: () => Promise<void> }).render();
  if (then === 'pdf') void downloadPdf();
  if (then === 'png') void downloadPng();
}
