const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
 await page.goto('/');
 await expect(page.locator('[data-create="docs"]').first()).toBeVisible();
});

test('Docs paragraph styles apply to editable content and survive reload',async({page})=>{
 await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').fill('Professional heading');
 await page.locator('[data-ot-action="style-h1"]').click();
 await expect(page.locator('#rich-content h1')).toContainText('Professional heading');
 await page.keyboard.press('Control+s');
 await page.reload();
 await expect(page.locator('#rich-content h1')).toContainText('Professional heading');
});

test('Sheets conditional comparisons calculate in visible grid and persist',async({page})=>{
 await page.locator('[data-create="sheets"]').first().click();
 await page.locator('[data-cell="A1"]').fill('20');
 await page.locator('[data-cell="B1"]').fill('=IF(A1>10,100,0)');
 await expect(page.locator('[data-cell="B1"]')).toHaveValue('100');
 await page.locator('[data-cell="A1"]').fill('4');
 await expect(page.locator('[data-cell="B1"]')).toHaveValue('0');
 await page.keyboard.press('Control+s');
 await page.reload();
 await expect(page.locator('[data-cell="B1"]')).toHaveValue('0');
});

test('Slides supports rounded and triangle objects through native PPTX round-trip',async({page})=>{
 const result=await page.evaluate(async()=>{
   const {createPPTX,importPPTX}=await import('/src/ooxml-pptx.js');
   const {readZip}=await import('/src/ooxml-zip.js');
   const slide={title:'Modern shapes',body:'Office geometry',theme:'violet',objects:[
     {id:'first',kind:'roundRect',x:10,y:20,w:30,h:24,fill:'#ff6600',color:'#202d48',text:'',fontSize:22},
     {id:'second',kind:'triangle',x:45,y:20,w:25,h:24,fill:'#1777cc',color:'#202d48',text:'',fontSize:22}
   ]};
   const zip=createPPTX({type:'slides',slides:[slide]});
   const parts=await readZip(zip.bytes);
   const reimported=await importPPTX(zip.bytes);
   return {kind:reimported.slides[0].objects.map(o=>o.kind),
     geometry:parts['ppt/slides/slide1.xml'].includes('prst="triangle"'),
     rounded:parts['ppt/slides/slide1.xml'].includes('prst="roundRect"')};
 });
 expect(result.kind).toEqual(['roundRect','triangle']);
 expect(result.geometry).toBe(true);
 expect(result.rounded).toBe(true);
 await page.locator('[data-create="slides"]').first().click();
 await page.locator('[data-ot-tab="Shapes"]').click();
 await page.locator('[data-ot-action="shape-roundRect"]').click();
 await page.locator('[data-ot-action="shape-triangle"]').click();
 await expect(page.locator('.studio-shape-roundRect')).toHaveCount(1);
 await expect(page.locator('.studio-shape-triangle')).toHaveCount(1);
});

test('Notes can rename notebook across matching notes without touching others',async({page})=>{
 await page.locator('[data-create="notes"]').first().click();
 await page.locator('#note-notebook').fill('Projects');
 await page.locator('#note-section').fill('Architecture');
 await page.locator('[data-note-move]').click();
 await page.locator('[data-ot-tab="Organize"]').click();
 page.once('dialog',dialog=>dialog.accept('Studio Lab'));
 await page.locator('[data-ot-action="note-rename-notebook"]').click();
 await expect(page.locator('#note-notebook')).toHaveValue('Studio Lab');
 await page.keyboard.press('Control+s');
 await page.reload();
 await expect(page.locator('#note-notebook')).toHaveValue('Studio Lab');
});

test('stale tab cannot silently overwrite newer committed edits',async({page,context})=>{
 const second=await context.newPage();
 await second.goto('/');
 const firstLink=page.locator('[data-open]').first();
 const id=await firstLink.getAttribute('data-open');
 await firstLink.click();
 await second.locator('[data-open="'+id+'"]').first().click();
 await page.locator('#rich-content').fill('Saved first tab content');
 await page.keyboard.press('Control+s');
 await expect(page.locator('#save-status')).toContainText('Saved on device');
 await second.locator('#rich-content').fill('Conflicting second tab changes');
 await second.keyboard.press('Control+s');
 await expect(second.locator('#save-status')).toContainText('Save failed');
 await expect(second.locator('#toast')).toContainText('Another tab changed');
 const backup=second.waitForEvent('download');
 await second.locator('.sidebar [data-action="backup"]').click();
 expect((await backup).suggestedFilename()).toBe('mysoft-office-backup.json');
 await second.reload();
 await expect(second.locator('#rich-content')).toContainText('Saved first tab content');
 await expect(second.locator('#rich-content')).not.toContainText('Conflicting second tab changes');
 await second.close();
});

test('development HTTP server blocks repository files and includes response hardening',async({request})=>{
 for(const path of ['/.git/HEAD','/package.json','/.env','/supabase/schema.sql','/scripts/server.mjs']){
  const result=await request.get(path);
  expect(result.status(),path).toBe(404);
 }
 const html=await request.get('/');
 expect(html.status()).toBe(200);
 expect(html.headers()['x-frame-options']).toBe('DENY');
 expect(html.headers()['content-security-policy']).toContain("object-src 'none'");
 const denied=await request.post('/index.html',{data:'hi'});
 expect(denied.status()).toBe(405);
});
