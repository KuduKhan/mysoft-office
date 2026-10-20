const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});
test('Docs can insert rows and columns into a real editable table',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('[data-ot-tab="Insert"]').click();
  await page.locator('[data-ot-action="insert-table"]').click();
  await expect(page.locator('#rich-content table tr')).toHaveCount(3);
  await page.locator('#rich-content table tr').first().locator('td').first().click();
  await page.locator('[data-ot-tab="Table"]').click();
  await page.locator('[data-ot-action="table-add-row"]').click();
  await expect(page.locator('#rich-content table tr')).toHaveCount(4);
  await page.locator('#rich-content table tr').first().locator('td').first().click();
  await page.locator('[data-ot-action="table-add-column"]').click();
  await expect(page.locator('#rich-content table tr').first().locator('td')).toHaveCount(4);
  await page.reload();
  await expect(page.locator('#rich-content table tr')).toHaveCount(4);
  await expect(page.locator('#rich-content table tr').first().locator('td')).toHaveCount(4);
});
test('Sheets can highlight an arbitrary multi-cell range and preserve it',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-ot-tab="Range"]').click();
  page.once('dialog',d=>d.accept('A1:C3'));
  await page.locator('[data-ot-action="range-highlight"]').click();
  await expect(page.locator('[data-cell="C3"]')).toHaveCSS('background-color','rgb(255, 232, 189)');
  await page.reload();
  await expect(page.locator('[data-cell="C3"]')).toHaveCSS('background-color','rgb(255, 232, 189)');
});
test('Sheets fills a numeric series and generates a range summary',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('5');
  await page.locator('[data-cell="A1"]').press('Enter');
  await page.locator('[data-cell="A2"]').fill('10');
  await page.locator('[data-cell="A2"]').press('Enter');
  await page.locator('[data-ot-tab="Range"]').click();
  page.once('dialog',d=>d.accept('A1:A4'));
  await page.locator('[data-ot-action="range-series"]').click();
  await expect(page.locator('[data-cell="A3"]')).toHaveValue('15');
  await expect(page.locator('[data-cell="A4"]')).toHaveValue('20');
  page.once('dialog',d=>d.accept('A1:A4'));
  await page.locator('[data-ot-action="range-summary"]').click();
  await expect(page.getByText('Sum: 50')).toBeVisible();
});
