# BASELINE AUDIT — folio-2019 (unmodified)

Audit date: 2026-11-21 · Branch `birthday-drive-v1` (created from `master` @ `540f135 :bento: Projects > Update`) · **No game source file has been modified in Phase 1.**

## 1. Repository identity

```
origin  https://github.com/brunosimon/folio-2019.git (fetch/push)
git status --short  → clean at clone time
git switch -c birthday-drive-v1  → OK
license.md → MIT, Copyright (c) 2019 Bruno SIMON
```

## 2. Toolchain (exact `package.json`)

| Type | Package | Version range |
|---|---|---|
| dependency | `three` | `^0.164.1` (installed 0.164.1) |
| dependency | `cannon` | `^0.6.2` |
| dependency | `gsap` | `^3.12.5` |
| dependency | `howler` | `^2.2.4` |
| dependency | `dat.gui` | `^0.7.9` |
| dependency | `vite-plugin-restart` | `^0.4.0` |
| devDependency | `vite` | `^5.2.11` (Vite 5.2.11 ran) |
| devDependency | `vite-plugin-glsl` | `^1.3.0` |

Scripts: `dev` → `vite`, `build` → `vite build` (only these two).
`vite.config.js`: `root: 'src/'`, `publicDir: '../static/'`, `outDir: '../dist'`, `sourcemap: true`, plugins `glsl()` + `restart()`, `server.host: true`, `server.open` disabled when `SANDBOX_URL`/`CODESANDBOX_HOST` is set.

## 3. Install / build / run — actual results

| Step | Command | Result |
|---|---|---|
| Install | `npm ci` | **OK** (lockfile consistent; npm audit warnings only; no changes to lockfile) |
| Build | `npm run build` | **OK** — `✓ 92 modules transformed … ✓ built in 6.04s`; `dist/index.html` 4.72 kB, `assets/index-*.js` 1,137 kB (gzip 304 kB) + 4.4 MB sourcemap, `index-*.css` 7.35 kB. Only the standard ">500 kB chunk" warning. `dist/` total ≈ 23 MB (static models/sounds/draco copied) |
| Dev server | `npm run dev -- --host 0.0.0.0 --port 5199` (with `SANDBOX_URL=1` to stop Vite trying to open a browser) | **OK** — `VITE v5.2.11 ready in 197 ms`, `Local: http://localhost:5199/`, `Network: http://169.254.0.21:5199/` |
| Browser | Playwright Chromium 159 headless, software WebGL (SwiftShader), 640×360 | Page loads, loading → START tile → click → world reveal → arrow-key driving **works**. No `PAGEERROR`/`REQFAIL`. Only console warning: "AudioContext was not allowed to start" (autoplay policy before gesture — expected in headless) |

Software rendering note: SwiftShader gave ≈ 6.8 FPS at 480×270 (renderer is hard-coded to `pixelRatio = 2` with 3 post-processing passes), so screenshots were taken with generous waits. This is a test-environment limit, not an engine defect.

## 4. Baseline screenshots (real, from the dev server)

`../birthday-drive-research/audit/screenshots/` (also mirrored in `docs/screenshots/`):

1. `baseline-dev-01-start-screen.png` — orange scene with the START floor tile (area at `(0,0)`).
2. `baseline-dev-02-world-revealed.png` — after click: car, stylised trees, "USE YOUR ARROW KEYS TO MOVE AROUND" instructions, "BRUNO SIMON" 3D letters, wall bricks.
3. `baseline-dev-03-driving-forward.png` — after holding ↑ — car moved, camera followed.
4. `baseline-dev-04-turning.png` — after ↑ + → — statues, "PROJECTS" signpost, car turning, depth-of-field blur visible.

Verified working: car model, world, Cannon physics (car collides/moves), isometric-style follow camera with blur + glow passes, keyboard controls, START → reveal sequence.
Not verifiable headless: audio output, real touch joystick, GPU framerate.

## 5. Inventory of the real code (all paths in `src/`)

- Entry: `index.html` (canvas `.js-canvas`, Three.js-Journey popup DOM) → `index.js` (7 lines, instantiates `Application`).
- `javascript/Application.js` (294 l) — owns `Time`, `Sizes`, `Resources`, renderer, camera, passes, world, title animation, `ThreejsJourney`.
- `javascript/Camera.js` (347 l), `Resources.js` (250 l), `ThreejsJourney.js` (218 l).
- `javascript/Utils/`: `EventEmitter.js`, `Loader.js` (GLTF + DRACO (`setDecoderConfig({type:'js'})`) + FBX + texture), `Sizes.js`, `Time.js`.
- `javascript/Passes/`: `Blur.js`, `Glows.js` (+ `src/shaders/*.glsl` imported through `vite-plugin-glsl`).
- `javascript/World/`: `index.js` (512 l), `Car.js` (389), `Physics.js` (824), `Controls.js` (652), `Objects.js` (354), `Materials.js` (216), `Shadows.js` (242), `Sounds.js` (334), `Areas.js` (132), `Area.js` (308), `Tiles.js`, `Walls.js`, `Floor.js`, `Zones.js`, `Zone.js`, `EasterEggs.js` (385).
- `javascript/World/Sections/`: `IntroSection.js`, `ProjectsSection.js`, `Project.js`, `CrossroadsSection.js`, `InformationSection.js`, `PlaygroundSection.js`, plus unused `DistinctionA–D`.
- `static/`: `models/` (≈5.3 MB), `sounds/` (≈7.3 MB), `draco/` (3.6 MB), `favicon/`, `social/`.

