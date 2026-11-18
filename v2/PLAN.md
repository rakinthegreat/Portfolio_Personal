# Portfolio v2 — "On Rakin's Desk"

> A cat's-eye exploration of a hardware tinkerer's desk.
> Art direction from leoparpeix.com · optional game layer from jayransijn.com · playful physics from bruno-simon.com, at a fraction of the weight.

## 1. Concept

The whole site is one scene: Rakin's real desk at golden hour, seen from the height of his cat.
Everything is giant. The humming HP Pavilion home server is a warm tower (the cat's favourite nap spot),
the HP Victus 16 is a cliff (keyboard backlight glowing faintly), ESP32 boards are little buildings, jumper wires are roads.
Projects are objects on the desk. The joke lands instantly: *a tinkerer's portfolio, explored by the cat who keeps getting in the way.*

Tone: resourceful, playful, meticulous. No corporate fluff, no cloud flexing. Specific and Bangladeshi, not generic "global dev".

## 2. Two ways to experience it (Jay's model)

| Mode | Who it's for | Controls |
|---|---|---|
| **Scroll / tour (default)** | Recruiters, mobile, everyone | Scroll moves the camera along a rail between "stops". Click/tap objects to open project cards. Dot nav to jump. |
| **Play (opt-in)** | Curious visitors | Press **E** / tap the paw button → control the cat. WASD/arrows + Space to jump; virtual joystick on touch. |

Plus a **Lite page** (plain HTML, same content, Léo-style typography) auto-served on weak GPUs, no WebGL, `prefers-reduced-motion`, or via a "Skip the cat" link. Also the SEO/crawler target.

## 3. Stops / zones (scroll rail order)

| # | Zone (desk object) | Content | Interaction |
|---|---|---|---|
| 0 | **Pavilion server tower**, cat asleep on the warm vent | Hero + intro line, live server stats on its screen | Click cat → it rolls over, shows multi-coloured "bean" paw pads |
| 1 | **Phone stand** | WaitLess, HydroSync, Curzpay, **Loaf** | Live preview on the phone screen; on Loaf, the cat paws at the koi |
| 2 | **Water glass + dispenser** | HydroSync hardware side | Click → pours a glass |
| 3 | **Board-game box** | Polashi (Plassey 1757), IIT Indoor Games | Lid opens, pieces pop up |
| 4 | **Breadboard city** | ESP32 / Arduino work, HydroSync hardware | LEDs blink, wires light up as paths |
| 5 | **Desk lamp + old Android phone** (camera corner) | **SPL-1 low-light enhancement** (Retinex + DT-CWT, se2105_1728), ImageEnhanceAndroid, GCamUpdater, CameraHW, PhotoCompare | Toggle the lamp off → a dark photo "enhances" (Retinex demo) |
| 6 | **Cork pinboard** | **SARsight** (NASA Space Apps 2026, NISAR radar) | Pinned printouts; SARsight radar sweep animates |
| 7 | **Notebook** | Academics (IIT BSSE, IBA BBA, NDC, RCPSC), teaching (SAT, IELTS), MUN mentoring, skills | Pages flip |
| 8 | **Handheld console** | Easter egg: 16-bit boxing mini-game made for Arshia (named) | Playable tiny pixel game |
| 9 | **Sticky notes + little printer** | Contact, socials | Printer prints the résumé PDF (reuse current generator logic) |

## 4. Gamification (light)

- **Lost keycaps**: 6 keycaps hidden around the desk spell CATNIP; collecting all unlocks zoomies (1.7× speed). Some need a jump (printer, dispenser).
- **Knockables**: pens, bottle caps, a USB stick can be batted off the edge (cat logic). Counter: "Things knocked off the desk: 7".
- **Nap spots**: lie on the warm server / laptop → small cozy camera moment.
- Progress persisted in `localStorage` (try/catch, optional).
- Never gate content behind the game.

## 5. Art direction (Léo-inspired)

- **Materials**: matte clay / plaster, soft rounded geometry, light wood desk. No glossy plastic, no neon (contrast with Jay/Bruno).
- **Light**: warm late-afternoon sun through a window off-frame, long soft shadows, slight bloom on LEDs only. Baked lighting.
- **Palette (draft)**: cream `#F3EEE6`, warm paper `#E9E1D4`, light oak `#C9A47E`, deep ink green `#0F2A1F` (type), LED green `#6BD48A`, paw-pad pink `#E79AA0` + bean black `#2B2422` as the only accents.
- **Grain**: subtle film-grain overlay.
- **Type**: big tight grotesk display for headings, small quiet body, mono labels. Candidates: keep Space Grotesk + Space Mono for continuity, or move to a softer grotesk (e.g. Inter Tight / Instrument Sans).
- **UI chrome**: Léo-style thin top bar (name · role · Work · About · Play), project cards as clean off-white pages with year / team / role rows.
- **Small personality touches**: "(Click to wake the cat)", hover cursor turns into a paw.

## 6. Tech stack

- **Vite + TypeScript + vanilla Three.js** (Léo's site is the same shape; smaller than Next/R3F). DOM UI in plain TS or a tiny lib (no React needed).
- **Assets**: one desk GLB (meshopt/Draco + KTX2 textures, baked lightmap) ≤ ~1.5 MB; cat GLB with idle / walk / sleep / roll anims ≤ ~250 KB. Zones lazy-load detail.
- **Physics**: no full engine by default. Simple custom collision against desk surfaces + impulse on knockables. Lazy-load Rapier only if play mode truly needs it.
- **Audio**: off by default; tiny SFX only (purr, keycap click, pour). Optional music must be royalty-free/own.
- **Live server stats**: small read-only JSON endpoint on the Pavilion (uptime, container count, load) exposed via Cloudflare Tunnel, cached; nothing sensitive. Offline fallback: "Server's napping — so is the cat."
- **Content**: single `content.json` (migrated from `lib/data/portfolio_data.dart`), drives 3D labels, cards, Lite page and résumé PDF.
- **Deploy**: Vercel, same domain (rakin-talukder.me).

## 7. Performance budget

- Initial JS ≤ 250 KB gzip; first load ≤ 3 MB total; interactive < 3 s on mid-range phone / 4G.
- Hero shows instantly as DOM text over a still render while 3D streams in (no blocking loader).
- DPR cap 1.5 (1.0 on low tier), shadows baked, ≤ ~100 draw calls, 60 fps desktop / 30+ mobile.
- GPU tier detection → full / reduced / Lite.

## 8. Phases

Status (2026-11-18): phases 1–7 built in `v2/` (uncommitted). Left for Rakin: run `server/stats.py` behind the tunnel + set `VITE_SERVER_STATS_URL`; create the Vercel project (root `v2`) and move the domain. Background music was skipped on purpose (licensing); sound effects are synthesised.


1. **Foundation** — new Vite project, `content.json`, Lite page in Léo style (shippable on its own).
2. **Greybox** — blockout desk, camera rail + scroll, stops, click → cards.
3. **Art pass** — clay models, baked lighting, palette, grain.
4. **The cat** — model + anims, play mode, mobile joystick, collisions.
5. **Fun layer** — keycaps, knockables, zone interactions, arcade easter egg, sound.
6. **Live stats** — server endpoint + tunnel.
7. **Polish** — perf tiers, a11y (keyboard nav, focus, alt text), SEO/meta, analytics-free, deploy; retire Flutter v1.

## 9. Decisions made

- v2 lives in `v2/`; the Flutter site at the repo root stays untouched and deployed.
- Desk props: built procedurally in code (rounded clay shapes).
- **The cat**: built procedurally in code (no free model fit), modelled on his photos in `v2/cat/`: a slim, long-legged young white cat with big tall pink-lined ears, a wedge face, pink nose and grey-green eyes; a dark grey-brown tabby patch on the crown sweeping over one ear (that ear dark-backed); a grey smudge at the base of the tail; a broom tail that is white at the root and fades to near-black, bushiest at the tip; pink beans.
- Arcade easter egg names Arshia.
- Dropped: Jotno Ai, Type I Error.


## 10. v3 redesign (2026-11-18)

- **2D page**: the original portfolio's design and copy, restored: neo-brutalist black/white, Space Grotesk + Space Mono,
  sections 01 About … 07 Contact with ghost numbers, ticker, academics dialogs (test scores, acceptances, mentorship),
  contact email support@rakin-talukder.me, résumé laid out like the original PDF. SARsight and SPL-1 added to projects.
- **3D desk**: procedural high-res wood/plaster/wicker textures, RoomEnvironment reflections, 4K PCF-soft shadows, DPR up to 2.
  Shelf unit on the desk (phone dock + glass, console + plant), Pavilion on its crate, book stack, wall shelf with Plassey box.
- **Live screens** (`screens.ts`): CSS3D pages shown through transparent "holes" in the Victus and phone screens.
  Victus = mini browser (Projects home + tabs for web demos). Phone = launcher for the mobile apps; home bar to switch.
  Click a screen (or "Use the laptop/phone") to fly up to it and interact; Esc / button to return.
- **Pinboard**: About, Educational Background, Tech Stack, Experiences cards (original style) + polaroid.
- **Printer**: actually prints the résumé (animated sheet with the drawn résumé), then opens /resume.html.
- **Cat** (`cat.ts`): one skinned mesh on a 30-bone skeleton with 12 fur shells; markings from the photos.
  Sleeps in a basket on a stool; on Play he leaps onto the desk, on exit he leaps back.
- **Play physics** (`play.ts`): 3D box colliders; cat = three body samples × real height; no walking/turning through things,
  head bonks under shelves, parkour route up both sides; hisses (and refuses) at desk edges.

### v3.1 (2026-11-18)
- Cat 15% smaller (scale 0.72), slimmer legs, neater paws. Idle behaviour in play: stand → sit (tail wrapped) → groom
  (right paw to mouth) now and then → sphinx lie with forelegs out (like photo 3). Stretches on waking, crouches on landing.
- Victus shows only the web projects; mobile apps live on the phone.
- Plank bridges the top shelf to the (raised) wall shelf, directly under the pinboard (raised to sit above it).
- Lighting: warm sun + warm hemisphere bounce, VSM soft shadows, half-res GTAO ambient occlusion, warm colour grade
  with soft vignette, lower exposure. All passes keep alpha so the live screens still show through.
