const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await expect(page.locator('[data-create="docs"]').first()).toBeVisible();
});

test('desktop sidebar stays fixed during scrolling and keeps backup controls accessible in compact mode',async({page})=>{
  await page.setViewportSize({width:1440,height:760});
  const sidebar=page.locator('#studio-sidebar'),main=page.locator('#studio-main');
  await expect(sidebar).toHaveCSS('position','fixed');
  const pos=await page.evaluate(()=>{
    const s=document.querySelector('#studio-sidebar').getBoundingClientRect();
    const m=document.querySelector('#studio-main').getBoundingClientRect();
    return {sidebarRight:s.right,mainLeft:m.left,top:s.top};
  });
  expect(Math.abs(pos.sidebarRight-pos.mainLeft)).toBeLessThan(2);
  await page.evaluate(()=>document.body.style.minHeight='2200px');
  await page.evaluate(()=>window.scrollTo(0,900));
  expect(Math.abs((await sidebar.boundingBox()).y)).toBeLessThan(2);
  await page.locator('[data-action="nav-collapse"]').first().click();
  await expect(page.locator('.shell')).toHaveClass(/nav-collapsed/);
  const compact=await page.evaluate(()=>{
    const s=document.querySelector('#studio-sidebar').getBoundingClientRect();
    const m=document.querySelector('#studio-main').getBoundingClientRect();
    return {sidebarRight:s.right,mainLeft:m.left};
  });
  expect(Math.abs(compact.sidebarRight-compact.mainLeft)).toBeLessThan(2);
  await expect(page.locator('.side-foot [data-action="backup"]')).toBeVisible();
  await expect(page.locator('.side-foot [data-action="backup"]')).toHaveAttribute('aria-label','Export backup');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('.side-foot [data-action="backup"]').click();
  expect((await downloadPromise).suggestedFilename()).toContain('mysoft-office-backup');
});

test('mobile drawer traps focus, closes with Escape, and does not exceed the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:620});
  const menu=page.locator('[data-action="mobile"]');
  const sidebar=page.locator('#studio-sidebar');
  await expect(sidebar).toHaveAttribute('aria-hidden','true');
  await menu.click();
  await expect(sidebar).toHaveClass(/open/);
  await expect(sidebar).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.studio-sidebar-dismiss')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.side-foot [data-action="import"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.studio-sidebar-dismiss')).toBeFocused();
  const layout=await page.evaluate(()=>{
    const sidebar=document.querySelector('#studio-sidebar').getBoundingClientRect();
    const footer=document.querySelector('.side-foot').getBoundingClientRect();
    return {sidebarBottom:sidebar.bottom,footerBottom:footer.bottom,width:document.documentElement.scrollWidth};
  });
  expect(layout.sidebarBottom).toBeLessThanOrEqual(621);
  expect(layout.footerBottom).toBeLessThanOrEqual(621);
  expect(layout.width).toBeLessThanOrEqual(391);
  await page.keyboard.press('Escape');
  await expect(sidebar).not.toHaveClass(/open/);
  await expect(sidebar).toHaveAttribute('aria-hidden','true');
  await expect(menu).toBeFocused();
});

test('mobile menu toggles do not remount the open editable document',async({page})=>{
  await page.setViewportSize({width:390,height:700});
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').fill('Preserve unsaved editor selection');
  await page.locator('#rich-content').evaluate(el=>{el.dataset.stableEditor='kept';});
  await page.locator('[data-action="mobile"]').click();
  await page.locator('.studio-sidebar-dismiss').click();
  await expect(page.locator('#rich-content')).toHaveAttribute('data-stable-editor','kept');
  await expect(page.locator('#rich-content')).toContainText('Preserve unsaved editor selection');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('Preserve unsaved editor selection');
});

test('workspace search finds document body text, not just the title',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#document-title').fill('General Report');
  await page.locator('#rich-content').fill('Secretless experimental BLUEYAM label');
  await page.locator('[data-action="close-editor"]').click();
  await page.locator('#global-search').fill('blueyam');
  await page.locator('#global-search').press('Enter');
  await expect(page.getByText('Found in document content')).toBeVisible();
  await expect(page.getByText('General Report')).toBeVisible();
  await expect(page.locator('.page-heading')).toContainText('results for');
});

test('desktop keyboard navigation moves between sidebar routes without activating them',async({page})=>{
  await page.setViewportSize({width:1100,height:760});
  await page.locator('.sidebar-nav [data-nav="home"]').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.sidebar-nav [data-nav="files"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('.sidebar-nav [data-nav="notes"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('.sidebar-nav [data-nav="home"]')).toBeFocused();
  await expect(page.locator('.page-heading')).toHaveCount(0);
});
