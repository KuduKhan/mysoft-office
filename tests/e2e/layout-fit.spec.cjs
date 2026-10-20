const {test,expect}=require('@playwright/test');

for(const [width,height] of [[320,568],[390,664],[768,700],[1024,600],[1440,900],[1920,1080]]){
  test('navigation, long filenames and editor containers fit '+width+'×'+height,async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/');
    await expect(page.locator('.app-card')).toHaveCount(6);
    const check=async()=>{
      const sizes=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));
      expect(sizes.width).toBeLessThanOrEqual(sizes.viewport+1);
    };
    if(width<=860){
      await page.locator('[data-action="mobile"]').click();
      await expect(page.locator('#studio-sidebar')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
    }
    const side=await page.locator('#studio-sidebar').boundingBox();
    for(const item of await page.locator('.sidebar-nav .nav-link,.side-foot .nav-link').all()){
      const r=await item.boundingBox();
      expect(r.x).toBeGreaterThanOrEqual(side.x);
      expect(r.x+r.width).toBeLessThanOrEqual(side.x+side.width+1);
      expect(r.y+r.height).toBeLessThanOrEqual(height+1);
    }
    const nav=await page.locator('.sidebar-nav').boundingBox();
    const footer=await page.locator('.side-foot').boundingBox();
    expect(nav.y+nav.height).toBeLessThanOrEqual(footer.y+1);
    if(width<=860)await page.locator('.studio-sidebar-dismiss').click();
    await page.locator('[data-create="docs"]').first().click();
    await page.locator('#document-title').fill('QuarterlyReview'.repeat(8));
    await page.locator('[data-action="close-editor"]').click();
    await check();
    await expect(page.locator('.topbar [data-action="new"]')).toHaveCount(1);
    await expect(page.locator('.content [data-action="new"]')).toHaveCount(0);
    const table=await page.locator('.data-table').boundingBox();
    for(const cell of await page.locator('.data-table tr:first-child td').all()){
      const r=await cell.boundingBox();
      if(!r)continue;
      expect(r.x+r.width).toBeLessThanOrEqual(table.x+table.width+1);
    }
    await page.screenshot({path:'.artifacts/layout-fit/library-'+width+'.png'});
    for(const type of ['docs','sheets','slides','notes']){
      await page.goto('/');
      await page.locator('[data-create="'+type+'"]').first().click();
      await check();
      const editor=await page.locator('.editor-shell').boundingBox();
      expect(editor.y+editor.height).toBeLessThanOrEqual(height+1);
      const canvas=await page.locator('.editor-body,.sheet-layout,.slide-layout,.note-layout').boundingBox();
      expect(canvas.height).toBeGreaterThan(85);
      await page.screenshot({path:'.artifacts/layout-fit/'+type+'-'+width+'.png'});
    }
  });
}
