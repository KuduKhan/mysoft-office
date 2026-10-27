const {test,expect}=require('@playwright/test');
test.describe.configure({mode:'parallel'});
async function template(page,id){await page.goto('/#/templates');await page.locator(`[data-template-preview="${id}"]`).first().click();await page.locator('[data-template-use]').click();await expect(page.locator('.editor-shell')).toBeVisible();}
async function thumbnails(page){
 const issues=await page.locator('.slide-item').evaluateAll(nodes=>nodes.flatMap(el=>{const box=el.getBoundingClientRect(),thumb=el.querySelector('.slide-thumb').getBoundingClientRect();return el.scrollHeight>el.clientHeight+1||thumb.bottom>box.bottom+1||thumb.right>box.right+1?[{label:el.textContent,scroll:el.scrollHeight,client:el.clientHeight,box:{bottom:box.bottom,right:box.right},thumb:{bottom:thumb.bottom,right:thumb.right}}]:[]}));expect(issues).toEqual([]);
}
test('skip link preserves the current editor route and draft across all six apps',async({page})=>{
 await page.goto('/#/templates');await page.locator('[data-template-pack]').click();await expect(page.locator('[data-workspace-tab]')).toHaveCount(6);const tabs=await page.locator('[data-workspace-tab]').evaluateAll(es=>es.map(e=>({id:e.dataset.workspaceTab,type:e.dataset.app})));
 for(const {id,type}of tabs){await page.locator(`[data-workspace-tab="${id}"]`).click();if(type==='docs'){await page.locator('#rich-content').fill('Keep this draft while skipping navigation.');await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');}
 const url=page.url();await page.locator('.studio-skip-link').focus();await page.locator('.studio-skip-link').click();await expect(page).toHaveURL(url);await expect(page.locator('#studio-main')).toBeFocused();await expect(page.locator('.editor-shell')).toBeVisible();}
 const doc=tabs.find(t=>t.type==='docs');await page.locator(`[data-workspace-tab="${doc.id}"]`).click();await expect(page.locator('#rich-content')).toHaveText('Keep this draft while skipping navigation.');
});
test('numeric zero remains visible in the selected cell and formula bar after Goal Seek and reload',async({page})=>{
 await page.goto('/');await page.locator('[data-create="sheets"]').first().click();for(const [ref,value]of Object.entries({A1:'1',B1:'=A1*2'})){await page.locator(`[data-cell="${ref}"]`).fill(value);await page.locator(`[data-cell="${ref}"]`).press('Enter');}
 await page.locator('[data-ot-tab="Tools"]').click();await page.locator('[data-capability-action="advanced-goal"]').click();await page.getByLabel('Formula cell',{exact:true}).fill('B1');await page.getByLabel('Changing input cell',{exact:true}).fill('A1');await page.getByLabel('Target result',{exact:true}).fill('0');await page.getByLabel('Lower input bound',{exact:true}).fill('0');await page.getByLabel('Upper input bound',{exact:true}).fill('2');await page.getByRole('button',{name:'Solve and preview',exact:true}).click();await page.getByRole('button',{name:'Apply input value',exact:true}).click();
 await page.locator('[data-cell="A1"]').focus();await expect(page.locator('[data-cell="A1"]')).toHaveValue('0');await expect(page.locator('#formula-input')).toHaveValue('0');await page.keyboard.press('ArrowRight');await expect(page.locator('#formula-input')).toHaveValue('=A1*2');await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');await page.reload();await expect(page.locator('#formula-input')).toHaveValue('0');await page.locator('[data-cell="A1"]').focus();await expect(page.locator('[data-cell="A1"]')).toHaveValue('0');
});
test('tablet thumbnails retain their complete geometry in the compact strip',async({page})=>{await page.setViewportSize({width:768,height:900});await template(page,'pitch-deck');await thumbnails(page);});
for(const width of [320,390,768,1024,1440])for(const density of ['compact','comfortable'])for(const mode of ['light','dark'])test(`thumbnail strip fits ${width}px ${density} ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(({density,mode})=>{localStorage.setItem('mysoft-office-ribbon-density',density);localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({mode}));},{density,mode});await template(page,'pitch-deck');await thumbnails(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await page.locator('.slide-item').last().focus();await expect(page.locator('.slide-item').last()).toBeFocused();
 if(width===768&&density==='compact')await page.screenshot({path:`.artifacts/distortion-audit/slides-${width}-${mode}.png`});
});

test('paragraph controls provide enough inner height for their text',async({page})=>{
 for(const width of [320,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/');await page.locator('[data-create="docs"]').first().click();
  const metrics=await page.locator('#doc-block').evaluate(el=>{const s=getComputedStyle(el);return {font:parseFloat(s.fontSize),inner:el.getBoundingClientRect().height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)-parseFloat(s.borderTopWidth)-parseFloat(s.borderBottomWidth)}});
  expect(metrics.inner).toBeGreaterThanOrEqual(metrics.font*1.2);
 }
});
