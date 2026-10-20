const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('orangered studio palette persists across reload and supports dark mode',async({page})=>{
  await page.locator('[data-ot-action="preferences"]').click();
  await expect(page.locator('.studio-swatch')).toHaveCount(8);
  await page.locator('[data-ot-palette="#ea4c24"]').click();
  await expect(page.locator('html')).toHaveCSS('--studio-accent','#ea4c24');
  await page.locator('[data-ot-pref="mode"]').selectOption('dark');
  await page.locator('[data-ot-action="settings-close"]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-mode','dark');
  await expect(page.locator('html')).toHaveCSS('--studio-accent','#ea4c24');
});

test('ribbon collapse and zoom are fully functional',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await expect(page.locator('.ot-ribbon-tools')).toBeVisible();
  await page.locator('[data-ot-action="ribbon-toggle"]').click();
  await expect(page.locator('.ot-ribbon-tools')).toBeHidden();
  await page.reload();
  await expect(page.locator('.ot-ribbon-tools')).toBeHidden();
  await page.locator('[data-ot-action="ribbon-toggle"]').click();
  await expect(page.locator('.ot-ribbon-tools')).toBeVisible();
  await page.locator('[data-ot-action="zoom-in"]').click();
  await expect(page.locator('#studio-zoom-value')).toHaveText('110%');
  await page.reload();
  await expect(page.locator('#studio-zoom-value')).toHaveText('110%');
});

test('spreadsheet includes alignment, text replacement and fill down',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('Oranges');
  await page.locator('[data-cell="A1"]').press('Tab');
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-ot-tab="Format"]').click();
  await page.locator('[data-ot-action="cell-align-center"]').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveCSS('text-align','center');
  await page.locator('[data-ot-tab="Data"]').click();
  let index=0;
  page.on('dialog',d=>{const answers=['Oranges','Tangerines','5'];d.accept(answers[index++]||'5');});
  await page.locator('[data-ot-action="sheet-find-replace"]').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveValue('Tangerines');
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-ot-action="sheet-fill-down"]').click();
  await expect(page.locator('[data-cell="A2"]')).toHaveValue('Tangerines');
  await page.reload();
  await expect(page.locator('[data-cell="A2"]')).toHaveValue('Tangerines');
});

test('slide backdrop choices persist and change editable stage appearance',async({page})=>{
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('[data-ot-input="backdrop"]').selectOption('sunset');
  await expect(page.locator('.slide-stage')).toHaveCSS('background-color','rgb(255, 240, 230)');
  await page.reload();
  await expect(page.locator('[data-ot-input="backdrop"]')).toHaveValue('sunset');
  await expect(page.locator('.slide-stage')).toHaveCSS('background-color','rgb(255, 240, 230)');
});

test('documents have extra text tools including quotes',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('[data-ot-tab="Insert"]').click();
  await page.locator('[data-ot-action="insert-quote"]').click();
  await expect(page.locator('#rich-content blockquote')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#rich-content blockquote')).toHaveCount(1);
});

for(const width of [360,390,768,1024,1440]){
  test('all editors fit main viewport at '+width+'px without sibling overlap',async({page})=>{
    await page.setViewportSize({width,height:850});
    const check=async label=>{
      const layout=await page.evaluate(()=>{
        const root=document.documentElement;
        const width=window.innerWidth;
        const editor=document.querySelector('.editor-head');
        const controls=editor?[...editor.querySelectorAll('button')].filter(b=>b.offsetParent!==null):[];
        const rects=controls.map(el=>el.getBoundingClientRect());
        let overlaps=0;
        for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
          const a=rects[i],b=rects[j];
          if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>3 &&
             Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>3)overlaps++;
        }
        return {scrollWidth:root.scrollWidth,windowWidth:width,overlaps,
          ribbon:document.querySelector('.ot-ribbon-tools')?.scrollWidth||0,
          hasStudioCSS:!!document.querySelector('link[href*="studio.css"]')};
      });
      expect(layout.hasStudioCSS,label).toBe(true);
      expect(layout.scrollWidth,label+' page-wide horizontal overflow').toBeLessThanOrEqual(layout.windowWidth+1);
      expect(layout.overlaps,label+' editor buttons overlap').toBe(0);
    };
    await check('home');
    for(const type of ['docs','sheets','slides','notes']){
      await page.locator('[data-create="'+type+'"]').first().click();
      await check(type);
      await page.locator('[data-action="close-editor"]').click();
      await page.goto('/');
    }
  });
}
