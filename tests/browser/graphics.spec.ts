import {test,expect,type Page} from '@playwright/test';

const state=(page:Page)=>page.evaluate(()=>(window as any).__HAMID_DEV__.getState());
const graphics=(page:Page)=>page.evaluate(()=>(window as any).__HAMID_DEV__.graphics());
async function lose(page:Page){
  await page.evaluate(()=>{
    const canvas=document.querySelector('canvas')!;
    const ext=canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context');
    if(!ext)throw new Error('Context-loss extension required for this regression test');
    (window as any).__lostExtension=ext;(window as any).__lostCanvas=canvas;ext.loseContext();
  });
  await expect(page.getByRole('heading',{name:'Grafik wird wiederhergestellt.'})).toBeVisible();
}
async function restore(page:Page){
  await page.evaluate(()=>(window as any).__lostExtension.restoreContext());
  await expect(page.getByRole('button',{name:'Weiter geht’s',exact:true})).toBeVisible({timeout:10000});
}
test('actual WebGL loss freezes the game, blocks resume, then recovers without a reload',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'FEIERABEND RETTEN'}).click();
  await expect.poll(async()=>(await graphics(page))?.draws??0).toBeGreaterThan(2);
  await page.keyboard.down('d');await page.waitForTimeout(150);await lose(page);await page.keyboard.up('d');
  const frozen=await state(page),draws=(await graphics(page)).draws;
  await page.keyboard.press('p');await page.keyboard.press('Escape');await page.waitForTimeout(250);
  expect(await state(page)).toEqual(frozen);expect((await graphics(page)).draws).toBe(draws);
  await restore(page);expect((await state(page)).phase).toBe('paused');expect((await state(page)).time).toBe(frozen.time);
  expect(await page.evaluate(()=>document.querySelector('canvas')===(window as any).__lostCanvas)).toBe(true);
  expect((await graphics(page)).profile.name).toBe('safe');expect((await graphics(page)).shadows).toBe(false);
  await page.getByRole('button',{name:'Weiter geht’s',exact:true}).click();await expect.poll(async()=>(await state(page)).time).toBeLessThan(frozen.time);
  expect(errors).toEqual([]);
});
test('automatic and manual canvas rebuild retain in-progress minigame answers and score',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.evaluate(()=>(window as any).__HAMID_DEV__.station('phone'));
  await page.getByRole('button',{name:'Anruf annehmen'}).click();await page.getByRole('button',{name:'Danke. Die schaue ich mir an.',exact:false}).click();
  await expect(page.locator('.mini-step')).toHaveText('2 / 3');await lose(page);const frozen=await state(page);
  // No synthetic restore: the bounded recovery timeout must replace the failed canvas.
  await expect(page.getByRole('button',{name:'Weiter geht’s',exact:true})).toBeVisible({timeout:15000});
  expect(await page.evaluate(()=>document.querySelector('canvas')!==(window as any).__lostCanvas)).toBe(true);
  expect((await state(page)).time).toBe(frozen.time);expect((await state(page)).score).toBe(frozen.score);expect((await state(page)).activeTask).toBe(frozen.activeTask);
  await page.getByRole('button',{name:'Weiter geht’s',exact:true}).click();await expect(page.locator('.mini-step')).toHaveText('2 / 3');
  await page.getByRole('button',{name:'Ja. Was prüfen wir als Nächstes?',exact:false}).click();await lose(page);
  await expect(page.getByRole('heading',{name:'Die Grafik braucht kurz Hilfe.'})).toBeVisible({timeout:8000});
  const secondFreeze=await state(page);await page.getByRole('button',{name:'Grafik neu aufbauen',exact:true}).click();
  await expect(page.getByRole('button',{name:'Weiter geht’s',exact:true})).toBeVisible({timeout:10000});expect((await state(page)).time).toBe(secondFreeze.time);
  await page.getByRole('button',{name:'Weiter geht’s',exact:true}).click();await expect(page.locator('.mini-step')).toHaveText('3 / 3');
  await page.getByRole('button',{name:'Gut. Ich bleibe dran.',exact:false}).click();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();expect((await state(page)).completed).toBe(1);expect((await state(page)).score).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test('held feeding input is released at loss while the existing portion survives',async({page})=>{
  await page.goto('/');await page.evaluate(()=>(window as any).__HAMID_DEV__.station('cats'));await page.getByRole('button',{name:'Napf bereitstellen'}).click();
  await page.keyboard.down('Space');await page.waitForFunction(()=>parseInt(document.querySelector('.station-cats h2')?.textContent??'0')>=25);
  await lose(page);await page.keyboard.up('Space');const amount=await page.locator('.station-cats h2').textContent();await restore(page);await page.getByRole('button',{name:'Weiter geht’s',exact:true}).click();
  await page.waitForTimeout(350);expect(await page.locator('.station-cats h2').textContent()).toBe(amount);
  await page.keyboard.down('Space');await page.waitForFunction(()=>parseInt(document.querySelector('.station-cats h2')?.textContent??'0')>=95);await page.keyboard.up('Space');
  await expect(page.getByRole('button',{name:'Weiter im Haushalt'})).toBeVisible();
});
test('high-DPR phone caps GPU work across rotation and releases retired contexts',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});const page=await context.newPage();
  await page.goto('/');await page.getByRole('button',{name:'FEIERABEND RETTEN'}).tap();await expect.poll(async()=>(await graphics(page))?.draws??0).toBeGreaterThan(2);
  let profile=await graphics(page);expect(profile.profile.name).toBe('mobile');expect(profile.pixelRatio).toBeLessThanOrEqual(1);expect(profile.shadows).toBe(false);
  await page.screenshot({path:'qa/mobile-safe-world.png'});
  const sample=()=>page.evaluate(()=>({draws:(window as any).__HAMID_DEV__.graphics().draws,now:performance.now()}));
  const before=await sample();await page.waitForTimeout(1000);const after=await sample();
  expect((after.draws-before.draws)*1000/(after.now-before.now)).toBeLessThanOrEqual(31.5);expect(after.draws).toBeGreaterThan(before.draws);
  for(const size of [{width:844,height:390},{width:390,height:844}]){
    await page.setViewportSize(size);await page.waitForTimeout(180);
    expect(await page.evaluate(()=>{const c=document.querySelector('canvas')!;return c.width*c.height;})).toBeLessThanOrEqual(750_000);
  }
  for(let i=0;i<3;i++){
    await page.evaluate(()=>{((window as any).__retiredContexts??=[]).push(document.querySelector('canvas')!.getContext('webgl2'));});
    await page.getByRole('button',{name:'Spiel pausieren'}).tap();await page.getByRole('button',{name:'Hauptmenü',exact:true}).tap();
    await expect.poll(()=>page.evaluate(()=>(window as any).__retiredContexts.every((gl:WebGL2RenderingContext)=>gl.isContextLost()))).toBe(true);
    await page.getByRole('button',{name:'FEIERABEND RETTEN'}).tap();await expect.poll(async()=>(await graphics(page))?.draws??0).toBeGreaterThan(0);
  }
  await context.close();
});
