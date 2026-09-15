import {AppBase,AppOptions,CameraComponentSystem,LightComponentSystem,RenderComponentSystem,Entity,Color,Vec3,FILLMODE_FILL_WINDOW,RESOLUTION_AUTO,DEVICETYPE_WEBGPU,createGraphicsDevice} from 'playcanvas';
import './style.css';
import {LEVEL,EYE,start,walk,rooms,roomAt,walls,upper,lower,stair,inStair,type Position} from './layout';
import {buildScene} from './scene';
const canvas=document.querySelector<HTMLCanvasElement>('#view')!,map=document.querySelector<SVGSVGElement>('#map')!,panel=document.querySelector<HTMLElement>('#map-panel')!;
const photoPanel=document.querySelector<HTMLElement>('#photo-panel')!,loading=document.querySelector<HTMLElement>('#loading')!;
let position={...start},yaw=Math.PI,pitch=0,currentFloor=1,route:number[][]=[];
let stickX=0,stickZ=0,lookX=0,lookY=0,vx=0,vz=0;
const keys=new Set<string>();
const marker=document.createElementNS('http://www.w3.org/2000/svg','g');marker.innerHTML='<path d="M0 -.6L-.7 1.2L.7 1.2Z" fill="#f1d28e"/><circle r=".25" fill="#fff3ca"/>';
function drawMap(){
 map.replaceChildren();const shapes=(currentFloor?upper:lower).map(r=>`<rect x="${r.x0}" y="${r.z0}" width="${r.x1-r.x0}" height="${r.z1-r.z0}" fill="#3d5a43"/>`).join('');
 const lines=walls.filter(w=>w.floor===currentFloor).map(w=>`<path d="M${w.a.join(' ')}L${w.b.join(' ')}" stroke="${w.glass?'#a3c0b4':'#ebe1c6'}" stroke-width=".18"/>`).join('');
 map.innerHTML=shapes+lines+`<rect x="${stair.x0}" y="${stair.z0}" width="${stair.x1-stair.x0}" height="${stair.z1-stair.z0}" fill="#bc9859" opacity=".85"/><text x="${stair.x0+.4}" y="${stair.z1-.3}" font-size="1.2" fill="#111">↕</text>`+(route.length?`<path d="M${route.map(p=>p.join(' ')).join('L')}" fill="none" stroke="#edcc85" stroke-width=".25" stroke-dasharray=".4 .3"/>`:'');map.append(marker);updateMarker();
}
function updateMarker(){marker.setAttribute('transform',`translate(${position.x},${position.z}) rotate(${yaw*180/Math.PI})`);}
function refreshLocation(){const floor=position.y>LEVEL*.5?1:0;if(floor!==currentFloor){currentFloor=floor;route=[];drawMap();}const room=roomAt(position);document.querySelector('#floor-label')!.textContent=currentFloor?'Piso principal':'Piso inferior';document.querySelector('#room-label')!.textContent=inStair(position.x,position.z)?'Escada interna':room?.name||'Circulação';document.querySelector('#stair-label')!.textContent=inStair(position.x,position.z)?'Percurso contínuo entre pisos':'';updateMarker();}
const showMap=(open:boolean)=>{panel.hidden=!open;document.querySelector('#map-toggle')!.setAttribute('aria-expanded',String(open));document.body.dataset.map=String(open);};
showMap(innerWidth>=900);drawMap();
document.querySelector('#map-toggle')!.addEventListener('click',()=>showMap(panel.hidden));document.querySelector('#map-close')!.addEventListener('click',()=>showMap(false));
const photoNames:Record<string,string>={'social.jpg':'Estar social','frente.jpg':'Fachada / entrada','cristaleira.jpg':'Cristaleira','cozinha.jpg':'Cozinha principal','intimo.jpg':'Estar íntimo','vista.jpg':'Vista da propriedade','suite.jpg':'Área íntima — referência de acabamento, não identifica todas as suítes','master.jpg':'Suíte master','gourmet.jpg':'Espaço gourmet','academia.jpg':'Academia','jardim.jpg':'Jardim','lavabo.jpg':'Lavabo','garagem.jpg':'Garagem'};
const photoUrls:Record<string,string>={};for(const room of rooms)photoUrls[room.photo]=`./photos/${room.photo}`;
document.querySelector('#photo-toggle')!.addEventListener('click',()=>{const room=roomAt(position)||rooms[0];const image=document.querySelector<HTMLImageElement>('#reference')!;image.src=photoUrls[room.photo];image.alt=`Foto original — ${photoNames[room.photo]}`;document.querySelector('#photo-caption')!.textContent=photoNames[room.photo];photoPanel.hidden=false;keys.clear();vx=vz=0;});
document.querySelector('#photo-close')!.addEventListener('click',()=>photoPanel.hidden=true);
document.querySelector('#fullscreen')!.addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen().catch(()=>{});});
function routeToStair(){
 const target=currentFloor?[31.55,4.4]:[28.05,8.35],step=.35,base={x:position.x,y:currentFloor*LEVEL,z:position.z},queue=[[0,0]],parents=new Map<string,string|null>([['0,0',null]]);let end:string|null=null;
 for(let i=0;i<queue.length&&i<25000;i++){
  const [gx,gz]=queue[i],p={x:base.x+gx*step,y:base.y,z:base.z+gz*step},key=`${gx},${gz}`;
  if(Math.hypot(p.x-target[0],p.z-target[1])<.5){end=key;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=gx+dx,nz=gz+dz,k=`${nx},${nz}`;if(parents.has(k))continue;const q=walk(p,dx*step,dz*step);if(Math.hypot(q.x-(base.x+nx*step),q.z-(base.z+nz*step))<.01&&Math.abs(q.y-base.y)<.08){parents.set(k,key);queue.push([nx,nz]);}}
 }
 route=[];while(end!==null){const [x,z]=end.split(',').map(Number);route.push([base.x+x*step,base.z+z*step]);end=parents.get(end)??null;}route.reverse();drawMap();
 document.querySelector('#destination')!.textContent=route.length?'Siga a linha dourada. A escada liga os dois pisos.':'Aproxime-se do corredor central para seguir até a escada.';
}
document.querySelector('#route-stair')!.addEventListener('click',routeToStair);
const fail=()=>{loading.classList.add('error');document.body.dataset.error='true';document.querySelector('#loading-message')!.textContent='O 3D precisa de aceleração gráfica. Você ainda pode consultar a planta. Ative WebGL e recarregue.';document.querySelector<HTMLButtonElement>('#retry')!.hidden=false;};
document.querySelector('#retry')!.addEventListener('click',()=>location.reload());window.addEventListener('unhandledrejection',fail);
const device=await createGraphicsDevice(canvas,{deviceTypes:[DEVICETYPE_WEBGPU],antialias:true}).catch(error=>{fail();throw error;});device.maxPixelRatio=Math.min(devicePixelRatio||1,2);
const opts=new AppOptions();opts.graphicsDevice=device;opts.componentSystems=[CameraComponentSystem,RenderComponentSystem,LightComponentSystem];
const app=new AppBase(canvas);app.init(opts);app.setCanvasFillMode(FILLMODE_FILL_WINDOW);app.setCanvasResolution(RESOLUTION_AUTO);app.scene.ambientLight=new Color(.72,.73,.68);
const camera=new Entity('Visitor');camera.addComponent('camera',{clearColor:new Color(.6,.71,.73),nearClip:.06,farClip:150,fov:72});app.root.addChild(camera);
const sun=new Entity('Daylight');sun.addComponent('light',{type:'directional',color:new Color(1,.96,.86),intensity:.9,castShadows:true,shadowDistance:35,shadowResolution:2048,normalOffsetBias:.04});sun.setLocalEulerAngles(50,-28,0);app.root.addChild(sun);
buildScene(app);
const eye=new Vec3(),aim=new Vec3();
function cameraPose(){eye.set(position.x,position.y+EYE,position.z);aim.set(eye.x+Math.sin(yaw)*Math.cos(pitch),eye.y+Math.sin(pitch),eye.z-Math.cos(yaw)*Math.cos(pitch));camera.setPosition(eye);camera.lookAt(aim);refreshLocation();}
function stop(){keys.clear();vx=vz=stickX=stickZ=lookX=lookY=0;}
document.querySelector('#entrance')!.addEventListener('click',()=>{stop();position={...start};yaw=Math.PI;pitch=0;route=[];drawMap();cameraPose();(document.activeElement as HTMLElement)?.blur();});
let pointer:number|null=null,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId)return;lookX+=e.clientX-lastX;lookY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;});
for(const name of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if((e as PointerEvent).pointerId===pointer)pointer=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{if(e.code==='Escape'){photoPanel.hidden=true;return;}if(e.target instanceof HTMLElement&&e.target.closest('button,input,select'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
const joystick=document.querySelector<HTMLElement>('#joystick')!,knob=joystick.querySelector('b')!;let stickPointer:number|null=null;
function joystickMove(e:PointerEvent){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,radius=r.width*.32,length=Math.hypot(dx,dz),factor=Math.min(1,radius/Math.max(1,length));stickX=length<7?0:dx*factor/radius;stickZ=length<7?0:-dz*factor/radius;knob.style.transform=`translate(${stickX*radius}px,${-stickZ*radius}px)`;}
joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);joystickMove(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)joystickMove(e);});for(const name of['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if((e as PointerEvent).pointerId===stickPointer){stickPointer=null;stickX=stickZ=0;knob.style.transform='';}});
let uiTime=0;
app.on('update',(delta:number)=>{if(document.hidden||!photoPanel.hidden)return;const dt=Math.min(delta,.05);yaw+=lookX*.0022;pitch=Math.max(-1.15,Math.min(1.15,pitch-lookY*.0022));lookX=lookY=0;
 const strafe=stickX+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 const forward=stickZ+Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));const magnitude=Math.max(1,Math.hypot(strafe,forward)),speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?3:1.8;
 const desiredX=(Math.cos(yaw)*strafe+Math.sin(yaw)*forward)*speed/magnitude,desiredZ=(Math.sin(yaw)*strafe-Math.cos(yaw)*forward)*speed/magnitude,smoothing=1-Math.exp(-16*dt);vx+=(desiredX-vx)*smoothing;vz+=(desiredZ-vz)*smoothing;
 position=walk(position,vx*dt,vz*dt);eye.set(position.x,position.y+EYE,position.z);aim.set(eye.x+Math.sin(yaw)*Math.cos(pitch),eye.y+Math.sin(pitch),eye.z-Math.cos(yaw)*Math.cos(pitch));camera.setPosition(eye);camera.lookAt(aim);uiTime+=dt;if(uiTime>.1){uiTime=0;refreshLocation();}
});
window.addEventListener('resize',()=>app.resizeCanvas());cameraPose();app.once('frameend',()=>loading.hidden=true);app.start();
