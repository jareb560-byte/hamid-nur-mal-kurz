import {useEffect,useRef,useState} from 'react';
import {House,Play,Pause,Volume2,VolumeX,ArrowRight,RotateCcw,Trophy,Cat,Phone,Zap,Terminal,MessageCircle,ArrowUpFromLine,Check,Clock,Heart,Move,Maximize,HelpCircle,X,Flag,MousePointer2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '../components/ui/dialog';
import {RadioGroup,RadioGroupItem} from '../components/ui/radio-group';
import {Apartment} from './world';
import {GameAudio} from './audio';
import {MiniGame} from './minigames';
import {STATIONS,SETTINGS,createGame,movePlayer,tick,startTask,cancelTask,finishTask,failAttempt,pauseGame,resumeGame,nearestTask,rank,notice,type GameState,type Difficulty,type StationId} from './simulation';

const ICONS={ladder:ArrowUpFromLine,power:Zap,phone:Phone,cats:Cat,mainframe:Terminal,rumor:MessageCircle};
function Icon({id,size=20}:{id:StationId;size?:number}){const Component=ICONS[id];return <Component size={size}/>;}
const asset=(file:string)=>`${import.meta.env.BASE_URL}art/${file}`;
function readStorage(key:string,fallback:string){try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function writeStorage(key:string,value:string){try{localStorage.setItem(key,value);}catch{/* Private browsers can disable storage. Gameplay remains available. */}}
function time(value:number){const seconds=Math.ceil(value);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
const startQuotes=['„Ich mach das nur mal kurz.“','„Die Katzen haben doch Hunger.“','„REXX hätte das längst erledigt.“','„Ich brauche keine Anleitung.“'];
export default function Game(){
  const game=useRef<GameState>({...createGame(),phase:'menu'});const [revision,redraw]=useState(0);const s=game.current;
  const [difficulty,setDifficulty]=useState<Difficulty>('normal');const [sound,setSound]=useState(()=>readStorage('hamid-sound','on')==='on');
  const [help,setHelp]=useState(false),[best,setBest]=useState(()=>Number(readStorage('hamid-best','0'))||0),[worldError,setWorldError]=useState('');
  const canvas=useRef<HTMLCanvasElement>(null),world=useRef<Apartment|null>(null),audio=useRef<GameAudio|null>(null);
  const keys=useRef(new Set<string>()),joystick=useRef({x:0,y:0,id:-1}),miniReady=useRef(false),markerRefs=useRef(new Map<string,HTMLButtonElement>());
  const [joystickKnob,setJoystickKnob]=useState({x:0,y:0}),[selected,setSelected]=useState<StationId|null>(null);
  const finishSaved=useRef(false),pendingDash=useRef(false),frameCount=useRef(0);const inMenu=s.phase==='menu';
  const refresh=()=>redraw(v=>v+1);
  useEffect(()=>{audio.current=new GameAudio();audio.current.setEnabled(sound);return()=>audio.current?.dispose();},[]);
  useEffect(()=>{audio.current?.setEnabled(sound);writeStorage('hamid-sound',sound?'on':'off');},[sound]);
  useEffect(()=>{audio.current?.music(s.phase==='playing'||s.phase==='minigame');},[s.phase]);
  const clearControls=()=>{keys.current.clear();joystick.current={x:0,y:0,id:-1};setJoystickKnob({x:0,y:0});pendingDash.current=false;game.current.player.moving=false;};
  const pause=()=>{pauseGame(game.current);clearControls();refresh();};
  const interact=()=>{if(startTask(game.current)){miniReady.current=false;clearControls();audio.current?.effect('click');refresh();}};
  useEffect(()=>{
    if(inMenu||!canvas.current)return;
    let apartment:Apartment;try{apartment=new Apartment(canvas.current);world.current=apartment;}catch(error){setWorldError('Die 3D-Ansicht konnte nicht starten. Aktiviere die Hardwarebeschleunigung deines Browsers oder öffne das Spiel in einem aktuellen Browser.');return;}
    let raf=0,last=performance.now(),accumulator=0,uiAccumulator=0,lastRender=0;
    const loop=(now:number)=>{
      const dt=Math.min(.25,(now-last)/1000);last=now;accumulator+=dt;uiAccumulator+=dt;const state=game.current;
      const running=state.phase==='playing'||state.phase==='minigame'&&miniReady.current;
      if(running){while(accumulator>=1/60){
        const x=(keys.current.has('KeyD')||keys.current.has('ArrowRight')?1:0)-(keys.current.has('KeyA')||keys.current.has('ArrowLeft')?1:0)+joystick.current.x;
        const y=(keys.current.has('KeyS')||keys.current.has('ArrowDown')?1:0)-(keys.current.has('KeyW')||keys.current.has('ArrowUp')?1:0)+joystick.current.y;
        const dash=pendingDash.current;pendingDash.current=false;movePlayer(state,x*.8+y*.6,-x*.6+y*.8,1/60,dash);tick(state,1/60);accumulator-=1/60;
      }}else accumulator=0;
      if(state.phase==='playing'||now-lastRender>500){
        const markers=apartment.update(state,dt,state.phase==='playing');lastRender=now;
        markers.forEach(m=>{const el=markerRefs.current.get(m.id);if(el){el.style.left=`${m.x}px`;el.style.top=`${m.y}px`;}});
      }
      if(uiAccumulator>.08){refresh();uiAccumulator=0;}frameCount.current++;raf=requestAnimationFrame(loop);
    };raf=requestAnimationFrame(loop);
    const contextLost=(e:Event)=>{e.preventDefault();pauseGame(game.current);setWorldError('Die Grafikverbindung wurde unterbrochen. Lade das Spiel neu, um weiterzuspielen.');refresh();};canvas.current.addEventListener('webglcontextlost',contextLost);
    const c=canvas.current;return()=>{cancelAnimationFrame(raf);c.removeEventListener('webglcontextlost',contextLost);apartment.dispose();world.current=null;};
  },[inMenu]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(game.current.phase==='menu'||(e.target as HTMLElement)?.tagName==='INPUT')return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code)&&e.code!=='Tab')e.preventDefault();
      if(e.repeat)return;
      if(e.code==='KeyP'||e.code==='Escape'){
        e.preventDefault();if(game.current.phase==='paused'){resumeGame(game.current);refresh();}else pause();return;
      }
      if(game.current.phase!=='playing')return;keys.current.add(e.code);
      if(e.code==='KeyE'||e.code==='Space')interact();
      if(e.code==='ShiftLeft'||e.code==='ShiftRight'){pendingDash.current=true;if(game.current.player.dashCooldown<=0)audio.current?.effect('dash');}
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.code);
    const visibility=()=>{if(document.hidden)pause();};const blur=()=>{if(game.current.phase!=='menu')pause();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);};
  },[]);
  useEffect(()=>{if((s.phase==='won'||s.phase==='lost')&&!finishSaved.current){finishSaved.current=true;if(s.score>best){setBest(s.score);writeStorage('hamid-best',String(s.score));}audio.current?.effect(s.phase==='won'?'win':'bad');}},[s.phase]);
  useEffect(()=>{if(import.meta.env.DEV){(window as unknown as {__HAMID_DEV__:unknown}).__HAMID_DEV__={getState:()=>JSON.parse(JSON.stringify(game.current)),frames:()=>frameCount.current,station:(id:StationId,final=false)=>{const st=STATIONS.find(v=>v.id===id);if(!st)return;game.current=createGame('normal',7);const g=game.current;g.tasks=[{id:4,station:id,remaining:60,total:60,urgent:false}];g.player.x=st.x;g.player.z=st.z;g.finalJob=final;startTask(g);miniReady.current=false;refresh();}};}},[]);
  const start=()=>{audio.current?.init();game.current=createGame(difficulty);miniReady.current=false;finishSaved.current=false;setSelected(null);setWorldError('');clearControls();refresh();};
  const mainMenu=()=>{game.current.phase='menu';game.current.activeTask=null;setHelp(false);clearControls();refresh();};
  const completeMini=(quality:number)=>{finishTask(game.current,quality);miniReady.current=false;refresh();};
  const markStation=(id:StationId)=>{setSelected(id);const st=STATIONS.find(v=>v.id===id)!;if(Math.hypot(s.player.x-st.x,s.player.z-st.z)<=1.65){interact();}else{notice(s,`Zu „${st.name}“ gehen. Dann E oder ANPACKEN.`);refresh();}};
  const toggleSound=()=>{audio.current?.init();setSound(v=>!v);};
  const fullScreen=()=>{if(!document.fullscreenElement)void document.documentElement.requestFullscreen?.().catch(()=>{});else void document.exitFullscreen?.();};
  const activeTask=s.tasks.find(t=>t.id===s.activeTask),nearest=nearestTask(s),canInteract=s.phase==='playing'&&nearest.distance<=1.65;
  const phaseLabel=s.finalJob?'FINALE · PAPA RETTET DAS INTERNET':s.completed<s.target/3?'01 · DAS DAUERT FÜNF MINUTEN':s.completed<s.target*2/3?'02 · ICH HAB DAS GLEICH':'03 · JETZT, WO ICH SCHON MAL HIER BIN';
  const finished=s.phase==='won'||s.phase==='lost';
  const showDialog=help||s.phase==='paused'||s.phase==='minigame'||finished||!!worldError;
  const joystickMove=(e:React.PointerEvent<HTMLDivElement>)=>{if(joystick.current.id!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect();let x=(e.clientX-rect.left-rect.width/2)/40,y=(e.clientY-rect.top-rect.height/2)/40;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}joystick.current.x=x;joystick.current.y=y;setJoystickKnob({x:x*32,y:y*32});};
  const joystickEnd=(e:React.PointerEvent<HTMLDivElement>)=>{if(joystick.current.id===e.pointerId){joystick.current={x:0,y:0,id:-1};setJoystickKnob({x:0,y:0});}};
  void revision;
  return <main className={`game-app ${inMenu?'is-menu':''}`}>
    {inMenu?<section className="title-screen" aria-label="Hamid – Nur mal kurz, Spielmenü">
      <img className="cover-art" src={asset('hamid-cover.png')} alt="Hamid mit blauem Pullover, Schraubenzieher und zwei sehr gut gefütterten Katzen in seiner Wohnung" fetchPriority="high"/>
      <div className="cover-shade"/>
      <header className="title-top"><span className="studio-mark"><House size={17}/> FAMILIE. CHAOS. FEIERABEND.</span><div className="top-actions"><button className="icon-button" onClick={toggleSound} aria-label={sound?'Ton ausschalten':'Ton einschalten'}>{sound?<Volume2/>:<VolumeX/>}</button><button className="icon-button" onClick={()=>setHelp(true)} aria-label="Spielanleitung"><HelpCircle/></button></div></header>
      <div className="title-copy"><span className="edition"><span/> DAS PAPA-ABENTEUER</span><h1>HAMID<span>NUR MAL KURZ.</span></h1><p className="title-description">Ein Mann. Sechs Baustellen.<br/>{' '}Absolut alles unter Kontrolle.</p><div className="difficulty-picker"><span className="field-label">WIE SCHLIMM KANN’S WERDEN?</span><RadioGroup value={difficulty} onValueChange={v=>setDifficulty(v as Difficulty)} className="difficulty-options" aria-label="Schwierigkeitsgrad">{(Object.entries(SETTINGS) as [Difficulty,typeof SETTINGS[Difficulty]][]).map(([key,cfg])=><label className={`difficulty-option ${difficulty===key?'chosen':''}`} key={key}><RadioGroupItem value={key}/><span>{cfg.label}</span></label>)}</RadioGroup></div><button className="primary start-button" onClick={start}><Play size={21} fill="currentColor"/>FEIERABEND RETTEN<ArrowRight size={21}/></button><div className="title-controls"><span><kbd>WASD</kbd> bewegen</span><span><kbd>E</kbd> anpacken</span><span className="touch-note"><MousePointer2 size={14}/> Auch mit Touch</span></div></div>
      <aside className="cover-quote"><span>HAMID, KURZ VOR DEM CHAOS</span><p>„Ich bin doch<br/>vom Fach.“</p></aside>
      <footer className="title-footer"><span>EIN LIEBEVOLLER FAMILIEN-ROAST <Heart size={12}/></span><span>{best>0?`DEIN REKORD ${best.toLocaleString('de-DE')}`:'6 AUFGABEN · 3 SCHWIERIGKEITEN · 1 LEGENDE'}</span></footer>
    </section>:<>
      <div className="world-wrap"><canvas ref={canvas} className="world-canvas" aria-label="Begehbare 3D-Wohnung. Steuere Hamid mit WASD oder den Pfeiltasten."/>
        <div className="station-markers">{STATIONS.map(st=>{const task=s.tasks.find(t=>t.station===st.id);return <button key={st.id} ref={el=>{if(el)markerRefs.current.set(st.id,el);else markerRefs.current.delete(st.id);}} className={`station-marker ${task?'active':''} ${task?.urgent?'urgent':''} ${selected===st.id?'selected':''}`} style={{'--station-color':st.color} as React.CSSProperties} onClick={()=>markStation(st.id)} aria-label={`${st.name}${task?`, ${Math.ceil(task.remaining)} Sekunden`:''}`} disabled={!task} tabIndex={task?0:-1}><span><Icon id={st.id} size={20}/></span>{task&&<small>{Math.ceil(task.remaining)}</small>}</button>;})}</div>
      </div>
      <header className="hud-top"><div className="mini-logo">HAMID<span>NUR MAL KURZ.</span></div><div className="chapter"><span>{phaseLabel}</span><div className="chapter-dots">{Array.from({length:s.target},(_,i)=><i key={i} className={i<s.completed?'filled':''}/>)}</div></div><div className={`timer ${s.time<40?'low':''}`}><Clock size={17}/><strong>{time(s.time)}</strong></div><button className="icon-button" onClick={toggleSound} aria-label={sound?'Ton ausschalten':'Ton einschalten'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><button className="icon-button" onClick={pause} aria-label="Spiel pausieren"><Pause size={20}/></button></header>
      <aside className="objectives"><div className="objectives-heading"><span>{s.finalJob?'LETZTER AUFTRAG':'DAS MACHT SICH NICHT VON ALLEIN'}</span><span>{s.finalJob?<Flag size={16}/>:s.tasks.length}</span></div>{s.tasks.map(task=>{const st=STATIONS.find(v=>v.id===task.station)!;return <button className={`task-card ${task.urgent?'urgent':''} ${selected===st.id?'selected':''}`} key={task.id} onClick={()=>markStation(st.id)} style={{'--station-color':st.color} as React.CSSProperties}><span className="task-icon"><Icon id={st.id}/></span><span className="task-info"><strong>{st.name}</strong><small>{task.urgent?'Papa, jetzt aber wirklich!':st.subtitle}</small><span className="task-deadline"><i style={{width:`${Math.max(0,task.remaining/task.total)*100}%`}}/></span></span><span className="task-seconds">{Math.ceil(task.remaining)}<small>SEK</small></span></button>;})}<div className="objective-goal"><Check size={16}/><span>{s.finalJob?'Zum Terminal. Jetzt bist du der Profi.':`${s.completed} von ${s.target} erledigt · dann das Finale`}</span></div></aside>
      <aside className="score-panel"><div><span>FEIERABEND-PUNKTE</span><strong>{s.score.toLocaleString('de-DE')}</strong></div>{s.combo>1&&<span className="combo">{s.combo}× IM FLOW</span>}</aside>
      <div className="room-caption"><span>ZU HAUSE BEI HAMID</span><strong>{s.chaos<30?'Verdächtig friedlich.':s.chaos<65?'Alles eine Frage der Definition.':'Vielleicht doch erst mal Tee?'}</strong></div>
      <div className="notices" aria-live="polite">{s.notices.slice(-1).map((n,i)=><div key={`${n.text}-${i}`}>{n.text}</div>)}</div>
      <footer className="hud-bottom"><div className="hamid-status"><img src={asset('hamid-avatar.png')} alt="Hamid"/><div><span>HAMIDS SELBSTVERTRAUEN</span><strong>Unerschütterlich.</strong><p>{startQuotes[Math.floor(s.elapsed/18)%startQuotes.length]}</p></div></div><div className={`chaos-panel ${s.chaos>70?'danger':''}`}><div><span>HAUSHALTSCHAOS</span><strong>{Math.ceil(s.chaos)}<small> / 100</small></strong></div><div className="chaos-track"><i style={{width:`${s.chaos}%`}}/></div><span className="chaos-note">Aufträge erledigen beruhigt die Familie.</span></div><div className="desktop-help"><span><kbd>WASD</kbd> Laufen</span><span><kbd>⇧</kbd> Flitzen</span><button onClick={()=>{pause();setHelp(true);}}><HelpCircle size={16}/> Anleitung</button><button onClick={fullScreen} aria-label="Vollbild"><Maximize size={16}/></button></div></footer>
      <div className={`interact-prompt ${canInteract?'available':''}`}><button className={canInteract?'primary':'secondary'} disabled={!canInteract} onClick={interact}><kbd>E</kbd><span>{canInteract?`${STATIONS.find(st=>st.id===nearest.task?.station)!.name}`:'Geh zu einem leuchtenden Kreis'}</span>{canInteract&&<ArrowRight size={18}/>}</button></div>
      <div className="touch-controls"><div className="joystick" role="group" aria-label="Bewegungsjoystick" onPointerDown={e=>{if(joystick.current.id!==-1)return;joystick.current.id=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);joystickMove(e);}} onPointerMove={joystickMove} onPointerUp={joystickEnd} onPointerCancel={joystickEnd}><Move size={25}/><span style={{transform:`translate(${joystickKnob.x}px,${joystickKnob.y}px)`}}/></div><div className="touch-buttons"><button className="dash-button" disabled={s.player.dashCooldown>0} onPointerDown={e=>{e.preventDefault();pendingDash.current=true;}}>{s.player.dashCooldown>0?s.player.dashCooldown.toFixed(1):<Zap size={21}/>}<small>FLITZEN</small></button><button className="action-button" disabled={!canInteract} onClick={interact}><Icon id={canInteract?nearest.task!.station:'ladder'} size={26}/><small>ANPACKEN</small></button></div></div>
    </>}
    <Dialog open={showDialog} disablePointerDismissal onOpenChange={(open,details)=>{if(!open){if(help){setHelp(false);}else if(details.reason==='escape-key'){details.cancel();}else if(s.phase==='paused'){resumeGame(s);refresh();}else if(s.phase==='minigame'){pause();}}}}>
      <DialogContent showCloseButton={false} className={`game-dialog ${finished?'result-dialog':''}`}>
        <DialogTitle className="sr-only">{help?'So rettest du den Feierabend':s.phase==='paused'?'Verschnaufpause':finished?'Dein Ergebnis':activeTask?STATIONS.find(st=>st.id===activeTask.station)!.name:'Grafikhinweis'}</DialogTitle><DialogDescription className="sr-only">Hamid – Nur mal kurz. Ein Haushaltsabenteuer.</DialogDescription>
        {worldError?<div className="pause-screen"><h2>Die Grafik braucht kurz Hilfe.</h2><p>{worldError}</p><button className="primary" onClick={()=>location.reload()}>Neu laden</button></div>:help?<div className="help-screen"><button className="close-help icon-button" onClick={()=>setHelp(false)} aria-label="Anleitung schließen"><X/></button><p className="eyebrow">EIN GANZ NORMALER SONNTAG</p><h2>Rette den Feierabend.</h2><p>Hamid hat für alles eine Lösung. Leider auch für Dinge, die noch gar nicht kaputt waren.</p><div className="help-steps"><div><span>01</span><p><strong>Leuchtende Kreise suchen</strong>Steuere Hamid mit WASD, Pfeiltasten oder dem Touch-Joystick zu einer Aufgabe.</p></div><div><span>02</span><p><strong>Anpacken, bevor’s knallt</strong>Drücke E oder ANPACKEN. Löse das kleine Minispiel. Die Anleitung hält die Zeit an.</p></div><div><span>03</span><p><strong>Chaos unter 100 halten</strong>Erledigte Aufgaben beruhigen die Familie. Abgelaufene Aufgaben bringen Unruhe. Zum Schluss wartet der Familien-Mainframe.</p></div></div><div className="help-controls"><span><kbd>⇧</kbd> kurzer Sprint</span><span><kbd>P / ESC</kbd> Pause</span><span><kbd>1–4</kbd> Antworten</span></div><button className="primary" onClick={()=>setHelp(false)}>Alles klar, ich bin vom Fach. <Check size={19}/></button></div>:null}
        {!help&&!worldError&&s.phase==='paused'&&<div className="pause-screen"><span className="pause-icon"><Pause size={28}/></span><p className="eyebrow">DER HAUSHALT KANN WARTEN</p><h2>Erst mal einen Tee.</h2><p>Ausnahmsweise bleibt Hamid kurz sitzen.</p><button className="primary" onClick={()=>{resumeGame(s);refresh();}} autoFocus><Play size={18}/>Weiter geht’s</button><div className="pause-actions"><button className="secondary" onClick={()=>setHelp(true)}><HelpCircle size={18}/>Anleitung</button><button className="secondary" onClick={mainMenu}><House size={18}/>Hauptmenü</button></div></div>}
        {!worldError&&activeTask&&<div style={{display:!help&&s.phase==='minigame'?'block':'none'}}><MiniGame key={`${activeTask.id}-${activeTask.station}-${s.finalJob}`} station={activeTask.station} taskId={activeTask.id} final={s.finalJob} difficulty={s.difficulty} paused={s.phase!=='minigame'||help} onReady={v=>{miniReady.current=v;}} onFinish={completeMini} onMistake={()=>{failAttempt(game.current);refresh();}} sound={kind=>audio.current?.effect(kind)}/>{s.phase==='minigame'&&<button className="text-button abandon-task" onClick={()=>{cancelTask(s);miniReady.current=false;refresh();}}>Später weitermachen</button>}</div>}
        {!help&&!worldError&&finished&&<div className="result-screen"><div className={`result-medal ${s.phase==='lost'?'lost':''}`}>{s.phase==='won'?<Trophy size={45}/>:<Cat size={45}/>}</div><p className="eyebrow">{s.phase==='won'?'MISSION FEIERABEND: GESCHAFFT':'DER FAMILIENRAT HAT ENTSCHIEDEN'}</p><h2>{s.phase==='won'?'War doch nur kurz.':'Papa. Erst mal hinsetzen.'}</h2><p>{s.phase==='won'?'Internet läuft. Licht brennt. Katzen behaupten, sie hätten Hunger.':s.time<=0?'Die Zeit ist um. Hamid hatte gerade erst richtig angefangen.':'Zu viel Chaos. Die Katzen übernehmen vorübergehend die Haushaltsleitung.'}</p><div className="result-score">{s.score.toLocaleString('de-DE')}<span>FEIERABEND-PUNKTE</span></div><div className="result-stats"><div><strong>{s.completed}</strong><span>ERLEDIGT</span></div><div><strong>{s.bestCombo}×</strong><span>BESTE SERIE</span></div><div><strong>{Math.ceil(s.chaos)}%</strong><span>RESTCHAOS</span></div></div><div className="result-rank">{rank(s)}</div><button className="primary" onClick={start} autoFocus><RotateCcw size={19}/>Noch mal kurz</button><button className="text-button" onClick={mainMenu}>Zurück ins Hauptmenü</button></div>}
      </DialogContent>
    </Dialog>
  </main>;
}