## 6. Systems inspected (exact filenames / functions)

| System | Where | Notes |
|---|---|---|
| Renderer | `Application.setRenderer()` | `THREE.WebGLRenderer({canvas, alpha:true, powerPreference:'high-performance'})`, `setPixelRatio(2)` (hard-coded), `autoClear=false`, clear colour black |
| Post-processing | `Application.setPasses()` | `EffectComposer` → `RenderPass` → horizontal `BlurPass` → vertical `BlurPass` → `GlowsPass`. Blur strength set to 1 (0 → pass disabled) and forced to 1 on first `touchstart` (`setConfig`) |
| Config flags | `Application.setConfig()` | `config.debug` = `#debug`; `config.cyberTruck` = `#cybertruck`; `config.touch` set on first `touchstart` and calls `world.controls.setTouch()` |
| Scene init | `Application.setWorld()` → `World` constructor (`setSounds, setControls, setFloor, setAreas, setStartingScreen`) then `World.start()` after START tile interact (`setReveal, setMaterials, setShadows, setPhysics, setZones, setObjects, setCar, setTiles, setWalls, setSections, setEasterEggs`) |
| Loader | `Utils/Loader.js` + `Resources.js` | `GLTFLoader` + `DRACOLoader` (`setDecoderPath('draco/')`), textures; relative paths `./models/...` ⇒ **relocatable with `vite build --base=./`** |
| Vehicle | `World/Car.js` (visual: `setModels, setMovement, setChassis, setAntena, setBackLights, setWheels, setTransformControls, setShootingBall, setKlaxon`) + `World/Physics.js setCar()` (physics) | `CANNON.RaycastVehicle` (Physics.js:203), chassis `CANNON.Box` mass 40, 1.02×2.03×1.16, wheel bodies |
| Physics loop | `Physics` constructor | `this.time.on('tick', () => this.world.step(this.time.delta / 1000))`; gravity `(0,0,-3.25*4)`; Z-up world |
| Car reset | `Physics.car.recreate()` + `controls` action `reset` (Physics.js ~302–341) | Existing reset |
| Camera | `Camera.js` `setAngle, setInstance, setZoom, setPan, setOrbitControls` | `PerspectiveCamera(40, …, 1, 80)`, `up = (0,0,1)`, angle items `default (1.135,-1.45,1.15)`, `projects (0.38,-1.4,1.63)`; target eased (`easing 0.15`) to `car.chassis.object.position` via `Application.setCamera` tick; zoom + pan; GSAP `angle.set()` |
| Controls | `World/Controls.js` | `setActions` (up/right/down/left/brake/boost), `setKeyboard` (arrows/WASD, etc.), `setTouch` (native joystick + boost + forward/brake/backward zones; created lazily on first touch; events `joystickStart/Move/End`). Physics reads `controls.touch.joystick.angle.value` to steer toward an absolute angle |
| Interaction | `World/Area.js` (`activate/deactivate/setFloorBorder/setFence/setKey/interact/in/out/setInteractions`) + `Areas.js setMouse()` | Mouse raycast on `mouseMesh`, keys `f`/`e`/`Enter` when car inside; emits `interact` |
| Project images | `Sections/ProjectsSection.js setList()` / `Project.js setBoards()` | `imageSources: ['./models/projects/<name>/slideA.jpg', …]`; cycling image boards |
| GSAP | `Application`, `Camera`, `World/index.js` (reveal, start label), `Area`, sections | Used for tweens |
| Howler | `World/Sounds.js` (`setSettings, setMasterVolume, setMute, setEngine, add, play`) | Engine pitch via speed; mute & master volume |
| HTML overlays | `index.html`: `.canvas`, `.threejs-journey` message bubble; keys/labels drawn in 3D; mobile controls injected by `Controls.setTouch()` | |
| Responsiveness | `Utils/Sizes.js` (`window.resize` → `viewport`), listeners in Application/Camera/passes | |
| Debug | `dat.gui` only with `#debug` | |

## 7. Findings relevant to the Birthday product

1. START → reveal pipeline (`World.setStartingScreen`) is the natural place for a birthday intro (name/age).
2. Project-board system (`Project.js`) already shows images on 3D boards: reuse for photo frames (needs textures with CORS-safe sources).
3. Bruno branding to replace in later phases: `ThreejsJourney.js` + overlay in `index.html`, `IntroSection` letters ("BRUNO SIMON"), `InformationSection`, project images, `<title>`/favicons/social.
4. `pixelRatio=2` fixed → heavy on mobile; quality governor from HBD is a good fit (ADAPT).
5. Loader has DRACO only (no Meshopt, no KTX2).
6. Audio: Howler with autoplay gating handled by user click on START.

## 8. Known caveats

- `npm audit` reports dev-dependency advisories; not fixed (never run `npm audit fix` on the engine).
- Build output uses absolute base `/` by default; for sub-path hosting use `vite build --base=./` (paths inside JS are already relative).
