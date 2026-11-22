# BASELINE — Birthday Drive V1 as actually found (2026-11-22)
Repo `asasa14785-cloud/asset-optimization`, branch `main`, 1 commit ("Initial commit: Birthday Drive game"). Working tree clean at clone.

## Verified facts (read from source / measured)
- Engine: folio-2019, Three.js 0.164.1, Cannon 0.6.2, GSAP, Howler, NippleJS. Z-up world. Shell = React 19 / Vite 7 / Tailwind 4 iframe (`src/App.tsx` → `public/game/index.html`).
- **Rendering is unlit**: matcap `MeshMatcapMaterial`/custom shaders, baked floor shadows, NO scene lights, NO fog. Standard PBR GLB materials render black unless lit/converted.
- **Floor = flat background plane** (`World/Floor.js`, 4-colour gradient shader) + Cannon floor at z=0. There is no 3D terrain. Pastel palette comes from `config.json > theme`.
- Camera: `PerspectiveCamera(40°, aspect, near 1, far 80)` → anything >80 m is clipped: distant vistas need far plane/fog work in Phase 2.
- Route (`BirthdayWorld.js ROUTE`): (0,6)→(0,54)→(-46,54)→(-46,102)→(-9.5,102); plaza (0,102). Memory frames sit at offsets 6.6–8.4 m on the **-x side** of the first segment; the +x side was free.
- Scenery was procedural (icosahedron crowns, cylinder trunks) merged per material (matcap shader has no instancing).
- Quality governor `Birthday/Quality.js` (high/mid/low, `?quality=`).
- Build pipeline `bash scripts/build-game.sh && npm run build` works (verified).

## FINDINGS / limitations
1. **The GitHub repo shipped with ZERO `.glb` files and no `static/sounds/`** (92 Bruno models + sounds missing; `asset-sources/originals/models` empty, optimized copies absent). The game 404'd on load. Restored ONLY the missing binaries from upstream `brunosimon/folio-2019` (MIT) into `static/models`, `asset-sources/originals/models`, `static/sounds` (no overwrite, no engine replaced). The earlier "optimized copies" are therefore NOT restored: re-run `scripts/asset-pipeline.mjs`.
2. No terrain relief, no fog, far plane 80, flat world → "expansive" feel needs Phase 2 camera/fog/terrain work.
3. Car/physics/camera core untouched in Phase 1.
