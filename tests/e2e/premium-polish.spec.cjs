const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{await page.goto('/');});

test('create dialog contains focus and returns it to the invoking control',async({page})=>{
  const trigger=page.locator('.topbar [data-action="new"]');
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Create a new file'});
  await expect(dialog).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('inert','');
  await expect(dialog.locator('#new-title')).toBeFocused();
  await dialog.getByRole('button',{name:'Create file',exact:true}).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.locator('#new-type')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button',{name:'Create file',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#app')).not.toHaveAttribute('inert','');
  await expect(trigger).toBeFocused();
});

test('appearance dialogs keep keyboard focus after rebuilding their controls',async({page})=>{
  const trigger=page.locator('[data-ot-action="preferences"]');
  await trigger.click();
  await expect(page.locator('.modal')).toHaveAttribute('role','dialog');
  await page.locator('[data-ot-palette="#15846c"]').click();
  await page.locator('[data-ot-pref="mode"]').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-mode','dark');
  const contained=await page.evaluate(()=>document.querySelector('.modal').contains(document.activeElement));
  expect(contained).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('file titles open from the keyboard without triggering row actions',async({page})=>{
  await page.locator('.sidebar [data-nav="files"]').click();
  const title=page.getByRole('button',{name:'Welcome to MySoft Office',exact:true});
  await title.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#document-title')).toHaveValue('Welcome to MySoft Office');
  await expect(page.locator('#rich-content')).toBeVisible();
  await expect(page.locator('#modal-root .modal')).toHaveCount(0);
});
