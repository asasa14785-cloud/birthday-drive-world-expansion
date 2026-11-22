# REFERENCE INTEGRATION PLAN — Birthday Drive V1

Status: **PLAN ONLY (Phase 1).** Nothing below has been implemented. Details/evidence: `../birthday-drive-research/audit/REFERENCE_REUSE_MATRIX.md` and `ASSET_LICENSE_REGISTER.md`.

## The 8 required answers

### 1. Which modules are reused directly?
Everything of the Bruno engine, unchanged: `Application`, `Time`, `Sizes`, `Resources/Loader` (GLTF+DRACO), `Camera`, `World`, `Car` + `Physics` (Cannon 0.6.2 RaycastVehicle), `Controls` (keyboard + native touch), `Objects`/`Materials`/`Shadows`, `Areas/Area`, `Sounds` (Howler), GSAP tweens, post passes. three.js examples already used (`EffectComposer`, `RenderPass`, `ShaderPass`, `OrbitControls`, `GLTFLoader`, `DRACOLoader`, `FBXLoader`) come from the installed `three@0.164.1`.

### 2. Which code is ported from HBD 3D Craft (MIT, Copyright (c) 2026 GitBababoo)?
| Target (new file) | Source | Mode |
|---|---|---|
| `src/javascript/World/Birthday/Candles.js` | `src/cake/candles.js` (flame ShaderMaterial, InstancedMesh wax/wicks, `buildCandles`) | PORT — replace `sharedMaterial/sharedTexture` with a local Map cache |
| `src/javascript/World/Birthday/CakeParts.js` | extracts from `src/cake/parts.js`: `createBeveledCylinder`, `createHeartCakeGeometry`/`getHeartShape` (optional), `createPipedCreamMesh`, `createStrawberryMesh`, `createCherryMesh`, `addGlazeDrips`, `createCakeCrumbBumpTexture` | PORT selective (~400 of 2367 lines) |
| `src/javascript/World/Birthday/Cake.js` | recipe from `cake/models/classic-tiered.js` / `triple-luxury.js` | ADAPT (re-map PBR → matcap/MeshStandard decision, see risks) |
| `src/javascript/World/Birthday/Confetti.js` | `src/room/party/confetti.js` (InstancedMesh pool) | PORT |
| `src/javascript/World/Birthday/Balloons.js` | `src/room/party/balloons.js` | ADAPT (optional) |
| `src/javascript/QualityGovernor.js` | `src/render-quality.js` → `getDeviceClass`, `createQualityGovernor` (no bloom) | ADAPT: levels = pixelRatio 2→1.5→1, blur strength 1→0 |
| reduced-motion flag | `viewer.js:363` pattern | ADAPT |
| `src/javascript/BirthdayConfig.js` | `src/card-link.js` (`buildShareUrl`, `decodeCardHash`, `CARD_DEFAULTS`) | ADAPT with hash key `#bd=` (Bruno reads `#debug`, `#cybertruck`) → name, age, message, palette |
| Audio cue(s) | `src/audio/cues.js` `popper`, `chime`, party loop | ADAPT — only if rendered to files for Howler, or via one small shared AudioContext respecting `Sounds.setMute` |
Each ported file gets a header: `Ported from moo-krub/hbd-3d-craft (MIT) — Copyright (c) 2026 GitBababoo` + `THIRD_PARTY_NOTICES.md`.
**Not** ported: HBD viewer/creator UI, room GLBs, voice clips, bloom/RoomEnvironment, photo handling (HBD has no upload backend — only an external HTTPS link).

### 3. Which assets come from Quaternius?
Stylized Nature MegaKit (CC0) — **downloaded: FREE "Standard" edition = 68 of the 116 models** (the other 48 are paid PRO; not used). sha256 in the license register. Intended subset: ~6 tree variants, 4 bushes, 4 rocks, 6 flowers/grass tufts for roadside scenery. Constraint: Bruno renders with matcaps, no lights → either bake to matcap materials at load (swap `material` → `MeshMatcapMaterial` using `resources.items.matcap*`, keeping vertex colours/texture as base) or intentionally keep stylised vertex-colour look with unlit `MeshBasicMaterial`. Decision after a one-asset visual test in Phase 2. Place as non-colliding decor or `Objects.add` with a simple collision box for trunks.

### 4. Which props come from Kenney?
Food Kit 2.0 (CC0, 200 GLB) — **downloaded** (includes a ready-made `cake-birthday.glb` with candles, 1,146 tris, plus cupcake/donut/pizza…). Intended: cake / cupcake / donut / ice-cream / pizza / drinks for a celebration table & scattered sweets; ≤ 15 hand-picked items, rejected when low-poly look clashes. Imported as GLB → matcap swap → registered via `Objects.add` (with `collision` boxes) so the car can push them.

### 5. Will NippleJS be used?
**Undecided; default NO until proven.** Evidence: Bruno already ships a multitouch-safe native joystick (`Controls.setTouch`, touchIdentifier tracking, cleanup of listeners) feeding `controls.touch.joystick.angle.value` consumed by `Physics` steering. Phase 2 test: install `nipplejs@1.0.4` (MIT) in a branch, create `mode:'static'|'dynamic'`, map `move` event `data.angle.radian` → `controls.touch.joystick.angle.value` and `start/end` → `.active`, using the existing `joystickStart/Move/End` trigger names so `Physics`/`Car` remain unchanged; compare feel on emulated touch. Adopt only if it removes a real problem (e.g. dynamic positioning, thumb comfort). `manager.destroy()` for cleanup. No custom joystick will be written.

