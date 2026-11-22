# ENGINE ARCHITECTURE — folio-2019 (as found)

Plain ES modules + Vite 5, no framework. Z-up world. Everything is composed by constructor injection of shared singletons (`time`, `sizes`, `resources`, `camera`, `scene`, `renderer`, `passes`, `config`, `debug`).

```
src/index.js
 └─ new Application({ $canvas: .js-canvas })                         javascript/Application.js
     ├─ Time        (rAF loop, delta clamped to 60 ms, emits 'tick')   Utils/Time.js
     ├─ Sizes       (window resize → viewport, emits 'resize')         Utils/Sizes.js
     ├─ Resources   (queue of matcaps / GLBs / textures, emits progress+ready)  Resources.js → Utils/Loader.js
     ├─ setConfig() (#debug, #cybertruck, first touchstart → config.touch + controls.setTouch())
     ├─ setRenderer()  WebGLRenderer, pixelRatio 2, autoClear=false
     ├─ setCamera()    Camera.js ; on 'tick' camera.target = car.chassis.object.position (x,y)
     ├─ setPasses()    EffectComposer: Render → BlurH → BlurV → Glows ; composer.render() on every 'tick'
     ├─ setWorld()     World/index.js
     ├─ setTitle()     animated document.title using physics.car.forwardS
     └─ setThreejsJourney()   promo popup (to be removed for Birthday)
```

## Frame loop (single source of truth)

`Time.tick` → listeners in registration order:
1. `Application.setCamera` tick: copy car position to `camera.target`.
2. `Camera` tick: ease `targetEased`, place `instance` at `targetEased + normalize(angle)*zoom`, `lookAt`, add pan.
3. `Application.setPasses` tick: enable/disable blur passes by strength; `composer.render()`.
4. World modules' ticks: `Physics` (`world.step(delta/1000)`, then syncs three objects from bodies), `Car` (copy chassis/wheels), `Areas`, `Shadows`, `Sounds` (engine pitch), sections, etc.

## World composition (`World/index.js`)

Constructor (before START): `setSounds → setControls → setFloor → setAreas → setStartingScreen`.
`start()` (on START interaction): `setReveal, setMaterials, setShadows, setPhysics, setZones, setObjects, setCar, (areas.car = car), setTiles, setWalls, setSections, setEasterEggs`.

- `Materials` — matcap `MeshMatcapMaterial`s from `resources.items.matcap*` (`setPures`, `setShades`, `setFloorShadow`). The whole look is matcap + baked floor shadows + flat orange background glow — **no scene lights**.
- `Objects` — `add({base, collision, offset, rotation, duplicated, shadow, mass, soundName, sleep})` converts a GLB (`<name>Base` + `<name>Collision`) into a three object + Cannon body (`Physics.addObjectFromThree`). This is the sanctioned way to add dynamic/static props.
- `Physics` — Cannon 0.6.2 world (gravity z −13, `allowSleep`), contact materials (floor/dummy/wheel), `setCar()` builds chassis body, `CANNON.RaycastVehicle`, wheel bodies, controls (acceleration, steering, brake, boost, auto-flip, `recreate()`), and `addObjectFromThree`.
- `Car` — three.js visuals of the car synced from physics (chassis, wheels, antenna, back lights, shooting ball, klaxon), `transformControls` debug.
- `Areas`/`Area` — interactive floor zones (floor border shader, fence, key prompt, mouse + car interactions). Emit `interact`, `in`, `out`.
- `Zones`/`Zone` — invisible trigger boxes (`Physics` sensors) for camera angle/zoom changes.
- `Tiles` (path tiles), `Walls` (brick wall segments), `Floor` (background plane + gradient).
- `Sections/*` — authored content: Intro (instructions, BRUNO SIMON letters), Projects (boards), Crossroads, Information, Playground (bowling, bricks, horns, cones, wigs, eggs, …).
- `EasterEggs` — Konami code, wigs, eggs.
- `Sounds` — Howler wrapper: `add({name, sources, volume, rate, …})`, `play(name, velocity)`, engine sound, master volume, mute (UI at `setMute`).
- `Controls` — `actions` flags set by keyboard or touch; emits `action` events (e.g. `reset`, `brake`).

## Resource conventions

- Everything referenced as `./models/<group>/<name>.glb|png`, `./sounds/...`, `draco/` ⇒ files in `static/` (Vite `publicDir`).
- GLB convention for solid props: `base.glb` (visual) + `collision.glb` (invisible boxes/spheres named by `Physics.addObjectFromThree` shape parsing).
- Textures are matcaps (`models/matcaps/*.png`) and baked shadow PNGs.

## Input architecture

Keyboard: `Controls.setKeyboard` (arrows/WASD/space/shift/R). Touch: lazy `setTouch()` building DOM (`position:fixed` divs) with joystick (absolute angle steering), boost, forward/backward, brake. `Physics` consumes `controls.actions.*` and `controls.touch.joystick.{active,angle.value}` inside its tick.

## Extension points we will use (and where)

| Need | Hook |
|---|---|
| Birthday intro text/name | `World.setStartingScreen`, `IntroSection.setTitles` |
| New props with collision | `Objects.add` (+ glb `base`/`collision`) |
| New interaction zone (cake / gift) | `Areas.add` + `interact` event |
| Celebration FX (confetti, candles) | new module under `src/javascript/World/Birthday/` registered in `World.start()` and updated on `time.on('tick')` |
| Quality governor | `Application.setRenderer` / `setPasses` (pixelRatio, blur strengths) |
| Audio cues | `World/Sounds.js add/play` |
| Touch stick | `Controls.setTouch` (adapter only) |

## Fragile / do-not-touch areas

- `Physics.setCar` tuning and `RaycastVehicle` wiring; `Physics.addObjectFromThree`.
- `Time` loop, `EventEmitter`.
- `Camera` easing & zoom/pan math (only add new `angle.items` if needed).
- Matcap pipeline (adding lit materials requires lights, which the engine does not have).
