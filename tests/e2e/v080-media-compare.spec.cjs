const {test,expect}=require('@playwright/test');
test('Media compares original to non-destructive edits without changing saved settings',async({page})=>{
 await page.goto('/');
 await page.locator('[data-create="media"]').first().click();
 const data=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=200;canvas.height=120;
   const context=canvas.getContext('2d');context.fillStyle='#4c82bd';context.fillRect(0,0,200,120);
   return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#media-upload').setInputFiles({name:'Compare.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await expect(page.locator('#media-canvas')).toHaveAttribute('width','200');
 await expect(page.locator('#media-canvas')).toHaveAttribute('height','120');
 const brightness=page.getByLabel('Brightness',{exact:true});
 await brightness.evaluate(input=>{input.value='140';input.dispatchEvent(new Event('change',{bubbles:true}));});
 const compare=page.locator('[data-media-action="compare"]');
 await expect(compare).toHaveAttribute('aria-pressed','false');
 await compare.click();await expect(compare).toHaveAttribute('aria-pressed','true');
 await expect(brightness).toHaveValue('140');
 await compare.click();await expect(compare).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Control+s');await page.reload();
 await expect(page.getByLabel('Brightness',{exact:true})).toHaveValue('140');
 await expect(page.locator('[data-media-action="compare"]')).toHaveAttribute('aria-pressed','false');
});
