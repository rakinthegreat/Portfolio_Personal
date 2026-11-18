// "Punch It Out": a tiny 16-bit boxing game on the desk's handheld console, made for Arshia.
// Pads pop up left, right or high; punch them to bring the stress meter down. No way to lose.
import { sfx } from './sound';

const W = 160;
const H = 144;
const C = { bg: '#c4cfa1', light: '#9fae7c', mid: '#5f7350', dark: '#2f3b2a', glove: '#b5483d', pad: '#d9774e' };
type Dir = 'left' | 'up' | 'right';
const DIRS: Dir[] = ['left', 'up', 'right'];
const PAD_POS: Record<Dir, [number, number]> = { left: [30, 74], up: [72, 34], right: [114, 74] };

let dialog: HTMLDialogElement | null = null;

export function openArcade() {
  if (!dialog) dialog = build();
  dialog.showModal();
  (dialog as HTMLDialogElement & { start: () => void }).start();
}

function build() {
  const d = document.createElement('dialog') as HTMLDialogElement & { start: () => void };
  d.className = 'arcade';
  d.innerHTML = `
    <div class="arcade-shell">
      <canvas width="${W}" height="${H}" aria-label="Punch It Out, a tiny boxing game"></canvas>
      <p class="arcade-label mono">PUNCH IT OUT · for Arshia</p>
      <div class="arcade-pad">
        <button type="button" data-dir="left" aria-label="Punch left">◀</button>
        <button type="button" data-dir="up" aria-label="Punch up">▲</button>
        <button type="button" data-dir="right" aria-label="Punch right">▶</button>
      </div>
      <p class="arcade-help mono">Arrow keys or A W D · Esc to close</p>
      <button class="arcade-close" type="button" data-close aria-label="Close game">✕</button>
    </div>`;
  document.body.append(d);
  const cv = d.querySelector('canvas')!;
  const g = cv.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  let stress = 100;
  let streak = 0;
  let best = 0;
  let pad: { dir: Dir; t: number; life: number } | null = null;
  let punch: { dir: Dir; t: number; hit: boolean } | null = null;
  let pops: { x: number; y: number; t: number; text: string }[] = [];
  let wait = 0.6;
  let won = false;
  let raf = 0;
  let last = 0;

  const reset = () => {
    stress = 100;
    streak = 0;
    pad = null;
    punch = null;
    pops = [];
    wait = 0.8;
    won = false;
  };

  const hit = (dir: Dir) => {
    if (won) {
      reset();
      return;
    }
    const ok = !!pad && pad.dir === dir;
    punch = { dir, t: 0.18, hit: ok };
    if (ok) {
      sfx.punch();
      streak++;
      best = Math.max(best, streak);
      stress = Math.max(0, stress - (6 + Math.min(streak, 10) * 0.4));
      const [x, y] = PAD_POS[dir];
      pops.push({ x, y: y - 10, t: 0.6, text: streak > 4 && streak % 5 === 0 ? 'NICE!' : 'POW' });
      pad = null;
      wait = 0.25 + Math.random() * 0.35;
      if (stress <= 0) {
        won = true;
        sfx.win();
      }
    } else {
      sfx.click();
      streak = 0;
    }
  };

  const keymap: Record<string, Dir> = { arrowleft: 'left', a: 'left', arrowup: 'up', w: 'up', arrowright: 'right', d: 'right' };
  const onKey = (e: KeyboardEvent) => {
    const dir = keymap[e.key.toLowerCase()];
    if (dir && !e.repeat) {
      e.preventDefault();
      hit(dir);
    } else if ((e.key === ' ' || e.key === 'Enter') && won) {
      e.preventDefault();
      reset();
    }
  };
  d.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) =>
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hit(b.dataset.dir as Dir);
    }),
  );
  d.querySelector('[data-close]')!.addEventListener('click', () => d.close());
  d.addEventListener('close', () => {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
  });

  // ── drawing ───────────────────────────────
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const text = (s: string, x: number, y: number, c = C.dark, size = 8) => {
    g.fillStyle = c;
    g.font = `bold ${size}px monospace`;
    g.textAlign = 'center';
    g.fillText(s, x, y);
  };

  function drawBoxer(t: number) {
    const bob = Math.round(Math.sin(t * 6) * 1);
    const cx = 72;
    const y0 = 88 + bob;
    // legs
    rect(cx + 2, y0 + 30, 5, 14, C.dark);
    rect(cx + 9, y0 + 30, 5, 14, C.dark);
    // shorts + body
    rect(cx, y0 + 22, 16, 9, C.glove);
    rect(cx + 1, y0 + 8, 14, 15, C.mid);
    // head (with a tiny smile)
    rect(cx + 3, y0 - 4, 10, 11, C.mid);
    rect(cx + 5, y0, 2, 2, C.dark);
    rect(cx + 10, y0, 2, 2, C.dark);
    rect(cx + 6, y0 + 4, 5, 1, C.dark);
    // gloves: guard position, or extended toward the punch
    const glove = (x: number, y: number) => {
      rect(x, y, 9, 8, C.glove);
      rect(x + 1, y + 1, 3, 2, '#e08a7c');
    };
    if (punch) {
      const [px, py] = PAD_POS[punch.dir];
      const k = Math.min(1, (0.18 - punch.t) / 0.08);
      glove(cx + 4 + (px - cx - 4) * k, y0 + 8 + (py - y0 - 8) * k);
      glove(cx + 12, y0 + 10);
    } else {
      glove(cx - 4, y0 + 6);
      glove(cx + 11, y0 + 6);
    }
  }

  function draw(t: number) {
    rect(0, 0, W, H, C.bg);
    // ring ropes
    [118, 126].forEach((y) => rect(0, y, W, 2, C.light));
    rect(0, 134, W, 10, C.light);
    // stress meter
    text('STRESS', 26, 11);
    rect(48, 4, 104, 9, C.dark);
    rect(50, 6, Math.max(0, stress), 5, stress > 50 ? C.glove : stress > 20 ? C.pad : C.mid);
    text(`x${streak}`, 148, 24, C.mid);
    // pad
    if (pad) {
      const [x, y] = PAD_POS[pad.dir];
      const k = pad.t / pad.life;
      const s = k > 0.85 ? Math.round((1 - k) / 0.15 * 12) : 12; // pop-in
      rect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2, C.dark);
      rect(x - s / 2, y - s / 2, s, s, C.pad);
      rect(x - 3, y - 3, 6, 6, '#f0d6b0');
      // shrinking timer ring
      rect(x - 8, y + 10, Math.round(16 * k), 2, C.dark);
    }
    drawBoxer(t);
    for (const p of pops) text(p.text, p.x, p.y - (0.6 - p.t) * 20, C.dark, 10);
    if (won) {
      rect(14, 40, 132, 56, C.dark);
      rect(16, 42, 128, 52, C.bg);
      text('ALL CALM  ♥', 80, 60, C.dark, 12);
      text(`best combo x${best}`, 80, 74, C.mid);
      text('press any punch to replay', 80, 86, C.mid, 7);
    }
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const t = now / 1000;
    if (!won) {
      if (pad) {
        pad.t -= dt;
        if (pad.t <= 0) {
          pad = null;
          streak = 0;
          wait = 0.3;
        }
      } else if ((wait -= dt) <= 0) {
        const life = Math.max(0.6, 1.25 - streak * 0.03);
        pad = { dir: DIRS[Math.floor(Math.random() * 3)], t: life, life };
      }
    }
    if (punch && (punch.t -= dt) <= 0) punch = null;
    pops = pops.filter((p) => (p.t -= dt) > 0);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  d.start = () => {
    reset();
    addEventListener('keydown', onKey);
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  return d;
}
