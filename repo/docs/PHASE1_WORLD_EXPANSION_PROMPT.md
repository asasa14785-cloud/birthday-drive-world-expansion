# PHASE 1 — AUTONOMOUS WORLD RESEARCH, BEST-ASSET SELECTION & DIRECT INTEGRATION PREPARATION
(نسخة من الأمر الأصلي كما سُلّم — النسخة المنفّذة والمتبقي في `المرجع.md` و `research/world-expansion/`)

Project: BIRTHDAY DRIVE — WONDERLAND WORLD EXPANSION
Executor: Claude
Main repository: https://github.com/asasa14785-cloud/asset-optimization
Role: senior creative technical director, Three.js world-building engineer, 3D environment artist, asset pipeline engineer, autonomous coding agent.

## MISSION
Upgrade the EXISTING Birthday Drive world into an extraordinary, expansive, coherent, stylized fantasy game environment.
- Do not create three prototypes. Do not present three alternatives. Do not stop at research or recommendations.
- Do not ask the user to choose asset packs. Inspect all relevant sources, choose the BEST compatible combination yourself, proceed with ONE decisive artistic and technical direction.
- Final environment: a professionally designed animated-storybook adventure world, original and commercially usable.
- Broad characteristics allowed: whimsical landscapes, colorful organic architecture, surreal natural formations, giant plants/unusual trees, floating islands, distinctive villages, hidden landmarks, environmental storytelling, large scenic vistas.
- Do NOT copy Adventure Time characters, locations, backgrounds, logos, music, recognizable designs or copyrighted assets. Create an original world identity.

## THE ACTUAL EXISTING PROJECT — NON-NEGOTIABLE
- Root: React 19, Vite 7, Tailwind CSS 4, full-screen game shell.
- Nested game `birthday-drive/`: Three.js 0.164.x, Cannon.js 0.6.x, GSAP, Howler, NippleJS, Bruno Simon folio-2019 architecture.
- Paths: `birthday-drive/src/javascript/`, `birthday-drive/static/birthday/`, `birthday-drive/static/models/`, `birthday-drive/asset-sources/`, `public/game/`, `scripts/`, `docs/`, `package.json`, `vite.config.ts`.
- Build: `cd birthday-drive && npm ci && cd .. && bash scripts/build-game.sh && npm run build`.
- Dev: `cd birthday-drive && SANDBOX_URL=1 npm run dev -- --host 0.0.0.0`.
- Outer shell is separate from the inner engine; do not confuse their dependencies.
- FIRST inspect the real repository (branch, files, manifests, source, build scripts). Do not assume filenames from old reports. Preserve user changes.
- NEVER: `git reset --hard`, force-push, delete original assets, replace the existing engine, remove the original Bruno vehicle physics, overwrite the working app with an external project. Create a feature branch only when safe.
- Inspect: pwd, git status --short, git remote -v. Read README.md, package.json, docs/RELEASE_REPORT.md, FINAL_QA_REPORT.md, ASSET_LICENSE_REGISTER.md, ASSET_PIPELINE_REPORT.md, world/vehicle/camera docs, all world implementation files. Run the documented build pipeline. Verify the actual experience. Capture its current appearance.
- Inspect: terrain, road, vehicle scale, camera far plane, fog, lighting, materials, world boundaries, memory station positions, scene construction, optimized models, geometry-merging strategy, asset loading/cleanup, performance governor.
- Create `research/world-expansion/BASELINE.md` recording the actual implementation and its limitations.

## SOURCES TO INVESTIGATE
### 3DASSETS.DEV
Read https://3dassets.dev/skill.md, use the official API (`https://3dassets.dev/api/v1`): `GET /assets?q=tree&style=stylized&limit=30`, `GET /assets/{slug}`, `GET /packs`, `GET /packs/{slug}`; docs https://3dassets.dev/docs/agents; schema https://3dassets.dev/api/v1/openapi.json; catalog https://3dassets.dev/packs.
Do not trust thumbnails. For every promising pack inspect the manifest, starter scene, several real GLBs, verify license, dimensions, triangle counts, texture sizes, material consistency, pivots, compatibility with our pipeline. Use returned CDN URLs exactly; never invent URLs. Download locally; no third-party CDN requests during gameplay. Prioritise complete environments with a common visual language (whimsical forest, stylized fantasy, storybook landscapes, colorful nature, floating islands, fantasy villages, giant mushrooms, magical gardens, surreal architecture, cartoon landscapes, starter scenes). Do not search only for individual trees.

### proceduralterrains — https://github.com/arashmh/proceduralterrains (live editor https://terrains.zyfod.dev/)
Tile terrain, Infinite World, Planet mode, layered noise, biome painting, terrain/water/collision-mesh export, baked color/normal/height maps, chunk LOD. Inspect the latest source and license. Use as an EXTERNAL authoring/export tool only; its React editor/renderer must NOT be embedded in production. Preferred use: generate one cohesive finite terrain layout (hills, valleys, elevated areas, biome regions), export GLB/GLTF + collision mesh + baked textures, inspect, test inside the real Birthday Drive renderer. No unbounded Infinite World: a carefully authored finite adventure world with a main route and optional exploration areas. Adapt incompatible exports; do not write another terrain engine.

