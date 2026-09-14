import {
    AppBase,
    AppOptions,
    Asset,
    CameraComponentSystem,
    Color,
    DEVICETYPE_WEBGPU,
    Entity,
    FILLMODE_FILL_WINDOW,
    GSplatComponentSystem,
    GSplatHandler,
    RESOLUTION_AUTO,
    TextureHandler,
    Vec3,
    createGraphicsDevice
} from 'playcanvas';
import type { BoundingBox } from 'playcanvas';

import './style.css';
import type { CameraPose } from './splat-config';
import { CAMERA_POSE, SPLAT_URL } from './splat-config';

const canvas = document.querySelector<HTMLCanvasElement>('#app');
const loader = document.querySelector<HTMLDivElement>('#loader');
const loaderMessage = document.querySelector<HTMLDivElement>('#loader-message');
const loaderProgressBar = document.querySelector<HTMLDivElement>('#loader-progress-bar');

if (!canvas) {
    throw new Error('Missing #app canvas');
}

const DEFAULT_FOV = 75;
const DEFAULT_CAMERA_DIRECTION = new Vec3(2, 1, 2).normalize();
const DEFAULT_PITCH = (Math.asin(DEFAULT_CAMERA_DIRECTION.y) * 180) / Math.PI;
const DEFAULT_YAW = (Math.atan2(DEFAULT_CAMERA_DIRECTION.x, DEFAULT_CAMERA_DIRECTION.z) * 180) / Math.PI;
const ORBIT_SENSITIVITY = (18 * 0.5) / 60;
const TRACKPAD_ORBIT_SENSITIVITY = (18 * 0.75) / 60;
const MOVE_SPEED = 4;
const FLY_MOVE_ACCELERATION_DAMPING = 0.992;
const FLY_MOVE_DECELERATION_DAMPING = 0.993;
const WHEEL_ZOOM_SPEED = 0.06 / 60;
const PINCH_ZOOM_SPEED = WHEEL_ZOOM_SPEED * 2;
const MIN_PITCH = -90;
const MAX_PITCH = 90;
const MIN_SCENE_RADIUS = 0.5;

type DragMode = 'orbit' | 'pan';

const setLoadingState = (message: string, progress?: number, failed = false) => {
    if (loaderMessage) {
        loaderMessage.textContent = message;
    }

    if (loaderProgressBar && progress !== undefined) {
        loaderProgressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    }

    if (loader) {
        loader.dataset.state = failed ? 'error' : 'loading';
    }
};

const hideLoader = () => {
    if (loader) {
        loader.dataset.hidden = 'true';
    }
};

const device = await createGraphicsDevice(canvas, {
    deviceTypes: [DEVICETYPE_WEBGPU],

    // Gaussian splats do not benefit from antialiasing and it is expensive.
    antialias: false
}).catch((error: unknown) => {
    setLoadingState('Graphics initialization failed. Try a recent Chrome or Edge with hardware acceleration enabled.', 1, true);
    throw error;
});
device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);

const createOptions = new AppOptions();
createOptions.graphicsDevice = device;
createOptions.componentSystems = [CameraComponentSystem, GSplatComponentSystem];
createOptions.resourceHandlers = [TextureHandler, GSplatHandler];

const app = new AppBase(canvas);
app.init(createOptions);

app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
app.setCanvasResolution(RESOLUTION_AUTO);
app.start();

const camera = new Entity('Camera');
camera.addComponent('camera', {
    clearColor: new Color(0.02, 0.025, 0.035),
    fov: DEFAULT_FOV
});
app.root.addChild(camera);

const target = new Vec3(0, 0, 0);
const cameraPosition = new Vec3();
const forward = new Vec3();
const right = new Vec3();
const up = new Vec3();
const move = new Vec3();
const desiredMove = new Vec3();
const flyVelocity = new Vec3();
const nextTarget = new Vec3();
const worldAabbCenter = new Vec3();
const pressedKeys = new Set<string>();
let yaw = DEFAULT_YAW;
let pitch = DEFAULT_PITCH;
let distance = 3;
let fov = DEFAULT_FOV;
let sceneRadius = 1;
let dragMode: DragMode | null = null;
let activePointerId: number | null = null;
let lastPointerX = 0;
let lastPointerY = 0;
let isControlKeyDown = false;
let walking = true;

const updateCameraPosition = () => {
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const cosPitch = Math.cos(pitchRad);

    cameraPosition.set(
        target.x + distance * Math.sin(yawRad) * cosPitch,
        target.y + distance * Math.sin(pitchRad),
        target.z + distance * Math.cos(yawRad) * cosPitch
    );
};

const updateCamera = () => {
    updateCameraPosition();
    camera.setPosition(cameraPosition);
    camera.lookAt(target);
};

const getFrameDistance = (radius: number) => {
    const halfFovRad = (fov * Math.PI) / 360;
    return radius / Math.sin(halfFovRad);
};

