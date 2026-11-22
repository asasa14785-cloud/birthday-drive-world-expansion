# PERFORMANCE BASELINE (software rendering — not representative of GPUs)
- Game bundle: JS 1,219.9 kB (gzip 334.9 kB) + CSS 13 kB; `public/game` ≈ 19 MB with Bruno's models/sounds/draco (sourcemaps removed). Root `dist/index.html` 208 kB wrapper embedding `./game/index.html`.
- New static content: photos 613 KB (6 WebP). No new GLB.
- Scenery: 65 trees, 29 bushes, 5 rocks, 306 flowers merged into ≈15 meshes (matcap shader has no instancing, so batches are baked); 21 tree colliders in one static body. Candles use HBD's InstancedMesh; confetti one 420-instance pool.
- Pixel ratio: Bruno's hard-coded 2 replaced by min(devicePixelRatio, 2) (≤1.5 on coarse pointers).
- Measured FPS: not measured (SwiftShader). Previously ≈6.8 FPS at 480×270 in Phase 1; same order here. Real-device profiling is TODO.
- Textures: only stations near the car hold GPU photos.
