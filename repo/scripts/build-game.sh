#!/usr/bin/env bash
# Builds the Three.js engine (birthday-drive/) with a relocatable base and publishes it to public/game/
# so the React shell (src/App.tsx, built by `npm run build`) can embed it.  Usage: bash scripts/build-game.sh
set -euo pipefail
cd "$(dirname "$0")/../birthday-drive"
[ -d node_modules ] || npm ci
npx vite build --base=./ --sourcemap false
cd ..
rm -rf public/game && mkdir -p public && cp -r birthday-drive/dist public/game && rm -rf birthday-drive/dist
echo "game published to public/game ($(du -sh public/game | cut -f1))"
