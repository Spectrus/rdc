import { AppBase, Color, CULLFACE_NONE, Entity, Mesh, MeshInstance, StandardMaterial } from 'playcanvas';
import { inFootprint, roomAt } from './rooms';

// Interpretive ceiling, deliberately separate from the photographic scan.
// Flat 2.55 m height is a presentation assumption, not a measured property fact.
export const CEILING_HEIGHT = 2.55;
export function ceilingGeometry() {
 const positions:number[]=[],colors:number[]=[],normals:number[]=[],indices:number[]=[];
 const step=.2;
 for(let x=-9.4;x<16.9;x+=step)for(let z=-14.6;z<2.6;z+=step){
  if(![0,step/2,step].some(dx=>[0,step/2,step].some(dz=>inFootprint(x+dx,z+dz))))continue;
  const n=positions.length/3;
  for(const [px,pz] of [[x,z],[x+step,z],[x+step,z+step],[x,z+step]]){
   const room=roomAt(px,pz),b=room.bounds;
   const edge=Math.max(0,Math.min(px-b[0],b[2]-px,pz-b[1],b[3]-pz));
   // Baked edge shading gives the neutral plaster a little depth without blurred textures.
   const shade=.76+.12*Math.min(1,edge/.65);
   positions.push(px,CEILING_HEIGHT,pz);normals.push(0,-1,0);colors.push(shade,shade*.975,shade*.935,1);
  }
  indices.push(n,n+1,n+2,n,n+2,n+3);
 }
 return {positions,colors,normals,indices};
}
export function addCeiling(app: AppBase): Entity {
 const {positions,colors,normals,indices}=ceilingGeometry();
 const mesh=new Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setColors(colors);mesh.setIndices(indices);mesh.update();
 const material=new StandardMaterial();material.useLighting=false;material.diffuse=new Color(0,0,0);material.emissive=new Color(1,1,1);material.emissiveVertexColor=true;material.cull=CULLFACE_NONE;material.update();
 const entity=new Entity('Reconstructed ceiling');entity.addComponent('render',{meshInstances:[new MeshInstance(mesh,material)]});app.root.addChild(entity);return entity;
}
