export type QualityMode = 'auto' | 'high' | 'ultra';
// Adapt geometry detail, never stretch a reduced-resolution framebuffer.
export class DetailController {
 mode: QualityMode;
 motionBudget: number;
 private sampleTime=0;
 private sampleFrames=0;
 private idleTime=0;
 private settleTime=0;
 private budget=650_000;
 constructor(public mobile:boolean, mode: QualityMode='auto') {this.mode=mode;this.motionBudget=mobile?1_500_000:2_500_000;}
 update(dt:number,moving:boolean,ready:boolean):number {
  if(!ready)return this.budget;
  this.settleTime+=dt;
  this.idleTime=moving?0:this.idleTime+dt;
  if(moving&&dt>0&&dt<.25){this.sampleTime+=dt;this.sampleFrames++;}
  if(this.sampleTime>=4){
   const fps=this.sampleFrames/this.sampleTime;
   if(fps<32)this.motionBudget=Math.max(1_000_000,this.motionBudget*.8);
   else if(fps>52)this.motionBudget=Math.min(this.mobile?2_500_000:4_000_000,this.motionBudget*1.15);
   this.sampleTime=0;this.sampleFrames=0;
  }
  const fixed=this.mode==='ultra'?12_000_000:8_000_000;
  const desired=this.mode==='auto'?(this.idleTime>1.25?Math.max(this.motionBudget,this.mobile?3_000_000:7_000_000):this.motionBudget):fixed;
  // Coalescing prevents continuously rebuilding the LOD work buffer.
  if(this.settleTime>=1.5&&Math.abs(desired-this.budget)>200_000){this.budget=Math.round(desired/100_000)*100_000;this.settleTime=0;}
  return this.budget;
 }
}
