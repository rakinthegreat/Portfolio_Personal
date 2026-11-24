// High-resolution procedural materials: wood grain, plaster, wicker, fabric. Drawn once at load.
import * as THREE from 'three';

let maxAniso = 8;
export const setMaxAnisotropy = (n: number) => (maxAniso = n);

const rand = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number], srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

/** Planked wood with long grain lines, knots and per-plank tone shifts. Grain runs along u. */
function drawWood(g: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], planks: number, seed: number) {
  const r = rand(seed);
  const ph = h / planks;
  for (let p = 0; p < planks; p++) {
    const shift = (r() - 0.5) * 22;
    const [br, bg, bb] = base.map((c) => c + shift);
    g.fillStyle = `rgb(${br},${bg},${bb})`;
    g.fillRect(0, p * ph, w, ph);
    // grain: many thin, slightly wavy lines
    for (let i = 0; i < 90; i++) {
      const y0 = p * ph + r() * ph;
      const amp = 1 + r() * 4;
      const freq = 0.002 + r() * 0.006;
      const phase = r() * 10;
      const dark = r() < 0.55;
      g.strokeStyle = dark ? `rgba(60,35,15,${0.05 + r() * 0.12})` : `rgba(255,235,200,${0.04 + r() * 0.07})`;
      g.lineWidth = 0.6 + r() * 1.8;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    // a knot now and then
    if (r() < 0.35) {
      const kx = r() * w;
      const ky = p * ph + ph * (0.3 + r() * 0.4);
      for (let k = 6; k > 0; k--) {
        g.strokeStyle = `rgba(70,40,18,${0.08 + k * 0.03})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(kx, ky, k * 7, k * 2.4, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // plank seam
    g.fillStyle = 'rgba(40,22,10,0.55)';
    g.fillRect(0, p * ph, w, 2);
  }
}

export function makeMaterials() {
  const desk = tex(2048, 2048, (g, w, h) => drawWood(g, w, h, [178, 128, 84], 6, 11), [1, 1]);
  const shelf = tex(1024, 1024, (g, w, h) => drawWood(g, w, h, [205, 170, 125], 3, 23), [1, 1]);
  const floor = tex(2048, 2048, (g, w, h) => drawWood(g, w, h, [120, 82, 54], 8, 5), [3, 3]);
  const crate = tex(1024, 1024, (g, w, h) => drawWood(g, w, h, [160, 112, 70], 4, 41), [1, 1]);

  // mossy green limewash: deep moss base, soft mottled clouds, sweeping trowel marks, fine grit
  const plaster = tex(2048, 2048, (g, w, h) => {
    g.fillStyle = '#5f7148';
    g.fillRect(0, 0, w, h);
    const r = rand(9);
    for (let i = 0; i < 420; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 60 + r() * 260;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      const tone = r();
      const c = tone > 0.55 ? '132,150,98' : tone > 0.25 ? '70,86,52' : '108,124,80';
      grad.addColorStop(0, `rgba(${c},${0.1 + r() * 0.14})`);
      grad.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = r() > 0.5 ? `rgba(160,176,120,${0.05 + r() * 0.06})` : `rgba(44,56,32,${0.04 + r() * 0.05})`;
      g.lineWidth = 8 + r() * 30;
      g.lineCap = 'round';
      const x = r() * w;
      const y = r() * h;
      const a0 = r() * Math.PI * 2;
      g.beginPath();
      g.arc(x, y, 120 + r() * 300, a0, a0 + 0.3 + r() * 0.6);
      g.stroke();
    }
    for (let i = 0; i < 90000; i++) {
      g.fillStyle = r() > 0.5 ? `rgba(190,205,150,${0.08 * r()})` : `rgba(30,40,22,${0.08 * r()})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  }, [2, 1]);

  const wicker = tex(1024, 512, (g, w, h) => {
    g.fillStyle = '#b48a55';
    g.fillRect(0, 0, w, h);
    const cell = 32;
    for (let y = 0; y < h; y += cell / 2) {
      for (let x = 0; x < w; x += cell) {
        const off = (y / (cell / 2)) % 2 ? cell / 2 : 0;
        const grad = g.createLinearGradient(x + off, y, x + off + cell, y + cell / 2);
        grad.addColorStop(0, '#8a6233');
        grad.addColorStop(0.5, '#d1a76c');
        grad.addColorStop(1, '#8a6233');
        g.fillStyle = grad;
        g.beginPath();
        g.ellipse(x + off + cell / 2, y + cell / 4, cell / 2 - 2, cell / 4 - 1, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }, [3, 1]);

  const fabric = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#efe6d6';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 4) {
      g.fillStyle = 'rgba(160,140,110,0.08)';
      g.fillRect(i, 0, 1, h);
      g.fillRect(0, i, w, 1);
    }
  }, [2, 2]);

  // the gray mat under the desk: soft felt with a bound edge a shade darker, rounded corners (transparent outside)
  const mat = tex(1024, 640, (g, w, h) => {
    const R = 46, edge = 22;
    const round = (x: number, y: number, ww: number, hh: number, r: number) => {
      g.beginPath();
      g.roundRect(x, y, ww, hh, r);
    };
    round(0, 0, w, h, R);
    g.fillStyle = '#55585c';
    g.fill();
    round(edge, edge, w - edge * 2, h - edge * 2, R - edge * 0.6);
    g.fillStyle = '#7d8085';
    g.fill();
    // felt: fine random flecks, light and dark, clipped to the inside
    g.save();
    g.clip();
    const r = rand(17);
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    g.restore();
    // a stitched line just inside the binding
    g.setLineDash([10, 8]);
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(40,42,45,0.5)';
    round(edge + 9, edge + 9, w - (edge + 9) * 2, h - (edge + 9) * 2, R - edge);
    g.stroke();
  });

  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
  return {
    desk: std({ map: desk, roughness: 0.55 }),
    shelf: std({ map: shelf, roughness: 0.6 }),
    floor: std({ map: floor, roughness: 0.7 }),
    mat: std({ map: mat, roughness: 1, alphaTest: 0.5 }),
    crate: std({ map: crate, roughness: 0.75 }),
    plaster: std({ map: plaster, roughness: 0.97 }),
    wicker: std({ map: wicker, roughness: 0.85 }),
    fabric: std({ map: fabric, roughness: 1 }),
    laptopShell: std({ color: 0x24262a, roughness: 0.35, metalness: 0.6 }), // Victus: dark, satin
    laptopKeys: std({ color: 0x111214, roughness: 0.6 }),
    pavilion: std({ color: 0x8d8f93, roughness: 0.3, metalness: 0.75 }), // old silver Pavilion
    blackPlastic: std({ color: 0x18181a, roughness: 0.45 }),
    whitePlastic: std({ color: 0xf2f0ec, roughness: 0.4 }),
    cork: std({ color: 0xb58a5a, roughness: 0.95 }),
    paper: std({ color: 0xfbfaf7, roughness: 0.9 }),
    metal: std({ color: 0xbfc3c8, roughness: 0.25, metalness: 0.9 }),
    ceramic: std({ color: 0xeeeae3, roughness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.004, ior: 1.45 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0xd8eef4, roughness: 0.02, transmission: 0.85, thickness: 0.03, ior: 1.33 }),
    plant: std({ color: 0x3f7a45, roughness: 0.7 }),
    pot: std({ color: 0xc46a45, roughness: 0.85 }),
    led: std({ color: 0x5bff8a, emissive: 0x5bff8a, emissiveIntensity: 2.5 }),
    ledRed: std({ color: 0xff5040, emissive: 0xff5040, emissiveIntensity: 2 }),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;
