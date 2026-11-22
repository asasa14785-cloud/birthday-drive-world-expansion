# Asset pipeline report (glTF-Transform 4.x, Draco via draco3dgltf)

Script: `birthday-drive/scripts/asset-pipeline.mjs` (run where `@gltf-transform/{core,extensions,functions}` + `draco3dgltf` are installed). Per file: read → stats (nodes/meshes/materials/textures/vertices/triangles) → `dedup` + `prune` + `weld` + `draco(edgebreaker)` → written to `birthday-drive/asset-sources/optimized/models/`. **Originals are never overwritten**: kept in `asset-sources/originals/models/`. Full JSON: `asset-sources/asset-pipeline-report.json`.

Findings: all 92 GLBs were already Draco-compressed (Bruno's pipeline); **no embedded textures** (matcaps/shadows are external PNGs, so no WebP/KTX2 step was applicable and alpha/normal maps are untouched); duplicate accessors/materials were present in the big scene files (crossroads: 71, playground: 194). Texture compression was deliberately skipped.

Decision: optimized copies were adopted for every file that got smaller (90/92); `projects/board/plane.glb` and `intro/instructions/labels.glb` grew, so the originals stay.

| File | Original KB | Optimized KB | Saved | Nodes | Meshes | Verts | Tris | Textures | Dup. resources removed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| crossroads/static/base.glb | 616.6 | 277.1 | 55% | 186 | 115 | 81692 | 70069 | 0 | 71 |
| webbyTrophy/base.glb | 170.5 | 20.8 | 88% | 3 | 3 | 5412 | 7104 | 0 | 0 |
| playground/static/base.glb | 158.3 | 44.0 | 72% | 119 | 119 | 10477 | 12526 | 0 | 194 |
| distinctionB/static/base.glb | 66.7 | 32.2 | 52% | 48 | 48 | 4238 | 5134 | 0 | 54 |
| information/static/base.glb | 56.0 | 39.2 | 30% | 33 | 31 | 5840 | 5564 | 0 | 15 |
| distinctionC/static/base.glb | 50.4 | 16.6 | 67% | 16 | 16 | 1300 | 1638 | 0 | 6 |
| intro/static/base.glb | 38.6 | 20.6 | 47% | 29 | 29 | 2102 | 2578 | 0 | 30 |
| wigs/wig4.glb | 38.1 | 24.1 | 37% | 1 | 1 | 5952 | 6912 | 0 | 0 |
| distinctionA/static/base.glb | 36.4 | 20.1 | 45% | 27 | 27 | 1994 | 2446 | 0 | 26 |
| car/default/chassis.glb | 31.4 | 24.4 | 22% | 31 | 19 | 2085 | 1360 | 0 | -1 |
| projects/distinctions/fwa/base.glb | 23.3 | 4.1 | 82% | 2 | 2 | 746 | 684 | 0 | 0 |
| wigs/wig3.glb | 12.2 | 8.0 | 35% | 2 | 2 | 1740 | 1790 | 0 | 0 |
| projects/distinctions/awwwards/base.glb | 11.5 | 4.6 | 60% | 4 | 4 | 312 | 196 | 0 | -1 |
| wigs/wig2.glb | 9.2 | 6.8 | 27% | 1 | 1 | 1275 | 1728 | 0 | 0 |
| car/cyberTruck/chassis.glb | 8.5 | 6.4 | 25% | 5 | 5 | 795 | 436 | 0 | 0 |
| horn/base.glb | 8.1 | 6.6 | 18% | 2 | 2 | 1013 | 1490 | 0 | 0 |
| playground/static/collision.glb | 8.1 | 4.9 | 40% | 21 | 7 | 168 | 84 | 0 | 6 |
| distinctionB/static/collision.glb | 8.0 | 4.3 | 46% | 17 | 8 | 192 | 96 | 0 | 7 |
| bowlingPin/base.glb | 7.9 | 5.7 | 27% | 2 | 2 | 935 | 1088 | 0 | 0 |
| awwwardsTrophy/base.glb | 7.3 | 5.8 | 21% | 3 | 3 | 742 | 737 | 0 | 0 |
| lemon/base.glb | 7.3 | 5.3 | 27% | 1 | 1 | 1050 | 1408 | 0 | 0 |
| intro/static/collision.glb | 7.2 | 3.5 | 51% | 14 | 8 | 192 | 96 | 0 | 7 |
| car/default/wheel.glb | 6.4 | 3.9 | 39% | 3 | 2 | 720 | 454 | 0 | 0 |
| car/cyberTruck/wheel.glb | 6.4 | 3.9 | 39% | 3 | 2 | 720 | 454 | 0 | 0 |
| cone/base.glb | 6.3 | 5.5 | 14% | 2 | 2 | 749 | 934 | 0 | 0 |

Total (92 GLBs): 1557.0 KB -> 707.9 KB (55% smaller)

## In-game A/B
Same camera/time desktop screenshot (1440×900, software GL) before vs after the swap: mean absolute pixel difference 2.46/255 per channel, geometry count unchanged (139 vs 140 incl. new UI), no console errors, all 9 memory cycles pass. The residual difference is explained by animation timing at capture (start reveal), not a visible modelling change; a visual side-by-side was NOT done on every model (only the start world, memory frames and finale were inspected). Quaternius/Kenney assets: not integrated (not obtainable here).
