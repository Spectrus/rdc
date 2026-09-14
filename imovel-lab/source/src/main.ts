import { AppBase, AppOptions, Asset, CameraComponentSystem, CameraFrame, Color, DEVICETYPE_WEBGPU, Entity, FILLMODE_FILL_WINDOW, GSplatComponentSystem, GSplatHandler, RenderComponentSystem, RESOLUTION_AUTO, TextureHandler, Vec3, createGraphicsDevice } from 'playcanvas';
import './style.css';
import { constrainStep, lookTarget } from './navigation';
import { CAMERA_POSE, SPLAT_URL } from './splat-config';
import { addCeiling } from './ceiling';
import { setupTour } from './tour';
import { DetailController, type QualityMode } from './quality';

const canvas=document.querySelector<HTMLCanvasElement>('#app')!;
const loader=document.querySelector<HTMLElement>('#loader')!;
const message=document.querySelector<HTMLElement>('#loader-message')!;
const progress=document.querySelector<HTMLElement>('#loader-progress-bar')!;
const retry=document.querySelector<HTMLButtonElement>('#retry')!;
const status=document.querySelector<HTMLOutputElement>('#render-status')!;
const qualitySelect=document.querySelector<HTMLSelectElement>('#quality')!;
const ceilingToggle=document.querySelector<HTMLInputElement>('#ceiling-toggle')!;
const tour=setupTour();
let ready=false,failed=false;
const loading=(text:string,amount?:number,error=false)=>{
 message.textContent=text;loader.dataset.state=error?'error':'loading';
 if(amount!==undefined)progress.style.transform=`scaleX(${amount})`;
 if(error){failed=true;retry.hidden=false;status.textContent='3D view unavailable';}
};
retry.addEventListener('click',()=>location.reload());
window.addEventListener('unhandledrejection',()=>{
 if(!ready)loading('The 3D view could not start. Check your connection and graphics acceleration, then retry.',1,true);
});
document.querySelector('#fullscreen')!.addEventListener('click',async()=>{
 try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 catch{status.textContent='Fullscreen is unavailable in this browser.';}
});
const mobile=matchMedia('(pointer: coarse)').matches;
let mode:QualityMode='auto';
try{const saved=localStorage.getItem('rdc-detail-v2');if(saved==='auto'||saved==='high'||saved==='ultra')mode=saved;}catch{}
qualitySelect.value=mode;
const detail=new DetailController(mobile,mode);
const device=await createGraphicsDevice(canvas,{deviceTypes:[DEVICETYPE_WEBGPU],antialias:false}).catch(error=>{
 loading('Graphics initialization failed. Enable hardware acceleration in a recent browser, then retry.',1,true);throw error;
});
// Native CSS pixels at minimum; never use low-resolution upscaling.
device.maxPixelRatio=Math.min(window.devicePixelRatio||1,2);
const options=new AppOptions();options.graphicsDevice=device;
options.componentSystems=[CameraComponentSystem,GSplatComponentSystem,RenderComponentSystem];options.resourceHandlers=[TextureHandler,GSplatHandler];
const app=new AppBase(canvas);app.init(options);app.setCanvasFillMode(FILLMODE_FILL_WINDOW);app.setCanvasResolution(RESOLUTION_AUTO);
app.scene.gsplat.splatBudget=650_000;
app.scene.gsplat.lodUnderfillLimit=5;
app.scene.gsplat.lodBehindPenalty=4;
app.scene.gsplat.lodUpdateDistance=.4;
app.scene.gsplat.lodUpdateAngle=20;
app.scene.gsplat.minPixelSize=.5;
app.scene.gsplat.minContribution=1;
// Radial sorting avoids a full CPU re-sort every time the viewer turns their head.
app.scene.gsplat.radialSorting=true;
const camera=new Entity('Camera');camera.addComponent('camera',{clearColor:new Color(.19,.20,.19),nearClip:.04,farClip:70,fov:75});app.root.addChild(camera);
const frame=new CameraFrame(app,camera.camera!);
frame.rendering.renderTargetScale=1;
frame.rendering.samples=1;
frame.rendering.sharpness=.45;
frame.taa.enabled=false;frame.dof.enabled=false;frame.bloom.intensity=0;frame.fringing.intensity=0;
frame.grading.enabled=true;frame.grading.brightness=1;frame.grading.contrast=1.025;frame.grading.saturation=.96;
frame.update();
const ceiling=addCeiling(app);
ceilingToggle.addEventListener('change',()=>{ceiling.enabled=ceilingToggle.checked;});
qualitySelect.addEventListener('change',()=>{
 detail.mode=qualitySelect.value as QualityMode;
 try{localStorage.setItem('rdc-detail-v2',detail.mode);}catch{}
 qualitySelect.blur();
});
let x=CAMERA_POSE.position[0],z=CAMERA_POSE.position[2];
const eyeY=CAMERA_POSE.position[1];
let yaw=0,pitch=0;
const eye=new Vec3(),aim=new Vec3();
let dirty=true,lookX=0,lookY=0,vx=0,vz=0,stickX=0,stickY=0;
const keys=new Set<string>();
const refreshCamera=()=>{
 eye.set(x,eyeY,z);const a=lookTarget([x,eyeY,z],yaw,pitch);aim.set(...a);camera.setPosition(eye);camera.lookAt(aim);tour.update(x,z,yaw);dirty=false;
};
const thumb=document.querySelector<HTMLElement>('#joystick-thumb')!;
const stop=()=>{keys.clear();vx=vz=stickX=stickY=lookX=lookY=0;thumb.style.transform='';};
const reset=()=>{
 stop();x=CAMERA_POSE.position[0];z=CAMERA_POSE.position[2];
 const dx=x-CAMERA_POSE.target[0],dy=eyeY-CAMERA_POSE.target[1],dz=z-CAMERA_POSE.target[2];
 yaw=Math.atan2(dx,dz)*180/Math.PI;pitch=Math.asin(dy/Math.hypot(dx,dy,dz))*180/Math.PI;dirty=true;refreshCamera();
};
reset();
document.querySelector('#reset-view')!.addEventListener('click',()=>{reset();(document.activeElement as HTMLElement)?.blur();});
let lookPointer:number|null=null,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{
 if(lookPointer!==null||!ready)return;
 lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});
});
canvas.addEventListener('pointermove',e=>{
 if(lookPointer!==e.pointerId)return;
 lookX+=e.clientX-lastX;lookY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
});
const endLook=(e:PointerEvent)=>{if(e.pointerId===lookPointer)lookPointer=null;};
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endLook as EventListener);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
const movementKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
window.addEventListener('keydown',e=>{
 if(e.altKey||e.metaKey||e.ctrlKey||!movementKeys.has(e.code))return;
 if(e.target instanceof HTMLElement&&e.target.closest('button,input,select,a,[role="button"]'))return;
 e.preventDefault();keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{stop();lookPointer=null;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();lookPointer=null;}});
