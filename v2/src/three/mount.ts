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
import { buildPinCards, CARD_PX } from './pincards';
import { buildCalculator, CALC_PX } from './calculator';
import { buildPlaque, PLAQUE_PX } from './plaque';
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
  // 4x MSAA on the scene itself (geometry edges), SMAA at the very end (edges the shaders make)
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowTier ? 0 : 4 }));
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
      tDiffuse: { value: null }, tMask: { value: null }, uR: { value: lowTier ? 2 : 3 },
      uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) }, uRes: { value: new THREE.Vector2(1024, 1024) }, uStrength: { value: 1 },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tMask; uniform int uR; uniform vec2 uTexel; uniform vec2 uRes; uniform float uStrength; varying vec2 vUv;
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
        for (int j = 0; j <= 3; j++) {
          if (j > uR) break;
          for (int i = 0; i <= 3; i++) {
            if (i > uR) break;
            vec3 c;
            c = texture2D(tDiffuse, uv + vec2(-i, -j) * uTexel).rgb; m0 += c; s0 += c * c;
            c = texture2D(tDiffuse, uv + vec2( i, -j) * uTexel).rgb; m1 += c; s1 += c * c;
            c = texture2D(tDiffuse, uv + vec2(-i,  j) * uTexel).rgb; m2 += c; s2 += c * c;
            c = texture2D(tDiffuse, uv + vec2( i,  j) * uTexel).rgb; m3 += c; s3 += c * c;
          }
        }
        float n = float((uR + 1) * (uR + 1));
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
  composer.addPass(paint);

  // text mask: everything black (for depth), then text-layer meshes white where they're visible
  const textMask = new THREE.WebGLRenderTarget(1, 1, { samples: lowTier ? 0 : 4 }); // soft edges where sharp text meets paint
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

  const M = makeMaterials();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const desk = buildDesk(M, aniso);
  scene.add(desk.root);

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

  const screens = new Screens(sticky, { anchor: desk.laptopScreen, widthM: desk.SCR_W }, { anchor: desk.phoneScreen, widthM: desk.PH_W });
  const pinEls = buildPinCards();
  for (const c of desk.pinCards) screens.addPanel(c.mesh, desk.PIN_W, CARD_PX, pinEls[c.id as keyof typeof pinEls]);
  const calc = buildCalculator();
  screens.addPanel(desk.calcFace, desk.CALC_W, CALC_PX, calc.el);
  const plaque = buildPlaque();
  screens.addPanel(desk.plaqueFace, desk.PLQ_W, PLAQUE_PX, plaque.el);

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
    desk.keyMat.emissiveIntensity = d ? 0.35 : 0;
    (desk.windowMesh.material as THREE.MeshBasicMaterial).color.set(d ? 0x2c3550 : 0xc4a8d8); // dusk sky
    renderer.toneMappingExposure = d ? 1.0 : 0.95;
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
    laptop: `<button class="btn btn-solid" data-act="use-laptop">Use the laptop</button><button class="btn" data-act="use-plaque">♥ Our song</button>${web.map((p) => `<button class="btn" data-act="tab" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}`,
    phone: `<button class="btn btn-solid" data-act="use-phone">Use the phone</button>${apps.map((p) => `<button class="btn" data-act="app" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}<button class="btn" data-act="use-calc">Calculator</button><button class="btn" data-act="socials">Socials</button>`,
    pinboard: `<a class="btn" href="#about">About</a><a class="btn" href="#academics">Academics</a><a class="btn" href="#expertise">Tech Stack</a>`,
    server: `<p class="tour-stats" data-stats>Checking on the server…</p>`,
    console: `<button class="btn btn-solid" data-act="arcade">Play Punch It Out</button>`,
    printer: `<button class="btn btn-solid" data-act="print">Print résumé</button>`,
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
  // the socials: not a tour stop, but a caption of their own (by the books, or from the phone's caption)
  const socialsCap = document.createElement('li');
  socialsCap.className = 'tour-caption social-cap';
  socialsCap.innerHTML = `<p class="cap-num">SOCIALS · ON THE SHELF</p><h2>Find me online</h2><p>@rakinthegreat, more or less everywhere.</p><div class="cap-btns">${content.socials
    .map((s) => `<a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener me">${esc(s.label)}</a>`)
    .join('')}</div>`;
  captions.append(socialsCap);
  captions.querySelectorAll('.cap-btns').forEach((row) =>
    [...row.children].forEach((b, i) => b.insertAdjacentHTML('afterbegin', `<kbd class="ck-key">${i === 0 ? 'F' : i}</kbd>`)),
  );
  const captionEls = ([...captions.children] as HTMLElement[]).filter((el) => el !== socialsCap);
  const showCaption = (i: number) => {
    captionEls.forEach((el, j) => el.classList.toggle('on', j === i));
    socialsCap.classList.remove('on');
  };
  /** Only one caption at a time: the socials one replaces whatever was showing. */
  const showSocials = () => {
    captionEls.forEach((el) => el.classList.remove('on'));
    socialsCap.classList.add('on');
  };

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
  exitBtn.textContent = '← Back  (Esc)';
  sticky.append(exitBtn);
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn btn-solid play-btn';
  playBtn.innerHTML = 'Play as the cat <kbd>E</kbd>';
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
  const focus = (which: Device) => {
    // playing? just pause: the loop stops driving the cat while a screen is focused, and Back resumes the open world
    const { anchor, w, h } = devices[which];
    anchor.getWorldPosition(focusLook);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(anchor.getWorldQuaternion(new THREE.Quaternion()));
    if (which === 'calc') n.add(new THREE.Vector3(0, 0, 0.5)).normalize(); // lying flat: look down at it from the front
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) * 1.3;
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
  const FOCUS_KEYS: Record<Device, () => string> = {
    laptop: () => `<kbd>1–${screens.tabCount}</kbd> tabs · <kbd>R</kbd> reload · <kbd>⌫</kbd> projects · <kbd>Esc</kbd> back`,
    phone: () => `<kbd>1–${screens.appCount}</kbd> apps · <kbd>0</kbd> home · <kbd>Esc</kbd> back`,
    calc: () => `type to calculate · <kbd>Enter</kbd> EXE · <kbd>⌫</kbd> DEL · <kbd>Del</kbd> AC · <kbd>Esc</kbd> back`,
    plaque: () => `<kbd>Space</kbd> play / pause · <kbd>←</kbd> <kbd>→</kbd> skip · <kbd>Esc</kbd> back`,
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
        if (r.top > 0 || r.bottom < innerHeight) scrollTo({ top: tour.offsetTop, behavior: 'instant' });
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
    cat: ['Pet the cat', false],
    basket: ['Pet the cat', false],
    laptop: ['Use the Victus', true],
    phone: ['Use the phone', true],
    calc: ['Use the calculator', true],
    plaque: ['Look at the plaque', true],
    printer: ['Print the résumé', true],
    console: ['Play Punch It Out', true],
    boardgame: ['Play Plassey 1757 on the Victus', true],
    pinboard: ['Read the pinboard', false],
    mug: ['Clink the mug', false],
    socials: ['Visit a profile (1–4 for the rest)', true],
    book: ['Scratch the book', true],
  };
  const PLAY_ONLY: Record<string, string> = { mug: 'Walk into the mug to knock it over', basket: 'Press E to stop playing and nap', pinboard: 'Read the pinboard from the plank' };
  const hintEl = document.createElement('button');
  hintEl.type = 'button';
  hintEl.className = 'interact-hint';
  sticky.append(hintEl);
  let hintKey = '';
  const setHint = (id: string | null, mode: 'click' | 'key') => {
    const k = id ? `${mode}:${id}` : '';
    if (k === hintKey) return;
    hintKey = k;
    const h = id ? HINTS[id] ?? (id.startsWith('social:') ? ([`Visit ${id.slice(7)}`, false] as [string, boolean]) : null) : null;
    if (!h) {
      hintEl.classList.remove('on');
      return;
    }
    const label = mode === 'key' && !h[1] ? PLAY_ONLY[id!] ?? h[0] : h[0];
    const key = mode === 'click' ? 'CLICK' : h[1] ? 'F' : '';
    hintEl.innerHTML = `${key ? `<kbd>${key}</kbd>` : ''}<span>${label}</span>`;
    hintEl.classList.add('on');
  };
  hintEl.addEventListener('click', () => play.interact()); // touch: the hint is the button
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
    // F by the books opens the first profile; on the tour, clicking the shelf shows the socials caption
    socials: () => (play.active ? socialsCap.querySelector<HTMLElement>('.cap-btns > a')?.click() : showSocials()),
    pinboard: () => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }),
    basket: () => {
      cat.poke();
      sfx.purr();
    },
    mug: () => {
      mugWobble = 1;
      sfx.clink();
    },
  };
  const stopOf: Record<string, string> = { boardgame: 'laptop', calc: 'phone', socials: 'phone', plaque: 'laptop' };
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
    else scrollToStop(i);
  });

  // ── keyboard: almost everything works without a mouse ──
  const keysHelp = document.createElement('div');
  keysHelp.className = 'keys-help';
  keysHelp.setAttribute('role', 'dialog');
  keysHelp.setAttribute('aria-label', 'Keyboard controls');
  keysHelp.innerHTML = `
    <h2>Keys</h2>
    <div class="kh-cols">
      <section><h3>Anywhere on the desk</h3><ul>
        <li><kbd>E</kbd> play as the cat / stop</li><li><kbd>H</kbd> or <kbd>?</kbd> this list</li><li><kbd>M</kbd> sound on / off</li><li><kbd>C</kbd> pet the cat</li><li><kbd>Esc</kbd> back / close</li></ul></section>
      <section><h3>Touring</h3><ul>
        <li><kbd>←</kbd> <kbd>→</kbd> previous / next stop</li><li><kbd>F</kbd> or <kbd>Enter</kbd> the caption's main button</li><li><kbd>1</kbd>–<kbd>9</kbd> its other buttons</li></ul></section>
      <section><h3>Playing</h3><ul>
        <li><kbd>WASD</kbd> / arrows walk · <kbd>⇧</kbd> run</li><li><kbd>Space</kbd> jump</li><li><kbd>F</kbd> use / scratch what's in front of him</li><li><kbd>1</kbd>–<kbd>9</kbd> the nearby caption's buttons</li></ul></section>
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
    return r.top <= 1 && r.bottom >= innerHeight - 1;
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
        if (k === ' ' || lower === 'k') plaque.key('play');
        else if (k === 'ArrowLeft') plaque.key('prev');
        else if (k === 'ArrowRight') plaque.key('next');
        else return;
      }
      e.preventDefault();
      sfx.click();
      return;
    }
    if (!tourInView()) return;
    if (lower === 'h' || k === '?') return void (e.preventDefault(), toggleHelp());
    if (lower === 'm') return void setSound(!soundOn());
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
    const w = sticky.clientWidth;
    const h = sticky.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    const pr = renderer.getPixelRatio();
    (paint.uniforms.uTexel.value as THREE.Vector2).set(2.2 / w, 2.2 / h);
    (paint.uniforms.uRes.value as THREE.Vector2).set(w, h);
    textMask.setSize(Math.round(w * pr), Math.round(h * pr)); // full res: crisp edges where sharp text meets paint
    catMask.setSize(Math.round((w * pr) / 2), Math.round((h * pr) / 2)); // half res is plenty for a blur mask
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
    hintPos.copy(cat.root.position).y += 0.32;
    hintPos.project(camera);
    hint.style.transform = `translate(-50%, -100%) translate(${(hintPos.x * 0.5 + 0.5) * sticky.clientWidth}px, ${(-hintPos.y * 0.5 + 0.5) * sticky.clientHeight}px)`;

    cat.update(dt, t);
    if (play.active && !focused) setHint(play.interactable, 'key');
    else if (focused || hintKey.startsWith('key:')) setHint(null, 'key');
    if (hintEl.classList.contains('on')) {
      // sit just above whichever caption is showing (they share the bottom-left corner)
      const cap = captions.querySelector<HTMLElement>('.tour-caption.on');
      hintEl.style.bottom = cap && getComputedStyle(cap).opacity !== '0' ? `${sticky.clientHeight - cap.offsetTop + 10}px` : '';
    }
    play.placeThought(camera, sticky.clientWidth, sticky.clientHeight);
    (desk.lampBeam.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    // purring while he rests: lying down in play, or curled up in the basket while you're looking at him
    const restingInView = !focused && cat.resting && (play.active || (!play.busy && Math.abs(progress - 1) < 0.5));
    if (restingInView && soundOn()) {
      purrT -= dt;
      if (purrT <= 0) {
        sfx.purr(0.06);
        purrT = 1.45; // each purr overlaps the last: one steady rumble
      }
    } else purrT = 0;
    renderTextMask();
    updateBlur(dt);
    composer.render(dt);
    screens.render(camera);
  });

  requestAnimationFrame(() => tour.classList.add('ready'));
}
