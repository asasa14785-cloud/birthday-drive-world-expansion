# ASSET & LICENSE REGISTER — Birthday Drive V1 (Phase 3 audit)

Original copyright notices and third-party licence files are untouched: `birthday-drive/license.md` (folio-2019, MIT © Bruno Simon), `birthday-drive/THIRD_PARTY_NOTICES.md`, `birthday-drive/static/draco/README.md`, `node_modules/*/LICENSE` of each package.
Code licence ≠ asset licence; each row states which applies. Anything not verified is marked **UNVERIFIED**.

| Asset / module | Source | Author | Format | Licence | Required attribution | Modifications | Final usage |
|---|---|---|---|---|---|---|---|
| Engine (car, physics glue, camera, controls, areas, shadows, floor) | github.com/brunosimon/folio-2019 | Bruno Simon | JS | MIT | Keep `license.md` copyright notice | Pastel theme, portfolio sections removed, birthday modules added, quality governor, camera-focus blend | `birthday-drive/src/javascript/` |
| 3D models (car, tiles, cone, brick, bowling, trophy, crossroads, playground, etc. — 92 GLB) | folio-2019 `static/models` | Bruno Simon | GLB (Draco) | MIT (repo licence) — **asset-specific terms UNVERIFIED beyond the repo's MIT file** | Keep `license.md` | Phase 3: welded/deduped/re-Draco'd *copies* swapped into `static/models` where smaller; originals kept in `asset-sources/originals/models` | In-game car, tiles, props |
| Matcap textures, floor shadow PNGs, label PNGs | folio-2019 | Bruno Simon | PNG | MIT (repo licence) | as above | none | Materials, start screen |
| Sound effects (engine, horns, hits, UI, reveal…) | folio-2019 `static/sounds` | Bruno Simon | mp3/ogg | MIT (repo licence); **individual sample origins UNVERIFIED** | as above | none | Car/impact SFX |
| Draco decoder | google/draco | Google | JS/WASM | Apache-2.0 | Keep notice in `static/draco/README.md` | none | GLB decoding |
| three 0.164.1 | npm | three.js authors | JS | MIT | package LICENSE | none | rendering |
| cannon 0.6.2 | npm | Stefan Hedman / schteppe | JS | MIT | package LICENSE | none | physics |
| gsap 3.12 | npm | GreenSock | JS | GSAP "Standard No Charge" licence | package license | none | all transitions |
| howler 2.2.4 | npm | James Simpson | JS | MIT | package LICENSE | none | audio |
| nipplejs 1.0.4 | npm | Yoann Moinet | JS | MIT | package LICENSE | adapter `Birthday/Joystick.js` | touch joystick |
| dat.gui 0.7.9 | npm | Google Data Arts | JS | Apache-2.0 | package LICENSE | none | `#debug` only |
| Cake geometry, candles, confetti (`CakeParts.js`, `Candles.js`, `Confetti.js`, `Shared.js`) | HBD 3D Craft (reference repo) | HBD authors | JS | MIT (header kept in files) | MIT header kept | Ported to Z-up world, Basic materials | Finale |
| Audio cues (`Birthday/Cues.js`) | this project | project | code-synthesized WebAudio | Original work, no samples | none | – | memory open/close, candle puffs, fanfare |
| Photographs `static/birthday/photos/01–06.webp` | AI-generated placeholders | n/a | WebP | Placeholder only — **replace per recipient**; owner of real photos must grant permission | none | – | Memory frames |
| Voice messages | none shipped (`01.mp3` path intentionally absent to test fallback) | – | – | – | – | – | – |
| Comic Neue (web font, Google Fonts link) | fonts.google.com | Craig Rozynski | WOFF2 | SIL OFL 1.1 | none required | none (external request) | UI/3D labels |
| Favicons/social images | folio-2019 `static/favicon`, `static/social` | Bruno Simon | PNG | MIT (repo) — **still show original branding; replace before public release** | – | none | meta tags |
| glTF-Transform CLI/API | npm (dev tool, not shipped) | Don McCurdy | JS | MIT | n/a | n/a | asset pipeline only |
| Quaternius / Kenney packs | – | – | – | CC0 (if used) | – | **NOT USED** — packs could not be obtained/verified in this sandbox | – |

Open licence risks: (1) verify sample origins of Bruno's sound effects and whether his model/texture files carry terms beyond MIT; (2) swap favicons/share images; (3) real photos/voice need the subject's consent.
