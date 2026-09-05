export type StationId = 'ladder' | 'power' | 'phone' | 'cats' | 'mainframe' | 'rumor';
export type Difficulty = 'cozy' | 'normal' | 'legend';
export type Phase = 'menu' | 'playing' | 'paused' | 'minigame' | 'upgrade' | 'won' | 'lost';
export type Mode = 'rush' | 'classic';
export type PerkId = 'slippers' | 'tea' | 'expert' | 'shield' | 'magnet';
export const PERKS = [
  {id:'slippers' as const,icon:'⚡',name:'Turbo-Hausschuhe',description:'25 % schneller laufen. Sprint lädt doppelt so schnell.'},
  {id:'tea' as const,icon:'☕',name:'Ein richtig guter Tee',description:'Sofort +25 Sekunden und −20 Chaos. Durchatmen, Papa.'},
  {id:'expert' as const,icon:'⌘',name:'REXX-Reflexe',description:'Jede gelöste Aufgabe lädt deine Spezialaktion stärker auf.'},
  {id:'shield' as const,icon:'♥',name:'„War schon vorher so.“',description:'Die nächsten zwei Fehler kosten kein Chaos und retten deine Serie.'},
  {id:'magnet' as const,icon:'✦',name:'Vitamin B(alkon)',description:'Boni aus doppelter Entfernung einsammeln. Jeder Bonus gibt doppelte Punkte.'},
];
export const EVENTS = [
  {id:'hotline',title:'Die Hotline ruft zurück!',description:'Telefon-Aufträge geben doppelte Punkte.',color:'#ff76aa'},
  {id:'zoomies',title:'Die Katzen haben Zoomies.',description:'Doppeltes Chaos. Katzen-Aufträge geben doppelte Punkte!',color:'#ffad71'},
  {id:'turbo',title:'Papa hat Rückenwind!',description:'35 % schneller laufen. Jetzt eine lange Strecke!',color:'#65e5c7'},
  {id:'jackpot',title:'Alles läuft über Hamid.',description:'Alle Aufträge geben doppelte Punkte!',color:'#ffe27a'},
] as const;
export type Pickup={id:number;x:number;z:number;kind:'tea'|'bolt';remaining:number};
export type RushState={wave:number;power:number;powerTime:number;perks:PerkId[];offers:PerkId[];shields:number;event:number;eventTime:number;nextEvent:number;pickups:Pickup[];nextPickup:number;collected:number;risky:boolean;riskWins:number;seen:StationId[];bossStep:number;lastPoints:number;celebration:number;challengeSeed:number};
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
  mode:Mode; rush:RushState; route:{x:number;z:number}[]; routeTask:number|null;
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
export function createGame(difficulty:Difficulty='normal', seed=Date.now(), mode:Mode='classic'):GameState {
  const s:GameState={mode,route:[],routeTask:null,rush:{wave:1,power:40,powerTime:0,perks:[],offers:[],shields:0,event:-1,eventTime:0,nextEvent:12,pickups:[],nextPickup:15,collected:0,risky:false,riskWins:0,seen:[],bossStep:0,lastPoints:0,celebration:0,challengeSeed:seed>>>0},phase:'playing',previousPhase:'playing',difficulty,time:mode==='rush'?(difficulty==='cozy'?200:difficulty==='normal'?155:125):SETTINGS[difficulty].duration,elapsed:0,chaos:12,score:0,combo:0,bestCombo:0,completed:0,mistakes:0,target:mode==='rush'?9:SETTINGS[difficulty].target,tasks:[],nextSpawn:12,nextId:1,random:seed>>>0,stationUses:{},player:{x:-1.5,z:0,angle:0,moving:false,dash:0,dashCooldown:0},activeTask:null,finalJob:false,finalDone:false,notices:[]};
  spawnTask(s,'cats'); if(mode==='rush'){spawnTask(s);spawnPickups(s);notice(s,'Papa, dein Auftritt! Aufgabe antippen und los.');}else spawnTask(s,'phone');
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
  const total=s.mode==='rush'?SETTINGS[s.difficulty].deadline*.85:SETTINGS[s.difficulty].deadline;
  s.tasks.push({id:s.nextId++,station,remaining:total,total,urgent:false});
}
export function notice(s:GameState,text:string){s.notices.push({text,time:3.8});if(s.notices.length>3)s.notices.shift();}
export function nearestTask(s:GameState){
  let best:Task|undefined, distance=Infinity;
  for(const task of s.tasks){const st=STATIONS.find(v=>v.id===task.station)!;const d=Math.hypot(st.x-s.player.x,st.z-s.player.z);if(d<distance){best=task;distance=d;}}
  return {task:best,distance};
}
export function startTask(s:GameState,requested?:number){
  if(s.phase!=='playing')return false;
  const task=requested===undefined?nearestTask(s).task:s.tasks.find(t=>t.id===requested);if(!task)return false;
  const station=STATIONS.find(st=>st.id===task.station)!;if(Math.hypot(s.player.x-station.x,s.player.z-station.z)>1.65)return false;
  s.activeTask=task.id;s.phase='minigame';s.route=[];s.routeTask=null;s.player.moving=false;s.rush.risky=false;return true;
}
export function cancelTask(s:GameState){if(s.phase!=='minigame')return;s.phase='playing';s.activeTask=null;s.rush.risky=false;}
export function finishTask(s:GameState,quality:number){
  if(s.phase!=='minigame'||s.activeTask===null||!Number.isFinite(quality)||quality<=0)return false;
  quality=Math.max(0,Math.min(1,quality));
  const task=s.tasks.find(t=>t.id===s.activeTask);if(!task){cancelTask(s);return false;}
  const clean=quality>=0.65;
  s.combo=clean?s.combo+1:0;s.bestCombo=Math.max(s.bestCombo,s.combo);
  const points=Math.round((150+Math.max(0,task.remaining)*2)*Math.max(0.3,Math.min(1,quality))*scoreMultiplier(s,task.station));
  s.score+=points;if(!s.finalJob)s.completed++;s.chaos=Math.max(0,s.chaos-(clean?12:5));
  s.tasks=s.tasks.filter(t=>t.id!==s.activeTask);s.activeTask=null;s.phase='playing';
  notice(s,`${clean?'Souverän!':'Erledigt!'} +${points}${s.combo>1?` · ${s.combo}er-Serie`:''}`);
  if(s.mode==='rush'){
    const r=s.rush;r.lastPoints=points;r.celebration=2.1;r.power=Math.min(100,r.power+(clean?26:12)+(r.perks.includes('expert')?16:0));
    if(r.risky&&clean)r.riskWins++;r.risky=false;if(!r.seen.includes(task.station))r.seen.push(task.station);
    if(s.finalJob&&r.bossStep<2){r.bossStep++;const station:StationId=r.bossStep===1?'power':'mainframe';s.tasks=[{id:s.nextId++,station,remaining:s.time,total:s.time,urgent:true}];notice(s,r.bossStep===1?'BOSS 2/3: Die Sicherung macht Feierabend.':'BOSS 3/3: Jetzt zeigt Papa, was REXX kann.');return true;}
    if(!s.finalJob&&s.completed<9&&s.completed%3===0){
      s.phase='upgrade';s.route=[];s.routeTask=null;r.offers=PERKS.filter(p=>!r.perks.includes(p.id)||p.id==='tea'||p.id==='shield').map(p=>p.id);
      for(let i=r.offers.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[r.offers[i],r.offers[j]]=[r.offers[j],r.offers[i]];}r.offers=r.offers.slice(0,3);return true;
    }
  }
  if(s.finalJob){s.finalDone=true;s.phase='won';s.score+=Math.round(s.time*8+(100-s.chaos)*10);return true;}
  if(s.completed>=s.target){
    s.tasks=[];s.finalJob=true;s.time=Math.max(s.time,s.mode==='rush'?75:65);
    s.tasks.push({id:s.nextId++,station:s.mode==='rush'?'phone':'mainframe',remaining:s.time,total:s.time,urgent:true});
    if(s.mode==='rush'){s.rush.power=100;s.rush.event=-1;s.rush.eventTime=0;}
    notice(s,s.mode==='rush'?'DREIFACH-BOSS: Hotline. Sicherung. Familienserver.':'FINALE: Der Familienserver braucht dich!');
  }else if(s.tasks.length===0||s.mode==='rush'&&s.tasks.length<2){spawnTask(s);s.nextSpawn=SETTINGS[s.difficulty].spawn;}
  return true;
}
export function failAttempt(s:GameState){
  if(s.phase!=='minigame')return;
  s.mistakes++;if(s.mode==='rush'&&s.rush.shields>0){s.rush.shields--;notice(s,'„War schon vorher so.“ Fehler abgefangen!');return;}s.combo=0;s.chaos=Math.min(100,s.chaos+(s.mode==='rush'&&s.rush.risky?10:5));
  if(s.chaos>=100){s.phase='lost';s.activeTask=null;}
}
export function pauseGame(s:GameState){if(s.phase==='playing'||s.phase==='minigame'){s.previousPhase=s.phase;s.phase='paused';}}
export function resumeGame(s:GameState){if(s.phase==='paused')s.phase=s.previousPhase;}
export function canStand(x:number,z:number){
  if(x < -8.25 || x>8.75 || z < -5.5 || z>5.5)return false;
  for(const b of OBSTACLES){if(Math.abs(x-b.x)<b.w/2+0.3&&Math.abs(z-b.z)<b.d/2+0.3)return false;}
  return true;
}
export function movePlayer(s:GameState,dx:number,dz:number,dt:number,dash=false){
  if(s.phase!=='playing')return;
  const p=s.player;const len=Math.hypot(dx,dz);p.moving=len>0.08;
  if(!p.moving)return;
  dx/=Math.max(1,len);dz/=Math.max(1,len);
  if(dash&&p.dashCooldown<=0){p.dash=0.19;p.dashCooldown=s.mode==='rush'&&s.rush.perks.includes('slippers')?1.35:2.7;}
  const speed=(p.dash>0?10.5:4.25)*(s.mode==='rush'?(s.rush.perks.includes('slippers')?1.25:1)*(s.rush.event===2?1.35:1):1);
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
  s.chaos=Math.min(100,s.chaos+dt*cfg.chaos*rush*(s.mode==='rush'&&s.rush.event===1?2:1));
  // The active task's deadline is protected while solving, but the world clock continues.
  for(const task of s.tasks){if(s.finalJob)task.remaining=s.time;else if(task.id!==s.activeTask&&!(s.mode==='rush'&&s.rush.powerTime>0))task.remaining-=dt;task.urgent=task.remaining<15;}
  for(const task of s.tasks.filter(t=>t.remaining<=0)){
    if(s.mode==='rush'&&s.rush.shields>0){s.rush.shields--;s.mistakes++;notice(s,'„War schon vorher so.“ Verspätung abgefangen!');continue;}
    s.chaos=Math.min(100,s.chaos+cfg.penalty);s.combo=0;s.mistakes++;
    notice(s,`${STATIONS.find(st=>st.id===task.station)!.name}: Das wurde Hamid zu langsam.`);
  }
  s.tasks=s.tasks.filter(t=>t.remaining>0);
  if(!s.finalJob){s.nextSpawn-=dt;if(s.nextSpawn<=0){if(s.mode!=='rush'||s.tasks.length<3)spawnTask(s);s.nextSpawn=cfg.spawn/rush;}}
  if(s.mode==='rush')tickRush(s,dt);
  if(s.time<=0||s.chaos>=100){s.phase='lost';s.activeTask=null;}
}
export function rank(s:GameState){if(s.phase!=='won')return 'Hausverbot auf Bewährung';if(s.mistakes===0)return 'Mainframe-Maestro';if(s.chaos<35)return 'Legende in Hausschuhen';return 'Gefahr erkannt. Papa gebannt.';}

