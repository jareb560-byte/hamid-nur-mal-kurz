// An original, quiet pizzicato soundtrack and tiny arcade sounds. No audio files.
export class GameAudio {
  context:AudioContext|null=null; master:GainNode|null=null; timer:ReturnType<typeof setInterval>|null=null;
  enabled=true;step=0;playing=false;
  init(){if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.24;this.master.connect(this.context.destination);}void this.context.resume();}
  tone(frequency:number,duration:number,type:OscillatorType='sine',volume=.2,delay=0){
    if(!this.enabled||!this.context||!this.master)return;
    const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  effect(kind:'ok'|'bad'|'click'|'new'|'dash'|'win'){
    if(kind==='ok'||kind==='win'){[440,554.37,659.25,...(kind==='win'?[880,1108.7,1318.5]:[])].forEach((n,i)=>this.tone(n,.3,'sine',.3,i*.08));}
    if(kind==='bad'){this.tone(185,.2,'triangle',.2);this.tone(138,.3,'triangle',.2,.12);}
    if(kind==='click')this.tone(740,.08,'sine',.12);
    if(kind==='new'){this.tone(659,.25,'sine',.15);this.tone(880,.25,'sine',.15,.16);}
    if(kind==='dash')this.tone(240,.12,'triangle',.1);
  }
  setEnabled(value:boolean){this.enabled=value;if(this.master&&this.context)this.master.gain.setTargetAtTime(value?.24:0,this.context.currentTime,.1);}
  music(playing:boolean){
    this.playing=playing;if(this.timer){clearInterval(this.timer);this.timer=null;}if(!playing)return;
    const melody=[0,7,12,9,7,4,2,7,0,4,9,12,11,7,4,2];const bass=[130.81,110,146.83,98];
    this.timer=setInterval(()=>{if(!this.enabled)return;const i=this.step++;const root=bass[Math.floor(i/8)%4];if(i%2===0)this.tone(root,.45,'triangle',.13);if(i%2===1||i%8===0)this.tone(261.63*Math.pow(2,melody[i%melody.length]/12),.24,'sine',.11);if(i%4===2)this.tone(1800,.025,'triangle',.025);},260);
  }
  dispose(){if(this.timer)clearInterval(this.timer);void this.context?.close();}
}
