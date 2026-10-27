const {test,expect}=require('@playwright/test');
async function doc(page,html){await page.goto('/');await page.locator('[data-create="docs"]').first().click();await page.locator('#rich-content').evaluate((root,html)=>{root.innerHTML=html;root.dispatchEvent(new Event('input',{bubbles:true}));},html);}
async function cursor(page,selector,offset=0,select=false){await page.locator(selector).first().evaluate((node,{offset,select})=>{const range=document.createRange();range.selectNodeContents(node);if(!select){range.setStart(node.firstChild||node,offset);range.collapse(true);}node.closest('[contenteditable]').focus();getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));},{offset,select});}
async function action(page,tab,tool){await page.locator(`[data-ot-tab="${tab}"]`).click();await page.locator(`[data-ot-action="docplus-${tool}"]`).click();}
test('case tools preserve inline formatting and survive save/reopen',async({page})=>{
 await doc(page,'<p>hELLO <strong>WORLD. nEXT</strong> SENTENCE</p>');await cursor(page,'#rich-content p',0,true);await action(page,'Home','sentence');
 await expect(page.locator('#rich-content p')).toHaveText('Hello world. Next sentence');await expect(page.locator('#rich-content strong')).toHaveText('world. Next');
 await page.reload();await expect(page.locator('#rich-content strong')).toHaveText('world. Next');await cursor(page,'#rich-content p',0,true);await action(page,'Home','title');await expect(page.locator('#rich-content p')).toHaveText('Hello World. Next Sentence');
});
test('paragraph split/join preserves rich content and print-flow settings',async({page})=>{
 await doc(page,'<p>Alpha <strong>beta</strong></p>');await cursor(page,'#rich-content p',6);await action(page,'Structure','split');await expect(page.locator('#rich-content p')).toHaveCount(2);await expect(page.locator('#rich-content p').nth(1).locator('strong')).toHaveText('beta');
 await cursor(page,'#rich-content p',1);await action(page,'Structure','join');await expect(page.locator('#rich-content p')).toHaveText('Alpha beta');await expect(page.locator('#rich-content strong')).toHaveText('beta');
 await cursor(page,'#rich-content p',1);await action(page,'Layout','keep');await expect(page.locator('#rich-content p')).toHaveCSS('break-inside','avoid');await page.reload();await expect(page.locator('#rich-content p')).toHaveCSS('break-inside','avoid');
 await cursor(page,'#rich-content p',1);await action(page,'Layout','keep');expect(await page.locator('#rich-content p').evaluate(n=>n.style.breakInside)).toBe('');
});
test('table tools insert before selection, duplicate rows and toggle headers without losing links',async({page})=>{
 await doc(page,'<table><tbody><tr><td><strong>Item</strong></td><td>Value</td></tr><tr><td><a href="https://example.com">Alpha</a></td><td>10</td></tr></tbody></table>');
 await cursor(page,'#rich-content tr:nth-child(2) td:nth-child(2)');await action(page,'Table','column-before');await expect(page.locator('#rich-content tr').nth(1).locator('td')).toHaveCount(3);await expect(page.locator('#rich-content tr').nth(1).locator('td').nth(1)).toHaveText('Cell');
 await cursor(page,'#rich-content tr:nth-child(2) td:nth-child(3)');await action(page,'Table','row-before');await expect(page.locator('#rich-content tr')).toHaveCount(3);
 await cursor(page,'#rich-content tr:nth-child(3) td:nth-child(3)');await action(page,'Table','duplicate-row');await expect(page.locator('#rich-content tr')).toHaveCount(4);await expect(page.locator('#rich-content a')).toHaveCount(2);
 await cursor(page,'#rich-content tr:nth-child(3) td:nth-child(3)');await action(page,'Table','header');await expect(page.locator('#rich-content tr').first().locator('th')).toHaveCount(3);await expect(page.locator('#rich-content th strong')).toHaveText('Item');await page.reload();await expect(page.locator('#rich-content a')).toHaveCount(2);
});
test('merged tables are refused without changing content',async({page})=>{
 await doc(page,'<table><tbody><tr><td colspan="2">Merged</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>');const before=await page.locator('#rich-content').innerHTML();await cursor(page,'#rich-content tr:nth-child(2) td');await action(page,'Table','duplicate-row');await expect(page.locator('#toast')).toContainText(/without merged cells/);expect(await page.locator('#rich-content').innerHTML()).toBe(before);
});
test('review reports and File details work, and portable HTML retains formatting',async({page})=>{
 await doc(page,'<h1>Report</h1><p>Repeated</p><p>Repeated</p><p><a href="#/file/missing-record">Missing link</a></p>');await action(page,'Review','repeated');await expect(page.getByRole('dialog')).toContainText('2 occurrences');await page.getByRole('button',{name:'Done',exact:true}).click();
 await action(page,'Review','links');await expect(page.getByRole('dialog')).toContainText('Local file missing');await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.locator('.mo-file-tab').click();await page.getByRole('button',{name:'File details',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('1 headings');await page.getByRole('button',{name:'Done',exact:true}).click();
 const download=page.waitForEvent('download');await action(page,'Tools','html');const item=await download;const fs=require('node:fs/promises');const content=await fs.readFile(await item.path(),'utf8');expect(content).toContain('<h1>Report</h1>');expect(content).toContain('<!doctype html>');
});
test('signature cancellation leaves document untouched; insertion and tool search work',async({page})=>{
 await doc(page,'<p>Body</p>');page.once('dialog',d=>d.dismiss());await action(page,'Insert','signature');await expect(page.locator('#rich-content')).toHaveText('Body');let count=0;page.on('dialog',d=>d.accept(count++?'Director':'Amina'));await action(page,'Insert','signature');await expect(page.locator('#rich-content strong')).toHaveText('Amina');await expect(page.locator('#rich-content')).toContainText('Director');
 await page.getByRole('button',{name:'Find editor tools',exact:true}).click();await page.getByLabel('Search commands and files').fill('Document statistics');await page.locator('[data-command-run^="tool:"]:visible').click();await expect(page.getByRole('dialog')).toHaveAttribute('aria-label','Document statistics');
});
