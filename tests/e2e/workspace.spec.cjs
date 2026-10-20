const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});
test('dashboard launches Docs, autosaves, records versions and exports',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await expect(page.locator('#rich-content')).toBeVisible();
  await page.locator('#document-title').fill('E2E Document');
  await page.locator('#rich-content').fill('A useful document');
  await page.locator('#rich-content').blur();
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('A useful document');
  await page.locator('[data-action="revisions"]').click();
  await expect(page.getByText('Version history')).toBeVisible();
  await page.locator('[data-action="modal-close"]').click();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('E2E-Document.html');
});
test('sheet formulas recalculate and survive reload',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('2');
  await page.locator('[data-cell="A2"]').fill('3');
  await page.locator('[data-cell="B1"]').fill('=SUM(A1:A2)');
  await page.locator('[data-cell="B2"]').click();
  await expect(page.locator('[data-cell="B1"]')).toHaveValue('5');
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.locator('[data-cell="B1"]')).toHaveValue('5');
});
test('deleted note can be recovered from recycle bin',async({page})=>{
  await page.locator('[data-create="notes"]').first().click();
  await page.locator('#document-title').fill('Recover me');
  await page.locator('#rich-content').fill('important note');
  await page.locator('[data-action="close-editor"]').click();
  await page.locator('[data-delete]').first().click();
  await page.locator('[data-action="confirm-delete"]').click();
  await page.locator('[data-nav="trash"]').click();
  await expect(page.getByText('Recover me')).toBeVisible();
  await page.locator('[data-restore-trash]').first().click();
  await page.locator('[data-nav="files"]').click();
  await expect(page.getByText('Recover me')).toBeVisible();
});
test('importing CSV populates cells',async({page})=>{
  await page.locator('#external-file-upload').setInputFiles({
    name:'expenses.csv',mimeType:'text/csv',buffer:Buffer.from('Title,Cost\nLaptop,100\n')
  });
  await expect(page.locator('[data-cell="A2"]')).toHaveValue('Laptop');
  await expect(page.locator('[data-cell="B2"]')).toHaveValue('100');
});
test('cloud explains required setup when unconfigured',async({page})=>{
  await page.locator('[data-action="cloud"]').click();
  await expect(page.getByText('Cloud is not configured yet.')).toBeVisible();
});


test('Docs ribbon creates a formatted table and updates page layout',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('[data-ot-tab="Insert"]').click();
  await page.locator('[data-ot-action="insert-table"]').click();
  await expect(page.locator('#rich-content table tr')).toHaveCount(3);
  await page.locator('[data-ot-tab="Layout"]').click();
  await page.locator('[data-ot-input="orientation"]').selectOption('landscape');
  await page.locator('[data-action="close-editor"]').click();
  await page.locator('[data-open]').first().click();
  await expect(page.locator('#rich-content table tr')).toHaveCount(3);
  await page.locator('[data-ot-tab="Layout"]').click();
  await expect(page.locator('[data-ot-input="orientation"]')).toHaveValue('landscape');
});
test('Sheets offers multiple independent worksheets and cell formatting',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('Original');
  await page.locator('[data-ot-action="sheet-add"]').first().click();
  await page.locator('[data-cell="A1"]').fill('Second');
  await page.locator('[data-ot-sheet="0"]').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveValue('Original');
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-ot-action="cell-bold"]').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveCSS('font-weight','750');
  await page.reload();
  await expect(page.locator('[data-cell="A1"]')).toHaveValue('Original');
  await expect(page.locator('[data-ot-sheet]')).toHaveCount(2);
});
test('appearance preferences persist between reloads',async({page})=>{
  await page.locator('[data-ot-action="preferences"]').click();
  await page.locator('[data-ot-pref="mode"]').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-mode','dark');
  await page.locator('[data-ot-action="settings-close"]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mode','dark');
});
test('slide show can advance and close',async({page})=>{
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('[data-ot-tab="Present"]').click();
  await page.locator('[data-ot-action="present"]').click();
  await expect(page.locator('#ot-presentation')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#ot-presentation')).toContainText('1 / 1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#ot-presentation')).toHaveCount(0);
});

test('Docs can insert a small picture and preserve it after reload',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('[data-ot-tab="Insert"]').click();
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator('[data-ot-action="insert-picture"]').click();
  const chooser=await chooserPromise;
  await chooser.setFiles({
    name:'sample.png',mimeType:'image/png',
    buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9so6Q1sAAAAASUVORK5CYII=','base64')
  });
  await expect(page.locator('#rich-content img')).toHaveCount(1);
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.locator('#rich-content img')).toHaveCount(1);
});
