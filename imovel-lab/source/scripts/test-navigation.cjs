const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = path.resolve(__dirname, '../src/navigation.ts');
const sandbox = { exports: {}, require: require('node:module').createRequire(source) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, sandbox);
const {inside, constrainStep, lookTarget} = sandbox.exports;
const grid = require('../src/collision-map.json');
const entrance = [-.2580208778, 2.0780191422];
assert(inside(entrance));
for (const p of [[4,-.8],[2.5,-6.6],[-.75,-4.5],[-20,0],[20,-10],[NaN,0],[0,Infinity]]) assert(!inside(p), `Obstacle/exterior allowed: ${p}`);
// These independently selected room positions must be connected to the entrance.
const landmarks = [[8,0],[5,-4.2],[2,-5],[.4,-9],[8,-9.2],[14,-10],[-2,-4.4],[-3,-1],[-6,-8],[-6,-2]];
const idx = p => [Math.floor((p[0]-grid.origin[0])/grid.resolution),Math.floor((p[1]-grid.origin[1])/grid.resolution)];
const point = (x,z) => [grid.origin[0]+(x+.5)*grid.resolution,grid.origin[1]+(z+.5)*grid.resolution];
const queue=[idx(entrance)], seen=new Set([queue[0].join(',')]);
for(let k=0;k<queue.length;k++) {
 const [x,z]=queue[k];
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
  const next=[x+dx,z+dz],key=next.join(',');
  if(!seen.has(key)&&inside(point(...next))) {seen.add(key);queue.push(next);}
 }
}
for(const p of landmarks) assert(seen.has(idx(p).join(',')),`Room unreachable ${p}`);
let seed=12345; const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
for(let i=0;i<20000;i++) {
 const start=point(...queue[Math.floor(random()*queue.length)]);
 const end=constrainStep(start,[start[0]+(random()-.5)*4,start[1]+(random()-.5)*4]);
 assert(inside(end),'Movement escaped walkable map');
}
assert.deepEqual(Array.from(constrainStep(entrance,[100,100])),entrance);
for(let yaw=-180;yaw<=180;yaw+=5) for(let pitch=-80;pitch<=80;pitch+=5) {
 const eye=[entrance[0],1.384,entrance[1]], aim=lookTarget(eye,yaw,pitch);
 assert(Math.abs(Math.hypot(...eye.map((v,i)=>v-aim[i]))-1)<1e-10);
}
console.log(`PASS: ${queue.length} connected cells; 10 room routes; 20,000 collision moves; walls, furniture, exterior and camera invariants.`);
