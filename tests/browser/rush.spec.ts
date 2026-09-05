import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>(window as any).__HAMID_DEV__.getState());
async function setup(page:Page,id:string,completed=0){await page.evaluate(({id,completed})=>(window as any).__HAMID_DEV__.rushStation(id,completed),{id,completed});}
async function solveRC(page:Page){
 for(let i=0;i<9;i++){
  if(!await page.locator('.terminal-line.current').isVisible())break;
  const line=await page.locator('.terminal-line.current').textContent();const cmd=line?.includes('RC=0')?'WEITER':line?.includes('RC=4')?'PRÜFEN':'BEHEBEN';
  await page.locator('.command-grid button').filter({hasText:cmd}).click();
 }
}
test('rush on a phone: one-tap bonuses, routing, special during timing duel, pause and recovery',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.screenshot({path:'qa/rush-mobile-title.png'});await page.getByRole('button',{name:'FEIERABEND RETTEN'}).tap();
 await expect(page.locator('.papa-power')).toBeVisible();await page.waitForTimeout(500);await page.screenshot({path:'qa/rush-mobile-world.png'});expect((await state(page)).mode).toBe('rush');
 await page.locator('.pickup-marker').first().tap();await expect.poll(async()=>(await state(page)).rush.collected,{timeout:15000}).toBeGreaterThan(0);
 await page.locator('.task-card').filter({hasText:'Katzen füttern'}).tap();await expect(page.getByRole('button',{name:'Napf bereitstellen'})).toBeVisible({timeout:15000});
 await setup(page,'phone');await page.getByRole('button',{name:'Anruf annehmen'}).tap();await page.locator('.mini-power').tap();expect((await state(page)).rush.powerTime).toBeGreaterThan(10);
 await page.screenshot({path:'qa/rush-phone-duel.png'});
 await page.waitForFunction(()=>Math.abs(parseFloat((document.querySelector('.comeback-needle') as HTMLElement).style.left)-50)<8);await page.getByRole('button',{name:'JETZT KONTERN'}).tap();await expect(page.locator('.mini-step')).toHaveText('2 / 3');
 await page.evaluate(()=>{const c=document.querySelector('canvas')!;const ext=c.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;(window as any).__ext=ext;ext.loseContext();});await expect(page.getByRole('heading',{name:'Grafik wird wiederhergestellt.'})).toBeVisible();const frozen=await state(page);
 await page.waitForTimeout(250);expect(await state(page)).toEqual(frozen);await page.evaluate(()=>(window as any).__ext.restoreContext());await page.getByRole('button',{name:'Weiter geht’s',exact:true}).tap();await expect(page.locator('.mini-step')).toHaveText('2 / 3');
 for(let i=0;i<2;i++){await page.waitForTimeout(500);await page.waitForFunction(()=>Math.abs(parseFloat((document.querySelector('.comeback-needle') as HTMLElement).style.left)-50)<8);await page.getByRole('button',{name:'JETZT KONTERN'}).tap();}
 await expect.poll(async()=>(await state(page)).completed).toBe(1);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
test('risky terminal earns doubled reward then pauses for a real perk choice',async({page})=>{
 await page.goto('/');await setup(page,'mainframe',2);await page.getByRole('button',{name:'Papa kann das!',exact:false}).click();expect((await state(page)).rush.risky).toBe(true);await page.screenshot({path:'qa/rush-terminal.png'});await solveRC(page);
 await expect(page.getByRole('heading',{name:'Papa legt einen drauf.'})).toBeVisible();expect((await state(page)).rush.riskWins).toBe(1);const t=(await state(page)).time;await page.waitForTimeout(350);expect((await state(page)).time).toBe(t);await page.screenshot({path:'qa/rush-perks.png'});
 await page.locator('.perk-card').first().click();await expect.poll(async()=>(await state(page)).rush.wave).toBe(2);expect((await state(page)).rush.perks.length).toBe(1);expect((await state(page)).time).toBeGreaterThan(t+13);
});
test('final rush chains all three bosses and saves a replay result',async({page})=>{
 await page.goto('/');await setup(page,'mainframe',8);await page.getByRole('button',{name:'Am Terminal anmelden'}).click();await solveRC(page);await expect.poll(async()=>(await state(page)).finalJob).toBe(true);
 for(let boss=0;boss<3;boss++){
  await page.locator('.task-card').first().click();const g=await state(page);
  if(boss===0){await page.getByRole('button',{name:'Anruf annehmen'}).click({timeout:20000});for(let i=0;i<4;i++){
   await page.waitForTimeout(550);
   // Dispatch on the observed animation frame; a round trip through the test runner
   // can miss this timing window under software-renderer load. Touch is tested above.
   await page.waitForFunction(()=>{const el=document.querySelector('.comeback-needle') as HTMLElement|null;if(!el||Math.abs(parseFloat(el.style.left)-50)>5)return false;window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true,cancelable:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}));return true;});
   if(i<3)await expect(page.locator('.mini-step')).toHaveText(`${i+2} / 4`);
  }}
  if(boss===1){await page.getByRole('button',{name:'Folge ansehen'}).click({timeout:20000});const current=await state(page);const {challengeSequence}=await import('../../src/challenges');const seq=challengeSequence(current.rush.challengeSeed,current.activeTask,4);await expect(page.locator('.switch').first()).toBeEnabled({timeout:10000});for(const i of seq)await page.locator('.switch').nth(i).click();}
  if(boss===2){await page.getByRole('button',{name:'Am Terminal anmelden'}).click({timeout:20000});await solveRC(page);}
  await expect.poll(async()=>(await state(page)).phase,{timeout:5000}).not.toBe('minigame');
 }
 await expect(page.getByRole('heading',{name:'War doch nur kurz.'})).toBeVisible();await expect(page.locator('.earned-badges')).toContainText('Feierabend gerettet');await page.screenshot({path:'qa/rush-result.png'});expect((await state(page)).completed).toBe(9);const score=(await state(page)).score;expect(await page.evaluate(()=>Number(localStorage.getItem('hamid-best-rush-normal')))).toBe(score);
 await page.getByRole('button',{name:'Noch mal kurz',exact:false}).click();expect((await state(page)).completed).toBe(0);expect((await state(page)).rush.perks).toEqual([]);
});
test('rush controls fit portrait and landscape phones',async({browser})=>{
 for(const size of [{width:360,height:640},{width:844,height:390}]){const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();await page.goto('/');const start=page.getByRole('button',{name:'FEIERABEND RETTEN'});const startBox=(await start.boundingBox())!;expect(startBox.y).toBeGreaterThanOrEqual(0);expect(startBox.y+startBox.height).toBeLessThanOrEqual(size.height);await start.tap();await page.waitForTimeout(500);
  for(const selector of ['.papa-power','.joystick','.action-button','.rush-event']){const box=(await page.locator(selector).boundingBox())!;expect(box.x,selector).toBeGreaterThanOrEqual(0);expect(box.x+box.width,selector).toBeLessThanOrEqual(size.width);expect(box.y,selector).toBeGreaterThanOrEqual(0);expect(box.y+box.height,selector).toBeLessThanOrEqual(size.height);}
  await page.screenshot({path:`qa/rush-${size.width}x${size.height}.png`});await context.close();}
});
test('moving feeding target and the longer risk story both finish without repeated instructions',async({page})=>{
 await page.goto('/');await setup(page,'cats');await page.getByRole('button',{name:'Papa kann das!',exact:false}).click();
 const initial=await page.locator('.food-target').getAttribute('style');await page.waitForTimeout(300);expect(await page.locator('.food-target').getAttribute('style')).not.toBe(initial);
 await page.keyboard.down('Space');await page.waitForFunction(()=>parseInt(document.querySelector('.station-cats h2')?.textContent??'0')>=98);await page.keyboard.up('Space');
 await expect.poll(async()=>(await state(page)).completed).toBe(1);expect((await state(page)).rush.riskWins).toBe(1);
 await setup(page,'rumor');await page.getByRole('button',{name:'Papa kann das!',exact:false}).click();await expect(page.locator('.mini-step')).toHaveText('1 / 5');
 const {challengeSequence}=await import('../../src/challenges');const first=challengeSequence(37,104,1,12)[0],answers=[0,1,2,0,2,1,2,0,1,2,0,1];
 for(let i=0;i<5;i++)await page.locator('.three-answers button').nth(answers[(first+i)%12]).click();await expect.poll(async()=>(await state(page)).completed).toBe(1);expect((await state(page)).mistakes).toBe(0);
});
