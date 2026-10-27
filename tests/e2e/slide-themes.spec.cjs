const {test,expect}=require('@playwright/test');
const palettes={violet:{bg:'rgb(244, 241, 255)',ink:'rgb(48, 36, 81)'},ocean:{bg:'rgb(234, 245, 252)',ink:'rgb(22, 61, 89)'},forest:{bg:'rgb(237, 248, 243)',ink:'rgb(23, 76, 61)'},midnight:{bg:'rgb(23, 32, 54)',ink:'rgb(243, 246, 255)'}};
async function slides(page){await page.goto('/');await page.getByRole('button',{name:'MySoft product vision',exact:true}).click();}
test('all four theme buttons override backdrops, update thumbnails and persist on reopening',async({page})=>{
 await slides(page);await page.locator('[data-ot-input="backdrop"]').selectOption('night');
 for(const [theme,{bg,ink}]of Object.entries(palettes)){
  await page.locator(`[data-theme="${theme}"]`).click();await expect(page.locator(`[data-theme="${theme}"]`)).toHaveAttribute('aria-pressed','true');await expect(page.locator('.slide-stage')).toHaveCSS('background-color',bg);await expect(page.locator('#slide-title')).toHaveCSS('color',ink);await expect(page.locator('.slide-item.active .slide-thumb')).toHaveCSS('background-color',bg);await expect(page.locator('[data-ot-input="backdrop"]')).toHaveValue('theme');
  await page.reload();await expect(page.locator('.slide-stage')).toHaveCSS('background-color',bg);await expect(page.locator('#slide-title')).toHaveText('MySoft Office');
 }
});
test('Follow theme and apply-to-all use one appearance while preserving slide contents and shapes',async({page})=>{
 await slides(page);await page.locator('[data-theme="forest"]').click();await page.locator('[data-ot-input="backdrop"]').selectOption('coral');await expect(page.locator('[data-theme][aria-pressed="true"]')).toHaveCount(0);await expect(page.locator('.slide-stage')).toHaveCSS('background-color','rgb(250, 109, 90)');await page.locator('[data-ot-input="backdrop"]').selectOption('theme');await expect(page.locator('[data-theme="forest"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-ot-action="theme-all"]').click();
 for(let i=0;i<3;i++){await page.locator(`[data-slide="${i}"]`).click();await expect(page.locator('.slide-stage')).toHaveCSS('background-color',palettes.forest.bg);}
 await page.locator('[data-ot-tab="Shapes"]').click();await page.locator('[data-ot-action="shape-rect"]').click();const style=await page.locator('[data-slide-object]').getAttribute('style');await page.locator('[data-theme="midnight"]').click();expect(await page.locator('[data-slide-object]').getAttribute('style')).toBe(style);await page.getByRole('button',{name:'Duplicate current slide',exact:true}).click();await expect(page.locator('.slide-stage')).toHaveCSS('background-color',palettes.midnight.bg);await expect(page.locator('.slide-item')).toHaveCount(4);await expect(page.locator('[data-slide-object]')).toHaveAttribute('style',style);
});
test('presentation and exported PowerPoint retain the selected background and readable text',async({page})=>{
 await slides(page);await page.locator('[data-theme="midnight"]').click();await page.locator('[data-ot-tab="Present"]').click();await page.locator('[data-ot-action="present"]').click();await expect(page.locator('.ot-present-page')).toHaveCSS('background-color',palettes.midnight.bg);await expect(page.locator('.ot-present-page h1')).toHaveCSS('color',palettes.midnight.ink);await page.locator('[data-ot-action="present-close"]').click();
 const pending=page.waitForEvent('download');await page.locator('[data-action="office-export"]').click();await page.locator('[data-action="office-export-confirm"]').click();const download=await pending;const fs=require('node:fs/promises'),bytes=await fs.readFile(await download.path());const xml=await page.evaluate(async base64=>{const {readZip}=await import('/src/ooxml-zip.js');const zip=await readZip(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));return zip['ppt/slides/slide1.xml'];},bytes.toString('base64'));expect(xml).toContain('<p:bg>');expect(xml).toContain('val="172036"');expect(xml).toContain('val="F3F6FF"');
});
for(const width of [320,768,1440])for(const mode of ['light','dark'])test(`slide palette customizer fits ${width}px ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(mode=>localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({mode})),mode);await slides(page);
 for(const theme of Object.keys(palettes)){await page.locator(`[data-theme="${theme}"]`).click();await expect(page.locator('.slide-stage')).toHaveCSS('background-color',palettes[theme].bg);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);}
 await page.locator('[data-theme="ocean"]').click();await page.screenshot({path:`.artifacts/slide-themes/${width}-${mode}.png`});
});
