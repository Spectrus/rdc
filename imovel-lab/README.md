# RDC Real Home Lab

Standalone Home Scan walkthrough, published only under `imovel-lab/`. Starts at Isaiah Sweeney's authored entrance camera. Drag to look; WASD/arrows move. On touch devices, use the left thumbstick while dragging the view with the other thumb. Return to entrance resets movement and camera position.

## Detail and loading

Auto (default) adapts the splat budget during movement: initially 2.5 million on desktop / 1.5 million on mobile, decreasing if measured movement falls below 32 fps and increasing above 52 fps. When stationary, it refines to 5 million / 3 million respectively. High locks 6 million; Ultra locks 8 million. These are budgets, not guaranteed frame rates. Resolution stays at native CSS pixels or higher (device pixel ratio capped at 2); there is no sub-native resolution scaling. New preferences use rdc-detail-v2 so older fixed presets do not silently disable Auto.

The camera uses a 75-degree field of view, radial splat sorting to avoid repeated CPU sorting during rotation, near-view LOD priority, and a 0.5-pixel culling threshold to retain fine splats. A CameraFrame composition pass applies moderate contrast-adaptive sharpening (0.45), contrast 1.025, saturation 0.96. TAA, depth of field, bloom and chromatic aberration are disabled. Captured softness cannot be recovered through these settings. No CSS backdrop blur is used.

The scene starts with a 650,000-splat budget and permits coarse LOD fallback, refining after two frames with rendered splats. The loading preview is the author's actual scene poster. Movement is fixed at eye level, accelerates and stops smoothly, and applies pointer deltas once per frame. Shift gives a modest faster walking pace.

## Room guide and reconstructed ceiling

A 12-zone approximate room guide uses the creator's room annotations and the scan's layout. Current room and floor-plan position/view direction update as the camera moves. Click a numbered information point or select a room to read details; these actions do not teleport the visitor. The map explicitly does not provide verified measurements. Bedroom labels are neutral.

A separate, toggleable ceiling mesh covers the traced footprint at an assumed 2.55 m height, with warm neutral coloring and baked edge shading. This is an interpretive addition, not recovered scan data or a surveyed ceiling. It is visibly labeled in the room guide. Source furniture and room captures are unchanged.

The full scan streams from its existing public SuperSplat CDN: https://d28zzqy0iyovbz.cloudfront.net/3f89bbd3/v1/lod-meta.json . Its scene metadata is byte-identical to the uploaded ZIP. This deployment depends on that external host; it does not duplicate the 513 MB scan in GitHub. Attribution and CC BY 4.0 terms are in SPLAT-LICENSE.txt and on screen.

## Movement guard

`source/src/collision-map.json` is a compact 8 cm occupancy grid decoded from the author's LOD5 SOG points. Points at 0.28–1.8 m height and alpha above 100/255 identify walls and furniture; a 16 cm clearance, a traced exterior envelope and entrance-connected flood fill define permitted movement. Substeps (at most 4 cm) and axis sliding prevent jumping through blocked cells. This is an approximate, fixed-height scan-derived guard, not a watertight physics mesh: thin, transparent or uncaptured objects may be missed, and narrow spaces may be conservatively blocked. No jumping, stairs, interacting with doors or furniture. The source has no ceilings.

Regenerate the map with `python scripts/build-collision.py /path/to/scan`, where the directory contains official `5_0` and `5_1` folders with meta.json, means_l.webp, means_u.webp, sh0.webp. Requires numpy, Pillow, scipy and matplotlib. The script also saves diagnostic plots alongside the input. Those intermediate downloads are not shipped.

## Build and validation

`cd source && npm ci && npm test && npm run build`

Copy dist contents to imovel-lab/, preserving README, source, and SPLAT-LICENSE.txt; remove superseded built assets. Tests check ten room destinations are connected, blocked wall/furniture locations, exterior/non-finite rejection, 20,000 seeded movement steps, and stationary look direction. Additional tests verify ceiling coverage above every one of 23,116 walkable cells, map heading, room classification, and adaptive versus fixed detail budgets. TypeScript and production build pass. The available review browser has no WebGL and blocks localhost; GPU rendering and physical mobile-device performance need a supported device for visual verification.
