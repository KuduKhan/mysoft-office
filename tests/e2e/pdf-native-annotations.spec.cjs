const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const {PDFDocument,PDFName,PDFArray}=require('../../vendor/pdf-lib.min.js');
test('PDF note is saved and exported as a real annotation',async({page})=>{
 const d=await PDFDocument.create(),sheet=d.addPage([400,420]);sheet.drawText('Review',{x:50,y:300,size:12});
 await page.goto('/');
 await page.locator('#pdf-upload').setInputFiles({name:'review.pdf',mimeType:'application/pdf',buffer:Buffer.from(await d.save())});
 await expect(page.locator('#pdf-status')).toContainText('Page 1 of 1');
 await page.locator('[data-pdf-action="mark-note"]').click();
 page.once('dialog',dialog=>dialog.accept('QA review'));
 // PDF pages may extend below the scrollable viewport; click an actually visible
 // part of the canvas rather than a point 40% down an off-screen PDF page.
 await expect(page.locator('[data-pdf-action="mark-note"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#pdf-viewport').evaluate(node=>{node.scrollTop=0;});
 const canvas=await page.locator('#pdf-canvas').boundingBox();
 const frame=await page.locator('#pdf-viewport').boundingBox();
 const x=canvas.x+Math.min(55,canvas.width*.25);
 const y=Math.max(frame.y+20,canvas.y+Math.min(38,canvas.height*.15));
 expect(y).toBeLessThan(frame.y+frame.height-10);
 await page.mouse.click(x,y);
 await expect(page.locator('#pdf-mark-list')).toContainText('QA review');
 await page.keyboard.press('Control+s');await page.reload();
 await expect(page.locator('#pdf-mark-list')).toContainText('QA review');
 const downloaded=page.waitForEvent('download');
 await page.locator('[data-action="export"]').click();
 const file=await downloaded,result=await PDFDocument.load(await fs.readFile(await file.path()));
 expect(result.getPage(0).node.lookup(PDFName.of('Annots'),PDFArray).size()).toBe(1);
});
