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
