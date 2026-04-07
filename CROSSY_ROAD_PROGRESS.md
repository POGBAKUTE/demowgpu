# Crossy Road Build Notes

Last updated: 2026-04-06

## Current status
- `crossy-road-lite` is now aligned closer to `expo-crossy-road` for:
- Camera placement and orthographic projection behavior.
- Forward camera/world easing.
- Player jump timing and arc.
- Baseline movement speeds for road/water/train lanes.

## Synced parameters from Expo reference
- `STARTING_ROW = 8`
- `CAMERA_EASING = 0.03`
- `BASE_ANIMATION_TIME = 0.1` (jump total duration = `0.2`)
- Camera transform:
- position `(-1, 2.8, -2.9)`
- lookAt `(0, 0, 0)`
- orthographic `zoom = 400`
- Lane speed ranges converted to delta-time form:
- Road: `(0.02..0.08) * 60`
- Water: `(0.02..0.07) * 60`
- Train: `0.8 * 60`

## Behavioral changes done in lite
- Horizontal swipe direction now matches Expo orientation.
- Player movement uses a 2-phase jump arc (mid-air then land), instead of frame-lerp drift.
- World follows player using Expo-like camera easing and x-clamp behavior.
- Added out-of-frame fail checks (`x` off-screen / falls behind camera).
- River handling keeps drift behavior when standing on a log.

## Next parity tasks
- Reproduce exact row generation sequence from Expo map generator.
- Match collision boxes to model width-based hitboxes (current lite still uses fixed thresholds).
- Add blocked/tree obstacle collision before move commit.
- Match train lane timing/light warning behavior.
- Port full score formula (`floor(z) - startingRow`) and game-over polish effects.
