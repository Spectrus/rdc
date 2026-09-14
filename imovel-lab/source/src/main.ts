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
import { constrainStep, lookTarget, inside } from './navigation';
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

let sceneReady = false;
const hideLoader = () => {
    sceneReady = true;
    document.body.dataset.ready = 'true';
    if (loader) {
        loader.dataset.hidden = 'true';
    }
};

const mobile = matchMedia('(pointer: coarse)').matches;
const qualitySelect = document.querySelector<HTMLSelectElement>('#quality')!;
const status = document.querySelector<HTMLOutputElement>('#render-status')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;
retry.addEventListener('click', () => location.reload());
window.addEventListener('unhandledrejection', () => {
    if (!sceneReady) {
        setLoadingState('The 3D view could not start. Check your connection and graphics acceleration, then retry.', 1, true);
        retry.hidden = false;
    }
});
const device = await createGraphicsDevice(canvas, {
    deviceTypes: [DEVICETYPE_WEBGPU],

    // Gaussian splats do not benefit from antialiasing and it is expensive.
    antialias: false
}).catch((error: unknown) => {
    retry.hidden = false;
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
let splatEntity: Entity | null = null;
const profiles = {
    light: { budget: 750_000, pixels: 1, minLod: 2 },
    high: { budget: 3_000_000, pixels: 1.5, minLod: 0 },
    ultra: { budget: 6_000_000, pixels: 2, minLod: 0 }
};
type Profile = keyof typeof profiles;
let quality = mobile ? 'light' : 'high';
try { quality = localStorage.getItem('rdc-quality') || quality; } catch { /* storage may be unavailable */ }
if (!(quality in profiles)) quality = mobile ? 'light' : 'high';
const applyQuality = () => {
    const profile = profiles[quality as Profile];
    device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, profile.pixels);
    // Start coarse, then refine after the first drawable frame.
    app.scene.gsplat.splatBudget = sceneReady ? profile.budget : 600_000;
    app.scene.gsplat.lodUnderfillLimit = 5;
    app.scene.gsplat.lodUpdateDistance = 0.25;
    app.scene.gsplat.lodUpdateAngle = 15;
    app.scene.gsplat.lodBehindPenalty = 2;
    if (splatEntity?.gsplat) splatEntity.gsplat.lodRangeMin = profile.minLod;
    qualitySelect.value = quality;
    status.textContent = sceneReady ? `${qualitySelect.selectedOptions[0].textContent} · Refining detail` : 'Preparing the home';
    app.resizeCanvas();
};
qualitySelect.addEventListener('change', () => {
    quality = qualitySelect.value;
    try { localStorage.setItem('rdc-quality', quality); } catch { /* optional preference */ }
    applyQuality();
});
applyQuality();
let frameCount = 0;
app.on('frameend', () => {
    if (!sceneReady && app.stats.frame.gsplats > 0 && ++frameCount >= 2) {
        hideLoader();
        applyQuality();
    }
});
let elapsed = 0;
app.on('update', (dt: number) => {
    elapsed += dt;
    if (elapsed < 1) return;
    elapsed = 0;
    if (sceneReady) status.textContent = `${qualitySelect.selectedOptions[0].textContent} · ${Math.round(app.stats.frame.fps)} fps`;
});
setTimeout(() => {
    if (!sceneReady) {
        setLoadingState('Still loading the home. A slow connection or unavailable graphics acceleration may delay the view.', undefined);
        retry.hidden = false;
    }
}, 30000);

const camera = new Entity('Camera');
camera.addComponent('camera', {
    clearColor: new Color(0.02, 0.025, 0.035),
    nearClip: 0.05,
    farClip: 100,
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
    const corrected = inside([cameraPosition.x, cameraPosition.z]) ? [cameraPosition.x, cameraPosition.z] : [CAMERA_POSE.position[0], CAMERA_POSE.position[2]];
    const correction = new Vec3(corrected[0] - cameraPosition.x, CAMERA_POSE.position[1] - cameraPosition.y, corrected[1] - cameraPosition.z);
    target.add(correction);
    cameraPosition.add(correction);
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
    distance = 1;
    const aim = lookTarget(pose.position, yaw, pitch);
    target.set(...aim);
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
    if (event.target instanceof HTMLElement && event.target.closest('button, select, input, a')) return;
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
    flyVelocity.set(0, 0, 0);
    stickX = stickY = 0;
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
    if (!sceneReady) return;
    dt = Math.min(dt, 0.05);
    desiredMove.set(0, 0, 0);

    const strafe =
        stickX + Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) -
        Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'));
    const lift = walking ? 0 : Number(pressedKeys.has('KeyE')) - Number(pressedKeys.has('KeyQ'));
    const advance =
        -stickY + Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) -
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

            desiredMove.normalize().mulScalar((walking ? 1.5 : MOVE_SPEED) * speedMultiplier * Math.min(1, Math.hypot(strafe, advance)));
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
    updateCameraPosition();
    const next = constrainStep([cameraPosition.x, cameraPosition.z], [cameraPosition.x + move.x, cameraPosition.z + move.z]);
    target.x += next[0] - cameraPosition.x;
    target.z += next[1] - cameraPosition.z;
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
    splatEntity = splat;
    applyQuality();
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
    setLoadingState('Streaming the first view…', 0.3);
});

