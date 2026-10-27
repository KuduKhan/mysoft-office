const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
test.describe.configure({mode:'parallel'});
for(const width of [320,768,1440])for(const mode of ['light','dark'])test(`compact ribbons retain every group across six apps at ${width}px ${mode}`,async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});await page.addInitScript(mode=>localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({mode})),mode);
 await page.goto('/#/templates');await page.locator('[data-template-pack]').click();await expect(page.locator('[data-workspace-tab]')).toHaveCount(6);
 const entries=await page.locator('[data-workspace-tab]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.workspaceTab,type:n.dataset.app})));
 expect(entries.map(e=>e.type).sort()).toEqual(['docs','sheets','slides','notes','pdf','media'].sort());await fs.mkdir('.artifacts/ribbon-compact',{recursive:true});const measurements=[];
 for(const {id,type}of entries){
  await page.locator(`[data-workspace-tab="${id}"]`).click();
  const categories=await page.locator('[data-ot-tab]').evaluateAll(nodes=>nodes.map(n=>n.dataset.otTab));
  for(const category of categories.length?categories:['Native']){
   if(category!=='Native')await page.locator(`[data-ot-tab="${category}"]`).click();
   const stage=page.locator('.ot-ribbon-tools,.native-ribbon-stage');await expect(stage).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   const geometry=await stage.evaluate(el=>({height:el.getBoundingClientRect().height,scrollHeight:el.scrollHeight}));expect(geometry.height).toBeLessThanOrEqual(115);
   measurements.push({type,category,...geometry});
   const groups=stage.locator(':scope>.mo-ribbon-group');const count=await groups.count();
   expect(await page.locator('[data-ribbon-group] option').count()).toBe(count);
   for(let i=0;i<count;i++){
    if(await page.locator('[data-ribbon-group]').isVisible())await page.locator('[data-ribbon-group]').selectOption(String(i));else await groups.nth(i).focus();await expect(groups.nth(i)).toBeFocused();
    const controls=groups.nth(i).locator('button:visible:not(:disabled),input:visible:not(:disabled),select:visible:not(:disabled),textarea:visible:not(:disabled)');
    if(await controls.count()){
     const last=controls.last();await last.focus();
     const reachable=await last.evaluate(el=>{const r=el.getBoundingClientRect(),s=el.closest('.ot-ribbon-tools,.native-ribbon-stage').getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1;});expect(reachable,`${type} ${category} group ${i} last control is reachable`).toBeTruthy();
    }
   }
  }
  if(categories.length)await page.locator('[data-ot-tab="Tools"]').click();
  if(await page.locator('[data-ribbon-group]').isVisible())await page.locator('[data-ribbon-group]').selectOption('0');
  await page.locator('#save-status').click();
  await page.screenshot({path:`.artifacts/ribbon-compact/${type}-${width}-${mode}.png`});
 }
 await fs.writeFile(`.artifacts/ribbon-compact/measurements-${width}-${mode}.json`,JSON.stringify(measurements,null,2));expect(errors).toEqual([]);
});
test('Docs Tools shrinks without losing actions; comfortable density remains available',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('[data-create="docs"]').first().click();await page.locator('[data-ot-tab="Tools"]').click();
 const labels=await page.locator('.ot-ribbon-tools button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')||n.textContent.trim()));
 const compact=(await page.locator('.ot-ribbon').boundingBox()).height;expect(compact).toBeLessThan(160);
 await page.getByLabel('Ribbon density',{exact:true}).selectOption('comfortable');const comfortable=(await page.locator('.ot-ribbon').boundingBox()).height;expect(compact).toBeLessThan(comfortable-25);
 expect(await page.locator('.ot-ribbon-tools button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')||n.textContent.trim()))).toEqual(labels);
 await page.getByLabel('Ribbon density',{exact:true}).selectOption('compact');await page.locator('[data-ot-action="ribbon-toggle"]').click();await expect(page.locator('.ot-ribbon-tools')).toBeHidden();await page.locator('[data-ot-action="ribbon-toggle"]').click();await expect(page.locator('.ot-ribbon-tools')).toBeVisible();
 await page.getByRole('button',{name:'Advanced text replacement',exact:true}).click();await expect(page.getByRole('heading',{name:/text replacement/i})).toBeVisible();
});

test('compact phone ribbons retain touch targets and room to edit across six apps',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:667},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.goto(new URL('/#/templates',test.info().project.use.baseURL).toString());await page.locator('[data-template-pack]').click();await expect(page.locator('[data-workspace-tab]')).toHaveCount(6);
 const entries=await page.locator('[data-workspace-tab]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.workspaceTab,type:n.dataset.app})));
 for(const {id,type}of entries){
  await page.locator(`[data-workspace-tab="${id}"]`).click();if(!['pdf','media'].includes(type))await page.locator('[data-ot-tab="Tools"]').click();
  const stage=page.locator('.ot-ribbon-tools,.native-ribbon-stage');expect((await stage.boundingBox()).height).toBeLessThanOrEqual(115);
  const targets=await stage.locator('.mo-control-grid button:visible').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));expect(Math.min(...targets),type+' touch targets').toBeGreaterThanOrEqual(34);
  if(type!=='sheets')await page.getByRole('button',{name:'Hide editor panels',exact:true}).click();
  const work=page.locator({docs:'.editor-body',sheets:'.sheet-scroll',slides:'.slide-stage-wrap',notes:'.note-editor',pdf:'.pdf-viewport',media:'.media-stage'}[type]);expect((await work.boundingBox()).height,type+' edit area').toBeGreaterThan(220);
  if(type==='docs'){await page.locator('#save-status').click();await page.screenshot({path:'.artifacts/ribbon-compact/docs-touch-phone.png'});}
 }
 await context.close();
});
