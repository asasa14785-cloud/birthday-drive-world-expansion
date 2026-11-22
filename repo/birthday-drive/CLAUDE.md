# CLAUDE.md — Birthday Drive V1 (engine: Bruno Simon folio-2019)

Read first: `docs/BASELINE_AUDIT.md`, `docs/ENGINE_ARCHITECTURE.md`, `docs/REFERENCE_INTEGRATION_PLAN.md`, and `../المرجع.md` (master task file at the workspace root, includes remaining phases).

## What this repo is
`brunosimon/folio-2019` (MIT) on branch `birthday-drive-v1`. Vanilla JS + Vite 5, Three.js 0.164.1, Cannon 0.6.2, GSAP, Howler, `vite-plugin-glsl`. Goal: turn it into a birthday driving experience **by reusing existing work**, not by reinventing.

## Commands
```
npm ci
npm run dev -- --host 0.0.0.0        # set SANDBOX_URL=1 in headless envs so Vite does not try to open a browser
npm run build                        # outputs dist/ (absolute base)
npx vite build --base=./             # relocatable build (used when embedding under /game/)
```

## Non-negotiable rules
- Never replace folio-2019; never migrate to React or another framework.
- Never rewrite the car or physics; never replace Cannon.js; never upgrade Three.js.
- Do not touch: `World/Physics.js` car tuning, `World/Car.js` sync, `Utils/Time.js`, `Utils/EventEmitter.js`, `Camera.js` core.
- No new libs overlapping existing ones without a demonstrated need (NippleJS: pending A/B test; default = keep native touch joystick).
- Only assets from verified official sources with a license entry in `../birthday-drive-research/audit/ASSET_LICENSE_REGISTER.md`. Code license ≠ asset license.
- Never copy whole reference repos. Port the smallest unit, keep MIT headers.
- Never claim a build/run result without running it.
- Workflow: DISCOVER → INSPECT → CLASSIFY → VERIFY LICENSE → CHECK COMPATIBILITY → SELECT → INTEGRATE.

## Engine map (real files, `src/javascript/`)
`Application.js` (renderer, passes, config) · `Camera.js` · `Resources.js` + `Utils/Loader.js` · `World/index.js` (start sequence) · `World/Car.js` + `World/Physics.js` (RaycastVehicle) · `World/Controls.js` (keyboard + lazy `setTouch`) · `World/Objects.js` (`add` = GLB base+collision → mesh+body) · `World/Areas.js`/`Area.js` (interactive tiles) · `World/Sounds.js` (Howler) · `World/Sections/*` (content).
Z-up world; assets referenced as `./models/...`, `./sounds/...`, `draco/` from `static/`.

## Reference repos (local, outside production tree)
`../birthday-drive-research/repositories/{hbd-3d-craft, raycast-vehicle, nipplejs, glTF-Transform}` — see `REFERENCE_REUSE_MATRIX.md` for exact files and classification (PORT / ADAPT / REFERENCE / REJECT).

## Status
Phase 2 integrated (see docs/INTEGRATION_REPORT.md and docs/PHASE2_STATUS_REFERENCE.md). Content lives in static/birthday/config.json; new code in src/javascript/Birthday/.
