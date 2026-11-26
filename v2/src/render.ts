// Renders the page (and resume.html) from content.json at build time, in the original
// portfolio's design: neo-brutalist black/white, Space Grotesk + Space Mono, numbered sections
// with a ghost number behind each heading. Visitors pick Standard (a 1:1 port of the original
// Flutter site) or 3D Interactive (the desk on its own) on the entry screen.
import type contentJson from './content.json';

type Content = typeof contentJson;
type Project = Content['projects'][number] & { previewUrl?: string; downloadUrl?: string; mobile?: boolean };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const NAV = ['About', 'Academics', 'Expertise', 'Projects', 'Experiences', 'Socials', 'Contact'];
const IDS = ['about', 'academics', 'expertise', 'projects', 'experiences', 'socials', 'contact'];

// Material icons the original used on the project buttons (code, visibility, download)
const ICON = {
  code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6 4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0 4.6-4.6-4.6-4.6L16 6l6 6-6 6z"/></svg>',
  visibility: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z"/></svg>',
  dark: '<svg class="s-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.37 5.51A7.35 7.35 0 0 0 9.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.01 7.01 0 0 1 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1"/></svg>',
  light: '<svg class="s-sun" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2a5 5 0 1 0 0 10 5 5 0 0 0 0-10M2 13h2a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2m18 0h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2M11 2v2a1 1 0 0 0 2 0V2a1 1 0 0 0-2 0m0 18v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-2 0M5.99 4.58a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41zm12.37 12.37a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41zm1.06-10.96a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41zM7.05 18.36a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
};

/** "01  ·  ABOUT" label row, then the ghost number with the heading laid over it (the original's layout). */
function head(n: string, label: string, heading: string) {
  return `
    <p class="s-label s-rev"><i class="s-dot"></i>${n}  ·  ${esc(label.toUpperCase())}</p>
    <div class="s-ghost s-rev" style="--d:80ms">
      <span class="s-ghost-num" aria-hidden="true">${n}</span>
      <h2 class="s-heading">${heading}</h2>
    </div>`;
}

const section = (id: string, body: string) => `
  <section class="s-section" id="${id}" data-sec>
    <div class="s-inner">${body}</div>
  </section>`;

function projectCard(p: Project, i: number) {
  const btns = [
    p.url && `<a class="s-pill" href="${esc(p.url)}" target="_blank" rel="noopener">${ICON.code}Source</a>`,
    p.previewUrl &&
      `<a class="s-pill" href="${esc(p.previewUrl)}" target="_blank" rel="noopener" data-preview="${esc(p.name)}" data-mobile="${p.mobile ? 'true' : 'false'}">${ICON.visibility}Live Preview</a>`,
    p.downloadUrl && `<a class="s-pill" href="${esc(p.downloadUrl)}" target="_blank" rel="noopener">${ICON.download}Download App</a>`,
  ].filter(Boolean);
  return `
    <article class="s-card s-rev" id="p-${slug(p.name)}" style="--d:${100 + i * 80}ms">
      <h3 class="s-card-name">${esc(p.name)}</h3>
      <p class="s-card-desc">${esc(p.description)}</p>
      <p class="s-card-meta"><span>${esc(p.type.toUpperCase())}</span><b>${esc(p.year)}</b></p>
      <div class="s-pills">${btns.join('')}</div>
    </article>`;
}

const dialog = (id: string, title: string, rows: string) => `
  <dialog class="info s-dlg" id="${id}">
    <div class="s-dlg-head"><h3>${esc(title.toUpperCase())}</h3><button type="button" class="s-dlg-x" data-close aria-label="Close">${ICON.close}</button></div>
    <hr />
    <div class="s-dlg-body">${rows}</div>
  </dialog>`;

/** The entry screen: the two real views, live underneath, torn corner to corner. Each half is a way in. */
/** The way back to the entry screen: a square torn corner to corner, like the screen itself. */
const PICK_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5"/><path d="M1.5 14.5 14.5 1.5"/></svg>';

