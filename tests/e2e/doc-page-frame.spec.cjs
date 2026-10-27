const {test,expect}=require('@playwright/test');
const cases=[{width:1024,zoom:150},{width:1440,zoom:75},{width:1440,zoom:100},{width:1920,zoom:150}];
for(const {width,zoom} of cases)test(`Docs preserves desktop paper proportions at ${width}px and ${zoom}%`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(zoom=>localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({zoom})),zoom);
 await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 const geometry=await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,width:r.width,height:r.height}};return {paper:box('.document-paper'),label:box('.doc-page-metadata'),font:getComputedStyle(document.querySelector('.doc-page-metadata')).fontSize,root:document.documentElement.scrollWidth,viewport:innerWidth}});
 expect(geometry.paper.width).toBeCloseTo(794*zoom/100,0);
 expect(geometry.paper.height).toBeCloseTo(1123*zoom/100,0);
 expect(geometry.label.x).toBeCloseTo(geometry.paper.x,0);expect(geometry.font).toBe('11px');
 expect(geometry.root).toBeLessThanOrEqual(geometry.viewport+1);
 await expect(page.getByRole('group',{name:'Document page setup'})).toContainText('19 mm margins');
});
test('Docs aligns headers with landscape paper and resets scaling for printing',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').fill('Page geometry regression');await page.locator('[data-ot-tab="Layout"]').click();
 page.once('dialog',d=>d.accept('Quarterly report'));await page.locator('[data-ot-action="page-header"]').click();
 page.once('dialog',d=>d.accept('Internal'));await page.locator('[data-ot-action="page-footer"]').click();
 await page.locator('[data-ot-input="paper"]').selectOption('Letter');await page.locator('[data-ot-input="orientation"]').selectOption('landscape');
 await page.locator('[data-ot-input="margins"]').selectOption('wide');
 const widths=await page.locator('.doc-page-surface').evaluate(el=>[...el.children].map(n=>n.getBoundingClientRect().width));
 expect(widths[0]).toBeCloseTo(widths[1],0);expect(widths[2]).toBeCloseTo(widths[1],0);
 await page.reload();await expect(page.locator('#rich-content')).toContainText('Page geometry regression');
 await expect(page.locator('.doc-page-metadata')).toContainText('Landscape');await expect(page.locator('.doc-page-metadata')).toContainText('25 mm margins');
 await page.emulateMedia({media:'print'});await expect(page.locator('.doc-page-metadata')).toBeHidden();
 expect(await page.locator('.doc-page-surface').evaluate(el=>getComputedStyle(el).zoom)).toBe('1');
});
for(const width of [320,768])test(`Docs page metadata and canvas fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 const sizes=await page.evaluate(()=>{const label=document.querySelector('.doc-page-metadata').getBoundingClientRect();return {root:document.documentElement.scrollWidth,viewport:innerWidth,left:label.left,right:label.right}});
 expect(sizes.root).toBeLessThanOrEqual(width+1);expect(sizes.left).toBeGreaterThanOrEqual(0);expect(sizes.right).toBeLessThanOrEqual(width+1);
 await page.screenshot({path:`.artifacts/page-label-fix/mobile-${width}.png`});
});