const clampDistance = (value: number) => {
    const minDistance = Math.max(sceneRadius * 0.02, 0.02);
    const maxDistance = Math.max(sceneRadius * 40, 30);
    return Math.max(minDistance, Math.min(maxDistance, value));
};

const damp = (damping: number, dt: number) => 1 - Math.pow(damping, dt * 1000);

const setDefaultFrame = () => {
    target.set(0, 0, 0);
    sceneRadius = 1;
    yaw = DEFAULT_YAW;
    pitch = DEFAULT_PITCH;
    distance = getFrameDistance(sceneRadius);
    updateCamera();
};

const applyCameraPose = (pose: CameraPose) => {
    const dx = pose.position[0] - pose.target[0];
    const dy = pose.position[1] - pose.target[1];
    const dz = pose.position[2] - pose.target[2];
    const poseDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // a pose looking at its own position has no view direction
    if (!Number.isFinite(poseDistance) || poseDistance < 1e-6) {
        return false;
    }

    target.set(pose.target[0], pose.target[1], pose.target[2]);
    yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
    pitch = (Math.asin(Math.max(-1, Math.min(1, dy / poseDistance))) * 180) / Math.PI;
    distance = poseDistance;
    fov = pose.fov;

    if (camera.camera) {
        camera.camera.fov = fov;
    }

    updateCamera();
    return true;
};

const frameSplat = (splat: Entity, aabb?: BoundingBox) => {
    if (aabb) {
        splat.getWorldTransform().transformPoint(aabb.center, worldAabbCenter);
        target.copy(worldAabbCenter);
        sceneRadius = Math.max(aabb.halfExtents.length(), MIN_SCENE_RADIUS);
    } else {
        target.set(0, 0, 0);
        sceneRadius = 1;
    }

    yaw = DEFAULT_YAW;
    pitch = DEFAULT_PITCH;
    distance = clampDistance(getFrameDistance(sceneRadius));
    updateCamera();
};

const updateBasis = () => {
    updateCameraPosition();
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;
    const cosPitch = Math.cos(pitchRad);

    forward.set(-Math.sin(yawRad) * cosPitch, -Math.sin(pitchRad), -Math.cos(yawRad) * cosPitch).normalize();
    right.set(Math.cos(yawRad), 0, -Math.sin(yawRad)).normalize();
    up.cross(right, forward).normalize();
};

const panTarget = (deltaX: number, deltaY: number) => {
    updateBasis();

    const height = canvas.clientHeight || window.innerHeight;
    const width = canvas.clientWidth || window.innerWidth;
    const halfHeight = distance * Math.tan((fov * Math.PI) / 360);
    const halfWidth = halfHeight * (width / height);

    nextTarget
        .copy(right)
        .mulScalar((-deltaX / width) * halfWidth * 2)
        .add(up.clone().mulScalar((deltaY / height) * halfHeight * 2));

    target.add(nextTarget);
    updateCamera();
};

canvas.addEventListener('pointerdown', (event) => {
    if (activePointerId !== null) {
        return;
    }

    dragMode = event.button === 2 ? 'pan' : 'orbit';
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId || !dragMode) {
        return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    if (walking) {
        updateCameraPosition();
        const eye = cameraPosition.clone();
        yaw -= deltaX * ORBIT_SENSITIVITY;
        pitch = Math.max(-80, Math.min(80, pitch + deltaY * ORBIT_SENSITIVITY));
        const yr = yaw * Math.PI / 180;
        const pr = pitch * Math.PI / 180;
        target.set(eye.x - Math.sin(yr) * Math.cos(pr), eye.y - Math.sin(pr), eye.z - Math.cos(yr) * Math.cos(pr));
        updateCamera();
    } else if (dragMode === 'pan') {
        panTarget(deltaX, deltaY);
    } else {
        yaw -= deltaX * ORBIT_SENSITIVITY;
        pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + deltaY * ORBIT_SENSITIVITY));
        updateCamera();
    }
});

const endPointerDrag = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
        return;
    }

    dragMode = null;
    activePointerId = null;

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
};

canvas.addEventListener('pointerup', endPointerDrag);
canvas.addEventListener('pointercancel', endPointerDrag);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener(
    'wheel',
    (event) => {
        event.preventDefault();
        if (walking) return;

        if (event.shiftKey) {
            panTarget(event.deltaX, event.deltaY);
            return;
        }

        if (event.ctrlKey && isControlKeyDown) {
            yaw -= event.deltaX * TRACKPAD_ORBIT_SENSITIVITY;
            pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch + event.deltaY * TRACKPAD_ORBIT_SENSITIVITY));
            updateCamera();
            return;
        }

        const zoomSpeed = event.ctrlKey ? PINCH_ZOOM_SPEED : WHEEL_ZOOM_SPEED;
        distance = clampDistance(distance * (1 + event.deltaY * zoomSpeed));
        updateCamera();
    },
    { passive: false }
);