export function scoreMultiplier(s:GameState,station?:StationId){
  let value=1+Math.min(s.combo,8)*.15;if(s.mode!=='rush')return value;
  const r=s.rush;if(r.risky)value*=2;if(r.powerTime>0)value*=1.5;
  if(r.event===3||r.event===0&&station==='phone'||r.event===1&&station==='cats')value*=2;
  return value;
}
export function choosePerk(s:GameState,id:PerkId){
  if(s.phase!=='upgrade'||!s.rush.offers.includes(id))return false;
  const r=s.rush;if(!r.perks.includes(id))r.perks.push(id);
  if(id==='tea'){s.time+=25;s.chaos=Math.max(0,s.chaos-20);}if(id==='shield')r.shields+=2;
  r.wave++;r.offers=[];s.time+=15;s.phase='playing';s.tasks.forEach(t=>{t.remaining=Math.max(t.remaining,25);t.total=Math.max(t.total,t.remaining);});
  while(s.tasks.length<2)spawnTask(s);spawnPickups(s);r.nextEvent=3;
  notice(s,`RUNDE ${r.wave}/3 · +15 Sekunden · ${PERKS.find(p=>p.id===id)!.name}`);return true;
}
export function activatePower(s:GameState){
  if(s.mode!=='rush'||s.phase!=='playing'&&s.phase!=='minigame'||s.rush.power<100||s.rush.powerTime>0)return false;
  s.rush.power=0;s.rush.powerTime=12;s.chaos=Math.max(0,s.chaos-12);notice(s,'ICH BIN VOM FACH! 12 Sekunden Fristen-Stopp + 50 % Punkte.');return true;
}
export function setRisk(s:GameState,value:boolean){if(s.mode==='rush'&&s.phase==='minigame')s.rush.risky=value;}
const PICKUP_SPOTS=[{x:-.5,z:-1},{x:1.4,z:1.9},{x:-4.2,z:-1.3},{x:5.5,z:.6},{x:4.1,z:2.7},{x:-1,z:-3.3},{x:-5.8,z:.2},{x:6.8,z:1.8}];
function spawnPickups(s:GameState){
  const slots=PICKUP_SPOTS.filter(p=>!s.rush.pickups.some(v=>v.x===p.x&&v.z===p.z));
  while(s.rush.pickups.length<3&&slots.length){const i=Math.floor(random(s)*slots.length),p=slots.splice(i,1)[0];s.rush.pickups.push({...p,id:s.nextId++,kind:random(s)<.4?'tea':'bolt',remaining:28});}
}
function tickRush(s:GameState,dt:number){
  const r=s.rush;r.celebration=Math.max(0,r.celebration-dt);r.powerTime=Math.max(0,r.powerTime-dt);
  r.eventTime=Math.max(0,r.eventTime-dt);if(r.eventTime<=0)r.event=-1;
  if(!s.finalJob){r.nextEvent-=dt;if(r.nextEvent<=0){r.event=Math.floor(random(s)*EVENTS.length);if(r.event===0&&!s.tasks.some(t=>t.station==='phone'))r.event=3;if(r.event===1&&!s.tasks.some(t=>t.station==='cats'))r.event=2;r.eventTime=18;r.nextEvent=32;notice(s,EVENTS[r.event].title);}}
  // Pickups only expire while Hamid can move; reading/solving a challenge is never a pickup penalty.
  if(s.phase==='playing'){
    r.nextPickup-=dt;if(r.nextPickup<=0&&!s.finalJob){spawnPickups(s);r.nextPickup=16;}
    for(const p of r.pickups){p.remaining-=dt;if(Math.hypot(s.player.x-p.x,s.player.z-p.z)<(r.perks.includes('magnet')?1.5:.75)){
      const points=r.perks.includes('magnet')?100:50;s.score+=points;r.collected++;p.remaining=0;r.lastPoints=points;r.celebration=.9;
      if(p.kind==='tea'){s.time+=4;notice(s,'Tee geschnappt! +4 Sekunden');}else{r.power=Math.min(100,r.power+18);notice(s,'Selbstvertrauen +18!');}
    }}r.pickups=r.pickups.filter(p=>p.remaining>0);
  }
}
export function stars(s:GameState){return s.phase!=='won'?0:s.score>=12500?3:s.score>=7500?2:1;}
export function badges(s:GameState){
  const found:string[]=[];if(s.phase==='won')found.push('Feierabend gerettet');if(s.phase==='won'&&s.mistakes===0)found.push('RC=0-Maestro');if(s.bestCombo>=6)found.push('6er-Serie');if(s.rush.riskWins>=3)found.push('Papa weiß es besser');if(s.rush.collected>=6)found.push('Tee-Turbo');return found;
}

