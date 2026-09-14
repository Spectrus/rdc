# RDC Real Home Lab

Standalone Home Scan walkthrough, published only under `imovel-lab/`. Starts at Isaiah Sweeney's authored entrance camera. Drag to look; WASD/arrows move. On touch devices, use the left thumbstick while dragging the view with the other thumb. Return to entrance resets movement and camera position.

## Detail and loading

Light: 750,000-splat budget, pixel ratio up to 1, highest two LODs excluded. High: 3 million, pixel ratio up to 1.5. Ultra: 6 million, pixel ratio up to 2. Mobile defaults to Light; desktop to High. Selection is remembered when local storage is available. Resolution never exceeds native device pixel ratio. The scene starts with a 600,000-splat budget and permits coarse LOD fallback, then refines after two frames with rendered splats. The loading preview is the author's actual scene poster, not a replacement reconstruction. Fullscreen requires browser support.

The full scan streams from its existing public SuperSplat CDN: https://d28zzqy0iyovbz.cloudfront.net/3f89bbd3/v1/lod-meta.json . Its scene metadata is byte-identical to the uploaded ZIP. This deployment depends on that external host; it does not duplicate the 513 MB scan in GitHub. Attribution and CC BY 4.0 terms are in SPLAT-LICENSE.txt and on screen.

## Movement guard

`source/src/collision-map.json` is a compact 8 cm occupancy grid decoded from the author's LOD5 SOG points. Points at 0.28–1.8 m height and alpha above 100/255 identify walls and furniture; a 16 cm clearance, a traced exterior envelope and entrance-connected flood fill define permitted movement. Substeps (at most 4 cm) and axis sliding prevent jumping through blocked cells. This is an approximate, fixed-height scan-derived guard, not a watertight physics mesh: thin, transparent or uncaptured objects may be missed, and narrow spaces may be conservatively blocked. No jumping, stairs, interacting with doors or furniture. The source has no ceilings.

Regenerate the map with `python scripts/build-collision.py /path/to/scan`, where the directory contains official `5_0` and `5_1` folders with meta.json, means_l.webp, means_u.webp, sh0.webp. Requires numpy, Pillow, scipy and matplotlib. The script also saves diagnostic plots alongside the input. Those intermediate downloads are not shipped.

## Build and validation

`cd source && npm ci && node scripts/test-navigation.cjs && npm run build`

Copy dist contents to imovel-lab/, preserving README, source, and SPLAT-LICENSE.txt; remove superseded built assets. Tests check ten room destinations are connected, blocked wall/furniture locations, exterior/non-finite rejection, 20,000 seeded movement steps, and stationary look direction. TypeScript and production build pass. The available review browser has no WebGL and blocks localhost; GPU rendering and physical mobile-device performance need a supported device for visual verification.
