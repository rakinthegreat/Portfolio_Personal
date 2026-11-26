// Mounts the 3D desk into the hero "tour" section. Loaded lazily from main.ts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import content from '../content.json';
import { makeMaterials, setMaxAnisotropy } from './materials';
import { buildDesk, TEXT_LAYER } from './props';
import { buildStops } from './stops';
import { Cat } from './cat';
import { Play } from './play';
import { Screens } from './screens';
import { buildPinCards, CARD_PX, rasterizeCards } from './pincards';
import { buildCalculator, CALC_PX } from './calculator';
import { buildDeskClock, buildPlaque, CLOCK_PX, PLAQUE_PX, plaqueUnlocked } from './plaque';
import { sfx, soundOn, setSound } from '../sound';
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
  await Promise.all([document.fonts.load('800 100px "Space Grotesk"'), document.fonts.load('400 30px "Space Mono"'), document.fonts.load('400 100px "Caveat Brush"'), document.fonts.load('400 40px "Patrick Hand"'), document.fonts.ready]);
  const sticky = tour.querySelector<HTMLElement>('[data-sticky]')!;
  const stage = tour.querySelector<HTMLElement>('[data-stage]')!;
  const heroCopy = tour.querySelector<HTMLElement>('.hero-copy');
  /** ?bootlog: a named moment in the build, next to the frame and long-task log index.html keeps */
  const mark = (n: string) => (window as unknown as { __boot?: { marks: [string, number][] } }).__boot?.marks.push([n, Math.round(performance.now())]);
  mark('mount');
  const stops = buildStops();
  const lowTier = (navigator.hardwareConcurrency ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  let gateSince = Infinity; // when the entry screen's 3D poster was last woken (first frame, a resize): drawn 2.5 s
  const dark = () => getComputedStyle(document.documentElement).colorScheme === 'dark';

  // ── renderer: full resolution, crisp shadows, studio reflections ──
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  // the painted look doesn't need many pixels: phones draw at 1x; elsewhere it starts at 1.25x and the frame-rate
  // governor below moves it between 1x and 1.5x
  let legacy = false;
  const benchPr = Number(new URLSearchParams(location.search).get('pr')) || 0; // ?bench&pr=1.5: a fixed ratio to compare at
  renderer.setPixelRatio(Math.min(devicePixelRatio, benchPr || (lowTier ? 1 : 1.25)));
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
  // no MSAA on the scene: the watercolour smears every edge anyway, and SMAA at the very end cleans up the rest
  // (4x MSAA on a half-float target was a lot of memory traffic, the thing laptop GPUs have least of)
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  let gtao: GTAOPass | null = null;
  if (!lowTier) {
    gtao = new GTAOPass(scene, camera, 512, 512);
    gtao.blendIntensity = 0.7;
    gtao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1.4, thickness: 1, scale: 1, samples: 8 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 8 });
    const fullSize = gtao.setSize.bind(gtao);
    gtao.setSize = (w: number, h: number) => fullSize(Math.ceil(w / 2), Math.ceil(h / 2)); // half-res AO
    const gtaoRender = gtao.render.bind(gtao);
    gtao.render = (...a: Parameters<GTAOPass['render']>) => {
      desk.lampBeam.visible = false; // light in the air has no surface to occlude
      gtaoRender(...a);
      desk.lampBeam.visible = true;
    };
    composer.addPass(gtao);
  }
  // motion blur on the cat: the image is smeared along his screen-space velocity, only where he is
  // (a cat-only mask, sampled along the same line so the streak reaches past his outline)
  const CAT_LAYER = 3;
  const catMask = new THREE.WebGLRenderTarget(1, 1);
  const blur = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tCat: { value: catMask.texture }, uVel: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tCat; uniform vec2 uVel; varying vec2 vUv;
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec3 acc = vec3(0.0); float m = 0.0;
        for (int i = 0; i < 12; i++) {
          vec2 uv = vUv - uVel * (float(i) / 11.0 - 0.35); // trail more behind than ahead
          acc += texture2D(tDiffuse, uv).rgb;
          m = max(m, texture2D(tCat, uv).r);
        }
        gl_FragColor = vec4(mix(base.rgb, acc / 12.0, m), base.a);
      }`,
  });
  blur.enabled = false;
  composer.addPass(blur);
  // watercolour: flat washes (Kuwahara), a hand-drawn wobble, pigment pooling along the edges of each
  // wash, granulation in the paper's tooth, uneven wash density and warm/cool blooms (alpha kept for the
  // live screens; readable text is mixed back in untouched)
  const paint = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, tMask: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, uRes: { value: new THREE.Vector2(1024, 1024) }, uStrength: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      // Kuwahara radius 2 (9 samples a quadrant, a fixed loop the compiler unrolls), spaced 1.5x wider on
      // bigger screens so the brush is the size the old radius 3 gave (16 a quadrant)
      uniform sampler2D tDiffuse; uniform sampler2D tMask; uniform vec2 uTexel; uniform vec2 uRes; uniform float uStrength; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.9375; }
      float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
      // pigment density (Bousseau et al.): d > 1 deepens a colour the way more pigment would, d < 1 thins it
      vec3 pigment(vec3 c, float d) { return max(c * (1.0 - (1.0 - min(c, vec3(1.0))) * (d - 1.0)), 0.0); }
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec2 px = vUv * uRes; // CSS pixels: the paper looks the same on every screen
        // the hand wobbles: shapes drift a couple of pixels along slow noise
        vec2 uv = vUv + (vec2(fbm(px / 42.0), fbm(px / 42.0 + 31.7)) - 0.5) * uTexel * 2.4;
        // flat washes: Kuwahara
        vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
        vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
        vec2 kt = uTexel * KSTEP;
        for (int j = 0; j <= R; j++) {
          for (int i = 0; i <= R; i++) {
            vec2 o = vec2(float(i), float(j)) * kt;
            vec3 c;
            c = texture2D(tDiffuse, uv - o).rgb; m0 += c; s0 += c * c;
            c = texture2D(tDiffuse, uv + vec2(o.x, -o.y)).rgb; m1 += c; s1 += c * c;
            c = texture2D(tDiffuse, uv + vec2(-o.x, o.y)).rgb; m2 += c; s2 += c * c;
            c = texture2D(tDiffuse, uv + o).rgb; m3 += c; s3 += c * c;
          }
        }
        float n = float((R + 1) * (R + 1));
        vec3 col = base.rgb; float best = 1e9; vec3 m, v; float sv;
        m = m0 / n; v = abs(s0 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m1 / n; v = abs(s1 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m2 / n; v = abs(s2 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        m = m3 / n; v = abs(s3 / n - m * m); sv = v.r + v.g + v.b; if (sv < best) { best = sv; col = m; }
        // pigment pools where one wash meets another: a darker, slightly ragged rim
        vec2 e = uTexel * 1.2;
        float tl = lum(texture2D(tDiffuse, uv + vec2(-e.x, e.y)).rgb), tr = lum(texture2D(tDiffuse, uv + e).rgb);
        float bl = lum(texture2D(tDiffuse, uv - e).rgb), br = lum(texture2D(tDiffuse, uv + vec2(e.x, -e.y)).rgb);
        float edge = length(vec2(tr + br - tl - bl, tl + tr - bl - br)) / (0.25 + lum(col));
        float rim = smoothstep(0.05, 0.5, edge) * (0.55 + 0.45 * vn(px / 3.0));
        // density: rim + granulation in the paper's tooth + uneven, blotchy washes
        float grain = vn(px / 1.8) * 0.6 + vn(px / 5.0) * 0.4;
        float blot = fbm(px / 110.0 + 3.1);
        float d = 1.0 + rim * 0.5 + (grain - 0.5) * 0.22 + (blot - 0.5) * 0.5;
        col = pigment(col, d);
        // warm and cool blooms drifting through the washes
        float hue = smoothstep(0.3, 0.7, fbm(px / 190.0 + 9.4));
        col *= mix(vec3(1.06, 0.99, 0.92), vec3(0.93, 0.99, 1.08), hue);
        // paper: a cold-press tooth and faint fibres
        float fibre = vn(vec2(px.x / 1.1 + px.y / 7.0, px.y / 1.6));
        col *= 0.975 + 0.035 * vn(px / 1.25) + 0.012 * fibre;
        float sharp = texture2D(tMask, vUv).r; // 1 where readable text is visible
        gl_FragColor = vec4(mix(base.rgb, col, uStrength * (1.0 - sharp)), base.a);
      }`,
  });
  paint.material.defines = { R: 2, KSTEP: lowTier ? '1.0' : '1.5' };
  composer.addPass(paint);

  // text mask: everything black (for depth), then text-layer meshes white where they're visible
  const textMask = new THREE.WebGLRenderTarget(1, 1); // half resolution: filtering gives the soft edge where text meets paint
  paint.uniforms.tMask.value = textMask.texture;
  const maskBlack = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const maskWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, depthFunc: THREE.LessEqualDepth });
  const clearCol = new THREE.Color();
  const renderTextMask = () => {
    const bg = scene.background;
    const clearA = renderer.getClearAlpha();
    renderer.getClearColor(clearCol);
    scene.background = null;
    desk.lampBeam.visible = false;
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
    desk.lampBeam.visible = true;
  };
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uVig: { value: 0.42 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uVig; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec3 col = c.rgb;
        // highlight shoulder: anything past 0.55 rolls off smoothly instead of blowing out to white
        float l0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (l0 > 0.55) { float x = l0 - 0.55; col *= (0.55 + x / (1.0 + x / 0.45)) / l0; }
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        // split toning: cool teal-blue shadows, warm coral highlights
        float k = smoothstep(0.03, 0.55, l);
        col *= mix(vec3(0.72, 0.9, 1.3), vec3(1.22, 0.9, 0.78), k);
        col += vec3(0.004, 0.008, 0.02) * (1.0 - k);                  // shadows never go dead black
        // storybook richness: saturation and a little contrast
        float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l2), col, mix(1.3, 1.05, smoothstep(0.35, 0.9, l2))); // less push in the brights
        col = max(col, 0.0);
        col = pow(col, vec3(1.08)) * 1.06;
        vec2 d = vUv - 0.5;
        col *= 1.0 - uVig * dot(d, d) * 1.7;                           // dusky vignette
        gl_FragColor = vec4(col, c.a);
      }`,
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass());

  // building the room is heavy: hand the main thread back between the big steps so the loading screen keeps moving
  const breathe = () => new Promise<void>((r) => setTimeout(r, 0));
  await breathe();
  mark('materials');
  const M = makeMaterials();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  mark('desk');
  const desk = buildDesk(M, aniso);
  await breathe();
  scene.add(desk.root);

  mark('cat');
  const cat = new Cat(lowTier ? 8 : 16);
  cat.root.position.copy(desk.basketSpot);
  cat.root.rotation.y = 1.1;
  scene.add(cat.root);
  cat.root.traverse((o) => o.layers.enable(CAT_LAYER));
  const maskWhite2 = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lastCat = cat.root.position.clone();
  const catV = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const blurClear = new THREE.Color();
  /** Velocity → blur length; renders the cat mask only while he's actually moving. */
  const updateBlur = (dt: number) => {
    catV.copy(cat.root.position).sub(lastCat).divideScalar(Math.max(dt, 1e-3));
    lastCat.copy(cat.root.position);
    const vel = blur.uniforms.uVel.value as THREE.Vector2;
    pA.copy(cat.root.position).y += 0.07;
    pB.copy(pA).addScaledVector(catV, 0.05); // a 1/20 s shutter
    pA.project(camera);
    pB.project(camera);
    vel.set((pB.x - pA.x) * 0.5, (pB.y - pA.y) * 0.5);
    if (vel.length() > 0.035) vel.setLength(0.035);
    const px = vel.length() * sticky.clientWidth;
    blur.enabled = cat.root.visible && px > 2;
    if (!blur.enabled) return;
    const bg = scene.background;
    const clearA = renderer.getClearAlpha();
    renderer.getClearColor(blurClear);
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(catMask);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    camera.layers.set(CAT_LAYER);
    scene.overrideMaterial = maskWhite2;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.set(0);
    renderer.setRenderTarget(null);
    renderer.setClearColor(blurClear, clearA);
    renderer.shadowMap.autoUpdate = true;
    scene.background = bg;
  };

  // Proyash (from content.json): its mascot sits on the Pavilion, and the server's stop links to it
  const proyash = content.experiences.find((e) => 'mascot' in e && e.mascot);
  const proyashUrl = (proyash && 'url' in proyash ? proyash.url : '') ?? '';
  const proyashLabel = proyash ? `${proyash.role} · ${proyash.title.toLowerCase()}` : '';
  await breathe();
  mark('screens');
  const screens = new Screens(sticky, { anchor: desk.laptopScreen, widthM: desk.SCR_W }, { anchor: desk.phoneScreen, widthM: desk.PH_W });
  // the pinboard cards, from content.json, both ways: live HTML (drawn by the browser at the screen's own
  // resolution, so it's sharp) and the same layout painted onto a texture at load. Each live HTML card costs
  // ~10 ms a frame to layer over the canvas, so a card is live only while it's big enough on screen to read;
  // smaller (the wide shots, the way past), it's the texture. See placePinCards.
  const pinEls = buildPinCards();
  mark('cards');
  const pinTex = await rasterizeCards(buildPinCards(), lowTier ? 1.5 : 2);
  const pinHole = desk.pinCards[0].mesh.material as THREE.Material;
  const pinCards = desk.pinCards.map((c) => {
    const el = pinEls[c.id as keyof typeof pinEls];
    screens.addPanel(c.mesh, desk.PIN_W, CARD_PX, el);
    const map = new THREE.CanvasTexture(pinTex[c.id]);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const img = new THREE.MeshBasicMaterial({ map, toneMapped: false });
    c.mesh.layers.enable(TEXT_LAYER); // the watercolour leaves it alone, like the HTML
    return { mesh: c.mesh, el, img, live: true };
  });
  const cardL = new THREE.Vector3();
  const cardR = new THREE.Vector3();
  const cardT = new THREE.Vector3();
  const cardB = new THREE.Vector3();
  /** Live HTML for the cards that are big on screen, the texture for the rest. "Big" scales with the screen: over
   *  ~170 CSS px on a laptop, ~22% of the width on a phone (~86 px), where the 3D is drawn at 1x and an image card
   *  is soft long before it's small, e.g. walking the plank under the board as Mi Mao */
  const placePinCards = () => {
    const w = sticky.clientWidth;
    for (const c of pinCards) {
      c.mesh.updateWorldMatrix(true, false);
      cardL.set(-desk.PIN_W / 2, 0, 0).applyMatrix4(c.mesh.matrixWorld).project(camera);
      cardR.set(desk.PIN_W / 2, 0, 0).applyMatrix4(c.mesh.matrixWorld).project(camera);
      const h = (desk.PIN_W * 1.415) / 2;
      cardT.set(0, h, 0).applyMatrix4(c.mesh.matrixWorld).project(camera);
      cardB.set(0, -h, 0).applyMatrix4(c.mesh.matrixWorld).project(camera);
      // in front of the camera and at least partly on screen
      const onScreen =
        cardL.z < 1 && cardR.z < 1 && Math.max(cardL.x, cardR.x) > -1 && Math.min(cardL.x, cardR.x) < 1 &&
        Math.max(cardT.y, cardB.y) > -1 && Math.min(cardT.y, cardB.y) < 1;
      const px = onScreen ? (Math.abs(cardR.x - cardL.x) / 2) * w : 0;
      const big = Math.min(170, w * 0.22);
      const live = px > (c.live ? big * 0.88 : big); // a little hysteresis: no flicker at the edge
      if (live === c.live) continue;
      c.live = live;
      c.mesh.material = live ? pinHole : c.img;
      c.el.style.visibility = live ? '' : 'hidden';
    }
  };
  const calc = buildCalculator();
  screens.addPanel(desk.calcFace, desk.CALC_W, CALC_PX, calc.el);
  const plaque = buildPlaque();
  screens.addPanel(desk.plaqueFace, desk.PLQ_W, PLAQUE_PX, plaque.el);
  // until it's unlocked (this browser session), an ordinary desk clock stands where the plaque goes;
  // setting it to the right word blows it apart (blastClock, below) and the plaque rises in its place
  let clockLocked = !plaqueUnlocked();
  const deskClock = clockLocked ? buildDeskClock(Math.round((CLOCK_PX * desk.CLOCK_FACE_H) / desk.CLOCK_FACE_W), () => blastClock()) : null;
  if (deskClock) screens.addPanel(desk.clockFace, desk.CLOCK_FACE_W, CLOCK_PX, deskClock.el);
  desk.deskClock.visible = clockLocked;
  desk.plaque.visible = !clockLocked;

  const applyTheme = () => {
    void dark; // the evening, lamp-lit look is used in both page themes
    const d = true;
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
    (desk.lampBeam.material as THREE.ShaderMaterial).uniforms.uStrength.value = d ? 0.32 : 0;
    desk.keyMat.emissiveIntensity = d ? 1.6 : 0; // backlit legends
    (desk.windowMesh.material as THREE.MeshBasicMaterial).color.set(d ? 0x2c3550 : 0xc4a8d8); // dusk sky
    renderer.toneMappingExposure = d ? 1.0 : 0.95;
  };
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── camera rail ──
  const posCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.pos), false, 'centripetal');
  // the pinboard on a narrow screen: its stop gets extra scroll (PAN_LEN stops' worth), during which the camera holds
  // close to the board and slides across it card by card (About → Academics → Tech Stack → Experiences). The curve
  // holds the stop's own vectors, so moving them each frame moves the path in and out of it too.
  const panAt = stops.findIndex((s) => s.cards);
  const basePos = stops.map((s) => s.pos.clone());
  const baseLook = stops.map((s) => s.look.clone());
  let PAN_LEN = 0; // set on resize: 0 on wide screens (the whole board fits)
  let panT = 0; // 0 → 1 across the cards
  const placePanStop = () => {
    if (panAt < 0) return;
    const st = stops[panAt];
    if (!PAN_LEN || !st.cards) {
      st.pos.copy(basePos[panAt]);
      st.look.copy(baseLook[panAt]);
      return;
    }
    const { xs, y, z, w } = st.cards;
    const seg = panT * (xs.length - 1);
    const i = Math.min(xs.length - 2, Math.floor(seg));
    const x = THREE.MathUtils.lerp(xs[i], xs[i + 1], smooth(0.25, 0.75, seg - i)); // a beat on each card
    const d = w / 2 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    st.pos.set(x, y + 0.02, z + d);
    st.look.set(x, y, z);
  };
  const lookCurve = new THREE.CatmullRomCurve3(stops.map((s) => s.look), false, 'centripetal');
  const camPos = stops[0].pos.clone();
  const camLook = stops[0].look.clone();
  const tmpP = new THREE.Vector3();
  const tmpL = new THREE.Vector3();
  let progress = 0;
  // a click on something away from where you are flies straight to it (the scroll jumps; the camera doesn't
  // wind along the rail past everything in between): from where it was, in an eased arc
  const FLY_SECS = 1.1;
  let flyT = -1;
  const flyFromP = new THREE.Vector3();
  const flyFromL = new THREE.Vector3();
  // the entry screen: the desk shows in the top-left of a torn poster, framed on the cat,
  // which the camera keeps nudged onto a spot set from CSS (--gate-cat-x / -y, 0..1 of the screen)
  const gating = () => document.documentElement.classList.contains('gating');
  // behind the entry screen the desk is drawn at half resolution: the browser scales it up, so it reads as a soft
  // blur behind the title (and costs a quarter of the pixels); full resolution again once a view is picked
  const GATE_PR = 0.5;
  if (gating() && !location.search.includes('bench')) renderer.setPixelRatio(GATE_PR);
  const GATE_POS = new THREE.Vector3(-1.05, 0.08, 0.85);
  const gateLook = new THREE.Vector3(-1.2, -0.2, 0.1);
  const gateAim = new THREE.Vector2(0.22, 0.55);
  const aimP = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  let catPosing = false;
  if (gating()) {
    camPos.copy(GATE_POS);
    camLook.copy(gateLook);
  }
  tour.style.setProperty('--stops', String(stops.length)); // (plus the pinboard's pan length on narrow screens: resize)
  tour.classList.add('has-3d');

  // ── captions ──
  const web = projects.filter((p) => p.previewUrl && !p.mobile);
  const apps = projects.filter((p) => p.previewUrl && p.mobile);
  const buttons: Record<string, string> = {
    basket: `<button class="btn btn-solid" data-act="play">Play as Mi Mao</button>`,
    laptop: `<button class="btn btn-solid" data-act="use-laptop">Use the laptop</button><button class="btn" data-act="use-plaque">${plaqueUnlocked() ? '♥ Our song' : 'The desk clock'}</button><button class="btn" data-act="tab" data-name="__more">More projects</button>${web.map((p) => `<button class="btn" data-act="tab" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}`,
    phone: `<button class="btn btn-solid" data-act="use-phone">Use the phone</button>${apps.map((p) => `<button class="btn" data-act="app" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}<button class="btn" data-act="use-calc">Calculator</button><button class="btn" data-act="socials">Socials</button>`,
    server: `<p class="tour-stats" data-stats>Checking on the server…</p>`,
    proyash: proyashUrl ? `<a class="btn btn-solid" href="${esc(proyashUrl)}" target="_blank" rel="noopener">Visit ${esc(proyashUrl.replace(/^https?:\/\//, ''))} ↗</a>` : '',
    console: `<button class="btn btn-solid" data-act="arcade">Play Punch It Out</button>`,
    printer: `<button class="btn btn-solid" data-act="print">Print résumé</button>`,
    socials: content.socials.map((s) => `<a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener me">${esc(s.label)}</a>`).join(''),
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
  captions.querySelectorAll('.cap-btns').forEach((row) =>
    [...row.children].forEach((b, i) => b.insertAdjacentHTML('afterbegin', `<kbd class="ck-key">${i === 0 ? 'F' : i}</kbd>`)),
  );
  const captionEls = [...captions.children] as HTMLElement[];
  const showCaption = (i: number) => captionEls.forEach((el, j) => el.classList.toggle('on', j === i));
  // the socials are a stop of their own now (the books on the lower shelf): shown there, or by the books in play
  const socialsAt = stops.findIndex((s) => s.id === 'socials');
  const showSocials = () => (play.active ? showCaption(socialsAt) : jumpToStop(socialsAt));

  const statsEl = captions.querySelector<HTMLElement>('[data-stats]');
  const refreshStats = async () => {
    if (statsEl) statsEl.textContent = describeStats(await fetchServerStats());
  };
  void refreshStats();
  let disposed = false;
  setInterval(() => document.hidden || disposed || void refreshStats(), 60_000);

  const hint = document.createElement('p');
  hint.className = 'tour-hint';
  hint.textContent = '(click Mi Mao)';
  sticky.append(hint);
  const exitBtn = document.createElement('button');
  exitBtn.className = 'btn btn-solid focus-exit';
  exitBtn.type = 'button';
  exitBtn.textContent = '← Back  (Esc)';
  sticky.append(exitBtn);
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn btn-solid play-btn';
  playBtn.innerHTML = 'Play as Mi Mao <kbd>E</kbd>';
  sticky.append(playBtn);

  // ── screen focus: fly up to a screen and hand the pointer to the real page ──
  type Device = 'laptop' | 'phone' | 'calc' | 'plaque';
  let focused: Device | null = null;
  const focusPos = new THREE.Vector3();
  const focusLook = new THREE.Vector3();
  const devices: Record<Device, { anchor: THREE.Object3D; w: number; h: number }> = {
    laptop: { anchor: desk.laptopScreen, w: desk.SCR_W, h: desk.SCR_W / 1.6 },
    phone: { anchor: desk.phoneScreen, w: desk.PH_W, h: desk.PH_W * (844 / 390) },
    calc: { anchor: desk.calcFace, w: desk.CALC_W, h: desk.CALC_W * 2 },
    plaque: { anchor: desk.plaqueFace, w: desk.PLQ_W, h: (desk.PLQ_W * 5) / 3 },
  };
  const clockDevice = { anchor: desk.clockFace, w: desk.CLOCK_FACE_W, h: desk.CLOCK_FACE_H };
  const focus = (which: Device) => {
    // playing? just pause: the loop stops driving the cat while a screen is focused, and Back resumes the open world
    const { anchor, w, h } = which === 'plaque' && clockLocked ? clockDevice : devices[which];
    anchor.getWorldPosition(focusLook);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()));
    if (which === 'calc') n.add(new THREE.Vector3(0, 0, 0.5)).normalize(); // lying flat: look down at it from the front
    const onClock = which === 'plaque' && clockLocked;
    if (onClock) n.add(new THREE.Vector3(0, 0.6, 0)).normalize(); // from a little above, so its SET button shows
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) * (onClock ? 1.9 : 1.3);
    focusPos.copy(focusLook).addScaledVector(n, d);
    focused = which;
    focusKeys.innerHTML = FOCUS_KEYS[which]();
    cat.root.visible = false; // out of the way while you use the screen
    tour.classList.add('screen-focus');
    document.documentElement.classList.add('focusing'); // lock page scroll while using the screen
  };
  // a strip of this device's keys, shown while it's in use
  const focusKeys = document.createElement('p');
  focusKeys.className = 'focus-keys';
  sticky.append(focusKeys);
  // touch screens: no key hints (the clock's instructions stay, in touch words)
  const touchOnly = matchMedia('(hover: none)').matches;
  const FOCUS_KEYS: Record<Device, () => string> = {
    laptop: () => `<kbd>1–${screens.tabCount}</kbd> tabs · <kbd>R</kbd> reload · <kbd>⌫</kbd> projects · <kbd>Esc</kbd> back`,
    phone: () => `<kbd>1–${screens.appCount}</kbd> apps · <kbd>0</kbd> home · <kbd>Esc</kbd> back`,
    calc: () => `type to calculate · <kbd>Enter</kbd> EXE · <kbd>⌫</kbd> DEL · <kbd>Del</kbd> AC · <kbd>Esc</kbd> back`,
    // the locked clock is an easter egg: no instructions at all (the strip hides when empty)
    plaque: () => (clockLocked ? '' : `<kbd>Space</kbd> play / pause · <kbd>←</kbd> <kbd>→</kbd> skip · <kbd>Esc</kbd> back`),
  };
  const unfocus = () => {
    if (!focused) return;
    focused = null;
    cat.root.visible = true;
    tour.classList.remove('screen-focus');
    document.documentElement.classList.remove('focusing');
  };
  // Back / Esc leave the screen straight away, back to the laptop or phone on the desk
  // (the demo stays on its screen; ◀ on the laptop and the phone's home bar go to their home screens)
  const goBack = () => unfocus();
  exitBtn.addEventListener('click', goBack);
  // While playing or using a screen, the page must not scroll (it would move the camera rail).
  // overflow:hidden on <html> breaks position:sticky, so swallow scroll input instead.
  const locked = () => /(playing|focusing)/.test(document.documentElement.className);
  addEventListener('wheel', (e) => locked() && e.preventDefault(), { passive: false });
  addEventListener('touchmove', (e) => locked() && e.preventDefault(), { passive: false });
  addEventListener('keydown', (e) => {
    if (locked() && ['PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && !(e.target as HTMLElement).closest?.('input, textarea')) e.preventDefault();
  });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !focused) return;
    goBack();
    e.stopImmediatePropagation(); // handled: don't let play mode read the same Esc as "stop playing"
  });
  addEventListener('keydown', (e) => {
    if (focused === 'calc' && !e.ctrlKey && !e.metaKey && !e.altKey && calc.key(e.key)) e.preventDefault();
  });
  screens.onOpenOnPhone = (name) => {
    screens.openApp(name);
    focus('phone');
  };

  // ── printing the résumé ──
  let printT = -1;
  let mugWobble = 0;
  let purrT = 0;
  const mug = desk.props.find((p) => p.id === 'mug')!.object;
  const PRINT_SECS = 3.4;
  let printShown = false;
  const openResume = () => void import('../resumeDoc').then((m) => m.openResume());
  const startPrint = () => {
    if (printT >= 0 && printT < PRINT_SECS) return;
    printT = 0;
    printShown = false;
    desk.paper.visible = true;
    sfx.print(PRINT_SECS);
  };

  // ── play mode ──
  mark('play');
  const play = new Play(scene, cat, desk.boxes, desk.knockables, desk.props, desk.basketSpot, sticky,
    (id) => {
      if (id === 'socials') showSocials();
      else showCaption(id ? stops.findIndex((s) => s.id === id) : -1);
    },
    (on) => {
      document.documentElement.classList.toggle('playing', on);
      active = -1;
      if (on) {
        const r = tour.getBoundingClientRect();
        if (r.top > 0 || r.bottom < innerHeight) scrollToY(tour.offsetTop, 'instant');
      } else playBtn.focus();
    });
  playBtn.addEventListener('click', () => play.enter());
  play.setBooks(desk.shelfBooks);
  play.onInteract = (id) => {
    if (HINTS[id]?.[1]) actions[id]?.();
  };
  // ── interaction hint, bottom left: what you can do with the thing under the pointer (or next to him) ──
  // [label, does F do it while playing?]
  const HINTS: Record<string, [string, boolean]> = {
    cat: ['Pet Mi Mao', false],
    basket: ['Pet Mi Mao', false],
    laptop: ['Use the Victus', true],
    phone: ['Use the phone', true],
    calc: ['Use the calculator', true],
    plaque: ['Look at the plaque', true],
    clock: ['Look at the clock', true],
    printer: ['Print the résumé', true],
    proyash: [`${proyashLabel} · visit ${proyashUrl.replace(/^https?:\/\//, '')} ↗`, false],
    'proyash-cat': [`Squeeze ${proyash?.role ?? ''}'s cat`, true],
    console: ['Play Punch It Out', true],
    boardgame: ['Play Plassey 1757 on the Victus', true],
    pinboard: ['Read the pinboard', false],
    mug: ['Clink the mug', false],
    socials: ['Visit a profile (1–4 for the rest)', true],
    book: ['Scratch the book', true],
    pickup: ['Pick it up', true],
    drop: ['Drop it', true],
    tissues: ['Pull out a tissue', true],
    wipe: ['Wipe up the coffee', true],
  };
  // two things to do with it: [key, label] pairs
  const DUAL: Record<string, [string, string][]> = {
    tissue: [['F', 'Scrunch it into a ball'], ['G', 'Pick it up']], // the first is what tapping the hint does
    ball: [['F', 'Bat it'], ['G', 'Pick it up']],
    wipe: [['F', 'Wipe up the coffee'], ['G', 'Drop it']],
  };
  const PLAY_ONLY_IDS = new Set(['tissues']); // nothing happens clicking these on the tour
  const PLAY_ONLY: Record<string, string> = { mug: 'Walk into the mug to knock it over', basket: touchOnly ? 'Tap Stop playing to nap' : 'Press E to stop playing and nap', pinboard: 'Read the pinboard from the plank' };
  const hintEl = document.createElement('button');
  hintEl.type = 'button';
  hintEl.className = 'interact-hint';
  sticky.append(hintEl);
  let hintKey = '';
  const setHint = (id: string | null, mode: 'click' | 'key') => {
    const k = id ? `${mode}:${id}${id === 'mug' && mug.userData.tipped ? ':over' : ''}` : ''; // the hint drops once it tips
    if (k === hintKey) return;
    hintKey = k;
    if (id && mode === 'key' && DUAL[id]) {
      // each half is its own target: tapping "G Pick it up" picks it up (it used to always do the F one)
      hintEl.innerHTML = DUAL[id]
        .map(([key, label]) => `<span class="ih-act" data-do="${key === 'G' ? 'carry' : 'interact'}"><kbd>${key}</kbd><span>${label}</span></span>`)
        .join('');
      hintEl.classList.add('on');
      return;
    }
    // a mug that's already over has nothing more to offer; tissues only do anything while playing
    if ((id === 'mug' && mug.userData.tipped) || (id && mode === 'click' && PLAY_ONLY_IDS.has(id))) id = null;
    const h = id ? HINTS[id] ?? (id.startsWith('social:') ? ([`Visit ${id.slice(7)}`, false] as [string, boolean]) : null) : null;
    if (!h) {
      hintEl.classList.remove('on');
      return;
    }
    const label = mode === 'key' && !h[1] ? PLAY_ONLY[id!] ?? h[0] : h[0];
    const key = mode === 'click' ? 'CLICK' : id === 'pickup' || id === 'drop' ? 'G' : h[1] ? 'F' : '';
    hintEl.innerHTML = `${key ? `<kbd>${key}</kbd>` : ''}<span>${label}</span>`;
    hintEl.classList.add('on');
  };
  // touch: the hint is the button
  hintEl.addEventListener('click', (e) => {
    const part = (e.target as HTMLElement).closest<HTMLElement>('[data-do]')?.dataset.do;
    if (part) return void (part === 'carry' ? play.carry() : play.interact());
    if (hintKey === 'key:pickup' || hintKey === 'key:drop') play.carry();
    else play.interact();
  });
  hintEl.addEventListener('contextmenu', (e) => {
    // touch and hold on a two-way hint: the other action (pick it up / drop it)
    if (hintKey === 'key:tissue' || hintKey === 'key:ball' || hintKey === 'key:wipe') {
      e.preventDefault();
      play.carry();
    }
  });
  const debug: { cam: { pos: THREE.Vector3; look: THREE.Vector3 } | null; gateMs: number } = { cam: null, gateMs: 1 }; // gateMs 0: never rest
  if (location.search.includes('debug')) Object.assign(window, { __desk: { cat, play, camera, screens, desk, debug, renderer, scene, gatePos: GATE_POS, gateLook } });

  // caption buttons
  captions.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'play') play.enter();
    if (act === 'use-laptop') focus('laptop');
    if (act === 'use-phone') focus('phone');
    if (act === 'use-calc') focus('calc');
    if (act === 'use-plaque') focus('plaque');
    if (act === 'socials') showSocials();
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
  // scroll ↔ tour: one unit of scroll per stop-to-stop, plus PAN_LEN units held at the pinboard on narrow screens
  const scrollUnits = () => stops.length - 1 + PAN_LEN;
  // on touch screens the desk scrolls inside its own full-screen box, not the page: the page never moves, so the
  // phone's address bar stays put instead of sliding in and out (which resized everything mid-scroll)
  const deskBox = () => (matchMedia('(hover: none)').matches ? tour.closest<HTMLElement>('.desk') : null);
  const scrollToY = (top: number, behavior: ScrollBehavior) => (deskBox() ?? window).scrollTo({ top, behavior });
  const scrollToStop = (i: number) => {
    const top = tour.getBoundingClientRect().top + (deskBox()?.scrollTop ?? scrollY);
    const span = tour.offsetHeight - innerHeight;
    const at = panAt >= 0 && i > panAt ? i + PAN_LEN : i; // arriving at the pinboard: its first card
    scrollToY(top + (span * at) / scrollUnits(), 'smooth');
  };
  // our own scroll line along the top (the browser's scrollbar is hidden in both views)
  const scrollLine = tour.closest('.desk')?.querySelector<HTMLElement>('[data-desk-progress]') ?? null;
  let lineAt = -1;
  /** Straight there: the scroll jumps to the stop, the camera flies from where it is. */
  const jumpToStop = (i: number) => {
    flyFromP.copy(camPos);
    flyFromL.copy(camLook);
    flyT = 0;
    const top = tour.getBoundingClientRect().top + (deskBox()?.scrollTop ?? scrollY);
    const span = tour.offsetHeight - innerHeight;
    const at = panAt >= 0 && i > panAt ? i + PAN_LEN : i;
    scrollToY(top + (span * at) / scrollUnits(), 'instant');
  };
  const readScroll = () => {
    const r = tour.getBoundingClientRect();
    const span = tour.offsetHeight - innerHeight;
    const f = Math.min(1, Math.max(0, -r.top / span));
    if (scrollLine && Math.abs(f - lineAt) > 0.0005) scrollLine.style.transform = `scaleX(${(lineAt = f)})`;
    let x = f * scrollUnits();
    panT = 0;
    if (PAN_LEN && panAt >= 0 && x > panAt) {
      if (x < panAt + PAN_LEN) {
        panT = (x - panAt) / PAN_LEN;
        x = panAt; // the caption and the stop hold while the camera crosses the board
      } else {
        panT = 1;
        x -= PAN_LEN;
      }
    }
    const i = Math.floor(x);
    progress = Math.min(stops.length - 1, i + smooth(0.2, 0.8, x - i));
    placePanStop();
  };

  // ── picking ──
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targets: THREE.Object3D[] = [];
  desk.props.forEach((p) => p.object.traverse((o) => (o as THREE.Mesh).isMesh && targets.push(o)));
  const catTargets = cat.hitTargets;
  let lastHit: THREE.Intersection | null = null;
  const pick = (e: MouseEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...catTargets, ...targets], false);
    lastHit = hits[0] ?? null;
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    if (catTargets.includes(o as THREE.SkinnedMesh)) return 'cat';
    while (o && !o.userData.propId) o = o.parent;
    return (o?.userData.propId as string) ?? null;
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    const id = pick(e);
    renderer.domElement.style.cursor = id ? 'pointer' : '';
    if (!play.active && !focused) setHint(id, 'click');
  });
  renderer.domElement.addEventListener('pointerleave', () => !play.active && setHint(null, 'click'));
  const actions: Record<string, () => void> = {
    laptop: () => focus('laptop'),
    phone: () => focus('phone'),
    calc: () => focus('calc'),
    boardgame: () => {
      screens.openTab('Plassey 1757');
      focus('laptop');
    },
    console: () => void import('../arcade').then((m) => m.openArcade()),
    printer: () => (printT >= PRINT_SECS ? openResume() : startPrint()),
    plaque: () => focus('plaque'),
    clock: () => focus('plaque'), // the clock stands in the plaque's spot: same close-up
    'proyash-cat': () => squeezePlush(),
    // F by the books opens the first profile; on the tour, clicking the shelf shows the socials caption
    socials: () => (play.active ? captionEls[socialsAt]?.querySelector<HTMLElement>('.cap-btns > a')?.click() : showSocials()),
    pinboard: () => {}, // nothing to open: it's read where it hangs
    basket: () => {
      cat.poke();
      sfx.purr();
    },
    mug: () => {
      mugWobble = 1;
      sfx.clink();
    },
  };
  // the clock's physical SET button: while you're looking at the clock the page layer has the pointer,
  // so clicks there that miss the display are cast into the scene to see if they hit the button
  const setBtnRay = new THREE.Raycaster();
  const overSetBtn = (e: MouseEvent) => {
    if (focused !== 'plaque' || !clockLocked || (e.target as HTMLElement).closest('.pq-lock')) return false;
    const r = renderer.domElement.getBoundingClientRect();
    setBtnRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    return setBtnRay.intersectObject(desk.clockSetBtn, true).length > 0;
  };
  const pressSet = () => {
    const b = desk.clockSetBtn;
    const y = b.userData.y0 ?? (b.userData.y0 = b.position.y);
    b.position.y = y - 0.0025;
    setTimeout(() => (b.position.y = y), 140);
    sfx.click();
    deskClock?.set();
  };
  screens.renderer.domElement.addEventListener('click', (e) => {
    if (overSetBtn(e)) pressSet();
  });
  screens.renderer.domElement.addEventListener('pointermove', (e) => {
    screens.renderer.domElement.style.cursor = overSetBtn(e) ? 'pointer' : '';
  });
  // Proyash's plushie gets squeezed: a quick squash and spring back (click it, or Q)
  const plush = desk.props.find((p) => p.id === 'proyash-cat')?.object;
  let squeezing = false;
  const squeezePlush = () => {
    if (!plush || squeezing) return;
    squeezing = true;
    let st = 0;
    fx.push((dt) => {
      st += dt;
      const k = Math.min(1, st / 0.5);
      const squash = Math.sin(k * Math.PI) * 0.16 * (1 - k * 0.5);
      plush.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
      if (k >= 1) squeezing = false;
      return k < 1;
    });
    sfx.click();
  };
  /** Is the plushie in reach: its stop on the tour, or him standing next to it while playing? */
  const plushInReach = () => {
    if (!plush) return false;
    if (play.active) return cat.root.position.distanceTo(plush.getWorldPosition(new THREE.Vector3())) < 0.4;
    return stops[Math.round(progress)]?.id === 'proyash';
  };
  const stopOf: Record<string, string> = { boardgame: 'laptop', calc: 'phone', plaque: 'laptop', clock: 'laptop' };
  renderer.domElement.addEventListener('click', (e) => {
    const hit = pick(e);
    if (hit === 'cat') {
      cat.poke();
      if (Math.random() < 0.35) sfx.meow();
      else sfx.purr();
      hint.classList.add('done');
      return;
    }
    if (!hit) return;
    // Proyash's plushie: the first click flies up close; after that its tablet goes to the site and the
    // cat itself gets a squeeze
    if ((hit === 'proyash' || hit === 'proyash-cat') && !play.active) {
      const at = stops.findIndex((s) => s.id === 'proyash');
      if (at >= 0 && at !== Math.round(progress)) return jumpToStop(at);
    }
    if (hit === 'proyash') {
      if (proyashUrl) window.open(proyashUrl, '_blank', 'noopener');
      return;
    }
    if (hit === 'proyash-cat') return squeezePlush();
    // a social book: straight to the profile
    if (hit.startsWith('social:')) {
      let o: THREE.Object3D | null = lastHit?.object ?? null;
      while (o && !o.userData.url) o = o.parent;
      if (o) window.open(o.userData.url as string, '_blank', 'noopener');
      return;
    }
    const i = stops.findIndex((s) => s.id === (stopOf[hit] ?? hit));
    // tapping the 3D screen itself presses the control under the pointer (app icon, project card, tab)
    const screenHit = lastHit && (lastHit.object === desk.laptopScreen ? 'laptop' : lastHit.object === desk.phoneScreen ? 'phone' : null);
    if (screenHit && lastHit!.uv && (play.active || i === Math.round(progress))) {
      screens.clickAt(screenHit, lastHit!.uv.x, lastHit!.uv.y);
      focus(screenHit);
      return;
    }
    // first click flies to the object; once you're there (or playing) it opens
    if (play.active || i === Math.round(progress) || i < 0) actions[hit]?.();
    else jumpToStop(i);
  });

  // a click inside a demo on the laptop or phone moves the keyboard into that page (another site, whose keys we
  // can't hear), so 1–9, 0, Esc stopped working. As soon as the pointer leaves the demo, the keys come back here
  // (typing in the demo still works while you're pointing at it)
  // And a demo that grabs the keyboard by itself as it loads (some do, the Flutter ones especially) while you're
  // not pointing at it gives it straight back, so opening an app with 1–4 doesn't swallow the next key.
  let overFrame = false;
  const reclaimKeys = () => {
    const a = document.activeElement as HTMLElement | null;
    if (focused && !overFrame && a?.tagName === 'IFRAME') {
      a.blur();
      window.focus();
    }
  };
  sticky.addEventListener('pointerover', (e) => (overFrame = (e.target as HTMLElement).tagName === 'IFRAME'));
  sticky.addEventListener('pointermove', () => {
    overFrame = false; // moves only reach this page when the pointer isn't over a demo
    reclaimKeys();
  });
  addEventListener('blur', () => setTimeout(reclaimKeys, 0)); // focus just went into a frame

  // the browser's (or phone's) Back: once you're off the opening shot, one history entry is added, so Back scrolls
  // to the top of the desk instead of leaving the site. Back up at the top leaves as usual.
  history.scrollRestoration = 'manual'; // the browser restoring a saved scroll on Back would fight the scroll to the top
  let backArmed = false;
  let backSilent = false;
  addEventListener('popstate', () => {
    if (backSilent) return void (backSilent = false); // we took the entry back ourselves (scrolled to the top by hand)
    if (!backArmed) return;
    backArmed = false;
    if (focused) unfocus();
    if (play.active) play.exit();
    jumpToStop(0); // flies straight back, like a click
  });
  const armBack = () => {
    if (!backArmed && progress > 0.6 && !focused && !play.active) {
      backArmed = true;
      history.pushState({ desk: 'scrolled' }, '');
    } else if (backArmed && progress < 0.2) {
      backArmed = false; // back at the start by hand: drop the entry so Back leaves straight away
      backSilent = true;
      history.back();
    }
  };

  // ── keyboard: almost everything works without a mouse ──
  const keysHelp = document.createElement('div');
  keysHelp.className = 'keys-help';
  keysHelp.setAttribute('role', 'dialog');
  keysHelp.setAttribute('aria-label', 'Keyboard controls');
  keysHelp.innerHTML = `
    <h2>Keys</h2>
    <div class="kh-cols">
      <section><h3>Anywhere on the desk</h3><ul>
        <li><kbd>E</kbd> play as Mi Mao / stop</li><li><kbd>H</kbd> or <kbd>?</kbd> this list</li><li><kbd>M</kbd> sound on / off</li><li><kbd>C</kbd> pet Mi Mao</li><li><kbd>Q</kbd> squeeze the Proyash plushie (when you're by it)</li><li><kbd>Esc</kbd> back / close</li></ul></section>
      <section><h3>Touring</h3><ul>
        <li><kbd>←</kbd> <kbd>→</kbd> previous / next stop</li><li><kbd>F</kbd> or <kbd>Enter</kbd> the caption's main button</li><li><kbd>1</kbd>–<kbd>9</kbd> its other buttons</li></ul></section>
      <section><h3>Playing</h3><ul>
        <li><kbd>WASD</kbd> / arrows walk · <kbd>⇧</kbd> run</li><li><kbd>Space</kbd> jump</li><li><kbd>F</kbd> use / scratch what's in front of him</li><li><kbd>G</kbd> pick up a small thing / drop it</li><li>Tissue box: <kbd>F</kbd> pull one out · on a tissue <kbd>F</kbd> scrunch it · on a ball <kbd>F</kbd> bat it · tissue in his mouth by a coffee spill <kbd>F</kbd> wipe it up</li><li><kbd>1</kbd>–<kbd>9</kbd> the nearby caption's buttons</li></ul></section>
      <section><h3>Devices</h3><ul>
        <li>Victus: <kbd>1</kbd>–<kbd>9</kbd> tabs · <kbd>R</kbd> reload · <kbd>⌫</kbd> projects</li><li>Phone: <kbd>1</kbd>–<kbd>9</kbd> apps · <kbd>0</kbd> home</li><li>Calculator: just type · <kbd>Enter</kbd> EXE</li><li>Plaque: <kbd>Space</kbd> play · <kbd>←</kbd> <kbd>→</kbd> skip</li><li>Résumé: <kbd>P</kbd> PDF · <kbd>I</kbd> PNG</li><li>Punch It Out: arrows / <kbd>A</kbd><kbd>W</kbd><kbd>D</kbd></li></ul></section>
    </div>
    <p class="kh-foot"><kbd>H</kbd> or <kbd>Esc</kbd> to close</p>`;
  sticky.append(keysHelp);
  const keysChip = document.createElement('button');
  keysChip.type = 'button';
  keysChip.className = 'keys-chip';
  keysChip.innerHTML = '<kbd>H</kbd> keys';
  sticky.append(keysChip);
  const toggleHelp = (on = !keysHelp.classList.contains('on')) => keysHelp.classList.toggle('on', on);
  keysChip.addEventListener('click', () => toggleHelp());
  // Esc closes the list first (before it backs out of anything else)
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && keysHelp.classList.contains('on')) {
      toggleHelp(false);
      e.stopImmediatePropagation();
    }
  }, true);
  const tourInView = () => {
    const r = tour.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= innerHeight * 0.6; // most of the window: at the page's very end it stops a hair short
  };
  const captionButtons = () => [...(captions.querySelector('.tour-caption.on .cap-btns')?.children ?? [])] as HTMLElement[];
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const tgt = e.target as HTMLElement;
    if (tgt?.closest?.('input, textarea, [contenteditable]') || document.querySelector('dialog[open]')) return;
    const k = e.key;
    const lower = k.toLowerCase();
    if (focused) {
      if (focused === 'calc') return; // the calculator takes typing
      if (lower === 'h' || k === '?') return void toggleHelp();
      if (focused === 'laptop') {
        if (/^[1-9]$/.test(k)) screens.tabAt(Number(k) - 1);
        else if (lower === 'r') screens.reload();
        else if (k === 'Backspace') screens.tabAt(0);
        else return;
      } else if (focused === 'phone') {
        if (/^[1-9]$/.test(k)) screens.appAt(Number(k) - 1);
        else if (k === '0') screens.appAt(-1);
        else return;
      } else if (focused === 'plaque') {
        if (clockLocked) {
          if (k === 'Enter') pressSet();
          else return;
        } else if (k === ' ' || lower === 'k') plaque.key('play');
        else if (k === 'ArrowLeft') plaque.key('prev');
        else if (k === 'ArrowRight') plaque.key('next');
        else return;
      }
      e.preventDefault();
      sfx.click();
      return;
    }
    if (!tourInView()) return;
    if (k === 'Escape' && !play.active && progress > 0.3) return void (e.preventDefault(), jumpToStop(0)); // back to the start, flying straight there
    if (lower === 'h' || k === '?') return void (e.preventDefault(), toggleHelp());
    if (lower === 'm') return void setSound(!soundOn());
    if (lower === 'q' && plushInReach()) return void (e.preventDefault(), squeezePlush());
    if (lower === 'c' && cat.root.visible) {
      cat.poke();
      if (Math.random() < 0.35) sfx.meow();
      else sfx.purr();
      return;
    }
    const btns = captionButtons();
    if (!play.active) {
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        e.preventDefault();
        scrollToStop(Math.max(0, Math.min(stops.length - 1, Math.round(progress) + (k === 'ArrowRight' ? 1 : -1))));
        return;
      }
      if ((lower === 'f' || (k === 'Enter' && tgt === document.body)) && btns[0]) {
        e.preventDefault();
        btns[0].click();
        return;
      }
    }
    if (/^[1-9]$/.test(k) && btns[Number(k)]) {
      e.preventDefault();
      btns[Number(k)].click();
    }
  });

  // ── resize ──
  const resize = () => {
    gateSince = performance.now(); // a resize clears the canvas: the entry screen's poster is drawn again
    const w = sticky.clientWidth;
    const h = sticky.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    const pr = renderer.getPixelRatio();
    (paint.uniforms.uTexel.value as THREE.Vector2).set(2.2 / w, 2.2 / h);
    (paint.uniforms.uRes.value as THREE.Vector2).set(w, h);
    const tm = legacy ? 1 : 2; // half res: the whole scene is drawn into it every frame
    textMask.setSize(Math.round((w * pr) / tm), Math.round((h * pr) / tm));
    catMask.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2)); // half res is plenty for a blur mask
    void pr;
    screens.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 55 : camera.aspect < 1.2 ? 44 : 35;
    camera.updateProjectionMatrix();
    PAN_LEN = camera.aspect < 0.8 && panAt >= 0 ? 2.4 : 0;
    tour.style.setProperty('--stops', String(stops.length + PAN_LEN));
    placePanStop();
    const cs = getComputedStyle(document.documentElement);
    gateAim.set(parseFloat(cs.getPropertyValue('--gate-cat-x')) || 0.15, parseFloat(cs.getPropertyValue('--gate-cat-y')) || 0.68);
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
  // frame-rate governor (not on phones, which already run the light version): every second of steady frames,
  // under ~45 fps steps quality down, a few seconds at ~full rate steps it back up. A level that proved too slow
  // after a step up becomes the ceiling, so it doesn't see-saw.
  //   0: 1x, no ambient occlusion   1: 1x   2: 1.25x (the start)   3: 1.5x
  const LEVEL_PR = [1, 1, 1.25, 1.5];
  let level = 2;
  let ceiling = 3;
  let govT = 0;
  let govN = 0;
  let govGood = 0;
  let govSkip = 0;
  let climbed = false;
  const setLevel = (l: number) => {
    level = l;
    if (gtao) gtao.enabled = l >= 1;
    renderer.setPixelRatio(gating() && !bench ? GATE_PR : Math.min(devicePixelRatio, LEVEL_PR[l]));
    resize();
    govSkip = 10; // the frames right after a resize aren't representative
  };
  new MutationObserver(() => {
    if (gating() || renderer.getPixelRatio() !== GATE_PR || bench) return;
    renderer.setPixelRatio(lowTier ? 1 : Math.min(devicePixelRatio, LEVEL_PR[level])); // a view was picked: sharp again
    resize();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const govern = (raw: number, wasIdle: boolean) => {
    if (bench || lowTier || document.hidden) return;
    if (wasIdle || raw > 0.25 || govSkip > 0) {
      govSkip = Math.max(0, govSkip - 1);
      return; // skipped idle frames, a hitch (tab switch, a shader compiling): not the steady rate
    }
    govT += raw;
    govN++;
    if (govT < 1) return;
    const avg = govT / govN;
    govT = govN = 0;
    if (avg > 1 / 45 && level > 0) {
      govGood = 0;
      if (climbed) ceiling = level - 1; // it was fine one step down: stay there
      climbed = false;
      setLevel(level - 1);
    } else if (avg < 1 / 56 && level < ceiling) {
      if (++govGood >= 3) {
        govGood = 0;
        climbed = true;
        setLevel(level + 1);
      }
    } else govGood = 0;
  };
  let lastIdle = false;

  // ── the desk clock blowing apart: a flash, its plastic and lit digits flying, then the plaque rising ──
  const fx: ((dt: number) => boolean)[] = []; // per-frame effects; each returns false when it's finished
  function blastClock() {
    const c = desk.deskClock;
    const parent = c.parent!;
    c.updateWorldMatrix(true, false);
    c.visible = false;
    clockLocked = false;
    // the laptop's caption button now names what's there
    captions.querySelectorAll('[data-act="use-plaque"]').forEach((b) => b.lastChild && (b.lastChild.textContent = '♥ Our song')); // keep its key chip
    sfx.click();
    const toParent = (local: THREE.Vector3) => parent.worldToLocal(c.localToWorld(local));
    const flash = new THREE.PointLight(0xff8a4a, 0, 0.9, 1.5);
    flash.position.copy(toParent(new THREE.Vector3(0, 0.035, 0.05)));
    parent.add(flash);
    const lit = new THREE.MeshStandardMaterial({ color: 0xff7a4a, emissive: 0xff5a1f, emissiveIntensity: 3 });
    const centre = new THREE.Vector3(0, 0.035, 0);
    const bits = Array.from({ length: 28 }, (_, i) => {
      const sz = 0.006 + Math.random() * 0.018;
      const m = new THREE.Mesh(new THREE.BoxGeometry(sz, sz * (0.4 + Math.random() * 0.8), sz * (0.3 + Math.random() * 0.7)), i < 9 ? lit : desk.clockMat);
      const local = new THREE.Vector3((Math.random() - 0.5) * 0.14, 0.006 + Math.random() * 0.058, (Math.random() - 0.5) * 0.05);
      m.position.copy(toParent(local.clone()));
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      m.castShadow = true;
      parent.add(m);
      const v = local.sub(centre).setY(0).normalize().multiplyScalar(0.35 + Math.random() * 0.6).applyQuaternion(c.quaternion);
      v.y = 0.7 + Math.random() * 0.9;
      const spin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(30);
      return { m, v, spin, rest: sz * 0.25 };
    });
    const pl = desk.plaque;
    pl.scale.setScalar(0.001);
    let t = 0;
    let refocused = false;
    fx.push((dt) => {
      t += dt;
      flash.intensity = t < 0.06 ? (t / 0.06) * 5 : Math.max(0, 5 * (1 - (t - 0.06) / 0.55));
      for (const b of bits) {
        b.v.y -= 6 * dt;
        b.m.position.addScaledVector(b.v, dt);
        b.m.rotation.x += b.spin.x * dt;
        b.m.rotation.y += b.spin.y * dt;
        b.m.rotation.z += b.spin.z * dt;
        if (b.m.position.y < b.rest) {
          // land on the desk: a small bounce, then they settle
          b.m.position.y = b.rest;
          b.v.y *= -0.3;
          b.v.x *= 0.55;
          b.v.z *= 0.55;
          b.spin.multiplyScalar(0.5);
        }
        if (t > 2.4) b.m.scale.setScalar(Math.max(0.001, 1 - (t - 2.4) / 0.6));
      }
      if (t > 0.35) {
        // the plaque grows up out of the wreck, overshooting a touch
        pl.visible = true;
        const k = Math.min(1, (t - 0.35) / 0.8);
        const back = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
        pl.scale.setScalar(Math.max(0.001, back));
      }
      if (t > 1.25 && focused === 'plaque' && !refocused) {
        refocused = true;
        focus('plaque'); // step back to take in the whole plaque
      }
      if (t < 3) return true;
      bits.forEach((b) => {
        parent.remove(b.m);
        b.m.geometry.dispose();
      });
      lit.dispose();
      parent.remove(flash);
      pl.scale.setScalar(1);
      return false;
    });
  }

  // nothing moving (camera still, no input for a moment, nothing animating but his breathing): draw about a third of
  // the frames. Any scroll, pointer or key brings back the full rate at once.
  let lastInput = performance.now();
  const poke = () => (lastInput = performance.now());
  // (capture: the desk's own scroll box doesn't bubble its scroll events up to the window)
  for (const ev of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'scroll', 'touchstart'] as const) addEventListener(ev, poke, { passive: true, capture: true });
  let lastCamX = NaN;
  let lastCamZ = NaN;
  let lastCamY = NaN;
  let idleN = 0;
  // ?bench: every frame is drawn (no idle skipping, no slow-start downgrade) and timed to when the GPU is done
  // with it, so different builds compare like for like. window.__bench drives it (see the benchmark script)
  const bench = location.search.includes('bench') ? { frames: [] as number[], on: false } : null;
  const benchPx = new Uint8Array(4);
  const benchSkip = { textMask: false, screens: false };
  /** ?bench only: the settings before the performance pass (1.5x, 4x MSAA, Kuwahara radius 3, full-res
   *  multisampled text mask), switchable at run time so old and new compare in one session */
  const setLegacy = (on: boolean) => {
    legacy = on;
    paint.material.defines = on ? { R: 3, KSTEP: '1.0' } : { R: 2, KSTEP: '1.5' };
    paint.material.needsUpdate = true;
    for (const rt of [composer.renderTarget1, composer.renderTarget2, textMask]) {
      rt.samples = on ? 4 : 0;
      rt.dispose();
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, on ? 1.5 : benchPr || 1.25));
    resize();
  };
  if (bench)
    Object.assign(window, {
      __bench: {
        get frames() { return bench.frames; },
        start: () => ((bench.frames = []), (bench.on = true)),
        stop: () => ((bench.on = false), bench.frames),
        goto: (i: number) => jumpToStop(i),
        stops: stops.map((s) => s.id),
        legacy: setLegacy,
        passes: composer.passes, // to switch one off and see what it costs
        skip: benchSkip,
        info: () => ({ pr: renderer.getPixelRatio(), w: renderer.domElement.width, h: renderer.domElement.height, gtao: gtao?.enabled ?? false, level }),
      },
    });
  // nothing is drawn until every shader is compiled (warmShaders, below): the first frame used to compile all of
  // them on the spot, one after another, ~6 s with the page frozen, loading screen included
  let warmed = false;
  const deskFace = document.querySelector<HTMLElement>('[data-pick="desk"]');
  renderer.setAnimationLoop(() => {
    if (!warmed) return;
    const frameStart = performance.now();
    const camStill = Math.abs(camPos.x - lastCamX) + Math.abs(camPos.y - lastCamY) + Math.abs(camPos.z - lastCamZ) < 1e-5;
    lastCamX = camPos.x;
    lastCamY = camPos.y;
    lastCamZ = camPos.z;
    const idle = camStill && !focused && !play.busy && !fx.length && performance.now() - lastInput > 1500;
    if (idle && !bench && ++idleN % 3) return; // the clock keeps the time, so the next drawn frame catches up
    // behind the entry screen the desk is a poster: once the camera has settled on him it stops being drawn (the
    // canvas keeps its last frame), and comes alive again while the pointer is on the desk's side. Each drawn frame
    // costs the 3D itself plus the browser re-blending every full-screen layer of the entry screen over it
    if (gating() && !bench) {
      const settled = performance.now() - gateSince > 2500; // (Infinity until the first frame: then 2.5 s)
      if (settled && !deskFace?.matches(':hover') && debug.gateMs > 0) return;
    }    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    govern(raw, lastIdle);
    lastIdle = idle;
    if (!visible || document.hidden) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 6);

    if (focused || play.active) flyT = -1; // a flight is cut short by opening a screen or starting to play
    if (focused) {
      camPos.lerp(focusPos, k);
      camLook.lerp(focusLook, k);
    } else if (play.active) {
      play.update(dt, t, camPos, camLook, camera.aspect < 1);
    } else if (gating()) {
      // he's up for the poster: sitting in his basket, facing us
      if (!catPosing) {
        catPosing = true;
        cat.setState('idle');
        cat.autonomous = true;
      }
      cat.root.rotation.y = Math.atan2(camPos.x - cat.root.position.x, camPos.z - cat.root.position.z) - 0.35;
      // turn the camera until the cat's head sits on the aim point
      aimP.copy(cat.root.position);
      aimP.y += 0.08;
      aimP.project(camera);
      if (Math.abs(aimP.z) < 1) {
        const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const dist = camPos.distanceTo(gateLook);
        camRight.setFromMatrixColumn(camera.matrixWorld, 0);
        camUp.setFromMatrixColumn(camera.matrixWorld, 1);
        gateLook
          .addScaledVector(camRight, (aimP.x - (gateAim.x * 2 - 1)) * tanV * camera.aspect * dist * 0.2)
          .addScaledVector(camUp, (aimP.y - (1 - gateAim.y * 2)) * tanV * dist * 0.2);
      }
      camPos.lerp(GATE_POS, k);
      camLook.lerp(gateLook, Math.max(k, 0.25));
    } else {
      if (catPosing) {
        // a view was picked: back to his nap
        catPosing = false;
        cat.autonomous = false;
        cat.setState('sleep');
        cat.root.rotation.y = 1.1;
      }
      if (play.busy) play.update(dt, t, junkP, junkL, false); // the leap back to the basket
      readScroll();
      armBack();
      const u = progress / (stops.length - 1);
      posCurve.getPoint(u, tmpP);
      lookCurve.getPoint(u, tmpL);
      if (camera.aspect < 0.8) tmpP.z += 0.35 * (1 - smooth(0, 1, progress)); // portrait: step back on the wide shot
      if (flyT >= 0) {
        // flying to a clicked thing: eased in and out, lifted a little in the middle so it arcs over the desk
        flyT = Math.min(1, flyT + dt / FLY_SECS);
        const e = flyT < 0.5 ? 4 * flyT ** 3 : 1 - (-2 * flyT + 2) ** 3 / 2;
        const lift = Math.sin(Math.PI * e) * Math.min(0.3, flyFromP.distanceTo(tmpP) * 0.25);
        camPos.lerpVectors(flyFromP, tmpP, e);
        camPos.y += lift;
        camLook.lerpVectors(flyFromL, tmpL, e);
        if (flyT >= 1) flyT = -1;
      } else {
        camPos.lerp(tmpP, k);
        camLook.lerp(tmpL, k);
      }
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
      if (!printShown && printT > PRINT_SECS + 0.4) {
        printShown = true;
        openResume(); // the printed page, in the popup, to keep or save
      }
    }

    // a clicked mug rocks on its base
    if (mugWobble > 0 && !play.active && !mug.userData.tipped) {
      mugWobble = Math.max(0, mugWobble - dt * 1.2);
      mug.rotation.z = Math.sin(t * 22) * 0.12 * mugWobble * mugWobble;
      mug.rotation.x = Math.cos(t * 17) * 0.05 * mugWobble * mugWobble;
    }

    const introFade = play.active || focused ? 0 : 1 - smooth(0.05, 0.45, progress);
    if (heroCopy) heroCopy.style.opacity = String(introFade);
    const nearBasket = !play.busy && Math.abs(progress - 1) < 0.4;
    hint.style.opacity = String(nearBasket ? 1 : 0);
    hintPos.copy(cat.root.position).y += Cat.HEIGHT * 2.4; // just over his head, whatever his size
    hintPos.project(camera);
    hint.style.transform = `translate(-50%, -100%) translate(${(hintPos.x * 0.5 + 0.5) * sticky.clientWidth}px, ${(-hintPos.y * 0.5 + 0.5) * sticky.clientHeight}px)`;

    for (let i = fx.length - 1; i >= 0; i--) if (!fx[i](dt)) fx.splice(i, 1);
    cat.update(dt, t);
    play.afterPose(dt); // whatever's in his mouth follows this frame's head pose
    if (play.active && !focused) setHint(play.interactable, 'key');
    else if (focused || hintKey.startsWith('key:')) setHint(null, 'key');
    if (hintEl.classList.contains('on')) {
      // sit just above whichever caption is showing (they share the bottom-left corner)
      const cap = captions.querySelector<HTMLElement>('.tour-caption.on');
      hintEl.style.bottom = cap && getComputedStyle(cap).opacity !== '0' ? `${sticky.clientHeight - cap.offsetTop + 10}px` : '';
    }
    play.placeThought(camera, sticky.clientWidth, sticky.clientHeight);
    (desk.lampBeam.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    // the Pavilion's drive light: bursts of Docker writes
    desk.serverLed.emissiveIntensity = Math.sin(t * 23) * Math.sin(t * 3.7) > 0.25 ? 2.2 : 0.05;
    // purring while he rests: lying down in play, or curled up in the basket while you're looking at him
    const restingInView = !focused && cat.resting && (play.active || (!play.busy && Math.abs(progress - 1) < 0.5));
    if (restingInView && soundOn()) {
      purrT -= dt;
      if (purrT <= 0) {
        sfx.purr(0.06);
        purrT = 1.45; // each purr overlaps the last: one steady rumble
      }
    } else purrT = 0;
    placePinCards();
    if (!(bench && benchSkip.textMask)) renderTextMask();
    updateBlur(dt);
    composer.render(dt);
    if (!(bench && benchSkip.screens)) screens.render(camera);
    if (bench?.on) {
      const gl = renderer.getContext();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, benchPx); // waits for the GPU to finish the frame
      bench.frames.push(performance.now() - frameStart);
    }
  });

  // reveal once the first frames are actually drawn: the shaders for what's in view compile in that first frame,
  // under the loading screen. (Compiling the whole scene up front instead made the wait longer, not shorter.)
  // the GPU compiles the scene's shaders in parallel, off the main thread (KHR_parallel_shader_compile), instead
  // of one after another inside the first frame
  mark('compile');
  try {
    await warmShaders();
  } catch {
    /* no parallel compile: they compile in the first frame instead */
  }
  mark('compiled');
  const warmProgs = new Set(renderer.info.programs ?? []);
  warmed = true;
  gateSince = performance.now();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  // ?bootlog: what the first frames still had to compile
  const boot = (window as unknown as { __boot?: { late?: string[] } }).__boot;
  if (boot) {
    boot.late = (renderer.info.programs ?? []).filter((p) => !warmProgs.has(p)).map((p) => `${p.name} ${p.cacheKey}`);
    (boot as { warm?: string[] }).warm = [...warmProgs].map((p) => `${p.name} ${p.cacheKey}`);
  }
  mark('ready');
  tour.classList.add('ready');

  /**
   * Every shader a frame needs, compiled in parallel off the main thread (KHR_parallel_shader_compile) before the
   * first frame. Not just the scene's own materials: a frame also draws every mesh in the text / cat mask
   * material, its depth for the shadows and its normals for the ambient occlusion, then the post passes. Programs
   * are cached by their settings, so compiling each mesh with an equivalent material warms the very program the
   * frame will ask for. (Only the shadow blur and the output pass are left to the first frame.)
   */
  async function warmShaders() {
    // every texture up to the GPU first, one at a time with a break between, instead of all of them in the first
    // frame: a big upload holds up the browser's own drawing (the loading screen with it)
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m])
        for (const v of Object.values(mat)) if ((v as THREE.Texture)?.isTexture) textures.add(v as THREE.Texture);
    });

    // the scene is drawn into the composer's target, not the screen: that changes each program's colour space and
    // tone mapping (and so its cache key), so compile against the same target or it's all compiled again
    renderer.setRenderTarget(composer.renderTarget1);
    const sceneCompiled = renderer.compileAsync(scene, camera); // compiles on the GPU's own threads, meanwhile…
    for (const t of textures) {
      renderer.initTexture(t);
      await new Promise((r) => setTimeout(r, 16));
    }
    renderer.setRenderTarget(composer.renderTarget1); // (an upload can leave another target bound)
    await sceneCompiled;
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
    const own = meshes.map((m) => m.material);
    for (const stand of [maskBlack, ...(gtao ? [gtao.normalMaterial] : [])]) {
      meshes.forEach((m) => (m.material = stand));
      try {
        await renderer.compileAsync(scene, camera);
      } finally {
        meshes.forEach((m, i) => (m.material = own[i]));
      }
    }
    // the shadow pass: each mesh in a depth material (its own, with the texture, where a cut-out texture shapes the
    // shadow, as three does), drawn with no lights in play. Kept, not disposed: that would free the very programs
    // the shadow pass is about to reuse
    const depth = new THREE.MeshDepthMaterial();
    const depthFor = (m: THREE.Material) => {
      const t = m as THREE.MeshStandardMaterial;
      return (t.map || t.alphaMap) && t.alphaTest > 0 ? new THREE.MeshDepthMaterial({ map: t.map, alphaMap: t.alphaMap, alphaTest: t.alphaTest }) : depth;
    };
    const lights: THREE.Light[] = [];
    scene.traverse((o) => (o as THREE.Light).isLight && o.visible && lights.push(o as THREE.Light));
    meshes.forEach((m, i) => (m.material = Array.isArray(own[i]) ? depth : depthFor(own[i] as THREE.Material)));
    lights.forEach((l) => (l.visible = false));
    try {
      await renderer.compileAsync(scene, camera);
    } finally {
      meshes.forEach((m, i) => (m.material = own[i]));
      lights.forEach((l) => (l.visible = true));
    }
    // the post passes' own materials, each on a throwaway full-screen quad
    const quads = new THREE.Scene();
    // like the passes' own full-screen triangle: positions and uvs only (normals would change the programs' keys)
    const quad = new THREE.BufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    quad.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    const mats = new Set<THREE.Material>();
    const take = (v: unknown) => {
      const m = v as { isMaterial?: boolean; material?: { isMaterial?: boolean } } | null;
      if (m?.isMaterial) mats.add(m as unknown as THREE.Material);
      else if (m?.material?.isMaterial) mats.add(m.material as unknown as THREE.Material);
    };
    for (const pass of [...composer.passes, composer.copyPass]) for (const v of Object.values(pass)) take(v);
    mats.forEach((m) => quads.add(new THREE.Mesh(quad, m)));
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // a pass is drawn with no lights, so no shadow map (a flag in its key): off while these compile
    renderer.shadowMap.enabled = false;
    try {
      await renderer.compileAsync(quads, ortho); // the passes that draw into a target…
      renderer.setRenderTarget(null);
      await renderer.compileAsync(quads, ortho); // …and the last one, to the screen
    } finally {
      renderer.shadowMap.enabled = true;
    }
    quad.dispose();
  }

  /** Shut the desk down completely (the visitor picked the standard page): stop drawing, free the GPU. */
  return () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    for (const ev of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'scroll', 'touchstart'] as const) removeEventListener(ev, poke, { capture: true });
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    screens.renderer.domElement.remove(); // the live demos (iframes) go with it
    tour.classList.remove('has-3d', 'ready');
    tour.style.removeProperty('--stops');
  };
}
