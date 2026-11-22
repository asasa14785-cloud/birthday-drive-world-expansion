# ASSET IMPLEMENTATION REPORT
| Asset | Source / licence | Status |
|---|---|---|
| Car, tiles, cone, matcaps, sounds, draco | Bruno Simon folio-2019 — MIT (code); keep notice in `license.md` | reused. Cone GLB re-enabled in `Resources.js` as pushable party hats |
| Candle/cake/confetti code | moo-krub/hbd-3d-craft — MIT, © 2026 GitBababoo | ported, headers kept, listed in `THIRD_PARTY_NOTICES.md` |
| nipplejs 1.0.4 | MIT | npm dependency |
| Sample photos 01–06 | generated for this project (no third-party rights, no real people) | `static/birthday/photos/*.webp` |
| Quaternius Stylized Nature, Kenney Food Kit | CC0 | **not integrated**: `kenney.nl` returned HTTP 403 to scripted download, Quaternius download is gated, and `../birthday-drive-research` (Phase 1 downloads/registers) was not present in this sandbox. No hash could be verified, so nothing was copied. |
| glTF-Transform | MIT | not run — no GLB selected. Plan unchanged (inspect→prune/dedup→webp; no meshopt/ktx2 until decoders exist) |
| Raycast RC Car | licence unverified | nothing copied |

## Photo optimisation (originals preserved in `asset-sources/originals/photos/`)
| file | original JPG | WebP (≤1280px, q82) |
|---|---|---|
| 01 | 296,974 B | 171,640 B |
| 02 | 147,327 B | 62,726 B |
| 03 | 261,808 B | 136,302 B |
| 04 | 182,621 B | 79,282 B |
| 05 | 206,776 B | 73,968 B |
| 06 | 190,762 B | 89,282 B |
Total 1,286 KB → 613 KB. Tool: `sharp` (build-time only, not a dependency).

## Art direction actually implemented
Pastel floor/shadow/indirect-light palette from `config.theme`; tinted matcap family; merged trees (4 crown colours incl. cherry-blossom), bushes, rocks, flowers; region styles: garden (tree-trunk posts + flowers), avenue (gold finials + bunting), landmarks (glowing ring + arch beam + star), celebration plaza (pedestal, poles, balloons, party-hat cones). Hero models in Blender: none made.
