# Deployment guide

> Nothing has been deployed publicly. Do so only with explicit authorization.

1. `cd birthday-drive && npm ci && cd ..`
2. `npm install`
3. `bash scripts/build-game.sh` — builds the engine with relative base into `public/game/` (sourcemaps off)
4. `npm run build` — builds the React shell to `dist/` (`dist/index.html` + `dist/game/…`)
5. Verify locally: `npx vite preview --host 0.0.0.0 --port 4173` → open `/` and check the console / Network tab.
6. Upload the whole `dist/` folder to any static host (Netlify, Cloudflare Pages, GitHub Pages, S3). Paths are relative (`./game/…`), so sub-folder hosting works. Serve `.glb`, `.wasm`, `.webp`, `.mp3` with correct MIME types (default on all major hosts).
7. HTTPS is recommended (audio unlock and some mobile APIs behave better).

Per-recipient builds: change only `birthday-drive/static/birthday/*`, rebuild with steps 3–4.
Troubleshooting: blank iframe → game not built (`public/game` missing); photos missing → check paths start with `/birthday/…` and files exist in `static/birthday/photos`; slow device → open with `?quality=low`.
