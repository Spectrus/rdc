type Point = readonly [number, number];

import grid from './collision-map.json';

// Scan-derived occupancy, with 16 cm clearance from wall/furniture samples.
// The connected floor region also closes gaps in the source's exterior capture.
export function inside([x, z]: Point): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    const col = Math.floor((x - grid.origin[0]) / grid.resolution);
    const row = Math.floor((z - grid.origin[1]) / grid.resolution);
    if (row < 0 || row >= grid.height || col < 0 || col >= grid.width) return false;
    const spans = grid.rows[row];
    for (let i = 0; i < spans.length; i += 2) {
        if (col >= spans[i] && col < spans[i + 1]) return true;
    }
    return false;
}

export function constrainStep(from: Point, to: Point): [number, number] {
    if (!inside(from)) return [-0.2580208778, 2.0780191422];
    if (!to.every(Number.isFinite)) return [...from];
    let current: [number, number] = [...from];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    // Reject teleports; substeps stop fast movement crossing an exterior gap.
    if (length > 5) return current;
    const steps = Math.max(1, Math.ceil(length / 0.04));
    const dx = (to[0] - from[0]) / steps, dz = (to[1] - from[1]) / steps;
    for (let i = 0; i < steps; i++) {
        if (inside([current[0] + dx, current[1]])) current[0] += dx;
        if (inside([current[0], current[1] + dz])) current[1] += dz;
    }
    return current;
}

export function lookTarget(eye: readonly [number, number, number], yaw: number, pitch: number): [number, number, number] {
    const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
    return [eye[0] - Math.sin(y) * Math.cos(p), eye[1] - Math.sin(p), eye[2] - Math.cos(y) * Math.cos(p)];
}
