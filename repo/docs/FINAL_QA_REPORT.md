# FINAL QA REPORT — Birthday Drive V1 RC
**All browser results are EMULATION: headless Chromium (Playwright) with SwiftShader software WebGL — not real phones, no real GPU.** Raw data: `docs/test-results-phase3-{desktop,mobile-portrait,mobile-landscape}.json`; screenshots `docs/screenshots/phase3/`; harness `scripts/e2e-test.mjs` (usage: `node e2e-test.mjs <name> <W> <H> <touch 0|1> <quality> <reduced 0|1>` with preview on :4173).

| Viewport (emulated) | Quality | Result |
|---|---|---|
| 1440×900 desktop | high (forced) | START → world → keyboard drive (car moved ≈13.7 units) → 9 memory open/close cycles (stations 0,1,2,0,1,2,3,4,5): each opened, closed to `idle`, camera focus weight 0, input unlocked → 2nd photo via Next → close (×) button → finale intro → Enter → celebration → message sheet (buttons Replay / Keep exploring). Console errors 0, failed requests 0. |
| 390×844 portrait touch (DPR 2) | mid (forced) | same sequence: 9/9 cycles OK, touch UI class active, 0 errors, 0 failed requests |
| 844×390 landscape touch | mid (forced) | same sequence: 9/9 cycles OK, 0 errors, 0 failed requests |

Observed: JS heap 22–26 MB after the run; `renderer.info.memory` textures 35–37, geometries 136–140 stable across repeated cycles (no growth trend observed across 9 cycles); programs 16–17.
Adaptive governor (auto mode, 960×540 software GL): started `low` (headless reports few cores), measured 34.9 ms avg frames and stepped to render scale 0.75 — demonstrates the governor works; **this is not a device FPS claim**. No real FPS numbers were collected.

## Verified ✅
Production build + preview load (shell → iframe → game; models, textures, photos, sounds 200); START; driving with keyboard; memory sequence incl. lock/restore; multi-photo; close button; missing audio path degrades with a warning; finale celebration reaches the message sheet; quality tiers apply; no console errors.
## NOT verified ❌ (do not assume these work)
- Real devices (no Android/iOS available), real GPU FPS, thermal behaviour, iOS Safari.
- Virtual-joystick *feel* (sensitivity, dead zone) was only checked in Phase 2 with synthetic touches; NippleJS destroy/recreate is correct by code review (`Joystick.destroy()` removes manager, zone, buttons, listeners) but was not runtime-tested in Phase 3. Multitouch not tested.
- Replay: after calling `finale.replay()` the state was still `message` 9 s later under software rendering (it may simply have re-reached the message) — inconclusive, needs a longer-wait retest.
- Reduced-motion browser run, mute/unmute audibility, audio loudness (headless is muted; cues are capped at 0.12 gain by design), autoplay unlock on real browsers.
- Synthetic image-condition tests (square, huge, missing photo, very long caption): handled in code (aspect fit, texture cap, error card, wrapping) but only the 6 sample photos (+1 missing audio) were exercised.
- Visual polish: composition review found the floor largely empty around the start and the welcome 3D sign duplicating the HUD welcome; **not fixed** this phase.
