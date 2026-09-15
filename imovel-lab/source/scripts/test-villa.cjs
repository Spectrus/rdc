const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const cache={};
class Entity{constructor(name){this.name=name;}addComponent(){}setPosition(){}setLocalScale(){}setLocalEulerAngles(){}lookAt(){}}
class Material{update(){}clone(){return new Material();}}
class Texture{setSource(){}}
const pc={Entity,StandardMaterial:Material,Texture,Color:class{},Vec2:class{}};
const ctx=new Proxy({},{get:()=>()=>{}});
function load(name){if(cache[name])return cache[name];const sandbox={exports:{},document:{createElement:()=>({getContext:()=>ctx})},require:id=>id==='playcanvas'?pc:load(id.replace('./',''))};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname,`../src/villa/${name}.ts`),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,sandbox);return cache[name]=sandbox.exports;}
const nav=load('layout');load('scene').buildScene({graphicsDevice:{maxAnisotropy:8},root:{addChild(){}}});
function route(from,to){const step=.25,queue=[[0,0]],seen=new Set(['0,0']);for(let i=0;i<queue.length&&i<40000;i++){const [gx,gz]=queue[i],p={x:from.x+gx*step,y:from.y,z:from.z+gz*step};if(Math.hypot(p.x-to[0],p.z-to[1])<.4)return true;for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const key=`${gx+dx},${gz+dz}`;if(seen.has(key))continue;const q=nav.walk(p,dx*step,dz*step);if(Math.hypot(q.x-p.x-dx*step,q.z-p.z-dz*step)<.01&&Math.abs(q.y-from.y)<.08){seen.add(key);queue.push([gx+dx,gz+dz]);}}}return false;}
assert(route(nav.start,[31.55,4.4]),'Upper entrance cannot reach stairhead');
function travel(p,to){let last={...p};for(let i=0;i<2000&&Math.hypot(p.x-to[0],p.z-to[1])>.02;i++){const dx=to[0]-p.x,dz=to[1]-p.z,len=Math.hypot(dx,dz),s=Math.min(.025,len)/len;p=nav.walk(p,dx*s,dz*s);if(Math.hypot(p.x-last.x,p.z-last.z)<1e-8)break;last={...p};}assert(Math.hypot(p.x-to[0],p.z-to[1])<.05,`Blocked before ${to}; stopped ${JSON.stringify(p)}`);return p;}
let p={x:31.55,y:nav.LEVEL,z:4.4};for(const t of[[31.55,8.3],[28.05,8.3]])p=travel(p,t);assert(p.y<.02,'Stairs must reach lower floor');const bottom={...p};for(const t of[[31.55,8.3],[31.55,4.4]])p=travel(p,t);assert(Math.abs(p.y-nav.LEVEL)<.02,'Stairs must return upstairs');
const targets={social:[8,6],intimo:[18,9],cozinha:[29,3],suite1:[36,6.5],suite2:[43,6.5],suite3:[51,6.5],suite4:[36,2.3],suite5:[44,2.3],master:[51,2.3],varanda:[21,15],gourmet:[23,14],academia:[19,4],atelier:[25,2],banhos:[35,7],lavanderia:[39,7],garagem:[48,5],jardim:[33,11]};
for(const [id,target]of Object.entries(targets)){const room=nav.rooms.find(r=>r.id===id);assert(route(room.floor?nav.start:bottom,target),`Room inaccessible with furniture: ${id}`);}
for(const from of[nav.start,bottom]){let q={...from};for(let i=0;i<2000;i++){q=nav.walk(q,Math.sin(i*19)*.15,Math.cos(i*23)*.15);assert(Number.isFinite(q.y));assert(nav.support(q.x,q.z,q.y)!==null,'Movement has no floor support');}}
console.log('PASS: entrance to stairs; continuous descent/ascent; 17 room routes with furniture; 4,000 supported movement steps.');
