import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>(window as any).__HAMID_DEV__.getState());
async function walkTo(page:Page,x:number,z:number){
  for(let i=0;i<35;i++){
    const s=await state(page),dx=x-s.player.x,dz=z-s.player.z,d=Math.hypot(dx,dz);if(d<1.2)return;
    const sx=dx*.8-dz*.6,sy=dx*.6+dz*.8,keys:string[]=[];
    if(Math.abs(sx)>d*.3)keys.push(sx>0?'d':'a');if(Math.abs(sy)>d*.3)keys.push(sy>0?'s':'w');
    for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(Math.min(350,Math.max(80,(d-.8)/4.25*1000)));for(const key of keys)await page.keyboard.up(key);
  }throw new Error(`Could not reach ${x},${z}`);
}
test('desktop: title, rendered world, movement, feeding, scoring, pause and restart',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.getByRole('button',{name:'FEIERABEND RETTEN'})).toBeVisible();
  await expect(page.locator('.cover-art')).toHaveJSProperty('complete',true);await page.screenshot({path:'qa/desktop-title.png',animations:'disabled'});
  await page.getByRole('button',{name:'Klassischer Haushalt',exact:true}).click();
  await page.getByRole('button',{name:'FEIERABEND RETTEN'}).click();await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).__HAMID_DEV__.frames())).toBeGreaterThan(8);
  await page.screenshot({path:'qa/desktop-world.png'});await walkTo(page,3.3,-3.6);await page.keyboard.press('e');
  await expect(page.getByText('Diese Katze verhungert nicht.')).toBeVisible();const t=(await state(page)).time;await page.waitForTimeout(350);expect((await state(page)).time).toBe(t);
  await page.getByRole('button',{name:'Napf bereitstellen'}).click();await page.screenshot({path:'qa/cat-minigame.png'});
  await page.keyboard.down('Space');await page.waitForFunction(()=>parseInt(document.querySelector('.station-cats h2')?.textContent??'0')>=95);await page.keyboard.up('Space');
  await expect(page.getByRole('button',{name:'Weiter im Haushalt'})).toBeVisible();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();expect((await state(page)).completed).toBe(1);expect((await state(page)).score).toBeGreaterThan(0);
  await page.keyboard.press('p');await expect(page.getByText('Erst mal einen Tee.')).toBeVisible();const paused=await state(page);await page.waitForTimeout(450);expect((await state(page)).time).toBe(paused.time);
  await page.getByRole('button',{name:'Weiter geht’s'}).click();await page.keyboard.press('Escape');await expect(page.getByText('Erst mal einen Tee.')).toBeVisible();await page.getByRole('button',{name:'Hauptmenü',exact:true}).click();await expect(page.getByRole('button',{name:'FEIERABEND RETTEN'})).toBeVisible();expect(errors).toEqual([]);
});
test('touch portrait: responsive title, scene and independent touch controls',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.screenshot({path:'qa/mobile-title.png'});await page.getByRole('button',{name:'FEIERABEND RETTEN'}).tap();await expect(page.locator('.joystick')).toBeVisible();await page.waitForTimeout(800);await page.screenshot({path:'qa/mobile-world.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();const initial=await state(page);
  const client=await context.newCDPSession(page);const box=(await page.locator('.joystick').boundingBox())!;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+31,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(600);await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect((await state(page)).player.x).not.toBe(initial.player.x);await page.getByRole('button',{name:'Spiel pausieren'}).tap();await expect(page.getByText('Erst mal einen Tee.')).toBeVisible();expect(errors).toEqual([]);await context.close();
});
test('landscape mobile title and controls remain inside viewport',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:1});const page=await context.newPage();await page.goto('/');await page.screenshot({path:'qa/landscape-title.png'});await page.getByRole('button',{name:'FEIERABEND RETTEN'}).tap();await page.waitForTimeout(650);await page.screenshot({path:'qa/landscape-world.png'});await expect(page.locator('.joystick')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();await context.close();
});
