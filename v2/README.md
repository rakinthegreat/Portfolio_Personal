# Portfolio v2: On Rakin's Desk

A cat's-eye tour of a software engineer's desk in Dhaka. Scroll through it, click things, or press **E** and play as the cat.
The Flutter site in the repo root is v1 and is untouched; this folder is a separate Vite project.

## Run

```bash
cd v2
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview    # serve dist/ on http://localhost:4173
```

## How it's put together

| Path | What |
|---|---|
| `src/content.json` | All content: projects (with `zone` = which desk object, `previewUrl`, `mobile`), education, skills, socials. Edit this, not the HTML. |
| `src/render.ts` | Renders the plain HTML page and `resume.html` from `content.json` at build time (SEO, no-JS, low-end devices). |
| `src/main.ts` | Small always-loaded script: live-demo popups, sound toggle, clock, reveal; lazy-loads the 3D desk. |
| `src/preview.ts` | In-page live demo popup for the 2D project cards (phone frame for `mobile: true`). |
| `src/three/screens.ts` | Real web pages on the Victus (browser) and the phone (app launcher), shown through the 3D screens. |
| `src/three/materials.ts`, `cards.ts` | Procedural high-res materials; pinboard cards and the printed résumé. |
| `src/three/` | The 3D desk: `props.ts` (desk + objects + colliders), `cat.ts` (procedural cat), `stops.ts` (scroll-tour camera stops), `play.ts` (play mode), `textures.ts` (everything drawn in code), `mount.ts` (wires it up). |
| `src/arcade.ts` | "Punch It Out", the boxing mini-game on the console. Loaded only when opened. |
| `src/sound.ts` | Synthesised sound effects; off until the visitor turns sound on. |
| `src/stats.ts` + `server/stats.py` | Live stats from the home server (optional). |

The 3D desk only loads with WebGL 2 and no reduced-motion / data-saver preference. Everyone else gets the plain page.
Add `?debug` to the URL to expose `window.__desk` (cat, play, camera, screens, desk; `debug.cam` overrides the camera) in the console.

## Live server stats (optional)

1. On the HP Pavilion: `python3 server/stats.py --port 8787 --origin https://rakin-talukder.me`
   (stdlib only; exposes uptime, running container count and 1-minute load, nothing else).
2. Route a hostname to it through the existing Cloudflare Tunnel (example config in the script's docstring).
3. Build with `VITE_SERVER_STATS_URL=https://stats.rakin-talukder.me/stats` (in Vercel: Project → Settings → Environment Variables).

Without it, the server stop says the server is napping.

## Deploy (Vercel)

Create a **new** Vercel project from this repo with **Root Directory = `v2`** (framework: Vite; `vercel.json` sets the rest).
The existing project that builds the Flutter site keeps working. When v2 is ready, move the `rakin-talukder.me` domain to the new project.

## Controls

Scroll: tour the desk · click an object: fly to it, click again: use it (laptop/phone screens, printer, console) · click the cat: belly up.
Play: **E** to start (he leaps out of his basket), WASD / arrows, Shift run, Space jump, Esc stop (he leaps back). Climb the shelves; six keycaps spell a word. He hisses if you try to make him jump off the desk.
