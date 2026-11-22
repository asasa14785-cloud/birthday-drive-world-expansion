# CUSTOMIZATION GUIDE (manual workflow, no backend)
1. Prepare photos: ≤1280 px longest side, WebP/JPG, put them in `birthday-drive/static/birthday/photos/` (never commit customer photos to a public repo; use a private fork/build).
2. Optional voice messages: `static/birthday/audio/NN.mp3` (own/licensed audio only).
3. Edit `static/birthday/config.json` (no rebuild needed for content when served as files):
   `recipient, sender, welcome, carColor, theme{floor*, accent, gold}, cake{shape: round|tiered|heart, tiers 1-3, candles 1-24, frosting, sponge, candleColor, topper}, stations[{id, zone: childhood|friends|landmarks, title, caption?, date?, photo | photos[{src, caption?}], audio?}], finale{title, message}`.
4. Zones hold 3 stations each (extra ones are skipped with a console warning).
5. Build: `cd birthday-drive && npx vite build --base=./`, copy `dist/*` to `public/game/` (delete `*.map`), then `npm run build` in the repo root.
Validation (`config.js`): defaults for anything missing; invalid colours/zones/duplicate ids are corrected with warnings in the console; `data:`/`blob:` URLs and >2 KB URLs are rejected; missing/failed images show a card; missing audio disables only the audio button; a missing config.json falls back to defaults.

---
## Phase 3 additions — preparing the next birthday (exact steps)
1. **Photographs:** copy images into `birthday-drive/static/birthday/photos/` (any aspect ratio; the frame refits and never stretches; textures are capped to 2048 / 1536 / 1024 px by quality tier). Reference them as `"/birthday/photos/name.webp"`.
2. **Captions / titles / dates:** edit `stations[]` in `static/birthday/config.json` (`title`, `caption`, `date`; multi-photo stations use `photos: [{src, caption}]`). Long text wraps and the sheet scrolls.
3. **Voice recordings (optional):** put `.mp3` in `static/birthday/audio/` and set `"audio": "/birthday/audio/xx.mp3"`; a missing file only logs a warning and hides nothing else.
4. **Recipient name:** `recipient` (gate, welcome, finale title) and `cake.topper`; sender line: `sender`.
5. **Car colour:** `carColor` (hex).
6. **Cake:** `cake.shape` (`round|tiered|heart`), `tiers`, `frosting`, `sponge`, `candles`.
7. **Quality:** automatic; force with `?quality=high|mid|low`.
8. Rebuild: `bash scripts/build-game.sh && npm run build`, host `dist/`.
