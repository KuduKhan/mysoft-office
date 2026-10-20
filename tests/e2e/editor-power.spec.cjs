const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});
test('Docs review comments preserve selected quote, resolve and reload',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').fill('Please review this paragraph.');
  await page.locator('#rich-content').evaluate(editor=>{
    const text=editor.firstChild;
    const range=document.createRange();
    range.setStart(text,7);range.setEnd(text,13);
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.locator('[data-ot-tab="Review"]').click();
  page.once('dialog',dialog=>dialog.accept('Clarify the wording'));
  await page.locator('[data-ot-action="review-add-comment"]').click();
  await expect(page.locator('.studio-review-comment')).toHaveCount(1);
  await expect(page.locator('.studio-review-comment')).toContainText('Clarify the wording');
  await page.locator('[data-review-toggle]').click();
  await expect(page.locator('.studio-review-comment.resolved')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.studio-review-comment.resolved')).toHaveCount(1);
  await expect(page.locator('#rich-content')).toContainText('Please review this paragraph');
});
test('Notes notebook and section organization persists across reload',async({page})=>{
  await page.locator('[data-create="notes"]').first().click();
  await page.locator('#rich-content').fill('Release checklist');
  await page.locator('#note-notebook').fill('Projects');
  await page.locator('#note-section').fill('Releases');
  await page.locator('[data-note-move]').click();
  await expect(page.locator('.studio-notebook-title').filter({hasText:'Projects'})).toHaveCount(1);
  await expect(page.locator('.studio-notebook-section').filter({hasText:'Releases'})).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#note-notebook')).toHaveValue('Projects');
  await expect(page.locator('#note-section')).toHaveValue('Releases');
  await expect(page.locator('#rich-content')).toContainText('Release checklist');
});
test('Slides adds a freeform text box, persists edits and exposes shape actions',async({page})=>{
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('[data-ot-tab="Shapes"]').click();
  await page.locator('[data-ot-action="shape-text"]').click();
  await expect(page.locator('[data-slide-object]')).toHaveCount(1);
  await page.locator('[data-slide-object-text]').fill('Editable caption');
  await page.locator('[data-ot-action="shape-right"]').click();
  await expect(page.locator('[data-slide-object]')).toHaveCount(1);
  await page.locator('[data-ot-action="shape-duplicate"]').click();
  await expect(page.locator('[data-slide-object]')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('[data-slide-object]')).toHaveCount(2);
  await expect(page.locator('[data-slide-object-text]').first()).toContainText('Editable caption');
});
test('Slide objects are presented and obey mobile container bounds',async({page})=>{
  await page.setViewportSize({width:390,height:780});
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('[data-ot-tab="Shapes"]').click();
  await page.locator('[data-ot-action="shape-rect"]').click();
  await page.locator('[data-ot-action="shape-ellipse"]').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.locator('[data-ot-tab="Present"]').click();
  await page.locator('[data-ot-action="present"]').click();
  await expect(page.locator('#ot-presentation .studio-shape')).toHaveCount(2);
  await page.locator('[data-ot-action="present-close"]').click();
});
