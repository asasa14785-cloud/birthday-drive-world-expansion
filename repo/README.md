# Birthday Drive V1 — release candidate

An interactive 3D birthday gift: drive a little car through a pastel world, stop at photo frames to open memories
(photos, captions, optional voice messages) and arrive at a birthday cake with a personalised reveal.

Engine: [brunosimon/folio-2019](https://github.com/brunosimon/folio-2019) (MIT) — Three.js 0.164, Cannon 0.6, GSAP, Howler, NippleJS.
Shell: React + Vite + Tailwind (embeds the built game full-viewport).

## Preview URL
Sandbox-local preview (not deployed publicly): `http://localhost:4173/` (started with `npx vite preview --host 0.0.0.0 --port 4173`).
Deployment is intentionally **not** done without explicit authorization — see `docs/DEPLOYMENT_GUIDE.md`.

## Commands
| Task | Command |
|---|---|
| Install shell deps | `npm install` |
| Install engine deps | `cd birthday-drive && npm ci` |
| Develop the game | `cd birthday-drive && SANDBOX_URL=1 npm run dev -- --host 0.0.0.0` (http://localhost:1234) |
| Build game → `public/game/` | `bash scripts/build-game.sh` |
| Production build (shell + game) | `npm run build` → `dist/` |
| Preview production build | `npm run preview` (or `npx vite preview --host 0.0.0.0`) |
| Re-run asset pipeline | see `docs/ASSET_PIPELINE_REPORT.md` |
| E2E browser test | `scripts/e2e-test.mjs` (Playwright; usage in `docs/FINAL_QA_REPORT.md`) |

## Where things live
- Game source: `birthday-drive/src/javascript/` (new birthday code in `Birthday/`)
- **Content / personalisation:** `birthday-drive/static/birthday/config.json` + `birthday-drive/static/birthday/photos|audio/`
- Models (served): `birthday-drive/static/models/` — originals preserved in `birthday-drive/asset-sources/originals/models/`, optimized copies in `asset-sources/optimized/models/`
- Published game: `public/game/`
- Docs: `docs/` (start with `RELEASE_REPORT.md`, `FINAL_QA_REPORT.md`, `CUSTOMIZATION_GUIDE.md`)

## Prepare the next birthday (short version)
1. Put photos in `birthday-drive/static/birthday/photos/` (webp/jpg, any aspect ratio).
2. Edit `birthday-drive/static/birthday/config.json`: `recipient`, `sender`, `carColor`, `welcome`, `cake`, `stations[]` (title, photo/photos, caption, date, optional `audio`).
3. Optional voice messages: add `.mp3` to `static/birthday/audio/` and set `"audio": "/birthday/audio/01.mp3"` on the station.
4. `bash scripts/build-game.sh && npm run build` then host `dist/` on any static host.

Quality modes: automatic (high / mid / low, with a measured frame-time governor). Force with `?quality=high|mid|low`.
Controls: WASD/arrows, Space brake, Enter open memory, T tour, R reset, M mute; touch: joystick + Brake + Reset buttons.

See `docs/RELEASE_REPORT.md` for known limitations.
