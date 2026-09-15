# Villa Alpina — connected modeled walkthrough

Built from the supplied Villa Alpina brochure floor plans and photographic references. This is a geometric reconstruction prototype, not a trained Gaussian splat or a surveyed digital twin. Unmeasured dimensions, room assignments and furnishings are approximate. Original property photographs are omitted from the public deployment because automatic review continued to block their publication despite the user's approval. The private downloadable package retains the original reference photos.

Both levels are accessible on foot through wall openings and an L-shaped internal staircase. The 3.3 m floor separation and 1.62 m eye height are modeling assumptions. Navigation has continuous floor support, axis sliding, wall/furniture clearance and substeps to prevent tunneling. Stair floors use continuous slope envelopes under visible steps; no room or floor teleportation is used. Return to entrance is an explicit reset.

Controls: WASD/arrows, drag to look, Shift for faster walking; left thumbstick plus view dragging on touch screens. The map follows floor and position. Its route button searches the same collision model to show a route to the stairs. The public model has no photographic reference overlay.

Build: from ../source run `npm run build:villa`, keep original property photos out of the public build until the publication block is resolved. Source lives in ../source/src/villa/. Test with `npm run test:villa`.

Tests pass for entrance-to-stair access, continuous stair descent/ascent, 17 destination routes with actual furnishing collision boxes, and 4,000 movement steps with floor support. TypeScript and production build pass. The review browser has no WebGL, so GPU visual fidelity and touch-device performance have not been verified there.
