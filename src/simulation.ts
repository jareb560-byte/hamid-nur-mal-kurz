export type StationId = 'ladder' | 'power' | 'phone' | 'cats' | 'mainframe' | 'rumor';
export type Difficulty = 'cozy' | 'normal' | 'legend';
export type Phase = 'menu' | 'playing' | 'paused' | 'minigame' | 'won' | 'lost';
export type Task = { id: number; station: StationId; remaining: number; total: number; urgent: boolean };
export type Station = { id: StationId; name: string; subtitle: string; icon: string; x: number; z: number; color: string; quip: string };
export const STATIONS: Station[] = [
  { id:'ladder',name:'Balkon-Akrobatik',subtitle:'Die Leiter hat andere Pläne.',icon:'ladder',x:7.1,z:-1.8,color:'#ffbc66',quip:'„Ich komm da locker dran.“' },
  { id:'power',name:'Strom & Selbstvertrauen',subtitle:'Erst denken. Dann schalten.',icon:'zap',x:0.4,z:-4.4,color:'#ffe27a',quip:'„Ich bin ITler. Das ist fast dasselbe.“' },
  { id:'phone',name:'Die Warteschleife',subtitle:'Einatmen. Nicht eskalieren.',icon:'phone',x:-6,z:2.3,color:'#ff76aa',quip:'„ICH BIN GANZ ENTSPANNT!“' },
  { id:'cats',name:'Noch ein Häppchen',subtitle:'Die Näpfe sind keine Buffets.',icon:'cat',x:3.3,z:-3.6,color:'#ffad71',quip:'„Die haben doch noch Hunger.“' },
  { id:'mainframe',name:'Mainframe-Magie',subtitle:'REXX. z/OS. Absolute Ruhe.',icon:'terminal',x:-5.8,z:-3.4,color:'#65e5c7',quip:'„Seit 1987 läuft das bei mir.“' },
  { id:'rumor',name:'Gut informierte Kreise',subtitle:'Quelle: Hamid, vermutlich.',icon:'message',x:-0.8,z:3.5,color:'#bb9dff',quip:'„Das weiß ich aus sicherer Quelle.“' },
];
export const SETTINGS = {
  cozy:{ label:'Sonntagsmodus', duration:300, deadline:65, spawn:24, chaos:0.06, penalty:10, target:9 },
  normal:{ label:'Nur mal kurz', duration:250, deadline:49, spawn:20, chaos:0.12, penalty:16, target:12 },
  legend:{ label:'Papa weiß es besser', duration:230, deadline:39, spawn:15, chaos:0.19, penalty:21, target:15 },
} as const;
export type GameState = {
  phase: Phase; previousPhase:'playing'|'minigame'; difficulty: Difficulty;
  time:number; elapsed:number; chaos:number; score:number; combo:number; bestCombo:number; completed:number; mistakes:number;
  target:number; tasks:Task[]; nextSpawn:number; nextId:number; random:number; stationUses:Partial<Record<StationId,number>>;
  player:{x:number;z:number;angle:number;moving:boolean;dash:number;dashCooldown:number};
  activeTask:number|null; finalJob:boolean; finalDone:boolean; notices:{text:string;time:number}[];
};
export const OBSTACLES = [
  {x:-6,z:-5,w:4.4,d:1.5},{x:3.7,z:-5.2,w:3.5,d:1.2},
  {x:-6,z:4.5,w:4.7,d:1.6},{x:-3.2,z:2.5,w:1.9,d:1.3},
  {x:1.0,z:5.0,w:3,d:1.2},{x:7.7,z:-4.5,w:1.5,d:1.1},
];
export function createGame(difficulty:Difficulty='normal', seed=Date.now()):GameState {
  const s:GameState={phase:'playing',previousPhase:'playing',difficulty,time:SETTINGS[difficulty].duration,elapsed:0,chaos:12,score:0,combo:0,bestCombo:0,completed:0,mistakes:0,target:SETTINGS[difficulty].target,tasks:[],nextSpawn:12,nextId:1,random:seed>>>0,stationUses:{},player:{x:-1.5,z:0,angle:0,moving:false,dash:0,dashCooldown:0},activeTask:null,finalJob:false,finalDone:false,notices:[]};
  spawnTask(s,'cats'); spawnTask(s,'phone');
  return s;
}
export function random(s:GameState){s.random=(Math.imul(s.random,1664525)+1013904223)>>>0;return s.random/4294967296;}
export function spawnTask(s:GameState,requested?:StationId){
  const choices=STATIONS.filter(st=>!s.tasks.some(t=>t.station===st.id));
  if(!choices.length || s.tasks.length>=4 || s.finalJob)return;
  const minUses=Math.min(...choices.map(st=>s.stationUses[st.id]??0));
  const leastUsed=choices.filter(st=>(s.stationUses[st.id]??0)===minUses);
  const station=requested??leastUsed[Math.floor(random(s)*leastUsed.length)].id;
  if(s.tasks.some(t=>t.station===station))return;
  s.stationUses[station]=(s.stationUses[station]??0)+1;
  const total=SETTINGS[s.difficulty].deadline;
  s.tasks.push({id:s.nextId++,station,remaining:total,total,urgent:false});
}
export function notice(s:GameState,text:string){s.notices.push({text,time:3.8});if(s.notices.length>3)s.notices.shift();}
export function nearestTask(s:GameState){
  let best:Task|undefined, distance=Infinity;
  for(const task of s.tasks){const st=STATIONS.find(v=>v.id===task.station)!;const d=Math.hypot(st.x-s.player.x,st.z-s.player.z);if(d<distance){best=task;distance=d;}}
  return {task:best,distance};
}
export function startTask(s:GameState){
  if(s.phase!=='playing')return false;
  const {task,distance}=nearestTask(s);if(!task||distance>1.65)return false;
  s.activeTask=task.id;s.phase='minigame';return true;
}
export function cancelTask(s:GameState){if(s.phase!=='minigame')return;s.phase='playing';s.activeTask=null;}
export function finishTask(s:GameState,quality:number){
  if(s.phase!=='minigame'||s.activeTask===null||!Number.isFinite(quality)||quality<=0)return false;
  quality=Math.max(0,Math.min(1,quality));
  const task=s.tasks.find(t=>t.id===s.activeTask);if(!task){cancelTask(s);return false;}
  const clean=quality>=0.65;
  s.combo=clean?s.combo+1:0;s.bestCombo=Math.max(s.bestCombo,s.combo);
  const points=Math.round((150+Math.max(0,task.remaining)*2)*Math.max(0.3,Math.min(1,quality))*(1+Math.min(s.combo,8)*0.15));
  s.score+=points;if(!s.finalJob)s.completed++;s.chaos=Math.max(0,s.chaos-(clean?12:5));
  s.tasks=s.tasks.filter(t=>t.id!==s.activeTask);s.activeTask=null;s.phase='playing';
  notice(s,`${clean?'Souverän!':'Erledigt!'} +${points}${s.combo>1?` · ${s.combo}er-Serie`:''}`);
  if(s.finalJob){s.finalDone=true;s.phase='won';s.score+=Math.round(s.time*8+(100-s.chaos)*10);return true;}
  if(s.completed>=s.target){
    s.tasks=[];s.finalJob=true;s.time=Math.max(s.time,65);
    s.tasks.push({id:s.nextId++,station:'mainframe',remaining:s.time,total:s.time,urgent:true});
    notice(s,'FINALE: Der Familienserver braucht dich!');
  }else if(s.tasks.length===0){spawnTask(s);s.nextSpawn=SETTINGS[s.difficulty].spawn;}
  return true;
}
export function failAttempt(s:GameState){
  if(s.phase!=='minigame')return;
  s.mistakes++;s.combo=0;s.chaos=Math.min(100,s.chaos+5);
  if(s.chaos>=100){s.phase='lost';s.activeTask=null;}
}
export function pauseGame(s:GameState){if(s.phase==='playing'||s.phase==='minigame'){s.previousPhase=s.phase;s.phase='paused';}}
export function resumeGame(s:GameState){if(s.phase==='paused')s.phase=s.previousPhase;}
function canStand(x:number,z:number){
  if(x < -8.25 || x>8.75 || z < -5.5 || z>5.5)return false;
  for(const b of OBSTACLES){if(Math.abs(x-b.x)<b.w/2+0.3&&Math.abs(z-b.z)<b.d/2+0.3)return false;}
  return true;
}
export function movePlayer(s:GameState,dx:number,dz:number,dt:number,dash=false){
  if(s.phase!=='playing')return;
  const p=s.player;const len=Math.hypot(dx,dz);p.moving=len>0.08;
  if(!p.moving)return;
  dx/=Math.max(1,len);dz/=Math.max(1,len);
  if(dash&&p.dashCooldown<=0){p.dash=0.19;p.dashCooldown=2.7;}
  const speed=p.dash>0?10.5:4.25;
  // Small substeps prevent dashes tunnelling through the furniture.
  const parts=Math.max(1,Math.ceil(speed*dt/0.15));
  for(let i=0;i<parts;i++){const x=p.x+dx*speed*dt/parts,z=p.z+dz*speed*dt/parts;if(canStand(x,p.z))p.x=x;if(canStand(p.x,z))p.z=z;}
  p.angle=Math.atan2(dx,dz);
}
export function tick(s:GameState,dt:number){
  if(s.phase!=='playing'&&s.phase!=='minigame')return;
  dt=Math.max(0,Math.min(dt,0.1));
  const cfg=SETTINGS[s.difficulty];s.time=Math.max(0,s.time-dt);s.elapsed+=dt;
  s.player.dash=Math.max(0,s.player.dash-dt);s.player.dashCooldown=Math.max(0,s.player.dashCooldown-dt);
  s.notices.forEach(n=>n.time-=dt);s.notices=s.notices.filter(n=>n.time>0);
  const rush=1+Math.min(0.75,s.completed/s.target*0.6);
  s.chaos=Math.min(100,s.chaos+dt*cfg.chaos*rush);
  // The active task's deadline is protected while solving, but the world clock continues.
  for(const task of s.tasks){if(task.id!==s.activeTask)task.remaining-=dt;task.urgent=task.remaining<15;}
  for(const task of s.tasks.filter(t=>t.remaining<=0)){
    s.chaos=Math.min(100,s.chaos+cfg.penalty);s.combo=0;s.mistakes++;
    notice(s,`${STATIONS.find(st=>st.id===task.station)!.name}: Das wurde Hamid zu langsam.`);
  }
  s.tasks=s.tasks.filter(t=>t.remaining>0);
  if(!s.finalJob){s.nextSpawn-=dt;if(s.nextSpawn<=0){spawnTask(s);s.nextSpawn=cfg.spawn/rush;}}
  if(s.time<=0||s.chaos>=100){s.phase='lost';s.activeTask=null;}
}
export function rank(s:GameState){if(s.phase!=='won')return 'Hausverbot auf Bewährung';if(s.mistakes===0)return 'Mainframe-Maestro';if(s.chaos<35)return 'Legende in Hausschuhen';return 'Gefahr erkannt. Papa gebannt.';}
