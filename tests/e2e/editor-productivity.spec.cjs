const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.goto('/');
  await expect(page.locator('[data-create="docs"]').first()).toBeVisible();
});

test('Docs inserts an editable contents snapshot and saves it',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').evaluate(el=>{
    el.innerHTML='<h1>Project overview</h1><p>Introduction</p><h2>Timeline</h2>';
    el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('[data-ot-tab="Insert"]').click();
  await page.locator('[data-ot-action="insert-contents"]').click();
  await expect(page.locator('#rich-content')).toContainText('Contents');
  await expect(page.locator('#rich-content ol')).toContainText('Project overview');
  await expect(page.locator('#rich-content ol')).toContainText('Timeline');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('#rich-content ol')).toContainText('Timeline');
});

test('Sheets transposes a source range into new cells and preserves original values',async({page})=>{
  await page.locator('[data-create="sheets"]').first().click();
  await page.locator('[data-cell="A1"]').fill('Alpha');
  await page.locator('[data-cell="B1"]').fill('Bravo');
  await page.locator('[data-cell="A2"]').fill('Charlie');
  await page.locator('[data-cell="B2"]').fill('Delta');
  await page.locator('[data-ot-tab="Range"]').click();
  const answers=['A1:B2','D1'];let i=0;
  page.on('dialog',dialog=>dialog.accept(answers[i++]||'D1'));
  await page.locator('[data-ot-action="range-transpose"]').click();
  await expect(page.locator('[data-cell="D1"]')).toHaveValue('Alpha');
  await expect(page.locator('[data-cell="D2"]')).toHaveValue('Bravo');
  await expect(page.locator('[data-cell="E1"]')).toHaveValue('Charlie');
  await expect(page.locator('[data-cell="E2"]')).toHaveValue('Delta');
  await expect(page.locator('[data-cell="B1"]')).toHaveValue('Bravo');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('[data-cell="E2"]')).toHaveValue('Delta');
});

test('Slides replaces text throughout title body and presenter notes',async({page})=>{
  await page.locator('[data-create="slides"]').first().click();
  await page.locator('#slide-title').fill('Mission title');
  await page.locator('#slide-body').fill('Mission objective');
  await page.locator('[data-ot-tab="Present"]').click();
  await page.locator('[data-ot-input="speaker-notes"]').fill('Mission briefing');
  await page.locator('[data-ot-tab="Arrange"]').click();
  const answers=['Mission','Project'];let i=0;
  page.on('dialog',dialog=>dialog.accept(answers[i++]||'Project'));
  await page.locator('[data-ot-action="slide-find-replace"]').click();
  await expect(page.locator('#slide-title')).toHaveText('Project title');
  await expect(page.locator('#slide-body')).toHaveText('Project objective');
  await page.locator('[data-ot-tab="Present"]').click();
  await expect(page.locator('[data-ot-input="speaker-notes"]')).toHaveValue('Project briefing');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('#slide-title')).toHaveText('Project title');
});

test('Notes inserts structured meeting and daily templates',async({page})=>{
  await page.locator('[data-create="notes"]').first().click();
  await page.locator('[data-ot-tab="Organize"]').click();
  await page.locator('[data-ot-action="note-template-meeting"]').click();
  await expect(page.locator('#rich-content')).toContainText('Decisions');
  await expect(page.locator('#rich-content')).toContainText('Action items');
  await page.locator('[data-ot-action="note-template-daily"]').click();
  await expect(page.locator('#rich-content')).toContainText('Top priorities');
  await page.keyboard.press('Control+s');
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('Top priorities');
});
