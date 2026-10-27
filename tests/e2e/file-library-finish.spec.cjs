const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
test.describe.configure({mode:'parallel'});
for(const width of [320,390,768,1024,1440])for(const mode of ['light','dark'])test(`library controls and empty states fit ${width}px ${mode}`,async({page})=>{
 await page.setViewportSize({width,height:800});await page.addInitScript(mode=>localStorage.setItem('mysoft-office-preferences-v4',JSON.stringify({mode})),mode);
 await page.goto('/#/files');await expect(page.locator('#library-sort')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-mode',mode);
 const bounded=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 await bounded();await page.getByLabel('Sort files',{exact:true}).selectOption('name');await expect(page.getByLabel('Sort files',{exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Grid view',exact:true}).click();await expect(page.locator('.mo-file-card')).toHaveCount(4);await bounded();
 await fs.mkdir('.artifacts/library-finish',{recursive:true});
 if([390,1440].includes(width))await page.screenshot({path:`.artifacts/library-finish/library-${width}-${mode}.png`,fullPage:true});
 const search=page.getByRole('searchbox',{name:'Search filenames and content',exact:true});await search.fill('zzzz-no-file');await search.press('Enter');
 await expect(page).toHaveURL(/#\/files$/);await expect(page.locator('#library-title')).toBeFocused();await expect(page.locator('.library-empty h2')).toHaveText('No files match your search');await bounded();
 expect(await page.locator('.library-controls [data-action="library-reset"]').count()).toBe(0);
 if(width===390)await page.screenshot({path:`.artifacts/library-finish/empty-${mode}.png`,fullPage:true});
 await page.getByRole('button',{name:'Clear search and filters',exact:true}).click();await expect(search).toBeFocused();await expect(page.locator('.mo-file-card')).toHaveCount(4);await bounded();
});
test('sort choices persist across views and reload without changing the file count',async({page})=>{
 await page.goto('/#/files');await page.getByLabel('Sort files',{exact:true}).selectOption('name');
 const names=await page.locator('.data-table .file-open').allTextContents();expect(names).toEqual([...names].sort(new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}).compare));
 await page.getByRole('button',{name:'Grid view',exact:true}).click();expect(await page.locator('.mo-file-caption strong').allTextContents()).toEqual(names);
 await page.reload();await expect(page.getByLabel('Sort files',{exact:true})).toHaveValue('name');expect(await page.locator('.mo-file-caption strong').allTextContents()).toEqual(names);
 await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('.data-table .file-open')).toHaveCount(4);
});
test('empty collection guidance and filter reset lead to useful work',async({page})=>{
 await page.goto('/#/starred');await expect(page.locator('.library-empty h2')).toHaveText('Keep your important work close');
 await page.getByRole('button',{name:'Browse my files',exact:true}).click();await expect(page.locator('.data-table .file-open')).toHaveCount(4);
 await page.getByLabel('Filter by file type',{exact:true}).selectOption('pdf');await expect(page.locator('.library-empty h2')).toHaveText('No files match your search');
 await page.getByRole('button',{name:'Clear search and filters',exact:true}).click();await expect(page.getByLabel('Filter by file type',{exact:true})).toHaveValue('all');
 await page.goto('/#/media');await expect(page.locator('.library-empty h2')).toHaveText('Your Media workspace starts here');
 await page.getByRole('button',{name:'Create media project',exact:true}).click();await expect(page.locator('.editor-shell')).toBeVisible();
});
test('search clear and Escape restore files, focus, and a reloadable files route',async({page})=>{
 await page.goto('/#/home');const search=page.getByRole('searchbox',{name:'Search filenames and content',exact:true});
 await search.fill('zzzz-no-file');await expect(page.getByRole('button',{name:'Clear file search',exact:true})).toBeVisible();await search.press('Enter');
 await expect(page).toHaveURL(/#\/files$/);await search.focus();await search.press('Escape');await expect(search).toHaveValue('');await expect(search).toBeFocused();await expect(page.locator('.data-table .file-open')).toHaveCount(4);
 await search.fill('Welcome');await search.press('Enter');await expect(page.locator('.data-table .file-open')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear file search',exact:true}).click();await expect(search).toBeFocused();await expect(page.locator('.data-table .file-open')).toHaveCount(4);
 await page.reload();await expect(page.locator('#library-title')).toHaveText('All files');
});