### 6. Which parts of Raycast RC Car are reference-only?
All of it (`src/Vehicle.js`, `World.js`, `main.js`, GLBs): Three 0.185.1 + cannon-es 0.20 + Vite 8. Concepts only: (a) pointer-events joystick with `setPointerCapture` (main.js ≈1215), (b) on-screen **Reset** button (`#mobile-reset` ≈1188) → we expose Bruno's existing `controls.trigger('action',['reset'])`, (c) Gamepad polling with deadzone (≈1286+) → optional adapter writing `controls.actions.*`, (d) mobile control placement. No code or GLB is copied.

### 7. How will GLB assets be optimised?
Tool: `npx @gltf-transform/cli@4.5.1` (build-time only; not a dependency). Pipeline per asset, from pristine copies kept in `birthday-drive-research/asset-sources/originals/` (never modified):
1. `inspect` (triangles, textures, bytes).
2. `prune` + `dedup` + `weld`/`simplify` only where triangle count > budget (props ≤ 2–3k tris, trees ≤ 5k).
3. `resize --width 512 --height 512` (decor textures) and `webp` (supported by r164 `GLTFLoader` in modern browsers).
4. `draco` (already supported: `Utils/Loader.js` uses `DRACOLoader`, decoder in `static/draco/`).
5. **Not** `meshopt` or `ktx2/etc1s/uastc` until `MeshoptDecoder` / `KTX2Loader` (+ transcoder files and renderer binding) are deliberately added.
Acceptance: visual compare in game before keeping; budget: total new static ≤ 4 MB gzip; log each result in the license register.

### 8. Which original Bruno systems must remain untouched?
`Physics.js` car/RaycastVehicle/physics tuning and `addObjectFromThree`; `Car.js` model sync; `Time.js`/`EventEmitter.js`; `Camera.js` core easing/zoom/pan; `Utils/Loader.js` loader architecture (only append new resource entries in `Resources.js`); matcap material pipeline; Cannon 0.6.2; Three 0.164.1; Vite 5 + `vite-plugin-glsl`. Allowed modifications (Phase 2+): branding/text/sections content, new `World/Birthday/*` modules registered in `World.start()`, `Application.setRenderer` pixelRatio hook, `index.html` overlays, `Resources.js` additions, removal of the Three.js Journey promo.

## Phase-1 compatibility evidence (three r164 `GLTFLoader`, scratch page, not in the game)

`../birthday-drive-research/audit/screenshots/asset-compat-three-r164.png`: all tested assets load with **no errors** in three 0.164.1 `GLTFLoader` (no Draco/Meshopt/KTX2 needed — plain `.glb`/`.gltf+.bin+png`):

| Asset | Triangles | Material on load | Verdict |
|---|---|---|---|
| Kenney `cake-birthday.glb` | 1,146 | MeshStandardMaterial (texture `KHR_texture_transform`) | ✅ light; usable as hero cake (or compare with HBD procedural cake) |
| Kenney `cupcake.glb` / `donut-sprinkles.glb` | 204 / 180 | MeshStandardMaterial | ✅ very light |
| Quaternius `CommonTree_1` | 6,265 | MeshStandardMaterial (leaf alpha textures) | ⚠ heavy → simplify/instance, ≤ 3k target |
| Quaternius `Pine_1` | 3,947 | MeshStandardMaterial | ⚠ borderline |
| Quaternius `TwistedTree_1` | 9,564 | MeshStandardMaterial | ❌ too heavy unless decimated |
| Quaternius `Bush_Common_Flowers` / `Flower_3_Group` / `Rock_Medium_1` | 1,368 / 755 / 342 | MeshStandardMaterial | ✅ |

Consequences: (1) both packs use **PBR + textures** and need lights; Bruno's scene has **no lights** (matcap pipeline) → Phase 2 must choose: add one `HemisphereLight`+`DirectionalLight` only for imported props (no change to Bruno meshes) *or* convert to unlit/matcap. The flat orange/matcap look suggests converting materials (keep base colour textures, drop normals). (2) Tree triangle budgets require `glTF-Transform simplify` or `InstancedMesh` placement. (3) Textures are PNG → `resize` + `webp` pass.

## Proposed module layout (Phase 2)

```
src/javascript/
  BirthdayConfig.js          # #bd= URL config (name, age, message, colours)  [ADAPT card-link]
  QualityGovernor.js         # FPS governor                                   [ADAPT render-quality]
  World/Birthday/
    Cake.js  CakeParts.js  Candles.js  Confetti.js  Balloons.js  BirthdaySection.js
static/models/nature/…       # Quaternius, optimised
static/models/food/…         # Kenney, optimised
THIRD_PARTY_NOTICES.md
```

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Matcap look vs PBR cake/candles | Use `MeshMatcapMaterial` + vertex colours; flame shader is unlit already |
| 2× DPR + SwiftShader / low-end phones | Quality governor; touch → pixelRatio ≤ 1.5 |
| HBD functions depend on shared caches | Replace with local `Map` caches, dispose explicitly |
| Autoplay audio | Keep audio start on START click (existing) |
| Bruno branding/rights (project images, sounds, promo) | Remove/replace before release (see license register §C) |
| User photo upload | Not solved by any reference; needs backend or HTTPS-URL-only MVP (Phase 2 decision) |
| Hash collision (`#debug`) | Use `#bd=` namespace |

## Phase 2 first actions (when told to continue)
1. Download/verify Quaternius + Kenney packs (browser flow), fill the register with sha256.
2. Brand removal pass (title, `ThreejsJourney`, Bruno text, project boards → birthday boards).
3. Port Candles/Confetti/Cake; add `BirthdaySection` near spawn.
4. Quality governor + reduced motion; NippleJS A/B test; Reset button.
5. Optimise assets, build, screenshot, update docs.
