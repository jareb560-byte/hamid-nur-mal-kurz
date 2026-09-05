export type GraphicsProfile = {
  name:'desktop'|'mobile'|'safe'; lightweight:boolean; shadows:boolean;
  maxPixelRatio:number; pixelBudget:number; frameInterval:number;
};

export function graphicsProfile(touch:boolean,safe=false):GraphicsProfile {
  if(safe)return {name:'safe',lightweight:true,shadows:false,maxPixelRatio:1,pixelBudget:360_000,frameInterval:1000/30};
  if(touch)return {name:'mobile',lightweight:true,shadows:false,maxPixelRatio:1,pixelBudget:750_000,frameInterval:1000/30};
  return {name:'desktop',lightweight:false,shadows:true,maxPixelRatio:2,pixelBudget:2_000_000,frameInterval:1000/60};
}

export function renderPixelRatio(width:number,height:number,deviceRatio:number,profile:GraphicsProfile){
  const area=Math.max(1,Number.isFinite(width*height)?width*height:1);
  const ratio=Number.isFinite(deviceRatio)&&deviceRatio>0?deviceRatio:1;
  return Math.min(ratio,profile.maxPixelRatio,Math.sqrt(profile.pixelBudget/area));
}
