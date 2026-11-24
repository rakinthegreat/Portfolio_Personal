// Camera stops for the scroll tour, with the caption each one shows.
import * as THREE from 'three';
import content from '../content.json';

export interface Stop {
  id: string; // matches a prop id ('intro' for the opening shot)
  num: string;
  title: string;
  text: string;
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** cards hung side by side (the pinboard): on a narrow (portrait) screen the stop gets extra scroll, and the
   *  camera goes in close and slides from card to card instead of showing the whole board small */
  cards?: { xs: number[]; y: number; z: number; w: number };
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Up close with Proyash's plushie on the Pavilion (only if content.json marks an experience as its mascot). */
function proyashStop(): Stop[] {
  const e = content.experiences.find((x) => 'mascot' in x && x.mascot);
  if (!e) return [];
  const domain = (('url' in e ? e.url : '') ?? '').replace(/^https?:\/\//, '');
  const since = e.period.match(/\d{4}/)?.[0];
  return [{
    id: 'proyash',
    num: '06',
    title: `${e.role} · ${e.title}`,
    text: `I co-founded ${domain || e.role}${since ? ` in ${since}` : ''}. Its cat keeps watch on my server: give it a squeeze, or tap its tablet to visit.`,
    pos: v(-0.385, 0.31, 0.03),
    look: v(-0.53, 0.26, -0.37),
  }];
}

export function buildStops(): Stop[] {
  const list: Stop[] = [
    { id: 'intro', num: '00', title: 'The desk', text: '', pos: v(0.1, 0.82, 2.0), look: v(-0.2, 0.3, -0.12) },
    { id: 'basket', num: '01', title: 'Mi Mao', text: 'He naps in this basket. Click him for belly-up, or let him loose on the desk.', pos: v(-0.92, 0.16, 0.8), look: v(-1.33, -0.2, 0.12) },
    { id: 'pinboard', num: '04', title: 'About · Academics · Tech Stack', text: 'Everything on one corkboard, right above the plank Mi Mao uses to cross the desk.', pos: v(0.0, 0.9, 0.44), look: v(0.0, 0.82, -0.54), cards: { xs: [-0.315, -0.105, 0.105, 0.315], y: 0.86, z: -0.524, w: 0.25 } },
    { id: 'laptop', num: '02', title: 'Victus 16 · Web projects', text: 'Live projects, running on the laptop. Click the screen to use it.', pos: v(-0.02, 0.3, 0.36), look: v(-0.02, 0.13, -0.27) },
    { id: 'phone', num: '03', title: 'Phone · Mobile apps', text: 'The mobile apps, live on the phone. Tap the screen, open an app, swipe home to switch.', pos: v(0.58, 0.47, 0.12), look: v(0.64, 0.36, -0.31) },
    { id: 'socials', num: '', title: 'Find me online', text: '@rakinthegreat, more or less everywhere. A book per profile on the lower shelf: click a spine to visit.', pos: v(0.8, 0.44, 0.2), look: v(0.9, 0.34, -0.3) },
    { id: 'server', num: '05', title: 'The warm server', text: 'An old HP Pavilion running Docker 24/7. Mi Mao approves of the exhaust vent.', pos: v(-0.34, 0.4, 0.24), look: v(-0.62, 0.14, -0.32) },
    ...proyashStop(),
    { id: 'console', num: '07', title: 'Punch It Out', text: 'A tiny 16-bit boxing game I made. Beat the bell. Click the console to play.', pos: v(0.56, 0.86, 0.06), look: v(0.64, 0.6, -0.43) },
    { id: 'printer', num: '08', title: 'Résumé', text: 'Click the printer to print my résumé.', pos: v(0.5, 0.4, 0.84), look: v(0.74, 0.06, 0.18) },
  ];
  // numbered by their order on the tour (00 is the opening shot)
  list.forEach((st, i) => (st.num = String(i).padStart(2, '0')));
  return list;
}
