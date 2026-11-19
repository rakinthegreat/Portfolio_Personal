import './styles.css';
import { bindPreviewLinks } from './preview';
import { onSoundChange, setSound, soundOn, sfx } from './sound';

document.documentElement.classList.add('js');

// Live demos open in-page, like the old site's preview popup
bindPreviewLinks();

// Dark / light toggle (the original site had one); remembered per visitor
const themeBtn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
try {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
} catch { /* ignore */ }
if (themeBtn) {
  themeBtn.hidden = false;
  themeBtn.addEventListener('click', () => {
    const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  });
}

// Academics: TEST SCORES / ACCEPTANCES / MENTORSHIP dialogs
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-open]');
  if (open) document.querySelector<HTMLDialogElement>(`#${open.dataset.open}`)?.showModal();
  const close = t.closest('dialog.info [data-close]');
  if (close) close.closest('dialog')?.close();
  if (t instanceof HTMLDialogElement && t.classList.contains('info')) t.close(); // backdrop click
  // résumé: a popup preview with PDF / PNG downloads (the links still work without JS)
  const cv = t.closest<HTMLElement>('[data-resume]');
  if (cv) {
    e.preventDefault();
    const then = cv.dataset.resume as 'pdf' | 'png' | '';
    void import('./resumeDoc').then((m) => m.openResume(then || undefined));
  }
  const copy = t.closest<HTMLButtonElement>('[data-copy]');
  if (copy) {
    void navigator.clipboard?.writeText(copy.dataset.copy!).then(() => {
      copy.textContent = '✓ COPIED';
      setTimeout(() => (copy.textContent = 'COPY'), 1600);
    });
  }
});

// Sound toggle (off by default, remembered per visitor)
const soundBtn = document.querySelector<HTMLButtonElement>('[data-sound]');
if (soundBtn) {
  const paint = (on: boolean) => {
    soundBtn.textContent = on ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(on));
  };
  soundBtn.hidden = false;
  paint(soundOn());
  onSoundChange(paint);
  soundBtn.addEventListener('click', () => {
    setSound(!soundOn());
    sfx.click();
  });
}

// Local Dhaka time in the intro strip
const clock = document.querySelector<HTMLTimeElement>('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: clock.dataset.tz || 'Asia/Dhaka',
  });
  const tick = () => (clock.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 15_000);
}

// Reveal-on-scroll
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('in'));
}

// Load the 3D desk only where it will run well; everyone else keeps the plain page.
const tour = document.querySelector<HTMLElement>('[data-tour]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
const hasWebGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();
if (tour && hasWebGL && !reduced && !saveData) {
  import('./three/mount').then((m) => m.mount(tour)).catch((err) => console.warn('3D desk unavailable', err));
}
