const {test,expect}=require('@playwright/test');
test('Docs heading promotion keeps paragraph indentation and inline markup after reopen',async({page})=>{
 await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').evaluate(el=>{el.innerHTML='<p style="margin-left: 32px" dir="rtl">Report <strong>summary</strong></p><p>Later</p>';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('[data-ot-tab="Structure"]').click();
 await page.locator('[data-ot-action="block-promote"]').click();
 await expect(page.locator('#rich-content h3').first()).toHaveCSS('margin-left','32px');
 await expect(page.locator('#rich-content h3 strong')).toHaveText('summary');
 await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');
 await page.reload();await expect(page.locator('#rich-content h3 strong')).toHaveText('summary');
 await expect(page.locator('#rich-content h3').first()).toHaveCSS('margin-left','32px');
});
test('Sheets Fill down translates formulas instead of copying cached values',async({page})=>{
 await page.goto('/');await page.locator('[data-create="sheets"]').first().click();
 for(const [ref,value] of Object.entries({A1:'2',A2:'4',A3:'6',B1:'=A1*3'})){
  await page.locator('[data-cell="'+ref+'"]').fill(value);
  await page.locator('[data-cell="'+ref+'"]').press('Enter');
 }
 await page.locator('[data-cell="B1"]').click();
 await page.locator('[data-ot-tab="Data"]').click();
 page.once('dialog',d=>d.accept('2'));
 await page.locator('[data-ot-action="sheet-fill-down"]').click();
 await page.locator('[data-cell="B3"]').click();
 await expect(page.locator('#formula-input')).toHaveValue('=A3*3');
 await expect(page.locator('[data-cell="B3"]')).toHaveValue('18');
 await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');
 await page.reload();await expect(page.locator('[data-cell="B3"]')).toHaveValue('18');
});