// A small deterministic grid search keeps tap-to-walk routes clear of furniture.
export function routeToTask(s:GameState,id:number){
  if(s.phase!=='playing')return false;const task=s.tasks.find(t=>t.id===id);
  const goal=id<0?s.rush.pickups.find(p=>p.id===-id):STATIONS.find(st=>st.id===task?.station);if(!goal)return false;const step=.5,cols=35,rows=23;
  const point=(i:number)=>({x:-8+i%cols*step,z:-5.5+Math.floor(i/cols)*step});
  const index=(x:number,z:number)=>Math.max(0,Math.min(rows-1,Math.round((z+5.5)/step)))*cols+Math.max(0,Math.min(cols-1,Math.round((x+8)/step)));
  const begin=index(s.player.x,s.player.z),parents=new Map<number,number>([[begin,-1]]),queue=[begin];let finish=-1;
  for(let head=0;head<queue.length;head++){
    const at=queue[head],p=point(at);if(Math.hypot(p.x-goal.x,p.z-goal.z)<(id<0?.3:1.05)){finish=at;break;}
    for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){const x=at%cols+dx,z=Math.floor(at/cols)+dz;if(x<0||x>=cols||z<0||z>=rows)continue;const next=z*cols+x,n=point(next);if(!parents.has(next)&&canStand(n.x,n.z)){parents.set(next,at);queue.push(next);}}
  }
  if(finish<0)return false;const path=[];for(let at=finish;at!==begin;at=parents.get(at)!){path.push(point(at));}
  s.route=path.reverse();s.routeTask=id;return true;
}
export function followRoute(s:GameState,dt:number,dash=false){
  if(s.phase!=='playing'||s.routeTask===null)return false;
  const task=s.tasks.find(t=>t.id===s.routeTask),pickup=s.routeTask<0?s.rush.pickups.find(p=>p.id===-s.routeTask!):undefined;
  const st=pickup??STATIONS.find(v=>v.id===task?.station);if(!st){s.route=[];s.routeTask=null;return false;}
  if(Math.hypot(s.player.x-st.x,s.player.z-st.z)<(pickup?.5:1.25)){if(!pickup)return startTask(s,task!.id);s.route=[];s.routeTask=null;s.player.moving=false;return false;}
  while(s.route.length&&Math.hypot(s.route[0].x-s.player.x,s.route[0].z-s.player.z)<.16)s.route.shift();
  if(!s.route.length){s.routeTask=null;return false;}
  const p=s.route[0],dx=p.x-s.player.x,dz=p.z-s.player.z;movePlayer(s,dx/Math.hypot(dx,dz),dz/Math.hypot(dx,dz),dt,dash);return false;
}
