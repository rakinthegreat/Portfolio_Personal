// Camera stops for the scroll tour, with the caption each one shows.
import * as THREE from 'three';

export interface Stop {
  id: string; // matches a prop id ('intro' for the opening shot)
  num: string;
  title: string;
  text: string;
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildStops(): Stop[] {
  return [
    { id: 'intro', num: '00', title: 'The desk', text: '', pos: v(0.1, 0.82, 2.0), look: v(-0.2, 0.3, -0.12) },
    { id: 'basket', num: '01', title: 'The boss', text: 'He naps in this basket. Click him for belly-up, or let him loose on the desk.', pos: v(-0.92, 0.16, 0.8), look: v(-1.33, -0.2, 0.12) },
    { id: 'laptop', num: '02', title: 'Victus 16 · Web projects', text: 'Live projects, running on the laptop. Click the screen to use it.', pos: v(-0.02, 0.3, 0.36), look: v(-0.02, 0.13, -0.27) },
    { id: 'phone', num: '03', title: 'Phone · Mobile apps', text: 'The mobile apps, live on the phone. Tap the screen, open an app, swipe home to switch.', pos: v(0.58, 0.47, 0.12), look: v(0.64, 0.36, -0.31) },
    { id: 'pinboard', num: '04', title: 'About · Academics · Tech Stack', text: 'Everything on one corkboard, right above the plank the cat uses to cross the desk.', pos: v(0.0, 0.9, 0.44), look: v(0.0, 0.82, -0.54) },
    { id: 'server', num: '05', title: 'The warm server', text: 'An old HP Pavilion running Docker 24/7. The cat approves of the exhaust vent.', pos: v(-0.34, 0.4, 0.24), look: v(-0.62, 0.14, -0.32) },
    { id: 'console', num: '06', title: 'Punch It Out', text: 'A tiny 16-bit boxing game I made for Arshia. Click the console to play.', pos: v(0.56, 0.86, 0.06), look: v(0.64, 0.6, -0.43) },
    { id: 'printer', num: '07', title: 'Résumé', text: 'Click the printer to print my résumé.', pos: v(0.5, 0.4, 0.7), look: v(0.74, 0.06, 0.04) },
  ];
}
