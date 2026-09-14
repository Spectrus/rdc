import grid from './collision-map.json';
import { rooms, roomAt, perimeter, type Room } from './rooms';

const svgNS='http://www.w3.org/2000/svg';
export const mapPoint=(x:number,z:number):[number,number]=>[(x+10)*10,(3-z)*10];
export const headingAngle=(yaw:number)=>yaw+180;
export function setupTour() {
 const panel=document.querySelector<HTMLElement>('#tour-panel')!;
 const toggle=document.querySelector<HTMLButtonElement>('#map-toggle')!;
 const map=document.querySelector<SVGSVGElement>('#floor-map')!;
 const roomLabel=document.querySelector<HTMLElement>('#current-room')!;
 const info=document.querySelector<HTMLElement>('#room-info')!;
 const caption=document.querySelector<HTMLElement>('#position-caption')!;
 const choice=document.querySelector<HTMLSelectElement>('#room-choice')!;
 let current=rooms[0];
 const openPanel=(open:boolean)=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
 toggle.addEventListener('click',()=>openPanel(panel.hidden));
 document.querySelector('#map-close')!.addEventListener('click',()=>{openPanel(false);toggle.focus();});
 const add=(tag:string,attrs:Record<string,string>,text?:string)=>{
  const el=document.createElementNS(svgNS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text)el.textContent=text;map.append(el);return el;
 };
 const outline=perimeter.map(([x,z])=>mapPoint(x,z).join(',')).join(' ');
 add('polygon',{points:outline,fill:'#152b28',stroke:'#75998b','stroke-width':'1'});
 let floor='';
 grid.rows.forEach((spans,row)=>{for(let i=0;i<spans.length;i+=2){
  const x=grid.origin[0]+spans[i]*grid.resolution,z=grid.origin[1]+(row+1)*grid.resolution;
  const [mx,my]=mapPoint(x,z);floor+=`M${mx.toFixed(2)} ${my.toFixed(2)}h${((spans[i+1]-spans[i])*grid.resolution*10).toFixed(2)}v.81h-${((spans[i+1]-spans[i])*grid.resolution*10).toFixed(2)}z`;
 }});
 add('path',{d:floor,fill:'#476b5c','aria-hidden':'true'});
 const showInfo=(room:Room)=>{
  choice.value=room.id;info.hidden=false;
  document.querySelector('#room-title')!.textContent=room.name;
  document.querySelector('#room-description')!.textContent=room.note;
  map.querySelectorAll('[data-room]').forEach(el=>el.classList.toggle('selected',el.getAttribute('data-room')===room.id));
 };
 for(const [index,room]of rooms.entries()){
  const option=document.createElement('option');option.value=room.id;option.textContent=`${String(index+1).padStart(2,'0')} · ${room.name}`;choice.append(option);
  const [x,y]=mapPoint(...room.point);
  const group=add('g',{'data-room':room.id,role:'button',tabindex:'0','aria-label':`About ${room.name}`,transform:`translate(${x},${y})`,class:'map-room'});
  const circle=document.createElementNS(svgNS,'circle');circle.setAttribute('r','6');group.append(circle);
  const text=document.createElementNS(svgNS,'text');text.setAttribute('text-anchor','middle');text.setAttribute('dy','2.6');text.textContent=String(index+1);group.append(text);
  group.addEventListener('click',()=>showInfo(room));group.addEventListener('keydown',e=>{const event=e as KeyboardEvent;if(event.key==='Enter'||event.key===' '){event.preventDefault();showInfo(room);}});
 }
 const marker=add('g',{id:'position-marker','aria-label':'Your position',transform:'translate(97.4,9.2)'});
 marker.innerHTML='<path d="M0 0L-8 -16L8 -16Z" fill="#e1be79" opacity=".35"/><circle r="3.2" fill="#f5d38c" stroke="#111e1a" stroke-width="1.2"/><path d="M0 -6L-2 -2H2Z" fill="#fff1ce"/>';
 choice.addEventListener('change',()=>showInfo(rooms.find(r=>r.id===choice.value)!));
 document.querySelector('#room-about')!.addEventListener('click',()=>{openPanel(true);showInfo(current);});
 document.querySelector('#room-info-close')!.addEventListener('click',()=>{info.hidden=true;map.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){openPanel(false);toggle.focus();}});
 openPanel(matchMedia('(min-width: 1000px)').matches);
 return {update(x:number,z:number,yaw:number){
  const next=roomAt(x,z);
  if(next.id!==current.id){current=next;roomLabel.textContent=current.name;caption.textContent=`You are in ${current.name.toLowerCase()}`;}
  const [mx,my]=mapPoint(x,z);marker.setAttribute('transform',`translate(${mx.toFixed(2)},${my.toFixed(2)}) rotate(${headingAngle(yaw)})`);

 }};
}
