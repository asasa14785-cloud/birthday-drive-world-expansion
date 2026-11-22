# World Art Direction — "Storybook Glade" (single chosen direction)
- **Dominant family:** Quaternius Stylized Nature MegaKit (hand-painted, rounded, soft silhouettes, CC0). **Supplement (max ~5%):** 3dassets.dev *Meadow Courier* cottage + route sign (faceted, warm).
- **Palette:** existing blush/peach floor gradient (#f6c6d0→#fff1d6) as ground; pastel spring greens for canopies (#76d161 broadleaf, #57a875 pine, #9ecc6b giant tree), warm yellows/reds for flowers, teal accents (sign) — one accent per cluster.
- **Materials:** kit PBR → `MeshLambertMaterial` + fake ambient (emissive map 0.38). Quaternius `_C` leaf maps are dark/red colour-variation maps: keep alpha+detail, recolour to pastel green in shader. No normal/ORM maps. Textures 512 WebP.
- **Light:** hemisphere (#fff1f6/#b9e0a8, 3.4) + warm sun (#fff0d0, 2.8) added inside the slice container only (matcap world ignores lights). Phase 2: sky gradient + pink-peach atmospheric fog tied to far plane.
- **Shape language:** round crowns, twisted trunks, chunky rocks; buildings small cosy cottages (scaled ×2.6 ≈ 6 m wide vs 3 m car).
- **Scale:** car ≈ 3 m; trees 0.85–1.4× kit (6–10 m); landmark Twisted Tree ×2.2 ≈ 36 m (distant silhouette); cottage 7 m.
- **Terrain (Phase 2):** gentle hills OUTSIDE a flat driveable corridor at z=0 so Bruno's flat Cannon floor stays untouched; proceduralterrains export used for hills/backdrop only.
- **Landmarks:** giant twisted tree + cottage glade (done); next: floating islands, mushroom grove, stone bridge.
