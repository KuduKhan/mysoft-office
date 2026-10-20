const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();});
test('semantic document blocks can be promoted, reordered, and paginated without losing text',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').fill('Alpha');
  await page.locator('#rich-content').evaluate(el=>{el.innerHTML='<p>Alpha</p><p>Beta</p>';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#rich-content p').nth(1).click();
  await page.locator('[data-ot-tab="Structure"]').click();
  await page.locator('[data-ot-action="block-up"]').click();
  await expect(page.locator('#rich-content p').first()).toContainText('Beta');
  await page.locator('[data-ot-action="block-promote"]').click();
  await expect(page.locator('#rich-content h3').first()).toContainText('Beta');
  await page.locator('[data-ot-action="block-break"]').click();
  await expect(page.locator('#rich-content hr[data-mysoft-page-break="true"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#rich-content h3')).toContainText('Beta');
  await expect(page.locator('#rich-content hr[data-mysoft-page-break="true"]')).toHaveCount(1);
  await expect(page.locator('#rich-content')).toContainText('Alpha');
});
