const {test,expect}=require('@playwright/test');
for(const width of [1024,1440,1920])test(`Home ribbon fields are fully visible at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 const fields=page.locator('[aria-label="Typeface & color"] [data-ot-input]');await expect(fields).toHaveCount(4);
 const checks=await fields.evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect(),s=el.closest('.ot-ribbon-tools').getBoundingClientRect();return {top:r.top>=s.top,bottom:r.bottom<=s.bottom,width:r.width,height:r.height}}));
 for(const c of checks){expect(c.top&&c.bottom).toBe(true);expect(c.width).toBeGreaterThan(60);expect(c.height).toBeGreaterThanOrEqual(28);}
 await expect(page.locator('select[data-ribbon-density]')).toHaveCount(1);await expect(page.locator('.ot-ribbon-meta [data-ribbon-density]')).toBeVisible();
 const overflowing=await page.locator('.ot-ribbon-tools').evaluate(el=>el.scrollWidth>el.clientWidth+2);await expect(page.locator('.ribbon-navigation')).toBeVisible({visible:overflowing});
 const canvas=await page.locator('.doc-canvas').boundingBox();const paper=await page.locator('.document-paper').boundingBox();expect(canvas.width).toBeGreaterThan(width*.75);expect(paper.x).toBeGreaterThanOrEqual(canvas.x-1);expect(paper.x+paper.width).toBeLessThanOrEqual(canvas.x+canvas.width+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await page.screenshot({path:`.artifacts/page-label-fix/chrome-${width}.png`});
});
