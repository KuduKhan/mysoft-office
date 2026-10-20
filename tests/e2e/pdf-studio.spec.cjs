const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const {PDFDocument,StandardFonts}=require('../../vendor/pdf-lib.min.js');

let bytes;
test.beforeAll(async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
  for(let i=1;i<=2;i++){
    const page=doc.addPage([400,560]);page.drawText('MySoft PDF test page '+i,{x:35,y:490,size:22,font});
    page.drawText('Local PDF reading and export',{x:35,y:450,size:14,font});
  }
  bytes=Buffer.from(await doc.save());
});
test.beforeEach(async({page})=>{await page.goto('/');});
async function openPDF(page){
  await page.locator('[data-create="pdf"]').click();
  await expect(page.getByRole('heading',{name:'MySoft PDF'})).toBeVisible();
  await page.locator('#pdf-upload').setInputFiles({name:'Reader sample.pdf',mimeType:'application/pdf',buffer:bytes});
  await expect(page.locator('#pdf-status')).toContainText('Page 1 of 2');
}
test('PDF imports, renders offline, navigates, rotates and exports a valid copy',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await openPDF(page);
  await expect(page.locator('#pdf-canvas')).toHaveAttribute('aria-label','PDF page 1 of 2');
  await page.locator('[data-pdf-action="next"]').click();
  await expect(page.locator('#pdf-status')).toContainText('Page 2 of 2');
  await page.locator('.pdf-text-panel summary').click();
  await expect(page.locator('#pdf-page-text')).toContainText('MySoft PDF test page 2');
  await page.locator('[data-pdf-action="rotate-right"]').click();
  await expect(page.locator('#pdf-status')).toContainText('Rotated 90°');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('#pdf-status')).toContainText('Page 1 of 2');
  await page.locator('[data-pdf-action="next"]').click();
  await expect(page.locator('#pdf-status')).toContainText('Rotated 90°');
  const exported=page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download=await exported;
  expect(download.suggestedFilename()).toBe('Reader-sample.pdf');
  const result=await PDFDocument.load(await fs.readFile(await download.path()));
  expect(result.getPageCount()).toBe(2);expect(result.getPage(1).getRotation().angle).toBe(90);
  const backupEvent=page.waitForEvent('download');
  await page.locator('.side-foot [data-action="backup"]').click();
  const backup=await backupEvent;
  const snapshot=JSON.parse(await fs.readFile(await backup.path(),'utf8'));
  expect(snapshot.files.find(file=>file.type==='pdf').pdfData).toBe(bytes.toString('base64'));
  await page.context().setOffline(true);
  await page.locator('[data-pdf-action="previous"]').click();
  await expect(page.locator('#pdf-status')).toContainText('Page 1 of 2');
  await page.context().setOffline(false);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#backup-upload').setInputFiles({name:'pdf-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(snapshot))});
  await expect(page.locator('.app-card')).toHaveCount(6);
  await page.locator('.sidebar [data-nav="pdf"]').click();
  await page.getByRole('button',{name:'Reader sample',exact:true}).click();
  await expect(page.locator('#pdf-status')).toContainText('Page 1 of 2');
  await page.locator('[data-pdf-action="next"]').click();
  await expect(page.locator('#pdf-status')).toContainText('Rotated 90°');
  expect(errors).toEqual([]);
});
test('PDF library supports favorites, search, duplicate, trash and restore',async({page})=>{
  await openPDF(page);
  await page.locator('[data-action="close-editor"]').click();
  const row=page.locator('tr[data-open]').filter({hasText:'Reader sample'});
  await row.locator('[data-star]').click();
  await page.locator('.sidebar [data-nav="starred"]').click();
  await expect(page.getByRole('button',{name:'Reader sample',exact:true})).toBeVisible();
  await page.locator('.sidebar [data-nav="files"]').click();
  await page.locator('#global-search').fill('reading and export');await page.locator('#global-search').press('Enter');
  await expect(page.getByText('Found in PDF text')).toBeVisible();
  await row.locator('[data-duplicate]').click();
  await expect(page.getByRole('button',{name:'Reader sample (copy)',exact:true})).toBeVisible();
  await page.locator('tr[data-open]').filter({hasText:'Reader sample (copy)'}).locator('[data-delete]').click();
  await page.locator('[data-action="confirm-delete"]').click();
  await page.locator('.sidebar [data-nav="trash"]').click();
  await page.locator('[data-restore-trash]').click();
  await page.locator('.sidebar [data-nav="pdf"]').click();
  await expect(page.getByRole('button',{name:'Reader sample (copy)',exact:true})).toBeVisible();
});
test('invalid PDFs report an error without replacing the open workspace',async({page})=>{
  await page.locator('[data-create="pdf"]').click();
  await page.locator('#pdf-upload').setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid data')});
  await expect(page.locator('#toast')).toContainText('valid PDF header');
  await expect(page.getByRole('heading',{name:'MySoft PDF'})).toBeVisible();
});
test('PDF is available from navigation and preselected in the new file dialog',async({page})=>{
  await page.locator('.sidebar [data-nav="pdf"]').click();
  await page.locator('.topbar [data-action="new"]').click();
  await expect(page.locator('#new-type')).toHaveValue('pdf');
  await page.locator('#new-title').fill('My PDF workspace');
  await page.locator('#new-form').getByRole('button',{name:'Create file',exact:true}).click();
  await expect(page.locator('#document-title')).toHaveValue('My PDF workspace');
  await expect(page.locator('[data-pdf-action="import"]')).toBeVisible();
});
for(const [width,height] of [[320,568],[1440,900]]){
  test('PDF viewer fits '+width+'px',async({page})=>{
    await page.setViewportSize({width,height});await openPDF(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    const canvas=await page.locator('#pdf-canvas').boundingBox(),viewport=await page.locator('#pdf-viewport').boundingBox();
    expect(canvas.width).toBeLessThanOrEqual(viewport.width);
    await fs.mkdir(path.resolve('.artifacts/pdf-studio'),{recursive:true});
    await page.screenshot({path:'.artifacts/pdf-studio/viewer-'+width+'.png'});
  });
}
