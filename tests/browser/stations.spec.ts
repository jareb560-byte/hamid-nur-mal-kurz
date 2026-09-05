import {test,expect,type Page} from '@playwright/test';
async function station(page:Page,id:string,final=false){await page.evaluate(({id,final})=>(window as any).__HAMID_DEV__.station(id,final),{id,final});}
test('all six mechanics, a wrong answer, balance control and the final job work',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await station(page,'phone');await page.getByRole('button',{name:'Anruf annehmen'}).click();await page.screenshot({path:'qa/phone-minigame.png'});
  await page.getByRole('button',{name:'ICH HABE ANLEITUNGEN ERFUNDEN!',exact:false}).click();await expect(page.getByRole('status')).toContainText('Durchatmen');
  for(const answer of ['Danke. Die schaue ich mir an.','Ja. Was prüfen wir als Nächstes?','Gut. Ich bleibe dran.'])await page.getByRole('button',{name:answer,exact:false}).click();
  await expect(page.getByRole('button',{name:'Weiter im Haushalt'})).toBeVisible();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();
  await station(page,'rumor');await page.getByRole('button',{name:'Genauer nachfragen'}).click();await page.screenshot({path:'qa/rumor-minigame.png'});
  for(const answer of ['Die Anzahl','Der Ort','Die Zeit'])await page.getByRole('button',{name:answer,exact:false}).click();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();
  await station(page,'power');await page.getByRole('button',{name:'Folge ansehen'}).click();await expect(page.locator('.switch').first()).toBeEnabled({timeout:10000});await page.screenshot({path:'qa/power-minigame.png'});
  for(const i of [0,0,2])await page.locator('.switch').nth(i).click();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();
  await station(page,'ladder');await page.getByRole('button',{name:'Leiter festhalten'}).click();let held='';
  for(let i=0;i<100;i++){
    if(await page.getByRole('button',{name:'Weiter im Haushalt'}).isVisible())break;
    const left=await page.locator('.balance-needle').evaluate(el=>parseFloat((el as HTMLElement).style.left));const next=left>56?'ArrowLeft':left<44?'ArrowRight':'';
    if(held!==next){if(held)await page.keyboard.up(held);if(next)await page.keyboard.down(next);held=next;}await page.waitForTimeout(110);
  }if(held)await page.keyboard.up(held);await page.screenshot({path:'qa/ladder-success.png'});await page.getByRole('button',{name:'Weiter im Haushalt'}).click();
  await station(page,'mainframe');await page.getByRole('button',{name:'Am Terminal anmelden'}).click();
  for(const cmd of ['PRÜFEN','STARTEN','ARCHIVIEREN'])await page.locator('.command-grid').getByRole('button',{name:new RegExp(`^\\d ${cmd}$`)}).click();await page.getByRole('button',{name:'Weiter im Haushalt'}).click();
  await station(page,'mainframe',true);await page.getByRole('button',{name:'Am Terminal anmelden'}).click();await page.screenshot({path:'qa/finale-minigame.png'});
  for(const cmd of ['PRÜFEN','STARTEN','ARCHIVIEREN','PRÜFEN','ARCHIVIEREN','STARTEN'])await page.locator('.command-grid').getByRole('button',{name:new RegExp(`^\\d ${cmd}$`)}).click();
  await page.getByRole('button',{name:'Feierabend!',exact:true}).click();await expect(page.getByRole('heading',{name:'War doch nur kurz.'})).toBeVisible();await page.screenshot({path:'qa/win-screen.png'});expect(errors).toEqual([]);
});