### Quaternius
- Main pack: Stylized Nature MegaKit (https://quaternius.itch.io/stylized-nature-megakit, https://quaternius.com/packs/stylizednaturemegakit.html) — ~116 models, glTF, CC0. Inspect the real package; select a coherent subset, do not import all.
- Ultimate Platformer, Fantasy Props MegaKit, Pirate Kit: check formats and licenses; use only suitable pieces (bridges, platforms, floating structures, rocks, props, village landmarks, water decorations, a coastal/island zone). Do not force medieval objects into a storybook world.
- Do not download full packages unnecessarily.

### KayKit Platformer — https://kaylousberg.itch.io/kaykit-platformer
Inspect the exact free-tier package: modular sections, platforms, bridges, obstacles, decorations, atlases, scale, materials. Verify the free-tier license separately from paid editions. Use only if visually compatible.

### ToxSam open-source-3D-assets — https://github.com/ToxSam/open-source-3D-assets
~991 GLBs. Inspect JSON registry, original sources, previews, URLs, per-model license, dimensions, material quality. Look for gardens, crystals, surreal architecture, landmarks, fantasy structures. Registry-level descriptions do not prove each model's license: verify each asset individually.

## SYSTEMS ALREADY IN THE PROJECT (do not duplicate/replace)
- glTF Transform (keep working pipeline, existing versions); NippleJS (no second joystick); Howler (no second audio engine); HBD 3D Craft cake/celebration (already integrated; reuse only missing verified features).
- Production target: Three.js 0.164.x, Cannon 0.6.x. Do NOT: upgrade Three.js, add Three 0.185+, add a second Three runtime, React Three Fiber, Drei, Babylon, Godot/Unity runtimes, replace Cannon/GSAP/Howler, introduce WebGPU-only models/shaders.
- For every candidate asset: load in isolation; inspect coordinate system, units, scale, materials, alpha, normal maps, textures, animations, pivots, bounding boxes; convert/adapt incompatible materials. Do not assume Blender-compatible = game-compatible.

## ART DIRECTION
ORIGINAL STORYBOOK FANTASY WORLD: large, whimsical, playful, colorful, organic, handcrafted, cohesive, rich in discovery, professionally composed. Keep the existing pastel identity as foundation. Specify: palette, material rules, shape language, tree scale, building proportions, terrain style, rock/vegetation style, atmospheric perspective, lighting, sky, fog, landmark silhouettes. Never mix packs merely because all are "low-poly". Use ONE dominant asset family, supplement with limited compatible assets, reject clashing ones.
Write: `research/world-expansion/WORLD_ART_DIRECTION.md`, `SELECTED_ASSETS.md`, `ASSET_LICENSES.md`. No variations, no gallery, no waiting for approval.

## FIRST INTEGRATION SLICE
Create ONE compact but representative section of the final world using selected assets + terrain: imported terrain, selected nature assets, correct materials, correct scale, one connected driveable road segment, one distant landmark, suitable collision, existing camera and vehicle compatibility. Test in the real engine; do not teleport the production car to a fake scene; do not replace the existing world until the segment passes the compatibility test. Keep research files separate from production assets. Preserve originals, optimized models, license manifests, build scripts, source structure. Store assets within the established static conventions, no duplicates, meaningful filenames, update the asset manifest.

## WORKFLOW
INSPECT EXISTING PROJECT → READ ORIGINAL FILES → SEARCH SOURCES → VERIFY ASSETS → CHECK LICENSE → CHECK VERSION COMPATIBILITY → SELECT BEST COHERENT SET → DOWNLOAD → OPTIMIZE → TEST IN EXISTING ENGINE → IMPLEMENT ONE INTEGRATION SLICE → BUILD → VISUAL INSPECTION → CORRECT.
On download failure: try an official alternative, inspect the manifest, record unavailable assets, continue with the best verified replacement. Never invent names or URLs.

## FINAL REPORT (end of Phase 1)
Verified project status; the single art direction; exact repositories/sources; downloaded models and paths; verified licensing; the integration segment; screenshot from the running app; compatibility report; performance observations; exact next actions. STOP only after the first real integration segment works. Wait for Phase 2.

## تعليمات المستخدم الإضافية (بالعربية)
- نزّل المستودع في البيئة وابدأ التنفيذ، واعمل تايمر 50 دقيقة.
- عند الدقيقة 48 ابدأ بإنشاء **ملف المرجع** بما تم وما بقي، وانسخ الأمر في المجلد ليبيّن ما تم وما بقي.
- سلّم اللعبة المعدّلة في الملفات التي يتم تسليمها.
