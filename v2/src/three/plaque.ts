// The glass plaque by the Victus: a photo of the two of them (as pixel art), a song's progress bar at
// 04:21, hand-drawn player controls and the song's Spotify code. Real HTML through a hole in the 3D glass,
// so the code stays sharp enough to scan. The controls work: play runs the bar, ⏮ / ⏭ jump.
// Until it's unlocked it's a digital clock showing local time: setting its six slots (HH:MM AM) to the
// right word blows the clock apart and shows the song. The unlock lasts for the browser session.
export const PLAQUE_PX = 600; // 600 × 1000 CSS px (3:5)
const LEN = 4 * 60 + 21;
const UNLOCK_KEY = 'plaque-unlocked';
const WORD = 'ARSHIA';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const isUnlocked = () => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

export function buildPlaque() {
  const el = document.createElement('div');
  el.className = 'plaque';
  el.style.width = `${PLAQUE_PX}px`;
  el.style.height = `${(PLAQUE_PX * 5) / 3}px`;
  el.innerHTML = `
    <div class="pq-photo"><img src="/plaque/us.jpg" alt="The two of them sitting together in a garden, drawn as pixel art" draggable="false"></div>
    <div class="pq-track"><span class="pq-fill" data-fill></span><span class="pq-knob" data-knob></span></div>
    <p class="pq-time" data-time>04:21</p>
    <div class="pq-ctl">
      <button type="button" data-prev aria-label="Back to the start"><svg viewBox="0 0 48 40"><path d="M8 4v32" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M42 5L13 20l29 15z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></button>
      <button type="button" class="pq-play" data-play aria-label="Play"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="currentColor"/><path data-icon d="M25 18v28l22-14z" fill="#e9ecef"/></svg></button>
      <button type="button" data-next aria-label="Skip to the end"><svg viewBox="0 0 48 40"><path d="M40 4v32" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M6 5l29 15L6 35z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></button>
    </div>
    <img class="pq-code" src="/plaque/code.png" alt="Spotify code for their song: scan it in the Spotify app" draggable="false">`;
  const fill = el.querySelector<HTMLElement>('[data-fill]')!;
  const knob = el.querySelector<HTMLElement>('[data-knob]')!;
  const time = el.querySelector<HTMLElement>('[data-time]')!;
  const icon = el.querySelector<SVGPathElement>('[data-icon]')!;
  const playBtn = el.querySelector<HTMLButtonElement>('[data-play]')!;
  let t = 0;
  let playing = false;
  let last = 0;
  const paint = () => {
    const k = Math.min(1, t / LEN);
    fill.style.width = `${k * 100}%`;
    knob.style.left = `${k * 100}%`;
    knob.style.opacity = playing || t > 0 ? '1' : '0';
    time.textContent = playing || t > 0 ? `${mmss(t)} / 04:21` : '04:21';
    icon.setAttribute('d', playing ? 'M22 18h7v28h-7zM35 18h7v28h-7z' : 'M25 18v28l22-14z');
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };
  const tick = (now: number) => {
    if (!playing) return;
    t += (now - last) / 1000;
    last = now;
    if (t >= LEN) {
      t = LEN;
      playing = false;
    }
    paint();
    if (playing) requestAnimationFrame(tick);
  };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.hasAttribute('data-play')) {
      if (t >= LEN) t = 0;
      playing = !playing;
      last = performance.now();
      if (playing) requestAnimationFrame(tick);
    } else if (b.hasAttribute('data-prev')) t = 0;
    else if (b.hasAttribute('data-next')) {
      t = LEN;
      playing = false;
    }
    paint();
  });
  paint();
  const key = (k: 'play' | 'prev' | 'next') => el.querySelector<HTMLElement>(`[data-${k}]`)?.click();
  return { el, key };
}

export const plaqueUnlocked = isUnlocked;
export const CLOCK_PX = 640; // the desk clock's display, CSS px across

