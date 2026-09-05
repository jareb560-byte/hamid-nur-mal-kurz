import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,STATIONS,SETTINGS,tick,startTask,finishTask,failAttempt,pauseGame,resumeGame,cancelTask,routeToTask,followRoute,choosePerk,activatePower,setRisk,scoreMultiplier,stars,badges,spawnTask} from '../src/simulation.ts';
import {challengeSequence} from '../src/challenges.ts';
function advance(s,t){for(let i=0;i<t*60;i++)tick(s,1/60);}
function enter(s,t=s.tasks[0]){const st=STATIONS.find(v=>v.id===t.station);s.player.x=st.x;s.player.z=st.z;assert.equal(startTask(s,t.id),true);}
test('rush completes three rounds, freezes perk selection and wins a three-part boss in all difficulties',()=>{
 for(const difficulty of Object.keys(SETTINGS)){
  const s=createGame(difficulty,41,'rush');
  for(let i=0;i<9;i++){enter(s);advance(s,5);finishTask(s,.95);if(s.phase==='upgrade'){const copy=structuredClone(s);advance(s,90);assert.deepEqual(s,copy);assert.equal(choosePerk(s,'invalid'),false);assert.equal(choosePerk(s,s.rush.offers[0]),true);}}
  assert.equal(s.completed,9);assert.equal(s.rush.wave,3);assert.equal(s.finalJob,true);assert.equal(s.rush.power,100);
  for(const station of ['phone','power','mainframe']){assert.equal(s.tasks[0].station,station);enter(s);finishTask(s,1);}
  assert.equal(s.phase,'won');assert.equal(s.completed,9);assert.ok(stars(s)>0);assert.ok(badges(s).includes('Feierabend gerettet'));
 }
});
test('expert action is earned, freezes deadlines while world clock runs, and multiplies score once',()=>{
 const s=createGame('normal',7,'rush');assert.equal(activatePower(s),false);s.rush.power=100;const remaining=s.tasks[0].remaining,time=s.time;
 assert.equal(activatePower(s),true);assert.equal(activatePower(s),false);advance(s,5);assert.equal(s.tasks[0].remaining,remaining);assert.ok(s.time<time-4.9);assert.equal(s.rush.power,0);
 enter(s);const plain=createGame('normal',7,'rush');enter(plain);plain.tasks[0].remaining=s.tasks[0].remaining;
 finishTask(s,1);finishTask(plain,1);assert.ok(s.score>=plain.score*1.49);const score=s.score;assert.equal(finishTask(s,1),false);assert.equal(s.score,score);
});
test('risk doubles reward and error cost; cancel removes risk multiplier',()=>{
 const s=createGame('normal',9,'rush'),normal=createGame('normal',9,'rush');enter(s);enter(normal);setRisk(s,true);finishTask(s,1);finishTask(normal,1);assert.ok(Math.abs(s.score/normal.score-2)<.01);assert.equal(s.rush.riskWins,1);
 enter(s);setRisk(s,true);const chaos=s.chaos;failAttempt(s);assert.equal(s.chaos-chaos,10);cancelTask(s);assert.equal(s.rush.risky,false);assert.equal(scoreMultiplier(s),1);
});
test('shields absorb both minigame mistakes and missed tasks; pause freezes the entire rush',()=>{
 const s=createGame('normal',9,'rush');s.rush.shields=2;s.combo=3;enter(s);const chaos=s.chaos;failAttempt(s);assert.equal(s.chaos,chaos);assert.equal(s.combo,3);cancelTask(s);s.tasks[0].remaining=.001;tick(s,1/60);assert.equal(s.combo,3);assert.equal(s.rush.shields,0);assert.ok(s.chaos-chaos<1);
 pauseGame(s);const copy=structuredClone(s);advance(s,90);assert.equal(activatePower(s),false);assert.deepEqual(s,copy);resumeGame(s);
});
test('tap routes reach every station and bonuses without traversing furniture, including boost speeds',()=>{
 for(const target of STATIONS){for(const boosted of [false,true]){const s=createGame('normal',22,'rush');s.tasks=[];spawnTask(s,target.id);if(boosted){s.rush.perks=['slippers'];s.rush.event=2;}assert.equal(routeToTask(s,s.tasks[0].id),true);for(let i=0;i<1500&&s.phase==='playing';i++)followRoute(s,1/60,boosted);assert.equal(s.phase,'minigame',target.id);assert.equal(s.tasks.find(t=>t.id===s.activeTask).station,target.id);}}
 const s=createGame('normal',22,'rush'),pickup=s.rush.pickups[0];assert.equal(routeToTask(s,-pickup.id),true);for(let i=0;i<1500&&s.rush.pickups.some(p=>p.id===pickup.id);i++){followRoute(s,1/60);tick(s,1/60);}assert.ok(!s.rush.pickups.some(p=>p.id===pickup.id));assert.equal(s.rush.collected,1);
});
test('explicit task selection respects the selected station even when another is closer',()=>{
 const s=createGame('normal',1,'rush');s.tasks=[];spawnTask(s,'cats');spawnTask(s,'power');s.player={...s.player,x:1.9,z:-4};assert.equal(startTask(s,s.tasks[1].id),true);assert.equal(s.tasks.find(t=>t.id===s.activeTask).station,'power');
});
test('boss uses a single clock, extra tea never leaves an empty unwinnable room',()=>{
 const s=createGame('normal',42,'rush');for(let i=0;i<9;i++){enter(s);finishTask(s,1);if(s.phase==='upgrade')choosePerk(s,s.rush.offers[0]);}s.time=75;s.tasks[0].remaining=1;s.rush.pickups=[];advance(s,2);assert.equal(s.tasks.length,1);assert.ok(s.tasks[0].remaining>72);s.time+=4;tick(s,.1);assert.equal(s.tasks[0].remaining,s.time);advance(s,20);assert.equal(s.rush.pickups.length,0);
});
test('run variations are deterministic but differ by seed, including challenge sequences',()=>{
 const seen=new Set();for(let seed=0;seed<30;seed++){const a=createGame('normal',seed,'rush'),b=createGame('normal',seed,'rush');advance(a,25);advance(b,25);assert.deepEqual(a,b);assert.ok(a.tasks.length<=3);seen.add(challengeSequence(seed,4,4).join(','));}assert.ok(seen.size>20);
});
