// The glass plaque by the Victus: a photo of the two of them (as pixel art), a song's progress bar at
// 04:21, hand-drawn player controls and the song's Spotify code. Real HTML through a hole in the 3D glass,
// so the code stays sharp enough to scan. The controls work: play runs the bar, ⏮ / ⏭ jump.
export const PLAQUE_PX = 600; // 600 × 1000 CSS px (3:5)
const LEN = 4 * 60 + 21;

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function buildPlaque() {
  const el = document.createElement('div');
  el.className = 'plaque';
  el.style.width = `${PLAQUE_PX}px`;
  el.style.height = `${(PLAQUE_PX * 5) / 3}px`;
  el.innerHTML = `
    <div class="pq-photo"><img src="/plaque/us.jpg" alt="The two of them sitting together in a garden, drawn as pixel art" draggable="false"></div>
    <div class="pq-track"><span class="pq-fill" data-fill></span><span class="pq-knob" data-knob></span></div>
    <p class="pq-time" data-time>04:21</p>
    <div class="pq-ctl">
      <button type="button" data-prev aria-label="Back to the start"><svg viewBox="0 0 48 40"><path d="M8 4v32" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M42 5L13 20l29 15z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></button>
      <button type="button" class="pq-play" data-play aria-label="Play"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="currentColor"/><path data-icon d="M25 18v28l22-14z" fill="#e9ecef"/></svg></button>
      <button type="button" data-next aria-label="Skip to the end"><svg viewBox="0 0 48 40"><path d="M40 4v32" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M6 5l29 15L6 35z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg></button>
    </div>
    <img class="pq-code" src="/plaque/code.png" alt="Spotify code for their song: scan it in the Spotify app" draggable="false">`;
  const fill = el.querySelector<HTMLElement>('[data-fill]')!;
  const knob = el.querySelector<HTMLElement>('[data-knob]')!;
  const time = el.querySelector<HTMLElement>('[data-time]')!;
  const icon = el.querySelector<SVGPathElement>('[data-icon]')!;
  const playBtn = el.querySelector<HTMLButtonElement>('[data-play]')!;
  let t = 0;
  let playing = false;
  let last = 0;
  const paint = () => {
    const k = Math.min(1, t / LEN);
    fill.style.width = `${k * 100}%`;
    knob.style.left = `${k * 100}%`;
    knob.style.opacity = playing || t > 0 ? '1' : '0';
    time.textContent = playing || t > 0 ? `${mmss(t)} / 04:21` : '04:21';
    icon.setAttribute('d', playing ? 'M22 18h7v28h-7zM35 18h7v28h-7z' : 'M25 18v28l22-14z');
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  };
  const tick = (now: number) => {
    if (!playing) return;
    t += (now - last) / 1000;
    last = now;
    if (t >= LEN) {
      t = LEN;
      playing = false;
    }
    paint();
    if (playing) requestAnimationFrame(tick);
  };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    if (b.hasAttribute('data-play')) {
      if (t >= LEN) t = 0;
      playing = !playing;
      last = performance.now();
      if (playing) requestAnimationFrame(tick);
    } else if (b.hasAttribute('data-prev')) t = 0;
    else if (b.hasAttribute('data-next')) {
      t = LEN;
      playing = false;
    }
    paint();
  });
  paint();
  const key = (k: 'play' | 'prev' | 'next') => el.querySelector<HTMLElement>(`[data-${k}]`)?.click();
  return { el, key };
}
