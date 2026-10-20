const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});
test('command palette opens by keyboard, searches actions and creates a spreadsheet',async({page})=>{
  await page.keyboard.press('Control+k');
  await expect(page.locator('#studio-command-search')).toBeFocused();
  await page.locator('#studio-command-search').fill('spreadsheet');
  await expect(page.locator('[data-command-run]:not([hidden])')).toHaveCount(1);
  await page.locator('#studio-command-search').press('Enter');
  await expect(page.locator('.sheet-table')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.locator('#studio-command-search').fill('save locally');
  await expect(page.locator('[data-command-run]:not([hidden])')).toHaveCount(1);
  await page.locator('#studio-command-search').press('Enter');
  await expect(page.locator('#studio-command-search')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.sheet-table')).toBeVisible();
});
test('Docs review can find the next/previous occurrence without modifying the content',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').fill('Alpha beta Alpha gamma');
  await page.locator('[data-ot-tab="Review"]').click();
  await page.locator('#ot-find').fill('alpha');
  await page.locator('[data-ot-action="find-next"]').click();
  await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString())).toBe('Alpha');
  await page.locator('[data-ot-action="find-next"]').click();
  await expect(page.locator('#toast')).toContainText('Match 2 of 2');
  await page.locator('[data-ot-action="find-previous"]').click();
  await expect(page.locator('#toast')).toContainText('Match 1 of 2');
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('Alpha beta Alpha gamma');
});
test('Sheets conditional-format rules highlight matching numeric ranges and survive reload',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('20');
  await page.locator('[data-cell="A1"]').press('Enter');
  await page.locator('[data-cell="B1"]').fill('5');
  await page.locator('[data-cell="B1"]').press('Enter');
  await page.locator('[data-ot-tab="Rules"]').click();
  let index=0;const entries=['A1:B1','10','#dff6e9'];
  page.on('dialog',dialog=>{dialog.accept(entries[index++]||'');});
  await page.locator('[data-ot-action="rule-greater"]').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveCSS('background-color','rgb(223, 246, 233)');
  await expect(page.locator('[data-cell="B1"]')).not.toHaveCSS('background-color','rgb(223, 246, 233)');
  await page.reload();
  await expect(page.locator('[data-cell="A1"]')).toHaveCSS('background-color','rgb(223, 246, 233)');
  await page.locator('[data-ot-tab="Rules"]').click();
  await expect(page.locator('.ot-ribbon-tools')).toContainText('1 conditional rules');
  await page.locator('[data-ot-action="rule-clear"]').click();
  await expect(page.locator('.ot-ribbon-tools')).toContainText('0 conditional rules');
});
test('Notes pin action survives reload and keeps notebooks available',async({page})=>{
  await page.locator('[data-create="notes"]').first().click();
  await expect(page.locator('[data-note-pin]')).toContainText('Pin note');
  await page.locator('[data-note-pin]').click();
  await expect(page.locator('[data-note-pin]')).toContainText('Pinned');
  await page.reload();
  await expect(page.locator('[data-note-pin]')).toHaveAttribute('aria-pressed','true');
});
test('Slides shape quarter-turn is editable and survives MySoft PPTX roundtrip',async({page})=>{
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('[data-ot-tab="Shapes"]').click();
  await page.locator('[data-ot-action="shape-rect"]').click();
  await page.locator('[data-ot-action="shape-rotate-right"]').click();
  await expect(page.locator('[data-slide-object]').first()).toHaveAttribute('style',/rotate\(90deg\)/);
  const result=await page.evaluate(async()=>{
    const {createPPTX,importPPTX}=await import('/src/ooxml-pptx.js');
    const file={type:'slides',slides:[{title:'Rotated',body:'',objects:[{id:'a',kind:'rect',x:15,y:20,w:24,h:20,rotation:90,fill:'#ea4c24',color:'#202d48',text:'',fontSize:22}]}]};
    const encoded=createPPTX(file);
    const decoded=await importPPTX(encoded.bytes);
    return decoded.slides[0].objects[0].rotation;
  });
  expect(result).toBe(90);
});
for(const width of [320,390,768,1440]){
  test('command palette and new editor fit width '+width+' without horizontal page overflow',async({page})=>{
    await page.setViewportSize({width,height:800});
    await page.locator('[data-action="commands"]').click();
    await expect(page.locator('#studio-command-search')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.locator('[data-command-run="create:slides"]').click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  });
}
