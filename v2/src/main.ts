import './styles.css';
import './standard.css';
import { bindPreviewLinks } from './preview';
import { onSoundChange, setSound, soundOn, sfx } from './sound';
import { initStandard, toggleTheme } from './standard';

type View = 'standard' | 'desk';
const root = document.documentElement;
root.classList.add('js');

// Live demos open in-page, like the old site's preview popup
bindPreviewLinks();

// ── which way in: the entry screen asks; the choice holds for this visit, and either view can switch ──
const hasWebGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();
const gate = document.querySelector<HTMLElement>('[data-gate]');
const deskPick = gate?.querySelector<HTMLButtonElement>('[data-pick="desk"]');
if (deskPick && !hasWebGL) {
  deskPick.disabled = true;
  deskPick.querySelector('[data-desk-note]')!.textContent = 'NEEDS WEBGL: NOT AVAILABLE ON THIS BROWSER';
}

let started = false;
let standardReady = false;
function enter(view: View) {
  if (view === 'desk' && !hasWebGL) view = 'standard';
  try {
    sessionStorage.setItem('view', view);
  } catch { /* ignore */ }
  if (started && root.dataset.view && root.dataset.view !== view) {
    // leaving one view for the other: a fresh load is the cleanest way to stop (or start) the 3D desk
    const url = new URL(location.href);
    url.searchParams.delete('view');
    url.hash = '';
    location.replace(url);
    return;
  }
  root.dataset.view = view;
  started = true;
  gate?.remove();
  if (view === 'standard' && !standardReady) {
    standardReady = true;
    initStandard();
  }
  const anchor = view === 'standard' && location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  if (anchor) anchor.scrollIntoView({ behavior: 'instant' });
  else scrollTo({ top: 0, behavior: 'instant' });
  if (view === 'desk') {
    const tour = document.querySelector<HTMLElement>('[data-tour]');
    if (tour) import('./three/mount').then((m) => m.mount(tour)).catch((err) => console.warn('3D desk unavailable', err));
  }
}
gate?.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]');
  if (b && !b.disabled) enter(b.dataset.pick as View);
});
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-switch]');
  if (b) enter(b.dataset.switch as View);
});
const preset = root.dataset.view as View | undefined;
if (preset === 'standard' || preset === 'desk') enter(preset);
else gate?.querySelector<HTMLButtonElement>('[data-pick="standard"]')?.focus({ preventScroll: true });

// Dark / light toggle (the original site had one in its clock); remembered per visitor
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-theme-toggle]');
  if (t) toggleTheme(t);
});

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
      setTimeout(() => (copy.textContent = 'COPY'), 2000);
    });
  }
});

// Sound toggle on the desk (off by default, remembered per visitor)
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

// Local Dhaka time on the desk's opening shot
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
