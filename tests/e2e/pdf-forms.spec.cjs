const {test,expect}=require('@playwright/test');
globalThis.self=globalThis;
const fs=require('node:fs/promises'),{PDFDocument}=require('../../vendor/pdf-lib.min.js');
test('PDF native form value saves and exports as editable field',async({page})=>{
 const doc=await PDFDocument.create(),sheet=doc.addPage([400,400]);
 doc.getForm().createTextField('Name').addToPage(sheet,{x:20,y:240,width:200,height:24});
 await page.goto('/');await page.locator('#pdf-upload').setInputFiles({name:'fields.pdf',mimeType:'application/pdf',buffer:Buffer.from(await doc.save())});
 await expect(page.locator('#pdf-status')).toContainText('Page 1 of 1');
 await page.locator('.pdf-forms-panel summary').click();await expect(page.locator('#pdf-form-fields')).toContainText('Name');
 page.once('dialog',d=>d.accept('Approved content'));await page.locator('[data-pdf-action="form-edit"]').click();
 await page.keyboard.press('Control+s');await page.reload();
 await page.locator('.pdf-forms-panel summary').click();await expect(page.locator('#pdf-form-fields')).toContainText('Approved content');
 const ready=page.waitForEvent('download');await page.locator('[data-action="export"]').click();
 const output=await ready,pdf=await PDFDocument.load(await fs.readFile(await output.path()));
 expect(pdf.getForm().getTextField('Name').getText()).toBe('Approved content');
});
