// The streamlined view: behaviour of the original Flutter site, ported 1:1.
// Hero letters rising in, drifting ambient rings, the big concentric-ring clock (with the theme
// toggle in it), hero parallax, the 2px scroll progress line, the side nav (radial edge menu on
// touch / narrow screens), reveal-on-scroll, and the two-dot cursor follower.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Light/dark with the original's circular reveal from the toggle; remembered per visitor. */
export function toggleTheme(from: HTMLElement) {
  const root = document.documentElement;
  const next = getComputedStyle(root).colorScheme === 'dark' ? 'light' : 'dark';
  const apply = () => {
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch { /* ignore */ }
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced) return apply();
  const r = from.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = doc.startViewTransition(apply);
  void t.ready.then(() =>
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 1000, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
    ),
  );
}

export function initStandard() {
  const std = document.querySelector<HTMLElement>('[data-std]');
  if (!std) return;

  // ── reveal on scroll: fade, slide up 32% of its own height, scale from 0.97 ──
  const revs = std.querySelectorAll('.s-rev');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08 },
    );
    revs.forEach((el) => io.observe(el));
  } else revs.forEach((el) => el.classList.add('in'));
  requestAnimationFrame(() => std.classList.add('go')); // hero letters

  // ── the big clock: three arcs (seconds, minutes, hours) growing clockwise from 12 ──
  const arc = (k: string) => std.querySelector<SVGCircleElement>(`[data-arc="${k}"]`)!;
  const [sec, min, hr] = [arc('s'), arc('m'), arc('h')];
  const set = (el: SVGCircleElement, f: number) => (el.style.strokeDasharray = `${Math.max(f, 0.0005)} 1`);
  const tick = () => {
    const d = new Date();
    set(sec, d.getSeconds() / 60);
    set(min, d.getMinutes() / 60);
    set(hr, ((d.getHours() % 12) + d.getMinutes() / 60) / 12);
  };
  tick();
  setInterval(tick, 1000);

  // ── scroll-driven bits: progress line, hero parallax, active section for the nav ──
  const bar = std.querySelector<HTMLElement>('[data-progress]')!;
  const copy = std.querySelector<HTMLElement>('[data-parallax]')!;
  const secs = [...std.querySelectorAll<HTMLElement>('[data-sec]')]; // hero, 7 sections, footer
  const side = std.querySelector<HTMLElement>('[data-sidenav]')!;
  const radial = std.querySelector<HTMLElement>('[data-radial]')!;
  const radialLabel = radial.querySelector<HTMLElement>('[data-radial-label]')!;
  const labels = [...side.querySelectorAll('a[data-i] span')].map((s) => s.textContent!);
  let active = -1;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (scrollY < innerHeight * 1.2) copy.style.transform = `translateY(${-scrollY * 0.35}px)`;
    let a = 0;
    secs.forEach((s, i) => {
      if (s.getBoundingClientRect().top < innerHeight * 0.55) a = i;
    });
    if (a === secs.length - 1) a = secs.length - 2; // the footer counts as Contact
    if (a !== active) {
      active = a;
      std.classList.toggle('past-hero', a > 0);
      const i = a - 1;
      side.querySelectorAll('a[data-i]').forEach((el, j) => el.classList.toggle('on', j === i));
      radial.querySelectorAll('.s-radial-items a[data-i]').forEach((el, j) => el.classList.toggle('on', j === i));
      radialLabel.textContent = labels[i] ?? '';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // ── radial edge menu (touch / narrow): a knob on the right edge that opens into a dial ──
  const knob = radial.querySelector<HTMLButtonElement>('[data-radial-open]')!;
  const setOpen = (open: boolean) => {
    radial.classList.toggle('open', open);
    knob.setAttribute('aria-expanded', String(open));
    // labels scale down to fit between the close button and the rim (the original's FittedBox)
    if (open)
      radial.querySelectorAll<HTMLElement>('.s-radial-items span').forEach((sp) => {
        sp.style.transform = '';
        const w = sp.scrollWidth;
        if (w > 55) sp.style.transform = `scale(${55 / w})`;
      });
  };
  knob.addEventListener('click', () => setOpen(true));
  radial.querySelector('[data-radial-close]')!.addEventListener('click', () => setOpen(false));
  radial.querySelectorAll('.s-radial-items > *').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('pointerdown', (e) => {
    if (radial.classList.contains('open') && !radial.contains(e.target as Node)) setOpen(false);
  });

  if (reduced) return;

  // ── ambient rings drifting and breathing behind the hero ──
  // [x%, y%, size, phase, driftX, driftY], as in the original
  const DOTS = [
    [0.06, 0.18, 80, 0.0, 18, 12],
    [0.88, 0.12, 40, 0.3, 10, 20],
    [0.72, 0.72, 120, 0.6, 14, 8],
    [0.14, 0.8, 55, 0.9, 8, 16],
    [0.5, 0.4, 30, 0.45, 22, 10],
    [0.92, 0.5, 64, 0.75, 6, 18],
  ];
  const dotEls = [...std.querySelectorAll<HTMLElement>('[data-dots] i')];
  dotEls.forEach((el, i) => {
    const [x, y, s] = DOTS[i];
    Object.assign(el.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${s}px`, height: `${s}px` });
  });

  // ── cursor: a sharp small dot on the pointer and a bigger one lagging behind ──
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const cur = std.querySelector<HTMLElement>('[data-cur]')!;
  const lag = std.querySelector<HTMLElement>('[data-cur-lag]')!;
  const target = { x: -100, y: -100 };
  const dot = { x: -100, y: -100 };
  if (fine) {
    std.classList.add('own-cursor');
    addEventListener('pointermove', (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
  }

  const t0 = performance.now();
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (fine) {
      const dx = (target.x - dot.x) * 0.12;
      const dy = (target.y - dot.y) * 0.12;
      if (Math.abs(dx) + Math.abs(dy) > 0.1) {
        dot.x += dx;
        dot.y += dy;
        lag.style.transform = `translate(${dot.x}px, ${dot.y}px)`;
      }
    }
    if (scrollY > innerHeight) return; // the rings are off screen
    const t = ((now - t0) / 6000) % 1;
    dotEls.forEach((el, i) => {
      const [, , , phase, ax, ay] = DOTS[i];
      const ang = ((t + phase) % 1) * Math.PI * 2;
      const scale = 0.85 + 0.15 * Math.sin(ang + phase);
      el.style.transform = `translate(-50%, -50%) translate(${ax * Math.sin(ang)}px, ${ay * Math.cos(ang * 0.7)}px) scale(${scale})`;
    });
  };
  requestAnimationFrame(frame);
}
