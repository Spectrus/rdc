export type Rect={x0:number,z0:number,x1:number,z1:number};
export type Barrier=Rect&{y0:number,y1:number};
export type Room=Rect&{id:string,name:string,floor:number,photo:string};
export const LEVEL=3.3,EYE=1.62,RADIUS=.20,S=.053;
const rect=(a:number,b:number,c:number,d:number):Rect=>({x0:(a-38)*S,z0:(b-287)*S,x1:(c-38)*S,z1:(d-287)*S});
export const upper:Rect[]=[rect(38,287,1070,455),rect(38,455,570,527),rect(285,527,570,597)];
// Lower floor is registered to the internal stair; unmeasured service areas are approximate.
export const lower:Rect[]=[{x0:13,z0:0,x1:55,z1:9},{x0:13,z0:9,x1:29,z1:17},{x0:29,z0:9,x1:36,z1:13}];
export const stair={x0:28.2,x1:32.25,z0:4.5,z1:9,turnX:30.9,turnZ:7.65};
export const rooms:Room[]=[
 {...rect(38,287,285,527),id:'social',name:'Estar social',floor:1,photo:'social.jpg'},
 {...rect(285,287,393,371),id:'entrada',name:'Entrada principal',floor:1,photo:'frente.jpg'},
 {...rect(393,287,514,371),id:'apoio',name:'Apoio / cristaleira',floor:1,photo:'cristaleira.jpg'},
 {...rect(514,287,690,371),id:'cozinha',name:'Cozinha principal',floor:1,photo:'cozinha.jpg'},
 {...rect(285,371,570,527),id:'intimo',name:'Estar íntimo',floor:1,photo:'intimo.jpg'},
 {...rect(285,527,570,597),id:'varanda',name:'Varanda',floor:1,photo:'vista.jpg'},
 {...rect(690,287,802,338),id:'suite4',name:'Suíte 4',floor:1,photo:'suite.jpg'},
 {...rect(802,287,944,338),id:'suite5',name:'Suíte 5',floor:1,photo:'suite.jpg'},
 {...rect(944,287,1070,338),id:'master',name:'Suíte master',floor:1,photo:'master.jpg'},
 {...rect(646,363,790,455),id:'suite1',name:'Suíte 1',floor:1,photo:'suite.jpg'},
 {...rect(790,363,930,455),id:'suite2',name:'Suíte 2',floor:1,photo:'suite.jpg'},
 {...rect(930,363,1070,455),id:'suite3',name:'Suíte 3',floor:1,photo:'suite.jpg'},
 {x0:13,z0:5,x1:28.2,z1:17,id:'gourmet',name:'Estar / espaço gourmet',floor:0,photo:'gourmet.jpg'},
 {x0:13,z0:0,x1:22,z1:5,id:'academia',name:'Academia',floor:0,photo:'academia.jpg'},
 {x0:22,z0:0,x1:29,z1:4.3,id:'atelier',name:'Atelier / apoio',floor:0,photo:'jardim.jpg'},
 {x0:33,z0:4.3,x1:37,z1:9,id:'banhos',name:'Banheiros / apoio',floor:0,photo:'lavabo.jpg'},
 {x0:37,z0:4.3,x1:42,z1:9,id:'lavanderia',name:'Lavanderia / serviço',floor:0,photo:'cozinha.jpg'},
 {x0:42,z0:0,x1:55,z1:9,id:'garagem',name:'Garagem',floor:0,photo:'garagem.jpg'},
 {x0:29,z0:9,x1:36,z1:13,id:'jardim',name:'Acesso ao jardim',floor:0,photo:'jardim.jpg'}
];
export type Wall={a:[number,number],b:[number,number],floor:number,glass?:boolean};
export const walls:Wall[]=[];
function line(a:number,b:number,c:number,d:number,floor=1,glass=false){walls.push({a:[a,b],b:[c,d],floor,glass});}
function trace(a:number,b:number,c:number,d:number,glass=false){line((a-38)*S,(b-287)*S,(c-38)*S,(d-287)*S,1,glass);}
// Full height walls, with real doorway gaps (no invisible teleport links).
trace(38,287,372,287);trace(395,287,1070,287);trace(1070,287,1070,455);trace(646,455,1070,455,true);
trace(38,287,38,527,true);trace(38,527,285,527,true);trace(285,527,380,527,true);trace(410,527,570,527,true);
trace(285,527,285,597,true);trace(285,597,570,597,true);trace(570,527,570,597,true);
trace(570,455,570,527,true);trace(285,287,285,380);trace(285,410,285,527);
trace(393,287,393,347);trace(393,367,393,371);trace(514,287,514,347);trace(514,367,514,371);
trace(285,371,320,371);trace(345,371,445,371);trace(472,371,615,371);
trace(690,287,690,318);trace(690,338,690,350);
// Six bedroom door openings along the shared hall.
for(const [a,b,door]of [[690,802,708],[802,944,850],[944,1070,989]]){trace(a,338,door,338);trace(door+23,338,b,338);if(b<1070)trace(b,287,b,338);}
for(const [a,b,door]of [[646,790,703],[790,930,829],[930,1070,981]]){trace(a,363,door,363);trace(door+23,363,b,363);if(b<1070)trace(b,363,b,455);}
trace(646,363,646,455);
// Lower circulation follows the stair landing; openings connect every modeled space.
line(13,0,55,0,0);line(55,0,55,9,0);line(13,0,13,17,0,true);line(13,17,29,17,0,true);line(29,13,29,17,0,true);
line(29,13,36,13,0,true);line(36,9,36,13,0,true);line(36,9,55,9,0);
line(13,5,16,5,0);line(17.3,5,22,5,0);line(22,0,22,2.5,0);line(22,3.7,22,4.3,0);
line(22,4.3,24,4.3,0);line(25.3,4.3,29,4.3,0);line(29,0,29,4.3,0);
line(33,4.3,34.3,4.3,0);line(35.5,4.3,38.4,4.3,0);line(39.7,4.3,42,4.3,0);
line(33,4.3,33,9,0);line(37,4.3,37,9,0);line(42,0,42,2,0);line(42,3.5,42,9,0);
export const barriers:Barrier[]=walls.map(w=>({x0:Math.min(w.a[0],w.b[0])-.08,x1:Math.max(w.a[0],w.b[0])+.08,z0:Math.min(w.a[1],w.b[1])-.08,z1:Math.max(w.a[1],w.b[1])+.08,y0:w.floor*LEVEL,y1:w.floor*LEVEL+2.8}));
const within=(x:number,z:number,r:Rect,pad=0)=>x>=r.x0+pad&&x<=r.x1-pad&&z>=r.z0+pad&&z<=r.z1-pad;
export const inStair=(x:number,z:number)=>within(x,z,stair);
export function stairHeight(x:number,z:number):number|null{
 if(!inStair(x,z))return null;
 if(x>=stair.turnX&&z<=stair.turnZ)return LEVEL*(1-.5*(z-stair.z0)/(stair.turnZ-stair.z0));
 if(x>=stair.turnX&&z>=stair.turnZ)return LEVEL/2;
 if(z>=stair.turnZ)return LEVEL/2*(x-stair.x0)/(stair.turnX-stair.x0);
 return null;
}
export type Position={x:number,y:number,z:number};
export const start:Position={x:17.6,y:LEVEL,z:1.6};
export function support(x:number,z:number,previousY:number):number|null{
 const candidates:number[]=[];const h=stairHeight(x,z);
 if(h!==null)candidates.push(h);
 if(upper.some(r=>within(x,z,r))&&!inStair(x,z))candidates.push(LEVEL);
 if(lower.some(r=>within(x,z,r))&&!inStair(x,z))candidates.push(0);
 const reachable=candidates.filter(v=>Math.abs(v-previousY)<=.25);
 return reachable.length?reachable.reduce((a,b)=>Math.abs(a-previousY)<Math.abs(b-previousY)?a:b):null;
}
function valid(x:number,z:number,y:number):boolean{
 return !barriers.some(b=>y+1.5>b.y0&&y+.1<b.y1&&x>b.x0-RADIUS&&x<b.x1+RADIUS&&z>b.z0-RADIUS&&z<b.z1+RADIUS);
}
export function walk(p:Position,dx:number,dz:number):Position{
 if(![p.x,p.y,p.z,dx,dz].every(Number.isFinite)||Math.hypot(dx,dz)>3)return {...p};
 let next={...p};const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));
 for(let i=0;i<n;i++)for(const axis of ['x','z']as const){const x=next.x+(axis==='x'?dx/n:0),z=next.z+(axis==='z'?dz/n:0),y=support(x,z,next.y);if(y!==null&&valid(x,z,y))next={x,y,z};}
 return next;
}
export function roomAt(p:Position){return rooms.find(r=>r.floor===(p.y>LEVEL*.7?1:0)&&within(p.x,p.z,r));}
