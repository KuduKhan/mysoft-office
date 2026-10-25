const {test,expect}=require('@playwright/test');
for(const width of [320,390,768,1024,1440]){
 test('Studio 2.0 keeps home and Docs bounded at '+width+'px and preserves work',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/');
  await expect(page.locator('[data-create="docs"]').first()).toBeVisible();
  const bounded=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await bounded();
  await page.locator('[data-create="docs"]').first().click();
  await expect(page.locator('#rich-content')).toBeVisible();
  await expect(page.locator('.studio-file-tabs')).toBeVisible();
  await bounded();
  await page.locator('#rich-content').fill('Studio 2.0 draft preserved');
  await page.keyboard.press('Control+s');
  await expect(page.locator('#save-status')).toHaveText('Saved on device');
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('Studio 2.0 draft preserved');
  await bounded();
 });
}
test('recent-file strip arrows move focus without navigating away',async({page})=>{
 await page.goto('/');
 await page.locator('[data-create="docs"]').first().click();
 const tabs=page.locator('.studio-file-tab');
 expect(await tabs.count()).toBeGreaterThan(1);
 const before=page.url();
 await tabs.first().focus();
 await page.keyboard.press('ArrowRight');
 await expect(tabs.nth(1)).toBeFocused();
 expect(page.url()).toBe(before);
 await page.keyboard.press('End');
 await expect(tabs.last()).toBeFocused();
 await page.keyboard.press('Home');
 await expect(tabs.first()).toBeFocused();
});
test('mobile ribbon group controls are usable with keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:800});
 await page.goto('/');
 await page.locator('[data-create="docs"]').first().click();
 const buttons=page.locator('.ribbon-navigation button:visible');
 expect(await buttons.count()).toBeGreaterThan(0);
 const box=await buttons.first().boundingBox();
 expect(box.height).toBeGreaterThanOrEqual(30);
 const selector=page.locator('.ribbon-navigation [data-ribbon-group]');
 await expect(selector).toBeEnabled();
 await selector.focus();
 await expect(selector).toBeFocused();
});
