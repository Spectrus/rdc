const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'../src');
const cache={};
function load(name){
 if(cache[name])return cache[name];
 const sandbox={exports:{},require:id=>id.startsWith('./')?id.endsWith('.json')?require(path.join(root,id)):load(id.slice(2)):require(id)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,sandbox);return cache[name]=sandbox.exports;
}
const {DetailController}=load('quality'),{roomAt,inFootprint}=load('rooms'),{ceilingGeometry,CEILING_HEIGHT}=load('ceiling');
const {mapPoint,headingAngle}=load('tour');
const detail=new DetailController(false);
assert.equal(detail.update(.016,true,false),650000);
for(let i=0;i<300;i++)detail.update(.05,true,true);
assert(detail.motionBudget>=1000000&&detail.motionBudget<2500000,'Slow frame rate must reduce geometry budget');
let resting;for(let i=0;i<200;i++)resting=detail.update(.016,false,true);assert.equal(resting,5000000,'Stationary view refines');
detail.mode='ultra';for(let i=0;i<200;i++)resting=detail.update(.016,true,true);assert.equal(resting,8000000,'Explicit Ultra remains fixed');
for(const [x,z,name]of [[-.26,2,'entrance'],[5,-1,'front-living'],[7,-6,'kitchen'],[3,-5,'dining'],[3,-11,'rear-living'],[14,-10,'main-bedroom'],[-3,-1,'office']])assert.equal(roomAt(x,z).id,name);
// An arrow initially pointing up must point down-map when facing negative world Z.
for(const yaw of [0,90,180,270]){const t=headingAngle(yaw)*Math.PI/180,r=yaw*Math.PI/180;assert(Math.abs(Math.sin(t)+Math.sin(r))<1e-10);assert(Math.abs(-Math.cos(t)-Math.cos(r))<1e-10);}
assert(mapPoint(0,2)[1]<mapPoint(0,-12)[1]);
const g=ceilingGeometry();assert(g.positions.length>0);assert(g.indices.every(i=>i>=0&&i<g.positions.length/3));
assert(g.positions.every((v,i)=>Number.isFinite(v)&&(i%3!==1||v===CEILING_HEIGHT)));
// Every movement-grid cell must have ceiling geometry above it.
const cells=new Set();for(let i=0;i<g.positions.length;i+=12)cells.add(`${Math.round((g.positions[i]+9.4)/.2)},${Math.round((g.positions[i+2]+14.6)/.2)}`);
const grid=require('../src/collision-map.json');let checked=0;
grid.rows.forEach((row,zi)=>{for(let j=0;j<row.length;j+=2)for(let xi=row[j];xi<row[j+1];xi++){
 const x=grid.origin[0]+(xi+.5)*grid.resolution,z=grid.origin[1]+(zi+.5)*grid.resolution;
 assert(cells.has(`${Math.floor((x+9.4)/.2+1e-7)},${Math.floor((z+14.6)/.2+1e-7)}`),`Ceiling gap above ${x},${z}`);checked++;
}});
console.log(`PASS: ceiling covers all ${checked} walkable cells; room classification, heading projection and adaptive detail tested. ${g.indices.length/3} ceiling triangles.`);
