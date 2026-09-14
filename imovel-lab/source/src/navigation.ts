type Point = readonly [number, number];

// Conservative outer movement envelope based on the creator's indoor landmarks.
// This is an exterior guard, not a mesh for collision with internal walls.
const perimeter: Point[] = [
    [-9.1, 1.15], [-0.7, 1.15], [-0.7, 2.1], [0.4, 2.1],
    [0.4, 0.1], [8.5, 0.1], [8.5, -4.2], [13.8, -4.2],
    [13.8, -10.4], [7.8, -10.4], [7.8, -11.7], [0, -11.7],
    [0, -8.5], [-9.1, -8.5]
];

export function inside([x, z]: Point): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    let result = false;
    for (let i = 0, j = perimeter.length - 1; i < perimeter.length; j = i++) {
        const [ax, az] = perimeter[i];
        const [bx, bz] = perimeter[j];
        if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) result = !result;
    }
    return result;
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