function renderGate(c: Content) {
  const title = c.person.name
    .toUpperCase()
    .split(' ')
    .map((w) => `<span data-t="${esc(w)}">${esc(w)}</span>`)
    .join('');
  // glass flung off the tear: position along it (t), offset from it, size, spin, drift time
  const shards = [
    [0.06, -26, 10, 22, 40, 3.4], [0.11, 18, -6, 12, -20, 2.8], [0.17, -8, -30, 16, 70, 3.9], [0.24, 34, 14, 9, 15, 2.6],
    [0.3, -40, -12, 26, -55, 4.2], [0.37, 22, 30, 11, 110, 3.1], [0.45, -18, 26, 8, 5, 2.4], [0.55, 44, -8, 18, -80, 3.6],
    [0.62, -30, -36, 13, 35, 3.0], [0.69, 12, 38, 24, 150, 4.4], [0.76, -46, 4, 10, -30, 2.7], [0.83, 28, -26, 17, 60, 3.3],
    [0.9, -14, 22, 12, -100, 2.9], [0.95, 38, 10, 20, 20, 3.8],
  ]
    .map(([t, ox, oy, z, r, d]) => `<i style="--t:${t};--ox:${ox}px;--oy:${oy}px;--z:${z}px;--r:${r}deg;--d:${d}s"></i>`)
    .join('');
  return `
  <div class="gate" data-gate role="dialog" aria-modal="true" aria-labelledby="gate-label">
    <h1 class="sr-only" id="gate-label">${esc(c.person.name)}: pick a way to look around</h1>
    <button class="gate-face gate-face-desk" type="button" data-pick="desk">
      <span class="gate-opt">
        <span class="gate-num">01</span>
        <span class="gate-name">3D Interactive</span>
        <span class="gate-desc">Sneak onto my desk as Mi Mao. Poke the laptop and phone, grab the résumé, or just roam around.</span>
        <span class="gate-tag">Know me as a person.</span>
        <span class="gate-go" data-desk-note>ENTER  ↖</span>
        <span class="gate-keys">or press <kbd>1</kbd> / <kbd>D</kbd></span>
      </span>
    </button>
    <button class="gate-face gate-face-std" type="button" data-pick="standard">
      <span class="gate-opt">
        <span class="gate-num">02</span>
        <span class="gate-name">Standard</span>
        <span class="gate-desc">The streamlined portfolio, on one clean page.</span>
        <span class="gate-tag">Know about me.</span>
        <span class="gate-go">ENTER  ↘</span>
        <span class="gate-keys">or press <kbd>2</kbd> / <kbd>S</kbd></span>
      </span>
    </button>
    <div class="gate-title">${['desk', 'std', 'ctl'].map((k) => `
      <div class="gate-title-${k}"${k === 'ctl' ? '' : ' aria-hidden="true"'}><p class="gate-name-big">${title}</p><p class="gate-sub">PICK A SIDE</p><p class="gate-sub2">You can switch any time</p>${
        k === 'ctl'
          ? '<label class="gate-remember"><input type="checkbox" data-remember /><i></i>Remember my choice</label>'
          : '<span class="gate-remember">Remember my choice</span>'
      }</div>`).join('')}
    </div>
    <div class="gate-sides" aria-hidden="true">
      <span class="gate-side gate-side-desk">Know me as a person.</span>
      <span class="gate-side gate-side-std">Know about me.</span>
    </div>
    <div class="gate-seam" aria-hidden="true"><b class="gate-glow"></b><span class="gate-rim"><i class="gate-line"></i></span><span class="gate-shards">${shards}</span></div>
  </div>`;
}