window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.altKey) {
        return;
    }

    pressedKeys.add(event.code);
    if (event.code.startsWith('Arrow')) event.preventDefault();

    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        isControlKeyDown = true;
    }
});

window.addEventListener('keyup', (event) => {
    pressedKeys.delete(event.code);

    if (event.code === 'ControlLeft' || event.code === 'ControlRight') {
        isControlKeyDown = false;
    }
});

window.addEventListener('blur', () => {
    pressedKeys.clear();
    isControlKeyDown = false;
});

const resize = () => app.resizeCanvas();
window.addEventListener('resize', resize);
app.on('destroy', () => {
    window.removeEventListener('resize', resize);
});

if (!CAMERA_POSE || !applyCameraPose(CAMERA_POSE)) {
    setDefaultFrame();
}

app.on('update', (dt) => {
    desiredMove.set(0, 0, 0);

    const strafe =
        Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) -
        Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'));
    const lift = walking ? 0 : Number(pressedKeys.has('KeyE')) - Number(pressedKeys.has('KeyQ'));
    const advance =
        Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) -
        Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown'));

    if (strafe !== 0 || lift !== 0 || advance !== 0) {
        updateBasis();
        if (walking) forward.set(-Math.sin(yaw * Math.PI / 180), 0, -Math.cos(yaw * Math.PI / 180));

        desiredMove.addScaled(right, strafe).addScaled(up, lift).addScaled(forward, advance);

        if (desiredMove.lengthSq() > 0) {
            const speedMultiplier =
                pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')
                    ? 4
                    : pressedKeys.has('ControlLeft') || pressedKeys.has('ControlRight')
                      ? 0.25
                      : 1;

            desiredMove.normalize().mulScalar((walking ? 1.5 : MOVE_SPEED) * speedMultiplier);
        }
    }

    const damping =
        desiredMove.lengthSq() > flyVelocity.lengthSq() ? FLY_MOVE_ACCELERATION_DAMPING : FLY_MOVE_DECELERATION_DAMPING;
    flyVelocity.lerp(flyVelocity, desiredMove, damp(damping, dt));

    if (desiredMove.lengthSq() === 0 && flyVelocity.lengthSq() < 1e-4) {
        flyVelocity.set(0, 0, 0);
    }

    if (flyVelocity.lengthSq() === 0) {
        return;
    }

    move.copy(flyVelocity).mulScalar(dt);
    target.add(move);
    updateCamera();
});

const filename = SPLAT_URL.split('/').pop() || 'splat';
const splatAsset = new Asset('SuperSplat', 'gsplat', {
    url: SPLAT_URL,
    filename
});

splatAsset.on('load', () => {
    const splat = new Entity('Splat');
    splat.setLocalEulerAngles(0, 0, 180);
    splat.addComponent('gsplat', {
        asset: splatAsset
    });
    app.root.addChild(splat);

    const resource = splatAsset.resource as { aabb?: BoundingBox } | null;
    const aabb = resource?.aabb;

    // scene radius scales zoom/pan limits even when the authored pose wins
    if (aabb) {
        sceneRadius = Math.max(aabb.halfExtents.length(), MIN_SCENE_RADIUS);
    }

    if (!CAMERA_POSE || !applyCameraPose(CAMERA_POSE)) {
        frameSplat(splat, aabb);
    }
    hideLoader();
});

splatAsset.on('progress', (received: number, length: number) => {
    if (length > 0) {
        const progress = Math.max(0, Math.min(1, received / length));
        setLoadingState(`Loading splat ${Math.floor(progress * 100)}%`, progress);
    }
});

splatAsset.on('error', (error: unknown) => {
    console.error(error);
    setLoadingState('Failed to load splat.', 1, true);
});

app.assets.add(splatAsset);
app.assets.load(splatAsset);

document.querySelector('#reset-view')?.addEventListener('click', () => {
    walking = true;
    flyVelocity.set(0, 0, 0);
    pressedKeys.clear();
    if (CAMERA_POSE) applyCameraPose(CAMERA_POSE);
    document.querySelector('#scene-note')!.textContent = 'Research demo · Free navigation · No wall collisions yet';
});
document.querySelector('#walk-view')?.addEventListener('click', () => {
    walking = true;
    flyVelocity.set(0, 0, 0);
    pressedKeys.clear();
    applyCameraPose(CAMERA_POSE);
    document.querySelector('#scene-note')!.textContent = 'Eye-level preview · Drag to look · WASD to move · Walls are not solid yet';
});
document.querySelector('#fullscreen')?.addEventListener('click', async () => {
    try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
    } catch { document.querySelector('#scene-note')!.textContent = 'Fullscreen is unavailable in this browser.'; }
});
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => {
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        pressedKeys.add(button.dataset.key!);
    });
    const release = () => pressedKeys.delete(button.dataset.key!);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
});