splatAsset.on('progress', (received: number, length: number) => {
    if (length > 0) {
        const progress = Math.max(0, Math.min(1, received / length));
        setLoadingState(`Loading splat ${Math.floor(progress * 100)}%`, progress);
    }
});

splatAsset.on('error', (error: unknown) => {
    console.error(error);
    setLoadingState('The home could not be downloaded. Check your connection and retry.', 1, true);
    retry.hidden = false;
});

app.assets.add(splatAsset);
app.assets.load(splatAsset);

document.querySelector('#reset-view')?.addEventListener('click', () => {
    walking = true;
    flyVelocity.set(0, 0, 0);
    pressedKeys.clear();
    if (CAMERA_POSE) applyCameraPose(CAMERA_POSE);
    document.querySelector('#scene-note')!.textContent = 'Interior exploration · Wall and furniture guard enabled';
});
document.querySelector('#walk-view')?.addEventListener('click', () => {
    walking = true;
    flyVelocity.set(0, 0, 0);
    pressedKeys.clear();
    applyCameraPose(CAMERA_POSE);
    document.querySelector('#scene-note')!.textContent = 'Drag to look · WASD to move · Wall and furniture guard enabled';
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

// Independent pointer capture allows left-thumb movement and right-thumb look.
let stickX = 0, stickY = 0;
const joystick = document.querySelector<HTMLDivElement>('#joystick')!;
const thumb = document.querySelector<HTMLSpanElement>('#joystick-thumb')!;
let stickPointer: number | null = null;
const updateStick = (event: PointerEvent) => {
    const rect = joystick.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const radius = rect.width * 0.32;
    const length = Math.hypot(dx, dy);
    const scale = Math.min(1, radius / Math.max(1, length));
    stickX = length < 7 ? 0 : dx * scale / radius;
    stickY = length < 7 ? 0 : dy * scale / radius;
    thumb.style.transform = `translate(${stickX * radius}px, ${stickY * radius}px)`;
};
joystick.addEventListener('pointerdown', event => {
    if (stickPointer !== null) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
});
joystick.addEventListener('pointermove', event => {
    if (event.pointerId === stickPointer) updateStick(event);
});
const releaseStick = (event: PointerEvent) => {
    if (event.pointerId !== stickPointer) return;
    stickPointer = null;
    stickX = stickY = 0;
    thumb.style.transform = '';
};
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(event, releaseStick as EventListener);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pressedKeys.clear();
        flyVelocity.set(0, 0, 0);
        stickX = stickY = 0;
        thumb.style.transform = '';
    }
});