/** The streamlined portfolio: a 1:1 port of the original Flutter site. */
function renderStandard(c: Content) {
  const p = c.person;
  const projects = c.projects as Project[];
  const name = p.heroLines
    .map((line, li) => `<span class="s-hero-line">${[...line].map((ch, i) => `<span class="ch" style="--d:${(li * p.heroLines[0].length + i) * 80}ms">${esc(ch)}</span>`).join('')}</span>`)
    .join('');
  const metaDelay = p.heroLines.join('').length * 80 + 100;

  return `
  <div class="std" data-std>
    <div class="s-progress" aria-hidden="true"><i data-progress></i></div>

    <section class="s-hero" id="top" data-sec>
      <div class="s-dots" aria-hidden="true" data-dots>${'<i></i>'.repeat(6)}</div>
      <div class="s-clock" data-bigclock>
        <svg class="s-rings" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="s-track" cx="50" cy="50" r="50" /><circle class="s-track" cx="50" cy="50" r="42.5" /><circle class="s-track" cx="50" cy="50" r="35" />
          <circle class="s-arc s-sec" cx="50" cy="50" r="50" pathLength="1" data-arc="s" />
          <circle class="s-arc s-min" cx="50" cy="50" r="42.5" pathLength="1" data-arc="m" />
          <circle class="s-arc s-hr" cx="50" cy="50" r="35" pathLength="1" data-arc="h" />
        </svg>
        <div class="s-clock-text">
          <p>BINDING INTO THE<br>LOOM  OF  TIME</p>
          <button class="s-theme" type="button" data-theme-toggle aria-label="Toggle dark mode">${ICON.dark}${ICON.light}</button>
        </div>
      </div>
      <div class="s-hero-copy" data-parallax>
        <h1 class="s-name" aria-label="${esc(p.name)}">${name}</h1>
        <div class="s-hero-meta" style="--d:${metaDelay}ms">
          <i class="s-dot s-pulse"></i>
          <div>
            <p class="s-meta-strong">${esc(p.heroMeta[0])}</p>
            <p class="s-meta">${esc(p.heroMeta[1])}</p>
          </div>
        </div>
        <a class="s-scroll" href="#about" style="--d:${metaDelay}ms" aria-label="Scroll to About">
          <span class="s-scroll-in">
            <span class="s-scroll-label"><i class="s-dot"></i>SCROLL</span>
            <svg viewBox="0 0 14 27" aria-hidden="true"><path d="M1 1l6 6 6-6" opacity=".25"/><path d="M1 11l6 6 6-6" opacity=".55"/><path d="M1 21l6 6 6-6"/></svg>
          </span>
        </a>
      </div>
    </section>

    ${section('about', `
      ${head('01', 'About', p.aboutHeading.map(esc).join('<br>'))}
      <p class="s-body s-bio s-rev" style="--d:200ms">${esc(p.about)}</p>`)}

    ${section('academics', `
      ${head('02', 'Academics', 'Educational<br>Background')}
      <div class="s-edu s-rev" style="--d:200ms">
        ${c.academics
          .map(
            (a) => `<div class="s-edu-row">
              <h3>${esc(a.degree)}</h3>
              <p class="s-edu-batch">${esc(a.batch)}</p>
              <p class="s-edu-inst">${esc(a.inst)}</p>
              <p class="s-edu-period">${esc(a.period)}</p>
            </div>`,
          )
          .join('')}
      </div>
      <div class="s-outlined s-rev" style="--d:300ms">
        <button class="s-obtn" type="button" data-open="dlg-scores">TEST SCORES</button>
        <button class="s-obtn" type="button" data-open="dlg-accept">OTHER UNDERGRADUATE ACCEPTANCES</button>
        <button class="s-obtn" type="button" data-open="dlg-mentor">MENTORSHIP AREAS</button>
      </div>
      ${dialog('dlg-scores', 'Academic Credentials', c.testScores.map(([k, v], i) => `<p class="s-dlg-row${k.startsWith(' ') ? ' indent' : i ? ' gap' : ''}"><b>${esc(k.trim())}</b><span>${esc(v)}</span></p>`).join(''))}
      ${dialog('dlg-accept', 'Undergrad Acceptances', c.acceptances.map((a) => `<p class="s-dlg-bullet"><b>•</b><span>${esc(a)}</span></p>`).join(''))}
      ${dialog('dlg-mentor', 'Mentorship Areas', c.mentorship.map((a) => `<p class="s-dlg-bullet"><b>•</b><span>${esc(a)}</span></p>`).join(''))}`)}

    ${section('expertise', `
      ${head('03', 'Expertise', 'Tech Stack')}
      <ul class="s-skills">
        ${c.skills.map(([n, cat], i) => `<li class="s-skill s-rev" style="--d:${50 + (i % 3) * 50}ms"><i class="s-skill-dot"></i><span class="s-skill-name">${esc(n)}</span><span class="s-skill-cat">${esc(cat)}</span></li>`).join('')}
      </ul>`)}

    ${section('projects', `
      ${head('04', 'Projects & Apps', 'Featured Projects')}
      <div class="s-grid">${projects.map(projectCard).join('')}</div>`)}

    ${section('experiences', `
      ${head('05', 'Experiences', 'Experiences')}
      <ol class="s-acts">
        ${c.experiences.map((e, i) => {
          // a role with a site links to it (role and domain, in the same small caps)
          const url = 'url' in e ? e.url : '';
          const role = url
            ? `<a class="s-act-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(e.role.toUpperCase())} · ${esc(url.replace(/^https?:\/\//, '').toUpperCase())} ↗</a>`
            : esc(e.role.toUpperCase());
          return `<li class="s-act s-rev" style="--d:${80 + i * 70}ms"><p class="s-act-role">${role}</p><h3 class="s-act-title">${esc(e.title)}</h3><p class="s-act-period"><i></i>${esc(e.period)}</p></li>`;
        }).join('')}
      </ol>`)}

    ${section('socials', `
      ${head('06', 'Socials', 'Find me Online')}
      <ul class="s-socials">
        ${c.socials.map((s, i) => `<li class="s-rev" style="--d:${80 + i * 80}ms"><a class="s-social" href="${esc(s.url)}" target="_blank" rel="noopener me"><span class="s-social-name">${esc(s.label)}</span><span class="s-social-handle">${esc(s.handle)}</span><span class="s-social-arrow" aria-hidden="true">↗</span></a></li>`).join('')}
      </ul>`)}

    ${section('contact', `
      ${head('07', 'Contact', "Let's build<br>something.")}
      <p class="s-body s-sub s-rev" style="--d:200ms">${esc(p.contactSub)}</p>
      <div class="s-blocks s-rev" style="--d:280ms">
        <div class="s-block">
          <p class="s-block-label">EMAIL</p>
          <a class="s-block-value s-mail" href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a>
          <div class="s-block-btns">
            <button class="s-abtn" type="button" data-copy="${esc(p.contactEmail)}">COPY</button>
            <a class="s-abtn filled" href="mailto:${esc(p.contactEmail)}">SEND EMAIL</a>
          </div>
        </div>
        <div class="s-block">
          <p class="s-block-label">RESUME</p>
          <p class="s-block-value">Preview Resume</p>
          <div class="s-block-btns">
            <a class="s-abtn filled" href="/resume.html" data-resume="">GENERATE</a>
          </div>
        </div>
      </div>`)}

    <footer class="s-footer" data-sec>
      <div class="s-inner s-foot">
        <p><i class="s-dot grey"></i>${esc(p.name.toUpperCase())}</p>
        <span class="s-switches"><button class="s-switch" type="button" data-switch="desk">VIEW THE 3D DESK  →</button><a class="s-switch" href="?view=pick">PICK AGAIN</a></span>
        <p><span>© ${new Date().getFullYear()}</span><span>${esc(p.location.toUpperCase())}</span></p>
      </div>
    </footer>

    <nav class="s-nav" aria-label="Sections" data-sidenav>
      ${NAV.map((l, i) => `<a href="#${IDS[i]}" data-i="${i}"><span>${l.toUpperCase()}</span><i></i></a>`).join('')}
      <a class="s-nav-pick" href="?view=pick" aria-label="Pick a view again" title="Pick a view again">${PICK_ICON}</a>
    </nav>
    <div class="s-radial" data-radial>
      <button class="s-radial-knob" type="button" aria-label="Sections menu" aria-expanded="false" data-radial-open><span data-radial-label></span></button>
      <div class="s-radial-items">
        ${(() => {
          // the sections, spread round the dial
          const n = NAV.length;
          const a = (i: number) => `--a:${(-(-0.43 * Math.PI + (i * 0.86 * Math.PI) / (n - 1))).toFixed(4)}rad`;
          return NAV.map((l, i) => `<a href="#${IDS[i]}" data-i="${i}" style="${a(i)}"><span>${l.toUpperCase()}</span></a>`).join('');
        })()}
      </div>
      <button class="s-radial-x" type="button" aria-label="Close menu" data-radial-close>${ICON.close}</button>
    </div>
    <div class="s-cursor" aria-hidden="true"><i data-cur-lag></i><i data-cur></i></div>
  </div>`;
}

