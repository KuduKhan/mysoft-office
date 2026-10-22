const {test,expect}=require('@playwright/test');

test('Docs inserts a reference to another MySoft file and resolves backlinks',async({page})=>{
 await page.goto('/');
 await page.locator('[data-create="notes"]').first().click();
 const notesId=await page.locator('#rich-content').getAttribute('data-file-id');
 await page.locator('[data-action="close-editor"]').click();
 await page.locator('[data-create="docs"]').first().click();
 await page.locator('[data-ot-tab="Tools"]').click();
 await page.locator('[data-capability-action="workspace-link"]').click();
 await page.locator('[data-workspace-target="'+notesId+'"]').click();
 await expect(page.locator('#rich-content a[href="#/file/'+notesId+'"]')).toHaveCount(1);
 await page.keyboard.press('Control+s');
 await page.reload();
 await expect(page.locator('#rich-content a[href="#/file/'+notesId+'"]')).toHaveCount(1);
 await page.locator('[data-ot-tab="Tools"]').click();
 await page.locator('[data-capability-action="workspace-references"]').click();
 await expect(page.locator('.cap-modal')).toContainText('Untitled');
});

test('Slides adds diamond and hexagon objects with editable PPTX geometry',async({page})=>{
 await page.goto('/');
 await page.locator('[data-create="slides"]').first().click();
 await page.locator('[data-ot-tab="Shapes"]').click();
 await page.locator('[data-ot-action="shape-diamond"]').click();
 await page.locator('[data-ot-action="shape-hexagon"]').click();
 await expect(page.locator('.studio-shape-diamond')).toHaveCount(1);
 await expect(page.locator('.studio-shape-hexagon')).toHaveCount(1);
 const kinds=await page.evaluate(async()=>{
   const {createPPTX,importPPTX}=await import('/src/ooxml-pptx.js');
   const data=createPPTX({type:'slides',slides:[{title:'Test',body:'Shapes',objects:[
     {id:'a',kind:'diamond',x:12,y:15,w:22,h:22,fill:'#123456',color:'#123456'},
     {id:'b',kind:'hexagon',x:45,y:15,w:25,h:25,fill:'#654321',color:'#123456'}
   ]}]});
   return (await importPPTX(data.bytes)).slides[0].objects.map(o=>o.kind);
 });
 expect(kinds).toEqual(['diamond','hexagon']);
});
