export type Room = { id: string; name: string; short: string; bounds: [number, number, number, number]; point: [number, number]; note: string };
// Approximate room zones traced against Home Scan; names follow the creator's annotations.
export const rooms: Room[] = [
 {id:'entrance',name:'Entrance & hallway',short:'Entry',bounds:[-1.2,-8.8,.7,2.35],point:[-.26,1.4],note:'The walkthrough begins at the entrance camera placed by the scan creator. Follow the hallway to explore the connecting rooms.'},
 {id:'front-living',name:'Front living room',short:'Living',bounds:[.7,-3.5,9.8,1.4],point:[5.7,-2],note:'The front living area connects to the entrance and the dining space. Furnishings and finishes are part of the photographic capture.'},
 {id:'kitchen',name:'Kitchen',short:'Kitchen',bounds:[5.8,-8.6,9.8,-3.5],point:[7.6,-6.3],note:'The kitchen sits beside the dining area. Cabinets, appliances and counters are captured imagery; they cannot be opened or moved.'},
 {id:'dining',name:'Dining room',short:'Dining',bounds:[.7,-8.8,5.8,-3.5],point:[3,-5],note:'The round dining table is visible in this part of the scan. The movement guard keeps the walking route around the table and chairs.'},
 {id:'rear-living',name:'Rear living room',short:'Lounge',bounds:[-.1,-13.7,6.4,-8.8],point:[3.5,-11.5],note:'A second living space opens beyond the dining area. Look around from several positions to inspect the captured furniture and finishes.'},
 {id:'suite-bath',name:'Main bathroom',short:'Bath',bounds:[6.4,-13.7,9.9,-9.5],point:[8,-12.2],note:'The main bathroom is recorded beside the rear living area and bedroom wing. The scan is a visual reference, not a survey or a condition report.'},
 {id:'main-bedroom',name:'Main bedroom',short:'Bedroom',bounds:[11.7,-14.5,16.7,-8.5],point:[14,-10],note:'The main bedroom lies at the end of the right-hand wing. The room geometry and furnishings come from the original Home Scan.'},
 {id:'bathroom',name:'Hall bathroom',short:'Bath',bounds:[-3.5,-8.8,-1.2,-3.8],point:[-2.3,-6.4],note:'A bathroom opens from the central hall. Tight spaces may be conservatively limited by the scan-derived movement guard.'},
 {id:'office',name:'Office',short:'Office',bounds:[-4.9,-2.9,-1.2,1.5],point:[-3,-.6],note:'The creator labels this room as an office. Explore the captured layout from the connecting hallway.'},
 {id:'bedroom-a',name:'Bedroom A',short:'Bedroom A',bounds:[-9.2,-2.9,-4.9,1.5],point:[-6.6,-2.1],note:'One of the two bedrooms on the left side of the home. The neutral room label is used here for the property tour.'},
 {id:'bedroom-b',name:'Bedroom B',short:'Bedroom B',bounds:[-9.2,-8.8,-3.5,-3.8],point:[-6,-7.9],note:'The second bedroom on the left wing, connected through the cross-hall. Captured objects remain fixed in place.'},
 {id:'hall',name:'Connecting hallway',short:'Hall',bounds:[-10,-15,18,3],point:[10.7,-9.1],note:'This passage connects the rooms. The floor plan is an approximate orientation guide; it does not provide verified measurements.'}
];
export const perimeter: [number, number][] = [[-9.2,1.55],[-1.25,1.55],[-1.25,2.35],[.45,2.35],[.65,1.45],[9.7,.85],[9.85,-8.45],[16.5,-8.65],[16.7,-14.45],[11.7,-14.45],[11.65,-9.5],[9.65,-9.5],[9.65,-13.7],[.1,-13.7],[-.5,-9],[-9.2,-8.85]];
export function roomAt(x: number, z: number): Room {
 return rooms.find(r => x >= r.bounds[0] && x <= r.bounds[2] && z >= r.bounds[1] && z <= r.bounds[3]) || rooms[rooms.length-1];
}
export function inFootprint(x: number,z: number): boolean {
 let yes=false;
 for(let i=0,j=perimeter.length-1;i<perimeter.length;j=i++){
  const a=perimeter[i],b=perimeter[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }
 return yes;
}
