import {test,expect} from '@playwright/test';
test('a solved challenge cannot be abandoned or retroactively boosted during success',async({page})=>{
 await page.goto('/');await page.evaluate(()=>(window as any).__HAMID_DEV__.rushStation('mainframe'));
 await page.getByRole('button',{name:'Am Terminal anmelden'}).click();
 for(let i=0;i<3;i++){const line=await page.locator('.terminal-line.current').textContent();const cmd=line?.includes('RC=0')?'WEITER':line?.includes('RC=4')?'PRÜFEN':'BEHEBEN';await page.locator('.command-grid button').filter({hasText:cmd}).click();}
 await expect(page.locator('.mini-success')).toBeVisible();await expect(page.locator('.abandon-task')).toBeHidden();await expect(page.locator('.mini-power')).toBeDisabled();
 await page.keyboard.press('q');expect(await page.evaluate(()=>(window as any).__HAMID_DEV__.getState().rush.powerTime)).toBe(0);
 await page.getByRole('button',{name:'Weiter im Haushalt'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__HAMID_DEV__.getState().completed)).toBe(1);
 await page.keyboard.press('q');expect(await page.evaluate(()=>(window as any).__HAMID_DEV__.getState().rush.powerTime)).toBeGreaterThan(10);
});
