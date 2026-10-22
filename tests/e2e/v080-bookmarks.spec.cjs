const {test,expect}=require('@playwright/test');
const {PDFDocument}=require('../../vendor/pdf-lib.min.js');
test('PDF source bookmarks remain available after save and reload',async({page})=>{
 const doc=await PDFDocument.create();doc.addPage([400,500]);doc.addPage([400,500]);
 const bytes=Buffer.from(await doc.save());
 await page.goto('/');await page.locator('[data-create="pdf"]').first().click();
 await page.locator('#pdf-upload').setInputFiles({name:'Bookmark fixture.pdf',mimeType:'application/pdf',buffer:bytes});
 await expect(page.locator('#pdf-status')).toContainText('Page 1 of 2');
 await page.locator('[data-pdf-action="next"]').click();
 await page.locator('.pdf-organize').filter({hasText:'MySoft bookmarks'}).locator('summary').click();
 page.once('dialog',dialog=>dialog.accept('Important source page'));
 await page.locator('[data-pdf-action="bookmark-add"]').click();
 await expect(page.locator('#pdf-bookmarks-list')).toContainText('Important source page');
 await page.keyboard.press('Control+s');await page.reload();
 await page.locator('.pdf-organize').filter({hasText:'MySoft bookmarks'}).locator('summary').click();
 await expect(page.locator('#pdf-bookmarks-list')).toContainText('Important source page');
 await page.locator('[data-pdf-action="bookmark-jump"]').click();
 await expect(page.locator('#pdf-status')).toContainText('Page 2 of 2');
});
