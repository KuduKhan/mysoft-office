const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const out='.artifacts/premium-finish';
for(const width of [320,390,768,1024,1440])for(const mode of ['light','dark'])test(`finished workspace and six editor action rails fit ${width}px ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(mode=>localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({mode})),mode);
 await page.goto('/');await expect(page.locator('.home-resume')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-mode',mode);
 const bounded=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await bounded();
 await fs.mkdir(out,{recursive:true});
 if([390,1440].includes(width))await page.screenshot({path:`${out}/home-${width}-${mode}.png`,fullPage:true});
 for(const app of ['docs','sheets','slides','notes','pdf','media']){
  await page.locator(`[data-create="${app}"]`).first().click();
  await expect(page.locator('.editor-actions')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-mode',mode);await expect(page.locator('#save-status')).toBeVisible();await bounded();
  const focus=page.locator('.editor-actions [data-action="focus-mode"]');
  await focus.focus();await expect(focus).toBeFocused();
  const fits=await focus.evaluate(el=>{const b=el.getBoundingClientRect(),rail=el.closest('.editor-actions').getBoundingClientRect();return b.left>=rail.left-1&&b.right<=rail.right+1});expect(fits).toBeTruthy();
  await page.locator('.editor-actions [data-action="commands"]').click();
  await expect(page.locator('#studio-command-search')).toBeFocused();await bounded();
  await page.keyboard.press('Escape');await expect(page.locator('.modal')).toHaveCount(0);
  await page.goto('/#/home');await expect(page.locator('.home-apps')).toBeVisible();
 }
});
test('resume opens the latest saved file and preserves its contents',async({page})=>{
 await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 await page.getByLabel('File title',{exact:true}).fill('Latest saved draft');
 await page.locator('#rich-content').fill('A draft worth returning to.');
 await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');
 const url=page.url();await page.goto('/#/home');
 await page.getByRole('button',{name:'Resume Latest saved draft',exact:true}).click();
 await expect(page).toHaveURL(url);await expect(page.locator('#rich-content')).toHaveText('A draft worth returning to.');
});
test('command discovery announces results, handles no matches and restores focus',async({page})=>{
 await page.goto('/');const trigger=page.getByRole('button',{name:'Search commands',exact:true});await trigger.click();
 const search=page.locator('#studio-command-search');await expect(search).toBeFocused();
 await search.fill('unmatched-command-zzzz');await expect(page.locator('#studio-command-count')).toHaveText('0 actions found');await expect(page.locator('#studio-command-empty')).toBeVisible();
 await search.fill('templates');await expect(page.locator('#studio-command-count')).toHaveText('1 action found');
 await page.keyboard.press('ArrowDown');await expect(page.locator('[data-command-run="nav:templates"]')).toBeFocused();
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await trigger.click();await search.fill('templates');await page.keyboard.press('Enter');await expect(page).toHaveURL(/#\/templates$/);
});
