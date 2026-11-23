// Real web pages on the Victus and the phone. The pages live in a CSS3D layer under the WebGL canvas;
// each screen mesh in the 3D scene punches a transparent hole so the page shows through it, and
// anything in front of the screen (the cat, the lid edge) still covers it.
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import content from '../content.json';

type Project = (typeof content.projects)[number] & { previewUrl?: string; mobile?: boolean; icon?: string; iconUrl?: string; color?: string; downloadUrl?: string };
const projects = content.projects as Project[];
/** Brand-coloured app icons for the socials (used by the phone dock and the sign on the shelf). */
export const SOCIAL_GLYPH: Record<string, [string, string]> = {
  GitHub: ['GH', '#24292f'],
  LinkedIn: ['in', '#0a66c2'],
  'Twitter / X': ['𝕏', '#000000'],
  Instagram: ['◎', 'linear-gradient(45deg, #f9ce34, #ee2a7b 50%, #6228d7)'],
  Facebook: ['f', '#1877f2'],
};
export const socialIcons = (labels = false) =>
  content.socials
    .map((s) => {
      const [g, bg] = SOCIAL_GLYPH[s.label] ?? [s.label[0], '#333'];
      return `<a class="soc" href="${s.url}" target="_blank" rel="noopener me" aria-label="${s.label}"><i style="background:${bg}">${g}</i>${labels ? `<span><b>${s.label}</b>${s.handle}</span>` : ''}</a>`;
    })
    .join('');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** CSS px ↔ metres: the CSS scene is scaled up so the browser's 3D maths stays precise. */
const S = 1000;

/** Material for a screen: writes transparent pixels so the CSS page beneath is visible. */
export const holeMaterial = () =>
  new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0, transparent: false, blending: THREE.NoBlending, side: THREE.FrontSide });

interface Screen { anchor: THREE.Object3D; widthM: number; px: number; obj: CSS3DObject }

export class Screens {
  readonly renderer = new CSS3DRenderer();
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera();
  private screens: Screen[] = [];
  private laptopBody!: HTMLElement;
  private laptopUrl!: HTMLElement;
  private tabs!: HTMLElement;
  private phoneScreen!: HTMLElement;
  private tmpS = new THREE.Vector3();
  onOpenOnPhone: (name: string) => void = () => {};
  onUse: (which: 'laptop' | 'phone') => void = () => {};
  private tab: string | null = null;
  private app: string | null = null;
  private roots: Record<'laptop' | 'phone', HTMLElement> = {} as Record<'laptop' | 'phone', HTMLElement>;

  constructor(container: HTMLElement, laptop: { anchor: THREE.Object3D; widthM: number }, phone: { anchor: THREE.Object3D; widthM: number }) {
    this.renderer.domElement.className = 'tour-css';
    container.prepend(this.renderer.domElement);
    this.roots.laptop = this.buildLaptop();
    this.roots.phone = this.buildPhone();
    this.add(laptop.anchor, laptop.widthM, 1280, this.roots.laptop);
    this.add(phone.anchor, phone.widthM, 390, this.roots.phone);
  }

  /** Any HTML element shown through a hole mesh (used for the pinboard cards). */
  addPanel(anchor: THREE.Object3D, widthM: number, px: number, el: HTMLElement) {
    this.add(anchor, widthM, px, el);
  }

  private add(anchor: THREE.Object3D, widthM: number, px: number, el: HTMLElement) {
    const obj = new CSS3DObject(el);
    this.scene.add(obj);
    this.screens.push({ anchor, widthM, px, obj });
  }

