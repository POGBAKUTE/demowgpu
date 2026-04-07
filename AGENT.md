# AGENT Log

Date: 2026-04-05

## Request
- Backup menu
- Keep only Crossy game in menu
- Remove imports/examples not needed for lighter app

## Backups
- app/index.tsx.bak-20260405-2219
- src/animations/registry.ts.bak-20260405-2219

## Changes
- Reduced animation registry to only `crossy-road-lite`
- Removed home screen dependency on `everybody-can-cook` staggered text
- Simplified home screen content for Crossy-only flow

## Fix After Run
- Added `obj` to `metro.config.js` `assetExts` so Crossy `.obj` model files resolve correctly in Metro.
- Replaced `THREE.TextureLoader` usage in `crossy-road-lite` with RN-safe mesh materials (no `document` dependency) to fix runtime crash on iOS.
- Improved Crossy visual fallback: assigned per-model colors (player/road/grass/river/log/car/train) so scene is readable without TextureLoader.
