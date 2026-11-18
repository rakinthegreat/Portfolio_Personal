// Real web pages on the Victus and the phone. The pages live in a CSS3D layer under the WebGL canvas;
// each screen mesh in the 3D scene punches a transparent hole so the page shows through it, and
// anything in front of the screen (the cat, the lid edge) still covers it.
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import content from '../content.json';

type Project = (typeof content.projects)[number] & { previewUrl?: string; mobile?: boolean; icon?: string; color?: string; downloadUrl?: string };
const projects = content.projects as Project[];
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

  constructor(container: HTMLElement, laptop: { anchor: THREE.Object3D; widthM: number }, phone: { anchor: THREE.Object3D; widthM: number }) {
    this.renderer.domElement.className = 'tour-css';
    container.prepend(this.renderer.domElement);
    this.add(laptop.anchor, laptop.widthM, 1280, this.buildLaptop());
    this.add(phone.anchor, phone.widthM, 390, this.buildPhone());
  }

  private add(anchor: THREE.Object3D, widthM: number, px: number, el: HTMLElement) {
    const obj = new CSS3DObject(el);
    this.scene.add(obj);
    this.screens.push({ anchor, widthM, px, obj });
  }

  // ── the Victus: a small browser ──────────────────────
  private buildLaptop() {
    const el = document.createElement('div');
    el.className = 'scr browser';
    el.style.width = '1280px';
    el.style.height = '800px';
    const web = projects.filter((p) => p.previewUrl && !p.mobile);
    el.innerHTML = `
      <div class="browser-tabs" role="tablist">
        <button class="browser-tab" role="tab" aria-selected="true" data-tab="">Projects · Rakin</button>
        ${web.map((p) => `<button class="browser-tab" role="tab" aria-selected="false" data-tab="${esc(p.name)}">${esc(p.name)}</button>`).join('')}
      </div>
      <div class="browser-bar"><span>◀ ▶ ⟳</span><span class="browser-url" data-url>rakin-talukder.me/projects</span></div>
      <div class="browser-body" data-body></div>`;
    this.tabs = el.querySelector('.browser-tabs')!;
    this.laptopBody = el.querySelector('[data-body]')!;
    this.laptopUrl = el.querySelector('[data-url]')!;
    this.tabs.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (t) this.openTab(t.dataset.tab || null);
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
      <div class="phone-status"><time data-phone-clock>9:41</time><span>●●● 5G</span></div>
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
    this.phoneScreen.querySelectorAll('iframe').forEach((f) => (f.hidden = true));
    let launcher = this.phoneScreen.querySelector<HTMLElement>('.launcher');
    if (!launcher) {
      launcher = document.createElement('div');
      launcher.className = 'launcher';
      launcher.innerHTML = `<h2 data-big-clock></h2>${projects
        .filter((p) => p.mobile)
        .map((p) => `<button class="app" type="button" data-app="${esc(p.name)}"><i style="background:${p.color ?? '#333'}">${esc(p.icon ?? p.name[0])}</i>${esc(p.name)}</button>`)
        .join('')}`;
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
      s.obj.scale.setScalar((s.widthM * S) / s.px);
    }
    this.renderer.render(this.scene, this.cam);
  }
}
