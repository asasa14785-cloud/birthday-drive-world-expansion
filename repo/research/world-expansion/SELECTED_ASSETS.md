# Selected assets (actually downloaded & used)
Merged into ONE GLB: `birthday-drive/static/models/storybook/storybook-kit.glb` (2.8 MB, 35k tris total kit, 11 textures 512 WebP). Built by `scripts/world-assets.mjs` (glTF-Transform: dequantize, weld, meshopt simplify, merge, dedup, WebP). Raw sources kept in `research/world-expansion/raw/`.

| Node | Source | Tris (orig→used) | Size m (WxHxD) |
|---|---|---|---|
| CommonTree_1/2/4 | Quaternius Nature MegaKit | 6265/5648/4066 → 4631/4470/3485 | ~4×7–9×4 |
| Pine_1, Pine_3 | same | 3947/4964 → 3388/4373 | ~5×7.3×4.5 |
| TwistedTree_1 (giant landmark) | same | 9564 → 7079 | 13.5×16.7×11.5 |
| Bush_Common, Bush_Common_Flowers | same | 900, 1368→1243 | 1.9×1.6×2 |
| Flower_3_Group, Flower_4_Group | same | 755→467, 1690→1014 | ~1.5×2.1 |
| Grass_Common_Tall, Grass_Wispy_Short, Fern_1, Clover_1 | same | 326, 494, 288→172, 379→227 | <3 |
| Mushroom_Common, Mushroom_Laetiporus | same | 880→439, 3216→1608 | <1.4 |
| Rock_Medium_1/2, Pebble_Round_1 | same | 342, 244, 136 | ~3×2×3 |
| MC_GardenCottage (1548 tris), MC_RouteSign (232) | 3dassets.dev `meadow-courier` (CDN URLs from API manifest) | — | 2.3×2.9×2.8 / 1×1.7 |
Also downloaded (not used yet): `meadow-courier-picket-fence`.
Origins: Y-up, origin at footprint, minY ≈ −0.2 (trunks sink slightly: fine). Alpha: MASK (leaf cards). All rotated +90° X for the Z-up game.
