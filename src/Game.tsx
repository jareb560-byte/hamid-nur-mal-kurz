import {useEffect,useRef,useState} from 'react';
import {House,Play,Pause,Volume2,VolumeX,ArrowRight,RotateCcw,Trophy,Cat,Phone,Zap,Terminal,MessageCircle,ArrowUpFromLine,Check,Clock,Heart,Move,Maximize,HelpCircle,X,Flag,MousePointer2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {RadioGroup,RadioGroupItem} from '../components/ui/radio-group';
import {Apartment} from './world';
import {GameAudio} from './audio';
import {MiniGame} from './minigames';
import {STATIONS,SETTINGS,createGame,movePlayer,tick,startTask,cancelTask,finishTask,failAttempt,pauseGame,resumeGame,nearestTask,rank,notice,routeToTask,followRoute,activatePower,choosePerk,setRisk,scoreMultiplier,stars,badges,PERKS,EVENTS,type Mode,type GameState,type Difficulty,type StationId} from './simulation';

const SHORT_NAMES:Record<StationId,string>={ladder:'Balkon-Leiter',power:'Sicherung',phone:'Hotline-Duell',cats:'Katzen füttern',mainframe:'REXX-Terminal',rumor:'Papas Stories'};
const ICONS={ladder:ArrowUpFromLine,power:Zap,phone:Phone,cats:Cat,mainframe:Terminal,rumor:MessageCircle};
function Icon({id,size=20}:{id:StationId;size?:number}){const Component=ICONS[id];return <Component size={size}/>;}
const asset=(file:string)=>`${import.meta.env.BASE_URL}art/${file}`;
function readStorage(key:string,fallback:string){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function writeStorage(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Private browsers can disable storage. Gameplay remains available. */}}
function time(value:number){const seconds=Math.ceil(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
const startQuotes=['„Ich mach das nur mal kurz.“','„Die Katzen haben doch Hunger.“','„REXX hätte das längst erledigt.“','„Ich brauche keine Anleitung.“'];
export default function Game(){
  const game=useRef<GameState>({...createGame(),phase:'menu'});const [revision,redraw]=useState(0);const s=game.current;
  const [mode,setMode]=useState<Mode>('rush');const [collection,setCollection]=useState<string[]>(()=>{try{const v=JSON.parse(readStorage('hamid-badges','[]'));return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return [];}});
  const [difficulty,setDifficulty]=useState<Difficulty>('normal');const [sound,setSound]=useState(()=>readStorage('hamid-sound','on')==='on');
  const [help,setHelp]=useState(false),[best,setBest]=useState(()=>Number(readStorage('hamid-best-rush-normal','0'))||0),[worldError,setWorldError]=useState('');
  const [rendererEpoch,setRendererEpoch]=useState(0);
  const graphicsStatus=useRef<'ready'|'recovering'|'failed'>('ready'),autoRebuilds=useRef(1);
  const canvas=useRef<HTMLCanvasElement>(null),world=useRef<Apartment|null>(null),audio=useRef<GameAudio|null>(null);
  const keys=useRef(new Set<string>()),joystick=useRef({x:0,y:0,id:-1}),miniReady=useRef(false),miniSettled=useRef(false),markerRefs=useRef(new Map<string,HTMLButtonElement>());
  const [joystickKnob,setJoystickKnob]=useState({x:0,y:0}),[selected,setSelected]=useState<StationId|null>(null);
  const finishSaved=useRef(false),pendingDash=useRef(false),frameCount=useRef(0);const inMenu=s.phase==='menu';
  const refresh=()=>redraw(v=>v+1);
  useEffect(()=>{audio.current=new GameAudio();audio.current.setEnabled(sound);return()=>audio.current?.dispose();},[]);
  useEffect(()=>{audio.current?.setEnabled(sound);writeStorage('hamid-sound',sound?'on':'off');},[sound]);
  useEffect(()=>{if(audio.current)audio.current.intensity=s.mode==='rush'?(s.rush.powerTime>0?3:s.rush.wave-1):0;},[s.mode,s.rush.wave,s.rush.powerTime>0]);
  const soundSnapshot=useRef({score:0,event:-1});
  useEffect(()=>{if(s.mode==='rush'&&s.phase==='playing'){if(s.score>soundSnapshot.current.score&&s.rush.lastPoints<=100)audio.current?.effect('new');if(s.rush.event>=0&&s.rush.event!==soundSnapshot.current.event)audio.current?.effect('new');}soundSnapshot.current={score:s.score,event:s.rush.event};},[s.score,s.rush.event]);
  useEffect(()=>{audio.current?.music(s.phase==='playing'||s.phase==='minigame');},[s.phase]);
  const clearControls=()=>{game.current.route=[];game.current.routeTask=null;keys.current.clear();joystick.current={x:0,y:0,id:-1};setJoystickKnob({x:0,y:0});pendingDash.current=false;game.current.player.moving=false;};
  const pause=()=>{pauseGame(game.current);clearControls();refresh();};
  const special=()=>{if(graphicsStatus.current!=='ready'||miniSettled.current)return;if(activatePower(game.current)){audio.current?.effect('win');refresh();}};
  const interact=()=>{if(graphicsStatus.current!=='ready')return;if(startTask(game.current)){miniReady.current=false;clearControls();audio.current?.effect('click');refresh();}};
  const rebuildGraphics=()=>{
    if(game.current.phase==='menu')return;
    pauseGame(game.current);clearControls();setHelp(false);writeStorage('hamid-graphics-safe','on');
    graphicsStatus.current='recovering';setWorldError('Dein Spiel bleibt pausiert. Wir bauen die Wohnung mit leichteren Grafikeffekten neu auf.');
    setRendererEpoch(v=>v+1);
  };
  useEffect(()=>{
    if(inMenu||!canvas.current)return;
    const c=canvas.current;let apartment:Apartment|undefined,disposed=false,lost=false;
    let raf=0,last=performance.now(),accumulator=0,uiAccumulator=0,lastRender=0,lastPhase='',lastSize='';
    let recoveryTimer:ReturnType<typeof setTimeout>|undefined;
    let restoreTimer:ReturnType<typeof setTimeout>|undefined;
    const clearRecoveryTimer=()=>{if(recoveryTimer!==undefined){clearTimeout(recoveryTimer);recoveryTimer=undefined;}};
    const stopLoop=()=>{cancelAnimationFrame(raf);raf=0;accumulator=0;};
    const failGraphics=()=>{
      stopLoop();pauseGame(game.current);clearControls();writeStorage('hamid-graphics-safe','on');
      graphicsStatus.current='failed';setWorldError('Dein Spielstand ist noch da. Versuche, nur die Grafik neu aufzubauen. Falls das nicht klappt, öffne den Spiellink über das Browsermenü im normalen Browser.');refresh();
    };
    const scheduleRecovery=()=>{
      clearRecoveryTimer();if(document.hidden)return;
      recoveryTimer=setTimeout(()=>{
        if(disposed||!lost||document.hidden)return;
        if(autoRebuilds.current>0){autoRebuilds.current--;rebuildGraphics();}else failGraphics();
      },4000);
    };
    const contextLost=(e?:Event)=>{
      e?.preventDefault();if(disposed||lost)return;
      lost=true;stopLoop();pauseGame(game.current);clearControls();setHelp(false);writeStorage('hamid-graphics-safe','on');
      graphicsStatus.current='recovering';setWorldError('Dein Spiel ist pausiert. Wir stellen die Grafikverbindung wieder her. Dein Fortschritt bleibt erhalten.');refresh();scheduleRecovery();
    };
    const draw=(dt:number)=>{
      if(!apartment||lost||disposed||document.hidden)return false;
      if(apartment.renderer.getContext().isContextLost()){contextLost();return false;}
      const markers=apartment.update(game.current,dt,game.current.phase==='playing');
      markers.forEach(m=>{const el=markerRefs.current.get(m.id);if(el){el.style.left=`${m.x}px`;el.style.top=`${m.y}px`;}});
      if(apartment.renderer.getContext().isContextLost()){contextLost();return false;}
      lastPhase=game.current.phase;lastSize=`${apartment.width}:${apartment.height}`;return true;
    };
    const finishRecovery=()=>{
      if(graphicsStatus.current!=='ready')notice(game.current,'Grafik wieder da. Dein Spielstand ist erhalten.');
      graphicsStatus.current='ready';setWorldError('');refresh();
    };
    const loop=(now:number)=>{
      raf=0;if(disposed||lost||document.hidden||!apartment||graphicsStatus.current!=='ready')return;
      const dt=Math.min(.25,(now-last)/1000);last=now;accumulator+=dt;uiAccumulator+=dt;const state=game.current;
      const running=state.phase==='playing'||state.phase==='minigame'&&miniReady.current;
      if(running){while(accumulator>=1/60){
        const x=(keys.current.has('KeyD')||keys.current.has('ArrowRight')?1:0)-(keys.current.has('KeyA')||keys.current.has('ArrowLeft')?1:0)+joystick.current.x;
        const y=(keys.current.has('KeyS')||keys.current.has('ArrowDown')?1:0)-(keys.current.has('KeyW')||keys.current.has('ArrowUp')?1:0)+joystick.current.y;
        const dash=pendingDash.current;pendingDash.current=false;if(Math.hypot(x,y)>.08){state.route=[];state.routeTask=null;movePlayer(state,x*.8+y*.6,-x*.6+y*.8,1/60,dash);}else if(state.routeTask!==null){if(followRoute(state,1/60,dash)){miniReady.current=false;clearControls();audio.current?.effect('click');refresh();}}else movePlayer(state,0,0,1/60,dash);if(state.phase!=='minigame'||miniReady.current)tick(state,1/60);accumulator-=1/60;
      }}else accumulator=0;
      if((state.phase==='playing'&&now-lastRender>=apartment.profile.frameInterval-.5)||lastPhase!==state.phase||lastSize!==`${apartment.width}:${apartment.height}`){
        try {if(!draw(Math.min(.25,(now-lastRender)/1000)))return;lastRender=now;}catch{failGraphics();return;}
      }
      if(uiAccumulator>.08){refresh();uiAccumulator=0;}frameCount.current++;raf=requestAnimationFrame(loop);
    };
    const startLoop=()=>{if(!raf&&!disposed&&!lost&&!document.hidden&&graphicsStatus.current==='ready'){last=performance.now();accumulator=0;raf=requestAnimationFrame(loop);}};
    const contextRestored=()=>{
      // Use a new task (not a microtask) so every native listener, including Three, has finished.
      if(restoreTimer!==undefined)clearTimeout(restoreTimer);
      restoreTimer=setTimeout(()=>{
        if(disposed||!apartment||apartment.renderer.getContext().isContextLost())return;
        lost=false;clearRecoveryTimer();
        try{apartment.useSafeGraphics();if(!document.hidden&&!draw(0))return;finishRecovery();startLoop();}catch{failGraphics();}
      },0);
    };
    const visibility=()=>{if(document.hidden){stopLoop();clearRecoveryTimer();}else if(lost)scheduleRecovery();else startLoop();};
    const cleanup=()=>{
      disposed=true;stopLoop();clearRecoveryTimer();if(restoreTimer!==undefined)clearTimeout(restoreTimer);c.removeEventListener('webglcontextlost',contextLost);c.removeEventListener('webglcontextrestored',contextRestored);document.removeEventListener('visibilitychange',visibility);
      apartment?.dispose();if(world.current===apartment)world.current=null;
    };
    // Listen before construction: a mobile GPU can fail while the first buffers are allocated.
    c.addEventListener('webglcontextlost',contextLost);c.addEventListener('webglcontextrestored',contextRestored);document.addEventListener('visibilitychange',visibility);
    try{
      apartment=new Apartment(c,readStorage('hamid-graphics-safe','off')==='on');world.current=apartment;
      if(apartment.renderer.getContext().isContextLost()){contextLost();}else if(!document.hidden&&draw(0)){finishRecovery();startLoop();}else if(document.hidden){finishRecovery();}
    }catch{failGraphics();}
    return cleanup;
  },[inMenu,rendererEpoch]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(game.current.phase==='menu'||graphicsStatus.current!=='ready'||(e.target as HTMLElement)?.tagName==='INPUT')return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&e.code!=='Tab')e.preventDefault();
      if(e.repeat)return;
      if(e.code==='KeyP'||e.code==='Escape'){
        e.preventDefault();if(game.current.phase==='paused'){resumeGame(game.current);refresh();}else pause();return;
      }
      if(e.code==='KeyQ'){special();return;}if(game.current.phase!=='playing')return;keys.current.add(e.code);
      if(e.code==='KeyE'||e.code==='Space')interact();
      if(e.code==='ShiftLeft'||e.code==='ShiftRight'){pendingDash.current=true;if(game.current.player.dashCooldown<=0)audio.current?.effect('dash');}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.code);
    const visibility=()=>{if(document.hidden)pause();};const blur=()=>{if(game.current.phase!=='menu')pause();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>{setBest(Number(readStorage(`hamid-best-${mode}-${difficulty}`,'0'))||0);},[mode,difficulty]);
  useEffect(()=>{if((s.phase==='won'||s.phase==='lost')&&!finishSaved.current){finishSaved.current=true;if(s.score>best){setBest(s.score);writeStorage(`hamid-best-${s.mode}-${s.difficulty}`,String(s.score));}const earned=badges(s);const all=[...new Set([...collection,...earned])];setCollection(all);writeStorage('hamid-badges',JSON.stringify(all));audio.current?.effect(s.phase==='won'?'win':'bad');}},[s.phase]);
  useEffect(()=>{if(import.meta.env.DEV){(window as unknown as {__HAMID_DEV__:unknown}).__HAMID_DEV__={getState:()=>JSON.parse(JSON.stringify(game.current)),frames:()=>frameCount.current,graphics:()=>world.current?{profile:world.current.profile,draws:world.current.renderer.info.render.frame,pixelRatio:world.current.renderer.getPixelRatio(),shadows:world.current.renderer.shadowMap.enabled,status:graphicsStatus.current}:null,rushStation:(id:StationId,completed=0)=>{game.current=createGame('normal',37,'rush');const g=game.current,st=STATIONS.find(st=>st.id===id)!;g.tasks=[{id:104,station:id,remaining:60,total:60,urgent:false}];g.completed=completed;g.rush.wave=Math.floor(completed/3)+1;g.rush.power=100;g.player.x=st.x;g.player.z=st.z;startTask(g);miniReady.current=false;refresh();},station:(id:StationId,final=false)=>{const st=STATIONS.find(v=>v.id===id);if(!st)return;game.current=createGame('normal',7);const g=game.current;g.tasks=[{id:4,station:id,remaining:60,total:60,urgent:false}];g.player.x=st.x;g.player.z=st.z;g.finalJob=final;startTask(g);miniReady.current=false;refresh();}};}},[]);
  const start=()=>{audio.current?.init();game.current=createGame(difficulty,Date.now(),mode);miniReady.current=false;miniSettled.current=false;finishSaved.current=false;autoRebuilds.current=1;graphicsStatus.current='ready';setSelected(null);setWorldError('');clearControls();refresh();};
  const mainMenu=()=>{game.current.phase='menu';game.current.activeTask=null;graphicsStatus.current='ready';setWorldError('');setHelp(false);clearControls();refresh();};
  const completeMini=(quality:number)=>{finishTask(game.current,quality);miniSettled.current=false;setSelected(null);miniReady.current=false;refresh();};
  const markStation=(id:StationId)=>{if(graphicsStatus.current!=='ready'||s.phase!=='playing')return;setSelected(id);const st=STATIONS.find(v=>v.id===id)!;if(Math.hypot(s.player.x-st.x,s.player.z-st.z)<=1.65&&nearestTask(s).task?.station===id){interact();}else{const task=s.tasks.find(t=>t.station===id);if(task&&routeToTask(s,task.id))notice(s,`Hamid kommt! → ${st.name}`);refresh();}};
  const toggleSound=()=>{audio.current?.init();setSound(v=>!v);};
  const fullScreen=()=>{if(!document.fullscreenElement)void document.documentElement.requestFullscreen?.().catch(()=>{});else void document.exitFullscreen?.();};
  const activeTask=s.tasks.find(t=>t.id===s.activeTask),nearest=nearestTask(s),canInteract=s.phase==='playing'&&nearest.distance<=1.65;
  const phaseLabel=s.mode==='rush'?(s.finalJob?`BOSS ${s.rush.bossStep+1}/3 · PAPA RETTET ALLES`:`RUNDE ${s.rush.wave}/3 · ${['NUR MAL KURZ','JETZT WIRD’S WILD','PAPA DREHT AUF'][s.rush.wave-1]}`):s.finalJob?'FINALE · PAPA RETTET DAS INTERNET':s.completed<s.target/3?'01 · DAS DAUERT FÜNF MINUTEN':s.completed<s.target*2/3?'02 · ICH HAB DAS GLEICH':'03 · JETZT, WO ICH SCHON MAL HIER BIN';
  const finished=s.phase==='won'||s.phase==='lost';
  const showDialog=help||s.phase==='paused'||s.phase==='minigame'||s.phase==='upgrade'||finished||!!worldError;
  const joystickMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(joystick.current.id!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect();let x=(e.clientX-rect.left-rect.width/2)/40,y=(e.clientY-rect.top-rect.height/2)/40;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}joystick.current.x=x;joystick.current.y=y;setJoystickKnob({x:x*32,y:y*32});};
  const joystickEnd=(e:React.PointerEvent<HTMLDivElement>)=>{if(joystick.current.id===e.pointerId){joystick.current={x:0,y:0,id:-1};setJoystickKnob({x:0,y:0});}};
  void revision;
  return <main className={`game-app ${inMenu?'is-menu':''} ${(inMenu?mode:s.mode)==='rush'?'rush-mode':''} ${s.rush.powerTime>0?'power-active':''}`}>
    {inMenu?<section className="title-screen" aria-label="Hamid – Nur mal kurz, Spielmenü">
      <img className="cover-art" src={asset('hamid-cover.png')} alt="Hamid mit blauem Pullover, Schraubenzieher und zwei sehr gut gefütterten Katzen in seiner Wohnung" fetchPriority="high"/>
      <div className="cover-shade"/>
      <header className="title-top"><span className="studio-mark"><House size={17}/> FAMILIE. CHAOS. FEIERABEND.</span><div className="top-actions"><button className="icon-button" onClick={toggleSound} aria-label={sound?'Ton ausschalten':'Ton einschalten'}>{sound?<Volume2/>:<VolumeX/>}</button><button className="icon-button" onClick={()=>setHelp(true)} aria-label="Spielanleitung"><HelpCircle/></button></div></header>
      <div className="title-copy"><span className="edition"><span/> DEIN FEIERABEND. DEIN REKORD.</span><h1>HAMID<span>NUR MAL KURZ.</span></h1><p className="title-description">{mode==='rush'?<>Papa gegen den ganzen Haushalt.<br/> Drei Runden. Ein Dreifach-Boss. Dein Rekord.</>:<>Ein Mann. Sechs Baustellen.<br/>Absolut alles unter Kontrolle.</>}</p><div className="mode-picker" role="group" aria-label="Spielmodus"><button className={mode==='rush'?'chosen':''} onClick={()=>setMode('rush')}>⚡ Feierabend-Rush</button><button className={mode==='classic'?'chosen':''} onClick={()=>setMode('classic')}>Klassischer Haushalt</button></div><div className="difficulty-picker"><span className="field-label">WIE SCHLIMM KANN’S WERDEN?</span><RadioGroup value={difficulty} onValueChange={v=>setDifficulty(v as Difficulty)} className="difficulty-options" aria-label="Schwierigkeitsgrad">{(Object.entries(SETTINGS) as [Difficulty,typeof SETTINGS[Difficulty]][]).map(([key,cfg])=><label className={`difficulty-option ${difficulty===key?'chosen':''}`} key={key}><RadioGroupItem value={key}/><span>{cfg.label}</span></label>)}</RadioGroup></div><button className="primary start-button" onClick={start}><Play size={21} fill="currentColor"/>FEIERABEND RETTEN<ArrowRight size={21}/></button><div className="title-controls"><span>Aufgabe antippen → Hamid läuft los</span><span className="touch-note"><MousePointer2 size={14}/> Auch mit Touch</span></div></div>
      <aside className="cover-quote"><span>HAMID, KURZ VOR DEM CHAOS</span><p>„Ich bin doch<br/>vom Fach.“</p></aside>
      <footer className="title-footer"><span>EIN LIEBEVOLLER FAMILIEN-ROAST <Heart size={12}/></span><span>{best>0?`DEIN REKORD ${best.toLocaleString('de-DE')}`:collection.length?`${collection.length} ABZEICHEN GESAMMELT`:'3 RUNDEN · 5 FÄHIGKEITEN · 1 PAPA'}</span></footer>
    </section>:<>
      <div className="world-wrap"><canvas key={rendererEpoch} ref={canvas} className="world-canvas" aria-label="Begehbare 3D-Wohnung. Steuere Hamid mit WASD oder den Pfeiltasten."/>
        <div className="station-markers">{STATIONS.map(st=>{const task=s.tasks.find(t=>t.station===st.id);return <button key={st.id} ref={el=>{if(el)markerRefs.current.set(st.id,el);else markerRefs.current.delete(st.id);}} className={`station-marker ${task?'active':''} ${task?.urgent?'urgent':''} ${selected===st.id?'selected':''}`} style={{'--station-color':st.color} as React.CSSProperties} onClick={()=>markStation(st.id)} aria-label={`${st.name}${task?`, ${Math.ceil(task.remaining)} Sekunden`:''}`} disabled={!task} tabIndex={task?0:-1}><span><Icon id={st.id} size={20}/></span>{task&&<small>{Math.ceil(task.remaining)}</small>}</button>;})}{s.mode==='rush'&&s.rush.pickups.map(p=><button key={p.id} ref={el=>{if(el)markerRefs.current.set(`pickup-${p.id}`,el);else markerRefs.current.delete(`pickup-${p.id}`);}} className={`pickup-marker ${p.kind}`} disabled={s.phase!=='playing'} onClick={()=>{if(graphicsStatus.current==='ready'&&routeToTask(s,-p.id)){setSelected(null);audio.current?.effect('click');refresh();}}} aria-label={p.kind==='tea'?'Tee einsammeln: vier Sekunden extra':'Blitz einsammeln: Spezialaktion laden'}>{p.kind==='tea'?'☕':<Zap size={19}/>}</button>)}</div>
      </div>
      <header className="hud-top"><div className="mini-logo">HAMID<span>NUR MAL KURZ.</span></div><div className="chapter"><span>{phaseLabel}</span><div className="chapter-dots">{Array.from({length:s.target},(_,i)=><i key={i} className={i<s.completed?'filled':''}/>)}</div></div><div className={`timer ${s.time<40?'low':''}`}><Clock size={17}/><strong>{time(s.time)}</strong></div><button className="icon-button" onClick={toggleSound} aria-label={sound?'Ton ausschalten':'Ton einschalten'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="icon-button" onClick={pause} aria-label="Spiel pausieren"><Pause size={20}/></button></header>
      <aside className="objectives"><div className="objectives-heading"><span>{s.finalJob?'LETZTER AUFTRAG':'DAS MACHT SICH NICHT VON ALLEIN'}</span><span>{s.finalJob?<Flag size={16}/>:s.tasks.length}</span></div>{s.tasks.map(task=>{const st=STATIONS.find(v=>v.id===task.station)!;return <button className={`task-card ${task.urgent?'urgent':''} ${selected===st.id?'selected':''}`} key={task.id} onClick={()=>markStation(st.id)} style={{'--station-color':st.color} as React.CSSProperties}><span className="task-icon"><Icon id={st.id}/></span><span className="task-info"><strong>{s.mode==='rush'?SHORT_NAMES[st.id]:st.name}</strong><small>{task.urgent?'Papa, jetzt aber wirklich!':st.subtitle}</small><span className="task-deadline"><i style={{width:`${Math.max(0,task.remaining/task.total)*100}%`}}/></span></span><span className="task-seconds">{Math.ceil(task.remaining)}<small>SEK</small></span></button>;})}<div className="objective-goal"><Check size={16}/><span>{s.mode==='rush'?(s.finalJob?`Dreifach-Boss · ${s.rush.bossStep+1} von 3`:`${s.completed%3} / 3 → ${s.rush.wave===3?'Dreifach-Boss':'Papa-Fähigkeit wählen'}`):s.finalJob?'Zum Terminal. Jetzt bist du der Profi.':`${s.completed} von ${s.target} erledigt · dann das Finale`}</span></div></aside>
      <aside className="score-panel"><div><span>FEIERABEND-PUNKTE</span><strong>{s.score.toLocaleString('de-DE')}</strong></div>{s.combo>1&&<span className="combo">{s.combo}er-SERIE · ×{scoreMultiplier(s).toFixed(2)}</span>}</aside>
      {s.mode==='rush'&&<><div className="rush-event" style={{'--event-color':s.rush.event>=0?EVENTS[s.rush.event].color:'#65e5c7'} as React.CSSProperties}><span>{s.rush.event>=0?`NOCH ${Math.ceil(s.rush.eventTime)} SEKUNDEN`:'PAPA, DEIN AUFTRITT'}</span><strong>{s.rush.event>=0?EVENTS[s.rush.event].title:'Goldene Boni einsammeln.'}</strong><small>{s.rush.event>=0?EVENTS[s.rush.event].description:'Tee gibt Zeit. Blitze laden deine Spezialaktion.'}</small></div><button className={`papa-power ${s.rush.power>=100?'charged':''}`} onClick={special} disabled={s.phase!=='playing'||s.rush.power<100||s.rush.powerTime>0} style={{'--charge':`${s.rush.power}%`} as React.CSSProperties}><Zap size={21}/><span><strong>{s.rush.powerTime>0?`VOM FACH! · ${Math.ceil(s.rush.powerTime)} s`:'ICH BIN VOM FACH!'}</strong><small>{s.rush.powerTime>0?'Fristen gestoppt · Punkte ×1,5':s.rush.power>=100?'JETZT ZÜNDEN · Q':`${Math.floor(s.rush.power)} % · Aufgaben & Blitze laden auf`}</small></span></button>{s.rush.celebration>0&&<div className="score-burst" key={s.score}>+{s.rush.lastPoints}<small>{s.combo>=3?'PAPA LÄUFT HEISS!':'LÄUFT BEI PAPA.'}</small></div>}</>}
      <div className="room-caption"><span>ZU HAUSE BEI HAMID</span><strong>{s.chaos<30?'Verdächtig friedlich.':s.chaos<65?'Alles eine Frage der Definition.':'Vielleicht doch erst mal Tee?'}</strong></div>
      <div className="notices" aria-live="polite">{s.notices.slice(-1).map((n,i)=><div key={`${n.text}-${i}`}>{n.text}</div>)}</div>
      <footer className="hud-bottom"><div className="hamid-status"><img src={asset('hamid-avatar.png')} alt="Hamid"/><div><span>HAMIDS SELBSTVERTRAUEN</span><strong>Unerschütterlich.</strong><p>{startQuotes[Math.floor(s.elapsed/18)%startQuotes.length]}</p></div></div><div className={`chaos-panel ${s.chaos>70?'danger':''}`}><div><span>HAUSHALTSCHAOS</span><strong>{Math.ceil(s.chaos)}<small> / 100</small></strong></div><div className="chaos-track"><i style={{width:`${s.chaos}%`}}/></div><span className="chaos-note">Aufträge erledigen beruhigt die Familie.</span></div><div className="desktop-help"><span><kbd>WASD</kbd> Laufen</span><span><kbd>⇧</kbd> Flitzen</span><button onClick={()=>{pause();setHelp(true);}}><HelpCircle size={16}/> Anleitung</button><button onClick={fullScreen} aria-label="Vollbild"><Maximize size={16}/></button></div></footer>
      <div className={`interact-prompt ${canInteract?'available':''}`}><button className={canInteract?'primary':'secondary'} disabled={!canInteract} onClick={interact}><kbd>E</kbd><span>{canInteract?`${STATIONS.find(st=>st.id===nearest.task?.station)!.name}`:s.routeTask!==null?'Hamid ist unterwegs …':'Tippe eine Aufgabe an'}</span>{canInteract&&<ArrowRight size={18}/>}</button></div>
      <div className="touch-controls"><div className="joystick" role="group" aria-label="Bewegungsjoystick" onPointerDown={e=>{if(joystick.current.id!==-1)return;joystick.current.id=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);joystickMove(e);}} onPointerMove={joystickMove} onPointerUp={joystickEnd} onPointerCancel={joystickEnd}><Move size={25}/><span style={{transform:`translate(${joystickKnob.x}px,${joystickKnob.y}px)`}}/></div><div className="touch-buttons"><button className="dash-button" disabled={s.player.dashCooldown>0} onPointerDown={e=>{e.preventDefault();pendingDash.current=true;}}>{s.player.dashCooldown>0?s.player.dashCooldown.toFixed(1):<Zap size={21}/>}<small>FLITZEN</small></button><button className="action-button" disabled={!canInteract} onClick={interact}><Icon id={canInteract?nearest.task!.station:'ladder'} size={26}/><small>ANPACKEN</small></button></div></div>
    </>}
    <Dialog open={showDialog} disablePointerDismissal onOpenChange={(open,details)=>{if(!open){if(graphicsStatus.current!=='ready'){details.cancel();}else if(help){setHelp(false);}else if(details.reason==='escape-key'){details.cancel();}else if(s.phase==='paused'){resumeGame(s);refresh();}else if(s.phase==='minigame'){pause();}}}}>
      <DialogContent showCloseButton={false} className={`game-dialog ${finished?'result-dialog':''}`}>
        <DialogTitle className="sr-only">{help?'So rettest du den Feierabend':s.phase==='paused'?'Verschnaufpause':s.phase==='upgrade'?'Wähle deine Papa-Fähigkeit':finished?'Dein Ergebnis':activeTask?STATIONS.find(st=>st.id===activeTask.station)!.name:'Grafikhinweis'}</DialogTitle><DialogDescription className="sr-only">Hamid – Nur mal kurz. Ein Haushaltsabenteuer.</DialogDescription>
        {worldError?<div className="pause-screen graphics-recovery" role="status"><h2>{graphicsStatus.current==='recovering'?'Grafik wird wiederhergestellt.':'Die Grafik braucht kurz Hilfe.'}</h2><p>{worldError}</p><button className="primary" onClick={rebuildGraphics}>Grafik neu aufbauen</button><button className="text-button" onClick={mainMenu}>Zurück zum Hauptmenü</button></div>:help?<div className="help-screen"><button className="close-help icon-button" onClick={()=>setHelp(false)} aria-label="Anleitung schließen"><X/></button><p className="eyebrow">EIN GANZ NORMALER SONNTAG</p><h2>Rette den Feierabend.</h2><p>Hamid hat für alles eine Lösung. Leider auch für Dinge, die noch gar nicht kaputt waren.</p><div className="help-steps"><div><span>01</span><p><strong>Leuchtende Kreise suchen</strong>Tippe eine Aufgabe an: Hamid läuft selbst dorthin. Oder steuere mit WASD, Pfeiltasten und dem Joystick.</p></div><div><span>02</span><p><strong>Anpacken, bevor’s knallt</strong>Drücke E oder ANPACKEN. Löse das kleine Minispiel. Die Anleitung hält die Zeit an.</p></div><div><span>03</span><p><strong>Chaos unter 100 halten</strong>Erledigte Aufgaben beruhigen die Familie. Abgelaufene Aufgaben bringen Unruhe. Im Rush wählst du nach jeder Runde eine Fähigkeit. Am Ende wartet der Dreifach-Boss. Sammle Blitze und zünde „Ich bin vom Fach!“ für einen Punkteschub.</p></div></div><div className="help-controls"><span><kbd>Q</kbd> Spezialaktion · ⇧ Sprint</span><span><kbd>P / ESC</kbd> Pause</span><span><kbd>1–4</kbd> Antworten</span></div><button className="primary" onClick={()=>setHelp(false)}>Alles klar, ich bin vom Fach. <Check size={19}/></button></div>:null}
        {!help&&!worldError&&s.phase==='paused'&&<div className="pause-screen"><span className="pause-icon"><Pause size={28}/></span><p className="eyebrow">DER HAUSHALT KANN WARTEN</p><h2>Erst mal einen Tee.</h2><p>Ausnahmsweise bleibt Hamid kurz sitzen.</p><button className="primary" onClick={()=>{resumeGame(s);refresh();}} autoFocus><Play size={18}/>Weiter geht’s</button><div className="pause-actions"><button className="secondary" onClick={()=>setHelp(true)}><HelpCircle size={18}/>Anleitung</button><button className="secondary" onClick={mainMenu}><House size={18}/>Hauptmenü</button></div></div>}
        {!help&&!worldError&&s.phase==='upgrade'&&<div className="upgrade-screen"><div className="upgrade-seal">{s.rush.wave}/3</div><p className="eyebrow">RUNDE GESCHAFFT · +15 SEKUNDEN</p><h2>Papa legt einen drauf.</h2><p>Welche Fähigkeit nimmst du in die nächste Runde mit?</p><div className="perk-choices">{s.rush.offers.map(id=>{const perk=PERKS.find(p=>p.id===id)!;return <button key={id} className="perk-card" onClick={()=>{if(choosePerk(s,id)){audio.current?.effect('win');refresh();}}}><span>{perk.icon}</span><div><strong>{perk.name}</strong><p>{perk.description}</p></div><ArrowRight size={20}/></button>;})}</div><small>Die Zeit steht still. Deine Wahl gilt für diesen Durchlauf.</small></div>}
        {activeTask&&<div style={{display:!worldError&&!help&&s.phase==='minigame'?'block':'none'}}>{s.mode==='rush'&&<button className="mini-power" disabled={s.rush.power<100||s.rush.powerTime>0||s.phase!=='minigame'||miniSettled.current} onClick={special}><Zap size={16}/>{s.rush.powerTime>0?`VOM FACH! ${Math.ceil(s.rush.powerTime)}s · Punkte ×1,5`:s.rush.power>=100?'ICH BIN VOM FACH! · JETZT ZÜNDEN':`Spezialaktion lädt · ${Math.floor(s.rush.power)} %`}</button>}<MiniGame key={`${activeTask.id}-${activeTask.station}-${s.finalJob}`} station={activeTask.station} taskId={activeTask.id} final={s.finalJob} difficulty={s.difficulty} rush={s.mode==='rush'?{wave:s.rush.wave,seed:s.rush.challengeSeed,repeat:s.rush.seen.includes(activeTask.station)}:undefined} onRisk={value=>{setRisk(s,value);refresh();}} onSettled={()=>{miniSettled.current=true;refresh();}} paused={s.phase!=='minigame'||help||!!worldError} onReady={v=>{miniReady.current=v;}} onFinish={completeMini} onMistake={()=>{failAttempt(game.current);refresh();}} sound={kind=>audio.current?.effect(kind)}/>{s.phase==='minigame'&&!miniSettled.current&&<button className="text-button abandon-task" onClick={()=>{cancelTask(s);miniReady.current=false;refresh();}}>Später weitermachen</button>}</div>}
        {!help&&!worldError&&finished&&<div className="result-screen"><div className={`result-medal ${s.phase==='lost'?'lost':''}`}>{s.phase==='won'?<Trophy size={45}/>:<Cat size={45}/>}</div><p className="eyebrow">{s.phase==='won'?'MISSION FEIERABEND: GESCHAFFT':'DER FAMILIENRAT HAT ENTSCHIEDEN'}</p><h2>{s.phase==='won'?'War doch nur kurz.':'Papa. Erst mal hinsetzen.'}</h2><p>{s.phase==='won'?'Internet läuft. Licht brennt. Katzen behaupten, sie hätten Hunger.':s.time<=0?'Die Zeit ist um. Hamid hatte gerade erst richtig angefangen.':'Zu viel Chaos. Die Katzen übernehmen vorübergehend die Haushaltsleitung.'}</p>{s.mode==='rush'&&<><div className="run-stars" aria-label={`${stars(s)} von 3 Sternen`}>{[1,2,3].map(i=><span key={i} className={i<=stars(s)?'earned':''}>★</span>)}</div><p className="next-goal">{s.phase!=='won'?'Nächster Versuch: Schaffst du den Dreifach-Boss?':stars(s)===3?'Drei Sterne! Schaffst du es auch ohne einen Fehler?':`Nächster Stern bei ${stars(s)===1?'7.500':'12.500'} Punkten. Risiko und Spezialaktion clever kombinieren!`}</p><div className="earned-badges">{badges(s).map(b=><span key={b}>✦ {b}</span>)}</div></>}<div className="result-score">{s.score.toLocaleString('de-DE')}<span>{s.score>=best&&s.score>0?'PERSÖNLICHER REKORD!':'FEIERABEND-PUNKTE'}</span></div><div className="result-stats"><div><strong>{s.completed}</strong><span>ERLEDIGT</span></div><div><strong>{s.bestCombo}×</strong><span>BESTE SERIE</span></div><div><strong>{Math.ceil(s.chaos)}%</strong><span>RESTCHAOS</span></div></div><div className="result-rank">{rank(s)}</div><button className="primary" onClick={start} autoFocus><RotateCcw size={19}/>Noch mal kurz</button><button className="text-button" onClick={mainMenu}>Zurück ins Hauptmenü</button></div>}
      </DialogContent>
    </Dialog>
  </main>;
}
