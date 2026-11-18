// Mounts the 3D desk into the hero "tour" section. Loaded lazily from main.ts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import content from '../content.json';
import { makeMaterials, setMaxAnisotropy } from './materials';
import { buildDesk, TEXT_LAYER } from './props';
import { buildStops } from './stops';
import { Cat } from './cat';
import { Play } from './play';
import { Screens } from './screens';
import { sfx } from '../sound';
import { describeStats, fetchServerStats } from '../stats';

type Project = (typeof content.projects)[number] & { previewUrl?: string; mobile?: boolean };
const projects = content.projects as Project[];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function mount(tour: HTMLElement) {
  // textures are drawn with the page fonts
  await Promise.all([document.fonts.load('800 100px "Space Grotesk"'), document.fonts.load('400 30px "Space Mono"'), document.fonts.ready]);
  const sticky = tour.querySelector<HTMLElement>('[data-sticky]')!;
  const stage = tour.querySelector<HTMLElement>('[data-stage]')!;
  const heroCopy = tour.querySelector<HTMLElement>('.hero-copy');
  const stops = buildStops();
  const lowTier = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  const dark = () => getComputedStyle(document.documentElement).colorScheme === 'dark';

  // ── renderer: full resolution, crisp shadows, studio reflections ──
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowTier ? 1 : 1.5)); // the painted look doesn't need more
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // genuinely soft, blurred shadows
  renderer.domElement.className = 'tour-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.after(renderer.domElement);
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);

  const sun = new THREE.DirectionalLight(0xff9460, 3.4);
  sun.position.set(-3.0, 1.9, 1.7); // low evening sun through the window: long shadows, coral patches
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(1024); // blurred anyway
  Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 1.4, bottom: -1.2, near: 1, far: 8 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.003;
  sun.shadow.radius = 9;
  sun.shadow.blurSamples = 8;
  // warm sky above, warm wood bounce below: the ambient that fills the shadows
  const hemi = new THREE.HemisphereLight(0x5a6fb0, 0x5a2c4c, 1.15); // cool blue sky, violet bounce
  // broad, shadowless fill from the room side so light spreads evenly across the desk and walls
  const fill = new THREE.DirectionalLight(0x7f9be0, 0.55); // cool front fill
  fill.position.set(1.5, 1.6, 2.5);
  scene.add(fill);
  scene.add(sun, hemi);

  // ── post: ambient occlusion (soft contact shadows), warm grade, tone mapping ──
  // every pass keeps the alpha channel, so the live screens still show through their holes
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  let gtao: GTAOPass | null = null;
  if (!lowTier) {
    gtao = new GTAOPass(scene, camera, 512, 512);
    gtao.blendIntensity = 0.7;
    gtao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1.4, thickness: 1, scale: 1, samples: 8 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
    const fullSize = gtao.setSize.bind(gtao);
    gtao.setSize = (w: number, h: number) => fullSize(Math.ceil(w / 2), Math.ceil(h / 2)); // half-res AO
    composer.addPass(gtao);
  }
  // painted look: Kuwahara brush strokes, soft ink edges, canvas weave (alpha kept for the live screens)
  const paint = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tMask: { value: null }, uR: { value: lowTier ? 2 : 3 }, uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, uStrength: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tMask; uniform int uR; uniform vec2 uTexel; uniform float uStrength; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
        vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
        for (int j = 0; j <= 3; j++) {
          if (j > uR) break;
          for (int i = 0; i <= 3; i++) {
            if (i > uR) break;
            vec3 c;
            c = texture2D(tDiffuse, vUv + vec2(-i, -j) * uTexel).rgb; m0 += c; s0 += c * c;
            c = texture2D(tDiffuse, vUv + vec2( i, -j) * uTexel).rgb; m1 += c; s1 += c * c;
            c = texture2D(tDiffuse, vUv + vec2(-i,  j) * uTexel).rgb; m2 += c; s2 += c * c;
            c = texture2D(tDiffuse, vUv + vec2( i,  j) * uTexel).rgb; m3 += c; s3 += c * c;
          }
        }
        float n = float((uR + 1) * (uR + 1));
        vec3 col = base.rgb; float best = 1e9; vec3 m, v; float sv;
        m = m0 / n; v = abs(s0 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m1 / n; v = abs(s1 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m2 / n; v = abs(s2 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m3 / n; v = abs(s3 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        // soft ink along edges (luminance Sobel)
        float tl = dot(texture2D(tDiffuse, vUv + uTexel * vec2(-1.5, 1.5)).rgb, vec3(0.333));
        float tr = dot(texture2D(tDiffuse, vUv + uTexel * vec2(1.5, 1.5)).rgb, vec3(0.333));
        float bl = dot(texture2D(tDiffuse, vUv + uTexel * vec2(-1.5, -1.5)).rgb, vec3(0.333));
        float br = dot(texture2D(tDiffuse, vUv + uTexel * vec2(1.5, -1.5)).rgb, vec3(0.333));
        float edge = length(vec2(tr + br - tl - bl, tl + tr - bl - br));
        col *= 1.0 - smoothstep(0.06, 0.32, edge) * 0.22;
        // canvas: woven threads plus a little tooth
        vec2 px = vUv / uTexel;
        float weave = (sin(px.x * 1.9) * sin(px.y * 1.9)) * 0.5 + 0.5;
        float tooth = h21(floor(px / 1.5));
        col *= 1.0 + ((weave - 0.5) * 0.035 + (tooth - 0.5) * 0.03);
        float sharp = texture2D(tMask, vUv).r; // 1 where readable text is visible
        gl_FragColor = vec4(mix(base.rgb, col, uStrength * (1.0 - sharp)), base.a);
      }`,
  });
  composer.addPass(paint);

  // text mask: everything black (for depth), then text-layer meshes white where they're visible
  const textMask = new THREE.WebGLRenderTarget(1, 1);
  paint.uniforms.tMask.value = textMask.texture;
  const maskBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const maskWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, depthFunc: THREE.LessEqualDepth });
  const clearCol = new THREE.Color();
  const renderTextMask = () => {
    const bg = scene.background;
    const clearA = renderer.getClearAlpha();
    renderer.getClearColor(clearCol);
    scene.background = null;
    renderer.shadowMap.autoUpdate = false; // shadows are drawn by the main pass
    renderer.setRenderTarget(textMask);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    scene.overrideMaterial = maskBlack;
    renderer.render(scene, camera);
    camera.layers.set(TEXT_LAYER);
    scene.overrideMaterial = maskWhite;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = true;
    camera.layers.set(0);
    scene.overrideMaterial = null;
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearCol, clearA);
    renderer.shadowMap.autoUpdate = true;
    scene.background = bg;
  };
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVig: { value: 0.42 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec3 col = c.rgb;
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        // split toning: cool teal-blue shadows, warm coral highlights
        float k = smoothstep(0.03, 0.55, l);
        col *= mix(vec3(0.72, 0.9, 1.3), vec3(1.22, 0.9, 0.78), k);
        col += vec3(0.004, 0.008, 0.02) * (1.0 - k);                  // shadows never go dead black
        // storybook richness: saturation and a little contrast
        float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l2), col, 1.3);
        col = max(col, 0.0);
        col = pow(col, vec3(1.08)) * 1.06;
        vec2 d = vUv - 0.5;
        col *= 1.0 - uVig * dot(d, d) * 1.7;                           // dusky vignette
        gl_FragColor = vec4(col, c.a);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  const M = makeMaterials();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const desk = buildDesk(M, aniso);
  scene.add(desk.root);

  const cat = new Cat(lowTier ? 6 : 12);
  cat.root.position.copy(desk.basketSpot);
  cat.root.rotation.y = 1.1;
  scene.add(cat.root);

  const screens = new Screens(sticky, { anchor: desk.laptopScreen, widthM: desk.SCR_W }, { anchor: desk.phoneScreen, widthM: desk.PH_W });

  const applyTheme = () => {
    const d = dark();
    scene.background = new THREE.Color(d ? 0x0b1020 : 0x1d2846);
    scene.environmentIntensity = d ? 0.08 : 0.22;
    sun.intensity = d ? 0.35 : 3.4;
    fill.intensity = d ? 0.12 : 0.55;
    sun.color.set(d ? 0x7f95ff : 0xff9460);
    hemi.intensity = d ? 0.5 : 1.15;
    hemi.color.set(d ? 0x6a5a7a : 0x5a6fb0);
    hemi.groundColor.set(d ? 0x7a4426 : 0x5a2c4c); // night: warm bounce from the lamp-lit wood
    desk.lampGlow.intensity = d ? 4.5 : 0;
    desk.lampLight.intensity = d ? 7 : 0;
    desk.keyMat.emissiveIntensity = d ? 0.35 : 0;
    (desk.windowMesh.material as THREE.MeshBasicMaterial).color.set(d ? 0x2c3550 : 0xc4a8d8); // dusk sky
    renderer.toneMappingExposure = d ? 1.1 : 1.0;
  };
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── camera rail ──
  const posCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.pos), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.look), false, 'centripetal');
  const camPos = stops[0].pos.clone();
  const camLook = stops[0].look.clone();
  const tmpP = new THREE.Vector3();
  const tmpL = new THREE.Vector3();
  let progress = 0;
  tour.style.setProperty('--stops', String(stops.length));
  tour.classList.add('has-3d');

  // ── captions ──
  const web = projects.filter((p) => p.previewUrl && !p.mobile);
  const apps = projects.filter((p) => p.previewUrl && p.mobile);
  const buttons: Record<string, string> = {
    basket: `<button class="btn btn-solid" data-act="play">Play as the cat</button>`,
    laptop: `<button class="btn btn-solid" data-act="use-laptop">Use the laptop</button>${web.map((p) => `<button class="btn" data-act="tab" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}`,
    phone: `<button class="btn btn-solid" data-act="use-phone">Use the phone</button>${apps.map((p) => `<button class="btn" data-act="app" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}`,
    pinboard: `<a class="btn" href="#about">About</a><a class="btn" href="#academics">Academics</a><a class="btn" href="#expertise">Tech Stack</a>`,
    server: `<p class="tour-stats" data-stats>Checking on the server…</p>`,
    console: `<button class="btn btn-solid" data-act="arcade">Play Punch It Out</button>`,
    printer: `<button class="btn btn-solid" data-act="print">Print résumé</button><a class="btn" href="/resume.html">Open PDF</a>`,
  };
  const captions = document.createElement('ol');
  captions.className = 'tour-captions';
  captions.innerHTML = stops
    .map((s, i) =>
      i === 0
        ? '<li></li>'
        : `<li class="tour-caption"><p class="cap-num">${s.num} / ${String(stops.length - 1).padStart(2, '0')}</p><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><div class="cap-btns">${buttons[s.id] ?? ''}</div></li>`,
    )
    .join('');
  sticky.append(captions);
  const captionEls = [...captions.children] as HTMLElement[];
  const showCaption = (i: number) => captionEls.forEach((el, j) => el.classList.toggle('on', j === i));

  const statsEl = captions.querySelector<HTMLElement>('[data-stats]');
  const refreshStats = async () => {
    if (statsEl) statsEl.textContent = describeStats(await fetchServerStats());
  };
  void refreshStats();
  setInterval(() => document.hidden || void refreshStats(), 60_000);

  const hint = document.createElement('p');
  hint.className = 'tour-hint';
  hint.textContent = '(click the cat)';
  sticky.append(hint);
  const exitBtn = document.createElement('button');
  exitBtn.className = 'btn btn-solid focus-exit';
  exitBtn.type = 'button';
  exitBtn.textContent = '← Back to the desk  (Esc)';
  sticky.append(exitBtn);
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn btn-solid play-btn';
  playBtn.innerHTML = 'Play as the cat <kbd>E</kbd>';
  sticky.append(playBtn);

  // ── screen focus: fly up to a screen and hand the pointer to the real page ──
  let focused: 'laptop' | 'phone' | null = null;
  const focusPos = new THREE.Vector3();
  const focusLook = new THREE.Vector3();
  const focus = (which: 'laptop' | 'phone') => {
    if (play.busy) play.exit();
    const anchor = which === 'laptop' ? desk.laptopScreen : desk.phoneScreen;
    const w = which === 'laptop' ? desk.SCR_W : desk.PH_W;
    const h = which === 'laptop' ? desk.SCR_W / 1.6 : desk.PH_W * (844 / 390);
    anchor.getWorldPosition(focusLook);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()));
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) * 1.3;
    focusPos.copy(focusLook).addScaledVector(n, d);
    focused = which;
    tour.classList.add('screen-focus');
    document.documentElement.classList.add('focusing'); // lock page scroll while using the screen
  };
  const unfocus = () => {
    if (!focused) return;
    focused = null;
    tour.classList.remove('screen-focus');
    document.documentElement.classList.remove('focusing');
  };
  exitBtn.addEventListener('click', unfocus);
  // While playing or using a screen, the page must not scroll (it would move the camera rail).
  // overflow:hidden on <html> breaks position:sticky, so swallow scroll input instead.
  const locked = () => /(playing|focusing)/.test(document.documentElement.className);
  addEventListener('wheel', (e) => locked() && e.preventDefault(), { passive: false });
  addEventListener('touchmove', (e) => locked() && e.preventDefault(), { passive: false });
  addEventListener('keydown', (e) => {
    if (locked() && ['PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && !(e.target as HTMLElement).closest?.('input, textarea')) e.preventDefault();
  });
  addEventListener('keydown', (e) => e.key === 'Escape' && unfocus());
  screens.onOpenOnPhone = (name) => {
    screens.openApp(name);
    focus('phone');
  };

  // ── printing the résumé ──
  let printT = -1;
  const PRINT_SECS = 3.4;
  const startPrint = () => {
    if (printT >= 0 && printT < PRINT_SECS) return;
    printT = 0;
    desk.paper.visible = true;
    sfx.print(PRINT_SECS);
  };

  // ── play mode ──
  const play = new Play(scene, cat, desk.boxes, desk.knockables, desk.props, desk.basketSpot, sticky,
    (id) => showCaption(id ? stops.findIndex((s) => s.id === id) : -1),
    (on) => {
      document.documentElement.classList.toggle('playing', on);
      active = -1;
      if (on) {
        const r = tour.getBoundingClientRect();
        if (r.top > 0 || r.bottom < innerHeight) scrollTo({ top: tour.offsetTop, behavior: 'instant' });
      } else playBtn.focus();
    });
  playBtn.addEventListener('click', () => play.enter());
  const debug: { cam: { pos: THREE.Vector3; look: THREE.Vector3 } | null } = { cam: null };
  if (location.search.includes('debug')) Object.assign(window, { __desk: { cat, play, camera, screens, desk, debug } });

  // caption buttons
  captions.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'play') play.enter();
    if (act === 'use-laptop') focus('laptop');
    if (act === 'use-phone') focus('phone');
    if (act === 'tab') {
      screens.openTab(b.dataset.name!);
      focus('laptop');
    }
    if (act === 'app') {
      screens.openApp(b.dataset.name!);
      focus('phone');
    }
    if (act === 'arcade') void import('../arcade').then((m) => m.openArcade());
    if (act === 'print') startPrint();
  });

  // ── scroll → progress ──
  const scrollToStop = (i: number) => {
    const top = tour.getBoundingClientRect().top + scrollY;
    const span = tour.offsetHeight - innerHeight;
    scrollTo({ top: top + (span * i) / (stops.length - 1), behavior: 'smooth' });
  };
  const readScroll = () => {
    const r = tour.getBoundingClientRect();
    const span = tour.offsetHeight - innerHeight;
    const raw = Math.min(1, Math.max(0, -r.top / span)) * (stops.length - 1);
    const i = Math.floor(raw);
    progress = Math.min(stops.length - 1, i + smooth(0.2, 0.8, raw - i));
  };

  // ── picking ──
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets: THREE.Object3D[] = [];
  desk.props.forEach((p) => p.object.traverse((o) => (o as THREE.Mesh).isMesh && targets.push(o)));
  const catTargets = cat.hitTargets;
  const pick = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...catTargets, ...targets], false);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    if (catTargets.includes(o as THREE.SkinnedMesh)) return 'cat';
    while (o && !o.userData.propId) o = o.parent;
    return (o?.userData.propId as string) ?? null;
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    renderer.domElement.style.cursor = pick(e) ? 'pointer' : '';
  });
  const actions: Record<string, () => void> = {
    laptop: () => focus('laptop'),
    phone: () => focus('phone'),
    glass: () => {
      screens.openApp('HydroSync');
      focus('phone');
    },
    boardgame: () => {
      screens.openTab('Plassey 1757');
      focus('laptop');
    },
    console: () => void import('../arcade').then((m) => m.openArcade()),
    printer: () => (printT >= PRINT_SECS ? (location.href = '/resume.html') : startPrint()),
    pinboard: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }),
    basket: () => {
      cat.poke();
      sfx.purr();
    },
  };
  const stopOf: Record<string, string> = { glass: 'phone', boardgame: 'laptop' };
  renderer.domElement.addEventListener('click', (e) => {
    const hit = pick(e);
    if (hit === 'cat') {
      cat.poke();
      sfx.purr();
      hint.classList.add('done');
      return;
    }
    if (!hit) return;
    const i = stops.findIndex((s) => s.id === (stopOf[hit] ?? hit));
    // first click flies to the object; once you're there (or playing) it opens
    if (play.active || i === Math.round(progress) || i < 0) actions[hit]?.();
    else scrollToStop(i);
  });

  // ── resize ──
  const resize = () => {
    const w = sticky.clientWidth;
    const h = sticky.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    const pr = renderer.getPixelRatio();
    (paint.uniforms.uTexel.value as THREE.Vector2).set(2.2 / w, 2.2 / h);
    textMask.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2)); // half-res mask is plenty // brush size in CSS px, same on any display
    void pr;
    screens.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 55 : camera.aspect < 1.2 ? 44 : 35;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(sticky);
  resize();

  // ── loop ──
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(tour);
  const clock = new THREE.Clock();
  const hintPos = new THREE.Vector3();
  const junkP = new THREE.Vector3();
  const junkL = new THREE.Vector3();
  let active = -1;

  // if the GPU gives up, fall back to the plain page instead of a blank box
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    renderer.setAnimationLoop(null);
    tour.classList.remove('has-3d', 'ready');
    tour.style.removeProperty('--stops');
  });
  // first ~2 s: if frames are slow, shed the expensive bits
  let probeT = 0;
  let probeN = 0;
  let downgraded = false;
  const probe = (dt: number) => {
    if (downgraded || document.hidden) return;
    probeT += dt;
    probeN++;
    if (probeN < 120) return;
    if (probeT / probeN > 1 / 35) {
      if (gtao) gtao.enabled = false;
      paint.uniforms.uR.value = 2;
      renderer.setPixelRatio(1);
      resize();
    }
    downgraded = true;
  };

  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    probe(raw);
    if (!visible || document.hidden) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 6);

    if (focused) {
      camPos.lerp(focusPos, k);
      camLook.lerp(focusLook, k);
    } else if (play.active) {
      play.update(dt, t, camPos, camLook, camera.aspect < 1);
    } else {
      if (play.busy) play.update(dt, t, junkP, junkL, false); // the leap back to the basket
      readScroll();
      const u = progress / (stops.length - 1);
      posCurve.getPoint(u, tmpP);
      lookCurve.getPoint(u, tmpL);
      if (camera.aspect < 0.8) tmpP.z += 0.35 * (1 - smooth(0, 1, progress)); // portrait: step back on the wide shot
      camPos.lerp(tmpP, k);
      camLook.lerp(tmpL, k);
      const idx = Math.round(progress);
      if (idx !== active) {
        active = idx;
        showCaption(idx);
      }
    }
    if (debug.cam) {
      camPos.copy(debug.cam.pos);
      camLook.copy(debug.cam.look);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // résumé sliding out of the printer in stepper-motor jerks, then settling in the tray
    if (printT >= 0 && printT <= PRINT_SECS + 0.5) {
      printT += dt;
      const steps = Math.min(1, printT / PRINT_SECS);
      const jerky = (Math.floor(steps * 18) + smooth(0, 1, (steps * 18) % 1)) / 18;
      desk.paper.position.set(0, 0.047 - 0.03 * jerky, -0.03 + 0.21 * jerky);
      desk.paper.rotation.x = -Math.PI / 2 + 0.22 * (1 - jerky) - 0.06 * jerky;
    }

    const introFade = play.active || focused ? 0 : 1 - smooth(0.05, 0.45, progress);
    if (heroCopy) heroCopy.style.opacity = String(introFade);
    const nearBasket = !play.busy && Math.abs(progress - 1) < 0.4;
    hint.style.opacity = String(nearBasket ? 1 : 0);
    hintPos.copy(cat.root.position).y += 0.32;
    hintPos.project(camera);
    hint.style.transform = `translate(-50%, -100%) translate(${(hintPos.x * 0.5 + 0.5) * sticky.clientWidth}px, ${(-hintPos.y * 0.5 + 0.5) * sticky.clientHeight}px)`;

    cat.update(dt, t);
    renderTextMask();
    composer.render(dt);
    screens.render(camera);
  });

  requestAnimationFrame(() => tour.classList.add('ready'));
}
