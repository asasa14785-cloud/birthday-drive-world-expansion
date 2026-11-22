# RELEASE REPORT — Birthday Drive V1 release candidate (Phase 3)
Status: **working RC, not a perfected release.** Build: \`npm run build\` ✅ (see FINAL_QA_REPORT for evidence). Preview: sandbox-local \`http://localhost:4173/\` (no public deployment).

## Delivered in Phase 3
- **Asset pipeline** (glTF-Transform): 92 GLBs inspected, optimized copies produced, 90 adopted: models 1,594,392 → 724,900 bytes (−55%); originals preserved (\`docs/ASSET_PIPELINE_REPORT.md\`).
- **Quality governor** (\`Birthday/Quality.js\`): high / mid / low tiers (DPR cap, blur passes, glow pass, composer bypass + CSS vignette fallback), device heuristics + measured frame-time step-down incl. 0.75 render scale, \`?quality=\` override. Car physics untouched.
- **Texture memory:** photographs are downscaled to 2048/1536/1024 px by tier before GPU upload; textures disposed when stations unload.
- **Cinematics:** memory open now uses three different curves (power3 / sine / expo) with a frame "anticipation" settle; cake takes a breath before the wish; candle-by-candle puff cues.
- **Audio:** original synthesized cues on Howler's context (open, close, candle puff, fanfare; soft attack, ≤0.12 gain) + HUD Sound button synced with the M key.
- **Mobile:** native Forward/Boost/Brake buttons hidden while a memory is open; touch-action rules; larger close/touch targets; long text wrapping.
- **Finale:** balloons moved out of the camera's line of sight; Replay label no longer relies on an emoji glyph.
- **Docs:** README, ASSET_LICENSE_REGISTER, DEPLOYMENT_GUIDE, CUSTOMIZATION_GUIDE, FINAL_QA_REPORT, ASSET_PIPELINE_REPORT, PHASE3_PROMPT (status), root \`المرجع.md\`.

## Known limitations
See FINAL_QA_REPORT "NOT verified" and: Quaternius/Kenney not used; no real photos/voice/licensed music shipped; sound effects & models are Bruno's (MIT, sample provenance unverified); favicon/share images still show original branding; Comic Neue loaded from Google Fonts; photos are AI placeholders.