/** The 3D desk on its own: the environment, nothing else on the page. */
function renderDesk(c: Content) {
  const p = c.person;
  return `
  <div class="desk" data-desk>
    <div class="desk-bar">
      <button class="tool" type="button" data-sound hidden aria-pressed="false">Sound off</button>
      <button class="tool" type="button" data-switch="standard">Standard view</button>
      <a class="tool" href="?view=pick">Pick again</a>
    </div>
    <div class="s-progress" aria-hidden="true"><i data-desk-progress></i></div>
    <section class="tour" data-tour aria-label="${esc(p.name)}'s desk">
      <div class="hero" data-sticky>
        <div class="hero-stage" aria-hidden="true" data-stage></div>
        <div class="hero-copy">
          <p class="hero-name">${p.heroLines
            .map((line, li) => `<span class="hero-line">${[...line].map((ch, i) => `<span class="ch" style="--d:${(li * 5 + i) * 80}ms">${esc(ch)}</span>`).join('')}</span>`)
            .join('')}</p>
          <div class="hero-meta">
            ${p.heroMeta.map((m) => `<p>${esc(m)}</p>`).join('')}
          </div>
          <p class="hero-hint">Scroll to explore the desk ↓</p>
        </div>
      </div>
    </section>
  </div>`;
}

