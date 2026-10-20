const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await expect(page.locator('[data-create="docs"]').first()).toBeVisible();
});

test('sidebar layout changes in Customize and persists across reload',async({page})=>{
  await page.locator('[data-action="nav-collapse"]').first().click();
  await expect(page.locator('.shell')).toHaveClass(/nav-collapsed/);
  await expect(page.locator('.sidebar .nav-link[data-nav="files"]')).toHaveAttribute('aria-label','My files');
  await page.reload();
  await expect(page.locator('.shell')).toHaveClass(/nav-collapsed/);
  await page.locator('[data-ot-action="preferences"]').click();
  await expect(page.locator('.studio-customize-nav')).toBeVisible();
  await page.locator('.studio-customize-nav [data-action="nav-collapse"]').click();
  await expect(page.locator('.shell')).not.toHaveClass(/nav-collapsed/);
});

test('recent tabs switch Docs and Sheets; live words metric updates',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#document-title').fill('Session draft');
  await page.locator('#rich-content').fill('One two three');
  await expect(page.locator('#studio-editor-metric')).toContainText('3 words');
  await page.locator('[data-action="close-editor"]').click();
  await page.locator('.sidebar [data-nav="home"]').click();
  await page.locator('[data-create="sheets"]').first().click();
  await expect(page.locator('.studio-file-tabs [data-workspace-tab]')).toHaveCount(5);
  await page.locator('.studio-file-tabs .studio-file-tab').filter({hasText:'Session draft'}).click();
  await expect(page.locator('#rich-content')).toContainText('One two three');
});

test('Focus Mode hides app chrome; Escape restores',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('[data-action="focus-mode"]').click();
  await expect(page.locator('.shell')).toHaveClass(/focus-mode/);
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('#rich-content')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.shell')).not.toHaveClass(/focus-mode/);
  await expect(page.locator('.topbar')).toBeVisible();
});

test('mobile navigation backdrop closes and slash focuses search',async({page})=>{
  await page.setViewportSize({width:390,height:780});
  await page.locator('[data-action="mobile"]').click();
  await expect(page.locator('#studio-sidebar')).toHaveClass(/open/);
  await page.locator('[data-action="mobile-close"]').click({position:{x:380,y:350}});
  await expect(page.locator('#studio-sidebar')).not.toHaveClass(/open/);
  await page.keyboard.press('/');
  await expect(page.locator('#global-search')).toBeFocused();
  await page.locator('#global-search').fill('Welcome');
  await page.locator('#global-search').press('Enter');
  await expect(page.locator('[data-open]').first()).toBeVisible();
});

for(const width of [320,390,768,1440]){
  test('Studio shell remains inside viewport at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:850});
    for(const mode of ['home','editor']){
      if(mode==='editor')await page.locator('[data-create="docs"]').first().click();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      if(mode==='editor')expect(await page.locator('#rich-content').isVisible()).toBe(true);
    }
  });
}
