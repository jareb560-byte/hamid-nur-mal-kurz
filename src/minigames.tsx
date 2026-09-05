import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Cat,Phone,Terminal,ShieldCheck,RotateCcw,Play,Volume2} from 'lucide-react';
import type {StationId,Difficulty} from './simulation';
import {STATIONS} from './simulation';

const phoneQuestions=[
  {q:'Haben Sie den Router neu gestartet?',a:['Ja. Was prüfen wir als Nächstes?','ICH STARTE GLEICH DIE GANZE STRASSE NEU!'],ok:0},
  {q:'Ich verbinde Sie kurz weiter.',a:['Mit wem? Dem Vorstand?!','Gut. Ich bleibe dran.'],ok:1},
  {q:'Einen kleinen Moment bitte.',a:['DER MOMENT HAT SCHON GEBURTSTAG!','Einatmen. Ausatmen.'],ok:1},
  {q:'Können Sie die Kundennummer nennen?',a:['Einen Moment, ich suche sie raus.','DIE MÜSSEN SIE DOCH KENNEN!'],ok:0},
  {q:'Wir schicken Ihnen eine Anleitung.',a:['ICH HABE ANLEITUNGEN ERFUNDEN!','Danke. Die schaue ich mir an.'],ok:1},
];
const stories=[
  {old:'„Ich war fünf Minuten auf dem Balkon.“',now:'„Nach zwei Stunden war ich fertig.“',ok:0},
  {old:'„Das habe ich in der Küche repariert.“',now:'„Da stand ich also im Keller …“',ok:1},
  {old:'„Ich habe einmal dort angerufen.“',now:'„Beim vierten Gespräch kannten die mich.“',ok:2},
  {old:'„Das war gestern Nachmittag.“',now:'„Also, letzten Dienstag …“',ok:0},
  {old:'„Drei Schrauben waren übrig.“',now:'„Die eine Schraube braucht kein Mensch.“',ok:2},
  {old:'„Die Katze saß auf dem Sofa.“',now:'„Da saß sie also im Kühlschrank.“',ok:1},
];
const INSTRUCTIONS:Record<StationId,{title:string;description:string;rule:string;action:string}>={
  ladder:{title:'Keine Kunststücke, Papa.',description:'Die Leiter wackelt. Halte die Anzeige sechs Sekunden lang in der Mitte.',rule:'Mit ← / → oder den großen Tasten gegensteuern. Die orangefarbenen Ränder sind tabu.',action:'Leiter festhalten'},
  power:{title:'Ein Funke Selbstvertrauen.',description:'Merke dir die leuchtende Schaltfolge und spiele sie nach.',rule:'Vier fiktive Schalter. Tastatur 1–4 oder antippen. Bei einem Fehler beginnt dieselbe Folge neu.',action:'Folge ansehen'},
  cats:{title:'Diese Katze verhungert nicht.',description:'Halte die Futtertaste gedrückt. Lass im markierten Bereich los.',rule:'Ziel: eine Portion. Die Katze behauptet etwas anderes. Leertaste oder Futtertaste halten.',action:'Napf bereitstellen'},
  phone:{title:'Bitte bleiben Sie sachlich.',description:'Drei Antworten. Wähle jeweils die, bei der niemand den Hörer weglegen muss.',rule:'Mit 1 / 2 oder antippen antworten. Großbuchstaben sind selten die Lösung.',action:'Anruf annehmen'},
  mainframe:{title:'Endlich ein vernünftiges Problem.',description:'Bringe den Familien-Mainframe wieder zum Laufen. Folge dem Ablauf im Terminal.',rule:'Wähle die Befehle in der angezeigten Reihenfolge. Tastatur 1–4 oder antippen.',action:'Am Terminal anmelden'},
  rumor:{title:'Die Geschichte wächst mit.',description:'Vergleiche beide Versionen. Welches Detail hat Hamid unterwegs verbessert?',rule:'Zeit, Ort oder Anzahl? Beide Aussagen bleiben stehen. Tastatur 1–3 oder antippen.',action:'Genauer nachfragen'},
};
type Props={station:StationId;taskId:number;final:boolean;difficulty:Difficulty;paused:boolean;onReady:(ready:boolean)=>void;onFinish:(quality:number)=>void;onMistake:()=>void;sound:(kind:'ok'|'bad'|'click')=>void};
export function MiniGame(p:Props){
  const [started,setStarted]=useState(false),[step,setStep]=useState(0),[feedback,setFeedback]=useState(''),[mistakes,setMistakes]=useState(0),[done,setDone]=useState(false);
  const [frame,setFrame]=useState(0);const run=useRef({time:0,value:0,bad:0,holding:false,left:false,right:false,ended:false,ready:false,error:0});
  const pRef=useRef(p);pRef.current=p;const stepRef=useRef(step);stepRef.current=step;
  const sequence=useRef(Array.from({length:p.final?6:p.difficulty==='legend'?4:3},(_,i)=>(p.taskId*7+i*3+(i%2))%4)).current;
  const intro=INSTRUCTIONS[p.station],station=STATIONS.find(s=>s.id===p.station)!;
  const finish=(quality:number)=>{if(run.current.ended)return;run.current.ended=true;setDone(true);p.sound('ok');p.onReady(false);setFeedback('');run.current.value=quality;};
  const mistake=(message:string)=>{p.sound('bad');p.onMistake();setMistakes(v=>v+1);setFeedback(message);};
  const releaseFood=()=>{if(!run.current.holding||!started||done||p.paused)return;run.current.holding=false;const amount=run.current.value;
    if(amount>=.55&&amount<=.78){finish(1-Math.abs(amount-.66)*2);}else{mistake(amount>.78?'„Das ist ein Buffet, Papa.“ Noch mal eine Portion.':'Das war selbst der Katze zu wenig. Noch einmal.');run.current.value=0;}};
  const answer=(index:number)=>{
    if(!started||done||p.paused)return;const step=stepRef.current;
    if(p.station==='power'){
      if(run.current.time<sequence.length*.85+.5)return;
      if(index===sequence[step]){p.sound('click');if(step+1===sequence.length)finish(Math.max(.7,1-mistakes*.1));else setStep(step+1);setFeedback('');}
      else{mistake('Das war die Stimmungssicherung. Dieselbe Folge noch einmal.');setStep(0);run.current.time=0;}
    }
    if(p.station==='mainframe'){
      const order=p.final?[2,0,1,2,1,0]:[2,0,1];
      if(index===order[step]){p.sound('click');if(step+1===order.length)finish(Math.max(.7,1-mistakes*.1));else setStep(step+1);setFeedback('');}
      else mistake(index===3?'IPL? Nicht während die Familie online ist!':'Fast. Schau auf den nächsten Schritt im Ablauf.');
    }
    if(p.station==='phone'){
      const q=phoneQuestions[(p.taskId+step)%phoneQuestions.length];if(index!==q.ok){mistake('Durchatmen, Hamid. Versuch es etwas freundlicher.');return;}
      p.sound('click');if(step===2)finish(Math.max(.7,1-mistakes*.1));else{setStep(step+1);setFeedback('');}
    }
    if(p.station==='rumor'){
      const q=stories[(p.taskId+step)%stories.length];if(index!==q.ok){mistake('„Die Details sind doch nebensächlich.“ Lies noch mal genau.');return;}
      p.sound('click');if(step===2)finish(Math.max(.7,1-mistakes*.1));else{setStep(step+1);setFeedback('');}
    }
  };
  const answerRef=useRef(answer);answerRef.current=answer;const releaseRef=useRef(releaseFood);releaseRef.current=releaseFood;
  useEffect(()=>{p.onReady(false);return()=>pRef.current.onReady(false);},[]);
  useEffect(()=>{
    if(!started||p.paused||done)return;let raf=0,last=performance.now(),accum=0;
    const loop=(now:number)=>{const delta=Math.min((now-last)/1000,.25);last=now;const r=run.current;r.time+=delta;
      if(p.station==='cats'&&r.holding){r.value+=delta*.24;if(r.value>=.95)releaseRef.current();}
      if(p.station==='ladder'){
        const drift=.35+Math.sin(r.time*1.4+p.taskId)*.5+Math.sin(r.time*3.7)*.28;
        r.value=Math.max(-1,Math.min(1,r.value+(drift+(r.right?1:0)*.85-(r.left?1:0)*.85)*delta));r.error+=Math.abs(r.value)*delta;
        r.bad=Math.abs(r.value)>.8?r.bad+delta:Math.max(0,r.bad-delta*.6);
        if(r.bad>.7){pRef.current.onMistake();pRef.current.sound('bad');setMistakes(v=>v+1);setFeedback('Die Leiter stand emotional etwas schief. Neue Runde!');r.time=0;r.value=0;r.bad=0;r.error=0;}
        if(r.time>=6&&!r.ended)finish(Math.max(.7,1-r.error/6*.5));
      }
      accum+=delta;if(accum>=1/30){setFrame(v=>v+1);accum=0;}if(!r.ended)raf=requestAnimationFrame(loop);
    };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
  },[started,p.paused,done]);
  useEffect(()=>{
    if(p.paused){run.current.holding=false;run.current.left=false;run.current.right=false;}
    const down=(e:KeyboardEvent)=>{if(p.paused||!started||done||e.repeat)return;if(['Space','ArrowLeft','ArrowRight','Digit1','Digit2','Digit3','Digit4'].includes(e.code))e.preventDefault();
      if(e.code==='Space'&&p.station==='cats'){run.current.holding=true;setFeedback('');}
      if(e.code==='ArrowLeft'||e.code==='KeyA')run.current.left=true;if(e.code==='ArrowRight'||e.code==='KeyD')run.current.right=true;
      if(/^Digit[1-4]$/.test(e.code))answerRef.current(Number(e.code.slice(-1))-1);
    };const up=(e:KeyboardEvent)=>{if(e.code==='Space')releaseRef.current();if(e.code==='ArrowLeft'||e.code==='KeyA')run.current.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')run.current.right=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[started,p.paused,done,p.station]);
  void frame;
  const begin=()=>{setStarted(true);run.current.ready=true;run.current.time=0;p.onReady(true);p.sound('click');};
  const displayOrder=p.final?['PRÜFEN','STARTEN','ARCHIVIEREN','PRÜFEN','ARCHIVIEREN','STARTEN']:['PRÜFEN','STARTEN','ARCHIVIEREN'];
  if(done)return <div className="mini-success"><div className="success-seal"><Check size={48}/></div><p className="eyebrow">AUFTRAG ERLEDIGT</p><h2>{p.final?'RC=0. Familie gerettet.':p.station==='cats'?'Eine Portion. Drei beleidigte Katzen.':p.station==='phone'?'Sachlich geblieben. Fast.':p.station==='mainframe'?'Läuft. Natürlich läuft’s.':'Hamid hat alles im Griff.'}</h2><p>{station.quip}</p><button className="primary" autoFocus onClick={()=>p.onFinish(run.current.value)}>{p.final?'Feierabend!':'Weiter im Haushalt'} <ArrowRight size={19}/></button></div>;
  if(!started)return <div className="mini-intro"><p className="eyebrow">{p.final?'DAS GROSSE FINALE':station.name.toUpperCase()}</p><h2>{p.final?'Der Familienserver ist abgestürzt.':intro.title}</h2><p>{p.final?'Alle warten aufs Internet. Jetzt schlägt deine Stunde: sechs Schritte bis zum verdienten Feierabend.':intro.description}</p><div className="instruction"><ShieldCheck size={24}/><span>{intro.rule}</span></div><blockquote>{station.quip}</blockquote><button className="primary" onClick={begin} autoFocus><Play size={18} fill="currentColor"/>{intro.action}</button><small>Kurze Verschnaufpause: Die Spielzeit wartet auf dich.</small></div>;
  return <div className={`minigame station-${p.station}`}>
    <div className="mini-heading"><span className="eyebrow">{p.final?'FINALE':station.name.toUpperCase()}</span><span className="mini-step">{p.station==='ladder'?`${Math.max(0,6-run.current.time).toFixed(1)} s`:p.station==='cats'?'1 PORTION':`${step+1} / ${p.station==='power'?sequence.length:p.final?6:3}`}</span></div>
    {p.station==='ladder'&&<><h2>Ganz ruhig, Balkon-Papa.</h2><p>Halte die Anzeige in der Mitte.</p><div className="balance-meter"><div className="balance-safe"/><div className="balance-needle" style={{left:`${50+run.current.value*46}%`}}>▼</div><span>ZU WEIT</span><span>GENAU HIER</span><span>ZU WEIT</span></div><div className="balance-progress"><i style={{width:`${run.current.time/6*100}%`}}/></div><div className="balance-buttons">{[-1,1].map(dir=><button key={dir} className="secondary" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);if(dir<0)run.current.left=true;else run.current.right=true;}} onPointerUp={()=>{run.current.left=false;run.current.right=false;}} onPointerCancel={()=>{run.current.left=false;run.current.right=false;}}>{dir<0?<ArrowLeft/>:<ArrowRight/>}{dir<0?'Nach links':'Nach rechts'}</button>)}</div></>}
    {p.station==='power'&&<><h2>{run.current.time<sequence.length*.85+.5?'Genau hinsehen …':'Jetzt du. In derselben Reihenfolge.'}</h2><p>{run.current.time<sequence.length*.85+.5?'Merke dir die leuchtenden Schalter.':'Jeder Treffer bringt das Licht zurück.'}</p><div className="sequence-progress">{sequence.map((_,i)=><span key={i} className={i<step?'complete':''}>{i<step?<Check size={16}/>:i+1}</span>)}</div><div className="switch-grid">{['A','B','C','D'].map((letter,i)=>{const showing=run.current.time<sequence.length*.85;const active=showing&&sequence[Math.floor(run.current.time/.85)]===i&&run.current.time%.85<.62;return <button key={letter} disabled={run.current.time<sequence.length*.85+.5} className={`switch ${active?'lit':''}`} onClick={()=>answer(i)}><span className="switch-lamp"/><strong>{letter}</strong><kbd>{i+1}</kbd></button>;})}</div><button className="text-button" onClick={()=>{run.current.time=0;setStep(0);}}><RotateCcw size={14}/>Folge noch einmal zeigen</button></>}
    {p.station==='cats'&&<><div className="cat-quote"><Cat size={36}/><span>„Seit acht Minuten nichts gegessen.“<small>— eine offensichtlich dramatische Katze</small></span></div><h2>{Math.round(run.current.value/.66*100)} <span className="unit">% einer Portion</span></h2><div className="food-meter"><div className="food-target"/><div className="food-fill" style={{width:`${run.current.value*100}%`}}/><span className="food-target-label">HIER LOSLASSEN</span></div><div className="meter-labels"><span>Ein Häppchen</span><span>Familienbuffet</span></div><button className="primary feed-button" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);run.current.holding=true;setFeedback('');}} onPointerUp={releaseFood} onPointerCancel={()=>{run.current.holding=false;run.current.value=0;}}>Futter einfüllen <span>Gedrückt halten</span></button><p className="key-hint">Oder die <kbd>Leertaste</kbd> halten und im Zielbereich loslassen.</p></>}
    {p.station==='phone'&&<><div className="hotline"><span className="hotline-icon"><Phone size={28}/></span><div><strong>Telekom-Hotline</strong><span><i/> VERBUNDEN · NOCH</span></div><Volume2 className="hotline-wave"/></div><h2>„{phoneQuestions[(p.taskId+step)%phoneQuestions.length].q}“</h2><div className="answer-list">{phoneQuestions[(p.taskId+step)%phoneQuestions.length].a.map((text,i)=><button key={`${step}-${i}`} className="answer" onClick={()=>answer(i)}><kbd>{i+1}</kbd><span>{text}</span></button>)}</div></>}
    {p.station==='rumor'&&<><h2>Was hat sich verändert?</h2><div className="story-versions"><div><span>VOR ZWEI MINUTEN</span><p>{stories[(p.taskId+step)%stories.length].old}</p></div><div><span>JETZT PLÖTZLICH</span><p>{stories[(p.taskId+step)%stories.length].now}</p></div></div><div className="three-answers">{['Die Zeit','Der Ort','Die Anzahl'].map((v,i)=><button className="answer" key={v} onClick={()=>answer(i)}><kbd>{i+1}</kbd>{v}</button>)}</div></>}
    {p.station==='mainframe'&&<><div className="terminal-screen"><div className="terminal-top"><Terminal size={17}/> HAMID SYSTEMS · z/OS <span>●</span></div><p>REXX / MVS — JOB: {p.final?'FAMILIE':'FUTTER01'}</p><p className="terminal-muted">{p.final?'RESTORE FAMILY_CONNECTION':'EXEC HOUSEHOLD_ROUTINE'}</p>{displayOrder.map((v,i)=><div key={i} className={`terminal-line ${i===step?'current':''} ${i<step?'passed':''}`}><span>{i<step?'[OK]':i===step?' >  ':'[  ]'}</span>{v}{i===step&&<span className="cursor">▌</span>}</div>)}<p className="terminal-muted">{step?'PROGRESS SAVED. WEITER GEHT’S.':'AWAITING THE PERSON WHO KNOWS EVERYTHING.'}</p></div><div className="command-grid">{['STARTEN','ARCHIVIEREN','PRÜFEN','ALLES NEU STARTEN'].map((cmd,i)=><button className={`answer ${i===3?'danger-answer':''}`} key={cmd} onClick={()=>answer(i)}><kbd>{i+1}</kbd>{cmd}</button>)}</div></>}
    <p className={`mini-feedback ${feedback?'has-feedback':''}`} role="status">{feedback||'Du schaffst das. Hamid ist schließlich vom Fach.'}</p>
  </div>;
}
