const {test,expect}=require('@playwright/test');
test('paragraph layout changes only the selection and survives reopening',async({page})=>{
 await page.goto('/');await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').evaluate(root=>{root.innerHTML='<p>First <strong>paragraph</strong></p><p>Second paragraph</p>';root.dispatchEvent(new Event('input',{bubbles:true}));root.focus();const range=document.createRange();range.selectNodeContents(root.firstElementChild);getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));});
 await page.locator('[data-ot-tab="Layout"]').click();await page.getByLabel('Space after (px)',{exact:true}).fill('24');await page.getByLabel('First-line indent (px)',{exact:true}).fill('18');await page.locator('[data-ot-action="mo-paragraph-apply"]').click();
 await expect(page.locator('#rich-content p').first()).toHaveCSS('margin-bottom','24px');await expect(page.locator('#rich-content strong')).toHaveText('paragraph');
 expect(await page.locator('#rich-content p').nth(1).evaluate(el=>el.style.marginBottom)).toBe('');
 await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');await page.reload();await expect(page.locator('#rich-content p').first()).toHaveCSS('text-indent','18px');
 await expect(page.locator('.topbar')).toBeHidden();await expect(page.locator('.sidebar')).toBeHidden();
});
test('Notes canvas choices persist without altering writing',async({page})=>{
 await page.goto('/');await page.locator('[data-create="notes"]').first().click();await page.locator('[data-ot-tab="Design"]').click();
 for(const [label,value] of [['Note paper','slate'],['Note font','Georgia'],['Note size','18'],['Note spacing','2'],['Writing width','focused'],['Writing guides','on']])await page.getByLabel(label,{exact:true}).selectOption(value);
 await expect(page.locator('.note-editor')).toHaveAttribute('data-custom-canvas','true');await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');await page.reload();await page.locator('[data-ot-tab="Design"]').click();
 await expect(page.getByLabel('Note paper',{exact:true})).toHaveValue('slate');await expect(page.getByLabel('Writing guides',{exact:true})).toHaveValue('on');await expect(page.locator('.note-editor')).toHaveCSS('font-size','18px');
 const tab=page.locator('[data-ot-tab="Design"]');await tab.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-ot-tab="Organize"]')).toHaveAttribute('aria-selected','true');
});
test('file gallery preference and real previews survive reload',async({page})=>{
 await page.goto('/#/files');await page.getByRole('button',{name:'Grid view',exact:true}).click();await expect(page.locator('.mo-file-card').first()).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Grid view',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('.mo-file-card')).toHaveCount(0);
});