const joystick=document.querySelector<HTMLElement>('#joystick')!;
let stickPointer:number|null=null;
const updateStick=(e:PointerEvent)=>{
 const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
 const radius=r.width*.32,length=Math.hypot(dx,dy),scale=Math.min(1,radius/Math.max(1,length));
 stickX=length<7?0:dx*scale/radius;stickY=length<7?0:dy*scale/radius;
 thumb.style.transform=`translate(${stickX*radius}px,${stickY*radius}px)`;
};
joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
const endStick=(e:PointerEvent)=>{if(e.pointerId!==stickPointer)return;stickPointer=null;stickX=stickY=0;thumb.style.transform='';};
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,endStick as EventListener);
let frames=0,elapsed=0;
app.on('frameend',()=>{
 if(!ready&&app.stats.frame.gsplats>0&&++frames>=2){ready=true;loader.dataset.hidden='true';document.body.dataset.ready='true';}
});
app.on('update',(rawDt:number)=>{
 if(document.hidden)return;
 const dt=Math.min(rawDt,.05);
 const turning=Math.abs(lookX)+Math.abs(lookY)>.01;
 if(turning){yaw-=lookX*.13;pitch=Math.max(-75,Math.min(75,pitch+lookY*.13));lookX=lookY=0;dirty=true;}
 const strafe=stickX+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 const advance=-stickY+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
 const magnitude=Math.hypot(strafe,advance),r=yaw*Math.PI/180;
 const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?2.2:1.4;
 const normalize=Math.max(1,magnitude);
 const wantedX=ready?(Math.cos(r)*strafe-Math.sin(r)*advance)*speed/normalize:0;
 const wantedZ=ready?(-Math.sin(r)*strafe-Math.cos(r)*advance)*speed/normalize:0;
 const smooth=1-Math.exp(-dt*(magnitude?14:22));
 vx+=(wantedX-vx)*smooth;vz+=(wantedZ-vz)*smooth;
 if(Math.hypot(vx,vz)>.001){
  const [nx,nz]=constrainStep([x,z],[x+vx*dt,z+vz*dt]);
  if(Math.abs(nx-x)<1e-7)vx=0;if(Math.abs(nz-z)<1e-7)vz=0;
  dirty ||= nx!==x||nz!==z;x=nx;z=nz;
 }
 if(dirty)refreshCamera();
 const budget=detail.update(rawDt,turning||magnitude>.01,ready);
 if(app.scene.gsplat.splatBudget!==budget)app.scene.gsplat.splatBudget=budget;
 elapsed+=rawDt;
 if(ready&&elapsed>=1){elapsed=0;status.textContent=`${qualitySelect.selectedOptions[0].textContent} · ${Math.round(app.stats.frame.fps)} fps`;}
});
window.addEventListener('resize',()=>app.resizeCanvas());
const asset=new Asset('Home Scan','gsplat',{url:SPLAT_URL,filename:'lod-meta.json'});
asset.on('load',()=>{
 const splat=new Entity('Home Scan');splat.setLocalEulerAngles(0,0,180);splat.addComponent('gsplat',{asset,lodFalloff:1.65,lodRangeMin:0});app.root.addChild(splat);
 loading('Streaming the first view…',.3);
});
asset.on('error',()=>loading('The home could not be downloaded. Check your connection and retry.',1,true));
app.assets.add(asset);app.assets.load(asset);app.start();
setTimeout(()=>{if(!ready&&!failed){loading('Still loading the first view. You can explore the room guide while it loads.');retry.hidden=false;}},30000);
