import {AppBase,Entity,StandardMaterial,Color,Texture,ADDRESS_REPEAT,FILTER_LINEAR_MIPMAP_LINEAR,Vec2,BLEND_NORMAL,CULLFACE_NONE} from 'playcanvas';
import {walls,rooms,upper,lower,stair,LEVEL,barriers,type Rect} from './layout';
export function buildScene(app:AppBase){
 const mats=new Map<string,StandardMaterial>();
 function material(name:string,color:number[],gloss=10){if(mats.has(name))return mats.get(name)!;const m=new StandardMaterial();m.diffuse=new Color(...color as [number,number,number]);m.gloss=gloss;m.update();mats.set(name,m);return m;}
 const plaster=material('warm plaster',[.86,.845,.79]),white=material('ceiling',[.96,.95,.91]),wood=material('oak',[.42,.26,.13]),dark=material('bronze',[.095,.105,.095],40),fabric=material('linen',[.52,.53,.47]),stone=material('stone',[.61,.61,.56]),black=material('piano',[.025,.029,.026],75);
 const glass=material('glass',[.68,.82,.8],85);glass.opacity=.14;glass.blendType=BLEND_NORMAL;glass.depthWrite=false;glass.cull=CULLFACE_NONE;glass.update();
 const tile=document.createElement('canvas');tile.width=tile.height=512;const ctx=tile.getContext('2d')!;
 ctx.fillStyle='#c6aa81';ctx.fillRect(0,0,512,512);
 let seed=12;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let row=0;row<8;row++){ctx.fillStyle=`rgb(${174+rand()*30},${142+rand()*25},${105+rand()*20})`;ctx.fillRect(0,row*64,512,63);for(let j=0;j<48;j++){ctx.strokeStyle=`rgba(66,42,22,${.035+rand()*.09})`;ctx.beginPath();const y=row*64+rand()*63;ctx.moveTo(0,y);ctx.bezierCurveTo(170,y+rand()*4,340,y-rand()*4,512,y);ctx.stroke();}ctx.fillStyle='#887357';ctx.fillRect((row%2)*240+60,row*64,1,64);}
 const tex=new Texture(app.graphicsDevice,{width:512,height:512,mipmaps:true,addressU:ADDRESS_REPEAT,addressV:ADDRESS_REPEAT,minFilter:FILTER_LINEAR_MIPMAP_LINEAR});tex.setSource(tile);tex.anisotropy=Math.min(8,app.graphicsDevice.maxAnisotropy);
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial,collision=false){const e=new Entity(name);e.addComponent('render',{type:'box',material:m,castShadows:true,receiveShadows:true});e.setPosition(x,y,z);e.setLocalScale(w,h,d);app.root.addChild(e);if(collision)barriers.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,y0:y-h/2,y1:y+h/2});return e;}
 function cylinder(x:number,y:number,z:number,w:number,h:number,m:StandardMaterial){const e=new Entity('round furnishing');e.addComponent('render',{type:'cylinder',material:m});e.setPosition(x,y,z);e.setLocalScale(w,h,w);app.root.addChild(e);return e;}
 function cut(r:Rect):Rect[]{const a=stair;if(r.x1<=a.x0||r.x0>=a.x1||r.z1<=a.z0||r.z0>=a.z1)return[r];return[{x0:r.x0,x1:Math.min(r.x1,a.x0),z0:r.z0,z1:r.z1},{x0:Math.max(r.x0,a.x1),x1:r.x1,z0:r.z0,z1:r.z1},{x0:Math.max(r.x0,a.x0),x1:Math.min(r.x1,a.x1),z0:r.z0,z1:Math.min(r.z1,a.z0)},{x0:Math.max(r.x0,a.x0),x1:Math.min(r.x1,a.x1),z0:Math.max(r.z0,a.z1),z1:r.z1}].filter(v=>v.x1>v.x0&&v.z1>v.z0);}
 for(const [level,list]of [[0,lower],[1,upper]]as const)for(const r of list){
  for(const q of(level?cut(r):[r])){const w=q.x1-q.x0,d=q.z1-q.z0,x=(q.x0+q.x1)/2,z=(q.z0+q.z1)/2;
   box('floor slab',x,level*LEVEL-.08,z,w,.16,d,stone);
   const floorMat=level?wood.clone():stone.clone();if(level){floorMat.diffuse=new Color(.98,.97,.94);floorMat.diffuseMap=tex;floorMat.diffuseMapTiling=new Vec2(w/4,d/4);}floorMat.update();
   const floor=new Entity('finished floor');floor.addComponent('render',{type:'plane',material:floorMat});floor.setPosition(x,level*LEVEL+.004,z);floor.setLocalScale(w,1,d);app.root.addChild(floor);
  }
  for(const q of(level?[r]:cut(r))){if(level&&q.z0>=12.72)continue;box('ceiling',(q.x0+q.x1)/2,level*LEVEL+2.87,(q.z0+q.z1)/2,q.x1-q.x0,.12,q.z1-q.z0,white);}
 }
 for(const wall of walls){const dx=wall.b[0]-wall.a[0],dz=wall.b[1]-wall.a[1],length=Math.hypot(dx,dz),x=(wall.a[0]+wall.b[0])/2,z=(wall.a[1]+wall.b[1])/2,y=wall.floor*LEVEL;const horizontal=Math.abs(dx)>0;
  box('wall',x,y+1.4,z,horizontal?length:.16,2.8,horizontal?.16:length,wall.glass?glass:plaster);
  box('skirting',x,y+.06,z,horizontal?length:.18,.12,horizontal?.18:length,wood);
  if(wall.glass){const n=Math.ceil(length/2.5);for(let i=0;i<=n;i++){const px=wall.a[0]+dx*i/n,pz=wall.a[1]+dz*i/n;box('window mullion',px,y+1.4,pz,.045,2.8,.045,dark);}box('window header',x,y+2.75,z,horizontal?length:.08,.08,horizontal?.08:length,dark);}
 }
 // L stair: two real flights and a landing. Navigation follows their sloping tread envelope.
 const steps=10,half=LEVEL/2;
 for(let i=0;i<steps;i++){const d=(stair.turnZ-stair.z0)/steps,h=LEVEL-(i+.5)/steps*half;box('upper stair tread',(stair.turnX+stair.x1)/2,h-.09,stair.z0+(i+.5)*d,stair.x1-stair.turnX,.18,d,wood);}
 box('stair landing',(stair.turnX+stair.x1)/2,half-.09,(stair.turnZ+stair.z1)/2,stair.x1-stair.turnX,.18,stair.z1-stair.turnZ,wood);
 for(let i=0;i<steps;i++){const w=(stair.turnX-stair.x0)/steps,h=(i+.5)/steps*half;box('lower stair tread',stair.x0+(i+.5)*w,h-.09,(stair.turnZ+stair.z1)/2,w,.18,stair.z1-stair.turnZ,wood);}
 // Stair guards follow the flights; thin rails never seal a landing.
 function rail(ax:number,ay:number,az:number,bx:number,by:number,bz:number){const e=box('handrail',(ax+bx)/2,(ay+by)/2,(az+bz)/2,.045,.045,Math.hypot(bx-ax,by-ay,bz-az),dark);e.lookAt(bx,by,bz);}
 for(const x of[stair.turnX,stair.x1]){rail(x,LEVEL+.9,stair.z0,x,half+.9,stair.turnZ);for(let i=0;i<5;i++){const t=i/4;box('baluster',x,LEVEL-half*t+.45,stair.z0+(stair.turnZ-stair.z0)*t,.035,.9,.035,dark);}}
 for(const z of[stair.turnZ,stair.z1]){rail(stair.x0,.9,z,stair.turnX,half+.9,z);for(let i=0;i<5;i++){const t=i/4;box('baluster',stair.x0+(stair.turnX-stair.x0)*t,half*t+.45,z,.035,.9,.035,dark);}}
 function sofa(x:number,y:number,z:number,w=3.4){box('linen sofa',x,y+.28,z,w,.5,1.1,fabric,true);box('sofa back',x,y+.65,z+.42,w,.65,.22,fabric);for(let i=0;i<3;i++)box('seat cushion',x-w/3+i*w/3,y+.57,z-.08,w/3-.04,.17,.8,white);}
 function table(x:number,y:number,z:number,w:number,d:number){box('oak table',x,y+.78,z,w,.09,d,wood,true);for(const dx of[-w/2+.15,w/2-.15])for(const dz of[-d/2+.15,d/2-.15])box('table leg',x+dx,y+.38,z+dz,.075,.76,.075,dark);}
 sofa(6,LEVEL,5,4.2);sofa(9.8,LEVEL,8,3);table(6,LEVEL,8.4,2.4,1.2);table(5,LEVEL,2,4,1.3);
 // Piano and stools echo the social-room reference, without projecting a flat photo into 3D.
 box('grand piano',3,LEVEL+.85,9.8,2,.23,1.6,black,true);box('keyboard',3,LEVEL+.8,8.9,2,.10,.3,white);for(let i=0;i<28;i++)box('piano key',2.08+i*.067,LEVEL+.865,8.92,.023,.025,.14,black);for(const [x,z]of[[2.2,9.1],[3.8,9.1],[3,10.4]])box('piano leg',x,LEVEL+.4,z,.10,.8,.10,black);
 sofa(20,LEVEL,10.4,4);table(17,LEVEL,7,2.6,1.2);
 box('family island',23,LEVEL+.5,7.1,2.8,1,1.05,dark,true);box('island stone',23,LEVEL+1.03,7.1,2.95,.08,1.15,stone);
 for(let i=0;i<4;i++)cylinder(21.9+i*.72,LEVEL+.65,8.1,.42,.08,wood);
 box('kitchen cabinets',28,LEVEL+.5,.65,5,1,.6,white,true);box('kitchen worktop',28,LEVEL+1.04,.65,5.1,.08,.65,dark);box('refrigerator',26,LEVEL+1.1,1.3,1,2.2,.9,stone,true);
 for(const room of rooms.filter(r=>r.id.startsWith('suite')||r.id==='master')){const x=(room.x0+room.x1)/2,z=room.z0>3?room.z1-1.1:room.z0+1.1,y=LEVEL;box('bed base',x,y+.25,z,1.85,.5,2,wood,true);box('mattress',x,y+.57,z,1.82,.2,2,white);box('headboard',x,y+.65,z-.94,2,1.3,.12,fabric);for(const dx of[-.47,.47])box('pillow',x+dx,y+.74,z-.62,.65,.17,.4,white);box('wardrobe',room.x1-.4,y+1.2,room.z1-.7,.65,2.4,1.5,plaster,true);}
 sofa(19,0,12,4);table(20,0,8,5,1.5);box('gourmet cabinets',14,1,8,.65,2,4,wood,true);box('gourmet worktop',15,.95,5.8,3.7,.12,.8,dark,true);
 for(let i=0;i<3;i++){box('gym equipment',14.8+i*2.5,.2,1.8,1.4,.4,2,black,true);box('gym console',14.8+i*2.5,1.1,1.05,1,.12,.18,dark);}
 for(const room of rooms){if(room.id==='varanda'||room.id==='jardim')continue;const x=(room.x0+room.x1)/2,z=(room.z0+room.z1)/2,y=room.floor*LEVEL;const m=material('lit panel',[1,.95,.82]);m.emissive=new Color(.65,.56,.4);m.update();box('recessed light',x,y+2.795,z,.45,.025,.45,m);}
 // Garden base and planter objects supply depth outside the glazing.
 const green=material('garden',[.17,.29,.12]);box('landscape',27,-.3,20,80,.3,90,green);
 for(let i=0;i<15;i++){const x=-4+i*4.3,z=24+(i%3)*2;cylinder(x,1.2,z,.2,2.4,wood);const e=new Entity('tree');e.addComponent('render',{type:'sphere',material:green});e.setPosition(x,3,z);e.setLocalScale(2.5,3.7,2.5);app.root.addChild(e);}
 return {materials:mats};
}
