// Renders the page (and resume.html) from content.json at build time, in the original
// portfolio's design: neo-brutalist black/white, Space Grotesk + Space Mono, numbered sections
// with a ghost number behind each heading. The 3D desk is layered on top by src/three/.
import type contentJson from './content.json';

type Content = typeof contentJson;
type Project = Content['projects'][number] & { previewUrl?: string; downloadUrl?: string; mobile?: boolean };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const ext = (href: string, label: string, cls = 'btn') =>
  `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

const NAV: [string, string][] = [
  ['about', 'About'], ['academics', 'Academics'], ['expertise', 'Expertise'], ['projects', 'Projects'],
  ['experiences', 'Experiences'], ['socials', 'Socials'], ['contact', 'Contact'],
];

/** "01 · ABOUT" label + ghost number with the heading laid over it (original layout). */
function sectionHead(n: string, label: string, heading: string) {
  return `
    <p class="section-label reveal">${n}  ·  ${esc(label.toUpperCase())}</p>
    <div class="ghost-wrap reveal">
      <span class="ghost-num" aria-hidden="true">${n}</span>
      <h2 class="section-heading">${heading}</h2>
    </div>`;
}

function projectCard(p: Project) {
  const btns = [
    p.url && ext(p.url, 'Source'),
    p.previewUrl &&
      `<a class="btn btn-solid" href="${esc(p.previewUrl)}" target="_blank" rel="noopener" data-preview="${esc(p.name)}" data-mobile="${p.mobile ? 'true' : 'false'}">Live Preview</a>`,
    p.downloadUrl && ext(p.downloadUrl, 'Download App'),
  ].filter(Boolean);
  return `
    <article class="proj-card reveal" id="p-${slug(p.name)}">
      <p class="proj-meta">${esc(p.type)}  ·  ${esc(p.year)}</p>
      <h3 class="proj-name">${esc(p.name)}</h3>
      <p class="proj-desc">${esc(p.description)}</p>
      <div class="proj-btns">${btns.join('')}</div>
    </article>`;
}

const infoDialog = (id: string, title: string, rows: string) => `
  <dialog class="info" id="${id}">
    <div class="info-head"><h3>${esc(title.toUpperCase())}</h3><button type="button" class="info-close" data-close aria-label="Close">✕</button></div>
    <div class="info-body">${rows}</div>
  </dialog>`;

export function renderLite(c: Content): string {
  const p = c.person;
  const projects = c.projects as Project[];
  const tick = esc(p.ticker).repeat(4);

  return `
  <a class="skip" href="#about">Skip the desk</a>
  <header class="topbar">
    <a class="topbar-name" href="#top">${esc(p.name)}</a>
    <nav class="topbar-nav" aria-label="Sections">
      ${NAV.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}
    </nav>
    <div class="topbar-tools">
      <button class="tool" type="button" data-theme-toggle hidden aria-label="Toggle dark mode">◐</button>
      <button class="tool" type="button" data-sound hidden aria-pressed="false">Sound off</button>
    </div>
  </header>

  <main id="top">
    <section class="tour" data-tour aria-label="Rakin's desk">
      <div class="hero" data-sticky>
        <div class="hero-stage" aria-hidden="true" data-stage></div>
        <div class="hero-copy">
          <h1 class="hero-name">${p.heroLines
            .map((line, li) => `<span class="hero-line">${[...line].map((ch, i) => `<span class="ch" style="--d:${(li * 5 + i) * 80}ms">${esc(ch)}</span>`).join('')}</span>`)
            .join('')}</h1>
          <div class="hero-meta">
            ${p.heroMeta.map((m) => `<p>${esc(m)}</p>`).join('')}
            <p class="hero-clock"><span class="live-dot" aria-hidden="true"></span>DHAKA · <time data-clock data-tz="${esc(p.timezone)}">--:--</time></p>
          </div>
          <p class="hero-hint">Scroll to explore the desk ↓</p>
        </div>
      </div>
    </section>

    <div class="ticker" aria-hidden="true"><div class="ticker-track"><span>${tick}</span><span>${tick}</span></div></div>

    <section class="section" id="about">
      ${sectionHead('01', 'About', p.aboutHeading.map(esc).join('<br>'))}
      <p class="body-text about-bio reveal">${esc(p.about)}</p>
    </section>

    <section class="section" id="academics">
      ${sectionHead('02', 'Academics', 'Educational<br>Background')}
      <ol class="edu-list">
        ${c.academics
          .map(
            (a) => `<li class="edu-row reveal">
              <p class="edu-period">${esc(a.period)}</p>
              <h3 class="edu-degree">${esc(a.degree)}</h3>
              <p class="edu-inst">${esc(a.inst)}</p>
              <p class="edu-batch">Batch ${esc(a.batch)}</p>
            </li>`,
          )
          .join('')}
      </ol>
      <div class="outlined-btns reveal">
        <button class="btn" type="button" data-open="dlg-scores">TEST SCORES</button>
        <button class="btn" type="button" data-open="dlg-accept">OTHER UNDERGRADUATE ACCEPTANCES</button>
        <button class="btn" type="button" data-open="dlg-mentor">MENTORSHIP AREAS</button>
      </div>
      ${infoDialog('dlg-scores', 'Academic Credentials', c.testScores.map(([k, v]) => `<p class="dlg-row${k.startsWith(' ') ? ' indent' : ''}"><span>${esc(k.trim())}</span><b>${esc(v)}</b></p>`).join(''))}
      ${infoDialog('dlg-accept', 'Undergrad Acceptances', c.acceptances.map((a) => `<p class="dlg-item">→ ${esc(a)}</p>`).join(''))}
      ${infoDialog('dlg-mentor', 'Mentorship Areas', c.mentorship.map((a) => `<p class="dlg-item">→ ${esc(a)}</p>`).join(''))}
    </section>

    <section class="section" id="expertise">
      ${sectionHead('03', 'Expertise', 'Tech Stack')}
      <ul class="skills">
        ${c.skills.map(([name, cat]) => `<li class="skill reveal"><span class="skill-dot" aria-hidden="true"></span><span class="skill-name">${esc(name)}</span><span class="skill-cat">${esc(cat)}</span></li>`).join('')}
      </ul>
    </section>

    <section class="section" id="projects">
      ${sectionHead('04', 'Projects & Apps', 'Featured Projects')}
      <div class="proj-grid">${projects.map(projectCard).join('')}</div>
    </section>

    <section class="section" id="experiences">
      ${sectionHead('05', 'Experiences', 'Experiences')}
      <ol class="exp-list">
        ${c.experiences.map((e) => `<li class="exp-row reveal"><div><h3 class="exp-title">${esc(e.title)}</h3><p class="exp-role">${esc(e.role)}</p></div><p class="exp-period">${esc(e.period)}</p></li>`).join('')}
      </ol>
    </section>

    <section class="section" id="socials">
      ${sectionHead('06', 'Socials', 'Find me Online')}
      <ul class="social-list">
        ${c.socials.map((s) => `<li class="reveal"><a class="social" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="social-label">${esc(s.label)}</span><span class="social-handle">${esc(s.handle)}</span><span class="social-arrow" aria-hidden="true">↗</span></a></li>`).join('')}
      </ul>
    </section>

    <section class="section" id="contact">
      ${sectionHead('07', 'Contact', "Let's build<br>something.")}
      <p class="body-text reveal">${esc(p.contactSub)}</p>
      <div class="contact-blocks reveal">
        <div class="contact-block">
          <p class="block-label">EMAIL</p>
          <p class="block-value">${esc(p.contactEmail)}</p>
          <div class="block-btns">
            <button class="btn" type="button" data-copy="${esc(p.contactEmail)}">COPY</button>
            <a class="btn btn-solid" href="mailto:${esc(p.contactEmail)}">SEND EMAIL</a>
          </div>
        </div>
        <div class="contact-block">
          <p class="block-label">RESUME</p>
          <p class="block-value">Preview Resume</p>
          <div class="block-btns">
            <a class="btn btn-solid" href="/resume.html" data-resume="">PREVIEW</a>
            <a class="btn" href="/resume.html?print=1" data-resume="pdf">DOWNLOAD PDF</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <span>RAKIN TALUKDER</span>
    <span>© ${new Date().getFullYear()}</span>
    <span>DHAKA, BD</span>
  </footer>`;
}

/** Printable résumé, same structure as the original generated PDF. */
export function renderResume(c: Content): string {
  const p = c.person;
  const r = p.resume;
  return `
  <div class="cv-actions"><a href="/">← Back to the desk</a><button type="button" data-print>Download PDF</button></div>
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
