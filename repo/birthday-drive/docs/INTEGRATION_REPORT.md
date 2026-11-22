# INTEGRATION REPORT — Birthday Drive V1, Phase 2

Engine: Bruno Simon folio-2019 (three 0.164.1, cannon 0.6.2, GSAP, Howler) — **not replaced**. Tests: headless Chromium (SwiftShader software WebGL, 960×540 / 844×390 touch), raw results in `docs/test-results-phase2.json`, screenshots in `docs/screenshots/phase2/`.

## Final integration table
| SYSTEM | SELECTED SOURCE | EXACT FILES | REUSE/PORT/ADAPT | DEPENDENCIES | RISKS | ACCEPTANCE TEST (result) |
|---|---|---|---|---|---|---|
| Vehicle + physics | Bruno | `World/Car.js`, `World/Physics.js` | REUSE (unchanged) | cannon 0.6.2 | spawns facing −y → `faceRoute()` sets body quaternion only | car drives, collides ✅ |
| Camera | Bruno | `Camera.js` (core untouched) | REUSE; `Application.js` tick gets a `camera.focus` blend (weight 0 = original follow) | GSAP | tilt-shift blur hides photos → blur strength set to 0 while a memory is open and restored | restored exactly (weight 0, minDistance 14) ✅ |
| Driving input | Bruno `Controls.js` | `World/Controls.js` | REUSE; lock via accessor patch from `MemoryViewer.lockInput` | – | – | car moved 0.00 while a memory was open ✅ |
| Interaction | Bruno `Area/Areas` | `World/Area.js`, `Areas.js` | REUSE | – | – | in/out/interact events drive stations + finale ✅ |
| Static colliders | Bruno `Physics.addObjectFromThree` | `Birthday/Props.js#solid` | REUSE | – | – | frames, gate, pedestal, trees block the car |
| Materials | Bruno matcap | `Birthday/Props.js#tint` | ADAPT (tinted clones sharing matcap texture, registered so the START reveal animates them) | – | – | pastel world renders ✅ |
| Cake geometry | HBD 3D Craft | `Birthday/CakeParts.js` (bevelled cylinder, heart, piped cream) | PORT (MIT header kept) | three | – | round / tiered / heart configurable (tiered verified visually in code path; heart/round not screenshot-tested) |
| Candles + flames | HBD | `Birthday/Candles.js`, `Shared.js` | PORT (Standard→Basic material, local caches) | three | – | 7 animated flames, blow-out via scale ✅ (state test) |
| Confetti | HBD | `Birthday/Confetti.js` | PORT (Z-up holder, pedestal ground) | – | – | bursts on finale ✅ (state test; not pixel-inspected) |
| Mobile joystick | NippleJS 1.0.4 | `Birthday/Joystick.js` | ADAPT | nipplejs | see below | dead zone, 4 directions, release, lock ✅ |
| Memory station | Own thin component on Bruno Area/GSAP | `MemoryStation.js`, `MemoryViewer.js` | NEW (required by brief) | – | – | full sequence ✅ |
| Quaternius / Kenney / glTF-Transform | – | – | **NOT USED** (see ASSET_IMPLEMENTATION_REPORT) | – | – | – |

## NippleJS honest finding
`nipplejs` renders the stick and owns start/end/removal, and its `move` payload shape under synthetic touch input returned constant data. The adapter therefore computes the vector from the raw touch relative to the stick centre and feeds Bruno's own `controls.touch.joystick.angle.*` / `active` (Bruno's tick then derives `angle.value`). Verified: right=0, up=π/2, left=π, down=−π/2, dead zone ignores small drags, release → inactive, `scrollY` stays 0, joystick inactive while a memory is open. Multitouch with the native Forward/Boost buttons was **not** tested (headless single pointer).

## What was verified in the browser
Start screen → START → pastel world, gate with recipient name, HUD (progress, Tour, Reset); prompt at a station; Enter opens memory (state opening→open, texture loaded, photo undistorted, caption/date/title); car locked; Esc closes (state idle, input restored, camera restored); 6 memories load lazily; guided tour drives the route, stops at a station, opens/closes it and continues; finale: approach → intro → Enter → candles out, balloons, confetti, message sheet (`message` state) → "Keep exploring" restores driving; touch mode builds NippleJS zone + Brake button, hides native stick. Console: no errors in the final runs.

## Incomplete / not verified (honest list)
- Quaternius + Kenney assets and glTF-Transform: not integrated (packs unavailable in this sandbox). Scenery is procedural low-poly (merged batches).
- Audio file `/birthday/audio/01.mp3` does not exist (intentional): exercises the "audio missing" path; no real voice message or music shipped. Engine SFX are Bruno's.
- Real-device touch, multitouch, GPU framerate, iOS Safari not tested. Reduced-motion code path written, not browser-tested.
- Heart/round cake shapes, `candleColor` option, config-warning paths only exercised by code review.
- Bruno's own sounds/models remain under his MIT licence; his Google Fonts link (Comic Neue) is still an external request.
- Photos are AI-generated placeholders; replace for a real customer (see CUSTOMIZATION_GUIDE).
- Large visual polish pass intentionally NOT started.