  // ── the Victus: a small browser ──────────────────────
  private buildLaptop() {
    // a Windows desktop: the wallpaper, the browser in a window over it, the taskbar along the bottom
    const el = document.createElement('div');
    el.className = 'scr desktop';
    el.style.width = '1280px';
    el.style.height = '800px';
    const web = projects.filter((p) => p.previewUrl && !p.mobile);
    el.innerHTML = `
      <div class="win browser">
      <div class="browser-tabs" role="tablist">
        <button class="browser-tab" role="tab" aria-selected="true" data-tab=""><kbd class="tk">1</kbd>Projects · Rakin</button>
        ${web.map((p, i) => `<button class="browser-tab" role="tab" aria-selected="false" data-tab="${esc(p.name)}"><kbd class="tk">${i + 2}</kbd>${esc(p.name)}</button>`).join('')}
      </div>
      <div class="browser-bar"><button class="browser-nav" type="button" data-back aria-label="Back to Projects">◀</button><button class="browser-nav" type="button" data-reload aria-label="Reload">⟳</button><span class="browser-url" data-url>rakin-talukder.me/projects</span></div>
      <div class="browser-body" data-body></div>
      </div>
      <div class="taskbar" aria-hidden="true">
        <span class="tb-apps">
          <i class="tb-start"><b></b><b></b><b></b><b></b></i>
          <i class="tb-search"></i>
          <i class="tb-browser on"></i>
          <i class="tb-files"></i>
        </span>
        <span class="tb-tray">
          <svg viewBox="0 0 24 24"><path d="M12 20.5 1.5 9a15 15 0 0 1 21 0z"/></svg>
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>
          <svg viewBox="0 0 24 24"><path d="M2 8h17v8H2zm18 2h2v4h-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h11v4H4z"/></svg>
          <span class="tb-clock"><time data-desk-clock></time><time data-desk-date></time></span>
        </span>
      </div>`;
    {
      const tz = content.person.timezone;
      const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz });
      const d = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz });
      const clock = el.querySelector<HTMLElement>('[data-desk-clock]')!;
      const date = el.querySelector<HTMLElement>('[data-desk-date]')!;
      const tick = () => {
        const now = new Date();
        clock.textContent = t.format(now);
        date.textContent = d.format(now);
      };
      tick();
      setInterval(tick, 30_000);
    }
    this.tabs = el.querySelector('.browser-tabs')!;
    this.laptopBody = el.querySelector('[data-body]')!;
    this.laptopUrl = el.querySelector('[data-url]')!;
    this.tabs.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (t) this.openTab(t.dataset.tab || null);
    });
    el.querySelector('[data-back]')!.addEventListener('click', () => this.openTab(null));
    el.querySelector('[data-reload]')!.addEventListener('click', () => {
      const f = this.laptopBody.querySelector<HTMLIFrameElement>('iframe:not([hidden])');
      if (f) f.src = f.src;
    });
    this.renderHome();
    return el;
  }

  private renderHome() {
    this.laptopBody.innerHTML = `
      <div class="home-page">
        <h1>Web Projects</h1>
        <p>04  ·  PROJECTS & APPS  ·  LIVE</p>
        <div class="home-grid">
          ${projects
            .filter((p) => p.previewUrl && !p.mobile) // the Victus shows the web projects only
            .map(
              (p) => `<button class="home-card" data-proj="${esc(p.name)}">
                <b>${esc(p.name)}</b><span>${esc(p.type)} · ${esc(p.year)} · live</span>
                <p>${esc(p.description)}</p></button>`,
            )
            .join('')}
        </div>
      </div>`;
    this.laptopBody.querySelector('.home-page')!.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-proj]');
      if (!card) return;
      const p = projects.find((x) => x.name === card.dataset.proj)!;
      if (p.previewUrl && !p.mobile) this.openTab(p.name);
      else if (p.previewUrl && p.mobile) this.onOpenOnPhone(p.name);
      else window.open(p.url, '_blank', 'noopener');
    });
  }

  /** Switch the laptop to a project's live demo (null = the Projects home page). */
  openTab(name: string | null) {
    this.tab = name;
    this.tabs.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.setAttribute('aria-selected', String((t.dataset.tab || null) === name)));
    this.laptopBody.querySelectorAll('iframe').forEach((f) => (f.hidden = true));
    const home = this.laptopBody.querySelector<HTMLElement>('.home-page');
    if (!name) {
      if (home) home.hidden = false;
      this.laptopUrl.textContent = 'rakin-talukder.me/projects';
      return;
    }
    if (home) home.hidden = true;
    const p = projects.find((x) => x.name === name)!;
    this.laptopUrl.textContent = p.previewUrl!.replace(/^https?:\/\//, '');
    let f = this.laptopBody.querySelector<HTMLIFrameElement>(`iframe[data-name="${CSS.escape(name)}"]`);
    if (!f) {
      f = document.createElement('iframe');
      f.dataset.name = name;
      f.title = `${name} live demo`;
      f.allow = 'fullscreen; autoplay; clipboard-write';
      f.src = p.previewUrl!;
      this.laptopBody.append(f);
      // keep at most two demos alive
      const all = this.laptopBody.querySelectorAll('iframe');
      if (all.length > 2) all[0].remove();
    }
    f.hidden = false;
  }

  // ── the phone: a launcher with the mobile apps ───────
  private buildPhone() {
    const el = document.createElement('div');
    el.className = 'scr phone';
    el.style.width = '390px';
    el.style.height = '844px';
    el.innerHTML = `
      <span class="phone-punch" aria-hidden="true"></span>
      <div class="phone-status"><time data-phone-clock>9:41</time><span class="ps-right" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20.5 1.5 9a15 15 0 0 1 21 0z"/></svg><svg viewBox="0 0 24 24"><path d="M2 21h3v-4H2zm5 0h3v-8H7zm5 0h3V9h-3zm5 0h3V4h-3z"/></svg><span class="ps-batt">87%</span></span></div>
      <div class="phone-screen" data-phone></div>
      <button class="phone-home" type="button" aria-label="Home" data-home></button>`;
    this.phoneScreen = el.querySelector('[data-phone]')!;
    el.querySelector('[data-home]')!.addEventListener('click', () => this.openApp(null));
    const clock = el.querySelector<HTMLElement>('[data-phone-clock]')!;
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: content.person.timezone });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 30_000);
    this.openApp(null);
    return el;
  }

  /** Open a mobile app on the phone (null = home screen). */
  openApp(name: string | null) {
    this.app = name;
    this.phoneScreen.querySelectorAll('iframe').forEach((f) => (f.hidden = true));
    let launcher = this.phoneScreen.querySelector<HTMLElement>('.launcher');
    if (!launcher) {
      launcher = document.createElement('div');
      launcher.className = 'launcher';
      launcher.innerHTML = `<h2 data-big-clock></h2>${projects
        .filter((p) => p.mobile)
        .map(
          (p, n) =>
            `<button class="app" type="button" data-app="${esc(p.name)}"><kbd class="ak">${n + 1}</kbd><i style="background:${p.color ?? '#333'}">${esc(p.icon ?? p.name[0])}${
              p.iconUrl ? `<img src="${esc(p.iconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''
            }</i>${esc(p.name)}</button>`,
        )
        .join('')}<nav class="dock" aria-label="Social">${socialIcons()}</nav>`;
      launcher.addEventListener('click', (e) => {
        const a = (e.target as HTMLElement).closest<HTMLElement>('[data-app]');
        if (a) this.openApp(a.dataset.app!);
      });
      this.phoneScreen.append(launcher);
    }
    const big = launcher.querySelector<HTMLElement>('[data-big-clock]')!;
    big.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: content.person.timezone }).format(new Date());
    launcher.hidden = !!name;
    if (!name) return;
    const p = projects.find((x) => x.name === name)!;
    let f = this.phoneScreen.querySelector<HTMLIFrameElement>(`iframe[data-name="${CSS.escape(name)}"]`);
    if (!f) {
      f = document.createElement('iframe');
      f.dataset.name = name;
      f.title = `${name} live demo`;
      f.allow = 'fullscreen; autoplay; vibrate';
      f.src = p.previewUrl!;
      this.phoneScreen.append(f);
      const all = this.phoneScreen.querySelectorAll('iframe');
      if (all.length > 2) all[0].remove();
    }
    f.hidden = false;
  }

  /** Keyboard: tab n on the laptop (0 = the Projects home page). */
  tabAt(i: number) {
    const web = projects.filter((p) => p.previewUrl && !p.mobile);
    if (i === 0) this.openTab(null);
    else if (web[i - 1]) this.openTab(web[i - 1].name);
  }
  /** Keyboard: app n on the phone (-1 = home screen). */
  appAt(i: number) {
    const apps = projects.filter((p) => p.mobile && p.previewUrl);
    if (i < 0) this.openApp(null);
    else if (apps[i]) this.openApp(apps[i].name);
  }
  reload() {
    const f = this.laptopBody.querySelector<HTMLIFrameElement>('iframe:not([hidden])');
    if (f) f.src = f.src;
  }
  get tabCount() {
    return projects.filter((p) => p.previewUrl && !p.mobile).length + 1;
  }
  get appCount() {
    return projects.filter((p) => p.mobile && p.previewUrl).length;
  }

  /** One step back: an open demo goes to its home screen. Returns false when already home. */
  back(which: 'laptop' | 'phone') {
    if (which === 'laptop' && this.tab) {
      this.openTab(null);
      return true;
    }
    if (which === 'phone' && this.app) {
      this.openApp(null);
      return true;
    }
    return false;
  }

  /** A click on the 3D screen at texture coords (u, v): press whatever control is under it. */
  clickAt(which: 'laptop' | 'phone', u: number, v: number) {
    const root = this.roots[which];
    const W = root.offsetWidth;
    const H = root.offsetHeight;
    const x = u * W;
    const y = (1 - v) * H;
    const sel = which === 'laptop' ? '[data-tab], [data-proj], [data-back], [data-reload]' : '[data-app], [data-home]';
    for (const el of root.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest('[hidden]') || !el.offsetParent) continue;
      const r = localRect(el, root);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        el.click();
        return true;
      }
    }
    return false;
  }

  setSize(w: number, h: number) {
    this.renderer.setSize(w, h);
  }

  render(camera: THREE.PerspectiveCamera) {
    // CSS scene is the WebGL scene scaled by S
    this.cam.fov = camera.fov;
    this.cam.aspect = camera.aspect;
    this.cam.near = camera.near * S;
    this.cam.far = camera.far * S;
    this.cam.updateProjectionMatrix();
    this.cam.position.copy(camera.position).multiplyScalar(S);
    this.cam.quaternion.copy(camera.quaternion);
    this.cam.updateMatrixWorld();
    for (const s of this.screens) {
      s.anchor.updateWorldMatrix(true, false);
      s.anchor.matrixWorld.decompose(s.obj.position, s.obj.quaternion, this.tmpS);
      s.obj.position.multiplyScalar(S);
      s.obj.scale.setScalar(((s.widthM * S) / s.px) * this.tmpS.x); // follows its mesh if that's scaled
      // a hidden mesh (or one inside a hidden group) hides its page too
      let shown = true;
      for (let o: THREE.Object3D | null = s.anchor; o && shown; o = o.parent) shown = o.visible;
      s.obj.visible = shown;
    }
    this.renderer.render(this.scene, this.cam);
  }
}

/** An element's box in its screen's own (untransformed) CSS pixels, accounting for scrolled containers. */
function localRect(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const parent = n.offsetParent as HTMLElement | null;
    for (let a: HTMLElement | null = n.parentElement; a && a !== parent && a !== root; a = a.parentElement) {
      x -= a.scrollLeft;
      y -= a.scrollTop;
    }
    if (parent && parent !== root) {
      x -= parent.scrollLeft;
      y -= parent.scrollTop;
    }
    n = parent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
