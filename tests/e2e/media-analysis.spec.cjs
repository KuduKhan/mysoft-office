const {test,expect}=require('@playwright/test');
test('Media histogram samples the current rendered drawing and toggles without edits',async({page})=>{
 await page.goto('/');await page.locator('[data-create="media"]').first().click();await page.locator('[data-media-action="drawing"]').click();
 await page.locator('[data-media-action="histogram"]').click();
 await expect(page.locator('#media-histogram-panel')).toBeVisible();
 await expect(page.locator('#media-histogram-count')).toContainText('sampled');
 await page.locator('[data-media-action="histogram"]').click();
 await expect(page.locator('#media-histogram-panel')).toBeHidden();
});
