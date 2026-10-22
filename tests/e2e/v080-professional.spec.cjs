const {test,expect}=require('@playwright/test');
test('Sheets copies relative formulas to a new destination and saves them',async({page})=>{
 await page.goto('/');await page.locator('[data-create="sheets"]').first().click();
 await page.locator('[data-cell="A1"]').fill('12');await page.locator('[data-cell="A1"]').press('Enter');
 await page.locator('[data-cell="B1"]').fill('=A1+3');await page.locator('[data-cell="B1"]').press('Enter');
 await page.locator('[data-ot-tab="Range"]').click();
 page.once('dialog',d=>d.accept('A1:B1'));page.once('dialog',d=>d.accept('D3'));
 await page.locator('[data-ot-action="range-copy-to"]').click();
 await expect(page.locator('[data-cell="E3"]')).toHaveValue('15');
 await page.keyboard.press('Control+s');await page.reload();
 await expect(page.locator('[data-cell="E3"]')).toHaveValue('15');
});
test('Docs refreshes an inserted contents snapshot after heading edits',async({page})=>{
 await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').fill('Opening');
 await page.locator('[data-ot-action="style-h1"]').click();
 await page.locator('[data-ot-tab="Insert"]').click();
 await page.locator('[data-ot-action="insert-contents"]').click();
 await expect(page.locator('#rich-content ol li')).toContainText('Opening');
 await page.locator('#rich-content h1').evaluate(el=>el.textContent='Revised opening');
 await page.locator('[data-ot-action="refresh-contents"]').click();
 await expect(page.locator('#rich-content ol li')).toContainText('Revised opening');
});
