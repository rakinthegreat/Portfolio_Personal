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
let deskMounted = false;
const startStandard = () => {
  if (standardReady) return;
  standardReady = true;
  initStandard();
};
// the loading screen (index.html) covers the 3D desk while it's built; it fades once the desk is ready (or can't be)
const booted = () => {
  root.classList.add('booted');
  setTimeout(() => root.classList.remove('booting', 'booted'), 700);
};
if (!hasWebGL) booted();
setTimeout(booted, 15000); // never leave anyone staring at it
let stopDesk: Promise<(() => void) | void> | null = null;
const mountDesk = () => {
  if (deskMounted || !hasWebGL) return;
  deskMounted = true;
  const tour = document.querySelector<HTMLElement>('[data-tour]');
  if (!tour) return booted();
  stopDesk = import('./three/mount')
    .then((m) => m.mount(tour))
    .catch((err) => console.warn('3D desk unavailable', err))
    .finally(booted);
};
/** The standard page was picked: shut the 3D desk down (once it's finished starting, if it hasn't yet). */
const unmountDesk = () => {
  void stopDesk?.then((stop) => stop?.());
  stopDesk = null;
  booted();
};
// every visit starts on the entry screen, unless the visitor ticked "Remember my choice" there
const rememberBox = gate?.querySelector<HTMLInputElement>('[data-remember]');
const remembered = () => { try { return localStorage.getItem('view'); } catch { return null; } };
if (rememberBox) rememberBox.checked = remembered() === 'desk' || remembered() === 'standard';
rememberBox?.addEventListener('change', () => {
  try { if (!rememberBox.checked) localStorage.removeItem('view'); } catch { /* ignore */ }
});
function remember(view: View) {
  const keep = rememberBox ? rememberBox.checked : remembered() !== null;
  try { if (keep) localStorage.setItem('view', view); } catch { /* ignore */ }
}
function enter(view: View) {
  if (view === 'desk' && !hasWebGL) view = 'standard';
  remember(view);
  if (started && root.dataset.view && root.dataset.view !== view) {
    // leaving one view for the other: a fresh load is the cleanest way to stop (or start) the 3D desk
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    url.hash = '';
    location.replace(url);
    return;
  }
  root.dataset.view = view;
  root.classList.remove('gating', 'pick-desk', 'pick-standard');
  started = true;
  gate?.remove();
  if (view === 'standard') {
    startStandard();
    unmountDesk();
  }
  const anchor = view === 'standard' && location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  if (anchor) anchor.scrollIntoView({ behavior: 'instant' });
  else scrollTo({ top: 0, behavior: 'instant' });
  if (view === 'desk') mountDesk();
}
// picking: the tear sweeps over the side you didn't pick, then that view simply carries on
let picking = false;
gate?.addEventListener('click', (e) => {
  // the page's own theme button (in its clock) still works through the poster
  const theme = document.querySelector<HTMLElement>('.s-clock [data-theme-toggle]');
  const tr = theme?.getBoundingClientRect();
  if (theme && tr && e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom) return toggleTheme(theme);
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-pick]');
  if (b) pick(b);
});
function pick(b: HTMLButtonElement) {
  if (b.disabled || picking) return;
  picking = true;
  const view = b.dataset.pick as View;
  root.classList.add(`pick-${view}`);
  setTimeout(() => enter(view), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620);
}
// keyboard shortcuts on the entry screen: 1 / D for the desk, 2 / S for the standard page
const PICK_KEYS: Record<string, View> = { '1': 'desk', d: 'desk', '2': 'standard', s: 'standard' };
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-switch]');
  if (b) enter(b.dataset.switch as View);
});
const preset = root.dataset.view as View | undefined;
if (preset === 'standard' || preset === 'desk') enter(preset);
else {
  // the entry screen: both views run live underneath it, one in each half of the tear
  root.classList.add('gating');
  startStandard();
  mountDesk();
  // while choosing, keys belong to the entry screen (Tab / Enter / Space and the pick keys), not to the views underneath
  addEventListener('keydown', (e) => {
    if (!root.classList.contains('gating')) return;
    const view = e.ctrlKey || e.metaKey || e.altKey ? undefined : PICK_KEYS[e.key.toLowerCase()];
    if (view) {
      e.preventDefault();
      const b = gate?.querySelector<HTMLButtonElement>(`[data-pick="${view}"]`);
      if (b) pick(b);
    }
    if (!['Tab', 'Enter', ' '].includes(e.key)) e.stopImmediatePropagation();
  }, true);
}

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