/** The desk clock's display: six slots (HH, MM, AM/PM). The clock's physical SET button on top (in 3D,
 *  see mount) calls `set()`: the first press lets you type into the slots, the next one sets the time.
 *  The right word makes the display flare, then `onBlast` fires: the clock should blow apart. */
export function buildDeskClock(heightPx: number, onBlast: () => void) {
  const el = document.createElement('div');
  el.className = 'pq-lock';
  el.style.width = `${CLOCK_PX}px`;
  el.style.height = `${heightPx}px`;
  const slot = (i: number) =>
    `<input class="pq-slot" data-slot="${i}" readonly inputmode="text" autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Clock slot ${i + 1} of 6">`;
  el.innerHTML = `
    <div class="pq-lcd" data-lcd>
      ${slot(0)}${slot(1)}<span class="pq-colon">:</span>${slot(2)}${slot(3)}<span class="pq-ampm">${slot(4)}${slot(5)}</span>
    </div>`;
  const slots = [...el.querySelectorAll<HTMLInputElement>('[data-slot]')];
  const lcd = el.querySelector<HTMLElement>('[data-lcd]')!;
  let offset = 0; // minutes added to local time, once someone sets the clock to a real time
  let editing = false;
  let done = false;

  const current = () => {
    const d = new Date(Date.now() + offset * 60000);
    const h = d.getHours();
    return `${String(h % 12 || 12).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'AM' : 'PM'}`;
  };
  const show = (txt: string) => slots.forEach((s, i) => (s.value = txt[i] ?? ''));
  const tick = () => {
    if (!editing && !done) show(current());
  };
  tick();
  const timer = setInterval(tick, 1000);

  const edit = (on: boolean) => {
    editing = on;
    el.classList.toggle('editing', on);
    slots.forEach((s) => (s.readOnly = !on));
    if (on) {
      slots[0].focus();
      slots[0].select();
    } else {
      slots.forEach((s) => s.blur());
      tick();
    }
  };
  const fail = () => {
    lcd.classList.remove('nope');
    void lcd.offsetWidth; // restart the shake
    lcd.classList.add('nope');
    edit(false);
  };
  const blast = () => {
    done = true;
    clearInterval(timer);
    slots.forEach((s) => {
      s.readOnly = true;
      s.blur();
    });
    // the word holds for a beat, glowing hot, then the clock itself blows apart (in 3D, see mount)
    el.classList.add('charged');
    setTimeout(() => {
      try {
        sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        /* ignore */
      }
      onBlast();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700);
  };
  const submit = () => {
    const v = slots.map((s) => s.value || ' ').join('');
    if (v === WORD) return blast();
    const m = /^(\d\d)(\d\d)(AM|PM)$/.exec(v);
    if (!m) return fail();
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h < 1 || h > 12 || mi > 59) return fail();
    // a real time: the clock jumps to it and keeps running from there
    const want = ((h % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + mi;
    const d = new Date();
    offset = want - (d.getHours() * 60 + d.getMinutes());
    edit(false);
  };

  // tapping the digits works too (handy on a phone)
  el.addEventListener('click', () => {
    if (!editing && !done) edit(true);
  });
  slots.forEach((s, i) => {
    s.addEventListener('input', () => {
      // one character per slot, always upper case, then on to the next
      const ch = s.value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/, '');
      s.value = ch;
      if (ch && i < slots.length - 1) {
        slots[i + 1].focus();
        slots[i + 1].select();
      }
    });
    s.addEventListener('focus', () => editing && s.select());
    s.addEventListener('keydown', (e) => {
      if (!editing) return;
      e.stopPropagation(); // typing here isn't a desk shortcut
      const go = (j: number) => {
        e.preventDefault();
        slots[j].focus();
      };
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        edit(false);
      } else if (e.key === 'Backspace' && !s.value && i > 0) {
        slots[i - 1].value = '';
        go(i - 1);
      } else if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
      else if (e.key === 'ArrowRight' && i < slots.length - 1) go(i + 1);
    });
  });
  return {
    el,
    active: () => !done,
    set: () => {
      if (!done) (editing ? submit : () => edit(true))();
    },
  };
}
