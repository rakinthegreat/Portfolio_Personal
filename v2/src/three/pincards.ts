// The pinboard cards are real HTML (shown through holes in the 3D board, like the laptop and phone
// screens), so the browser draws the lettering at full screen resolution: sharp at any distance.
import content from '../content.json';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Card size in CSS px; the 3D card is 0.2 × 0.283 m (same aspect). */
export const CARD_PX = 600;

function card(n: string, label: string, heading: string, body: string) {
  const el = document.createElement('article');
  el.className = 'pin-card';
  el.style.width = `${CARD_PX}px`;
  el.style.height = `${Math.round(CARD_PX * 1.415)}px`;
  el.innerHTML = `
    <p class="pin-label">${n} · ${esc(label)}</p>
    <div class="pin-head"><span class="pin-ghost" aria-hidden="true">${n}</span><h3>${heading}</h3></div>
    ${body}`;
  return el;
}

export function buildPinCards() {
  const p = content.person;
  const about = card('01', 'ABOUT', p.aboutHeading.map(esc).join('<br>'), `<p class="pin-big">${esc(p.about)}</p>`);
  const academics = card(
    '02',
    'ACADEMICS',
    'Educational<br>Background',
    `<ul class="pin-list">${content.academics
      .map((a) => `<li><b>${esc(a.degree)}</b><span>${esc(a.inst)} · ${esc(a.period)}</span></li>`)
      .join('')}</ul>
    <p class="pin-scores">SAT 1530 · IELTS 8.0 · GPA 5.0</p>`,
  );
  const stack = card(
    '03',
    'EXPERTISE',
    'Tech Stack',
    `<ul class="pin-grid">${content.skills.map(([n]) => `<li>${esc(n)}</li>`).join('')}</ul>`,
  );
  const experiences = card(
    '05',
    'EXPERIENCES',
    'Experiences',
    `<ul class="pin-list">${content.experiences
      .map((e) => `<li><b>${esc(e.title)}</b><span>${esc(e.role)} · ${esc(e.period)}</span></li>`)
      .join('')}</ul>`,
  );
  return { about, academics, stack, experiences };
}