export function renderLite(c: Content): string {
  return renderGate(c) + renderStandard(c) + renderDesk(c);
}

/** Printable résumé, same structure as the original generated PDF. */
export function renderResume(c: Content): string {
  const p = c.person;
  const r = p.resume;
  return `
  <div class="cv-actions"><a href="/">← Back to the portfolio</a><button type="button" data-print>Download PDF</button></div>
  <article class="cv">
    <header class="cv-top">
      <h1>${esc(p.fullName)}.</h1>
      <p class="cv-title">${esc(r.title)}</p>
      <p class="cv-summary">${esc(r.summary)}</p>
    </header>
    <div class="cv-dark">
      <section class="cv-col">
        <h2>Expertise</h2>
        <ul class="cv-skills">${c.skills.map(([n]) => `<li>${esc(n)}</li>`).join('')}</ul>
      </section>
      <section class="cv-col">
        <h2>Education</h2>
        ${c.academics.map((a) => `<div class="cv-item"><b>${esc(a.degree)}</b><p>${esc(a.inst)}</p><p class="cv-date">${esc(a.period)}</p></div>`).join('')}
        <h2>Experiences</h2>
        ${c.experiences.map((e) => `<div class="cv-item"><b>${esc(e.title)}</b><p>${esc(e.role)}</p><p class="cv-date">${esc(e.period)}</p></div>`).join('')}
      </section>
      <section class="cv-col">
        <h2>Projects</h2>
        ${(c.projects as Project[]).slice(0, 8).map((x) => `<div class="cv-item"><b>${esc(x.name)}</b><p>${esc(x.description)}</p></div>`).join('')}
        <h2>Contact</h2>
        <p>${[r.phone, r.email, r.website, r.github, r.linkedin].map(esc).join('<br>')}</p>
      </section>
    </div>
  </article>
`;
}
