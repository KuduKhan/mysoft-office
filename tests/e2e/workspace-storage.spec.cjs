const {test,expect}=require('@playwright/test');

test('migrates existing localStorage files to IndexedDB without erasing rollback data',async({page})=>{
  await page.addInitScript(()=>{
    const files=[{id:'legacy-note',type:'notes',title:'Important legacy note',body:'<p>Before migration</p>',createdAt:1,updatedAt:2}];
    localStorage.setItem('mysoft-office-v1',JSON.stringify({version:2,files}));
    localStorage.setItem('mysoft-office-trash-v2',JSON.stringify([]));
    localStorage.setItem('mysoft-office-revisions-v2',JSON.stringify({}));
  });
  await page.goto('/');
  await expect(page.getByText('Important legacy note').first()).toBeVisible();
  const state=await page.evaluate(async()=>{
    const {BrowserWorkspaceStore}=await import('/src/workspace-storage.js');
    const store=await new BrowserWorkspaceStore().open();
    const workspace=await store.read();
    return {title:workspace.files[0].title,legacyStillPresent:!!localStorage.getItem('mysoft-office-v1')};
  });
  expect(state).toEqual({title:'Important legacy note',legacyStillPresent:true});
  await page.locator('[data-open="legacy-note"]').first().click();
  await page.locator('#rich-content').fill('Updated after migration');
  await page.keyboard.press('Control+s');
  await expect(page.locator('#save-status')).toContainText('Saved on device');
  await page.reload();
  await expect(page.locator('#rich-content')).toContainText('Updated after migration');
});

test('displays failed-save state and never falsely announces success when IndexedDB is full',async({page})=>{
  await page.goto('/');
  await page.locator('[data-create="docs"]').first().click();
  await expect(page.locator('#save-status')).toContainText('Saved on device');
  await page.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(){
      if(arguments[1]==='readwrite')throw new DOMException('Out of space','QuotaExceededError');
      return original.apply(this,arguments);
    };
  });
  await page.locator('#rich-content').fill('This change cannot be saved');
  await page.keyboard.press('Control+s');
  await expect(page.locator('#save-status')).toContainText('Save failed');
  await expect(page.locator('#toast')).toContainText('Save failed');
  await expect(page.locator('#toast')).not.toContainText('Saved on this device');
});

test('invalid legacy workspace exposes raw recovery export instead of overwriting original data',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('mysoft-office-v1','{damaged json');
  });
  await page.goto('/');
  await expect(page.getByText('Workspace recovery required')).toBeVisible();
  const promise=page.waitForEvent('download');
  await page.locator('#export-legacy-recovery').click();
  const download=await promise;
  expect(download.suggestedFilename()).toBe('mysoft-legacy-recovery.json');
  expect(await page.evaluate(()=>localStorage.getItem('mysoft-office-v1'))).toBe('{damaged json');
});

test('failed backup replacement leaves the existing workspace unchanged',async({page})=>{
  await page.goto('/');
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await page.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(){
      if(arguments[1]==='readwrite')throw new DOMException('Out of space','QuotaExceededError');
      return original.apply(this,arguments);
    };
  });
  page.on('dialog',dialog=>dialog.accept());
  const replacement={version:2,files:[{id:'test-new',type:'notes',title:'Must not replace original',body:'<p>New</p>'}],trash:[],versions:{}};
  await page.locator('#backup-upload').setInputFiles({
    name:'new-workspace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))
  });
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await expect(page.getByText('Must not replace original')).toHaveCount(0);
});


test('rejected backup is never replayed on a subsequent reload',async({page})=>{
  await page.goto('/');
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await page.evaluate(()=>{
    const original=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(){
      if(arguments[1]==='readwrite')throw new DOMException('Out of space','QuotaExceededError');
      return original.apply(this,arguments);
    };
  });
  page.on('dialog',dialog=>dialog.accept());
  const replacement={version:2,files:[{id:'not-accepted',type:'notes',title:'Rejected replacement',body:'<p>not saved</p>'}],trash:[],versions:{}};
  await page.locator('#backup-upload').setInputFiles({
    name:'rejected.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))
  });
  await expect(page.locator('#toast')).toContainText('Current files are unchanged.');
  await page.reload();
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await expect(page.getByText('Rejected replacement')).toHaveCount(0);
});

test('invalid optional recovery journal cannot hide valid committed files',async({page})=>{
  await page.goto('/');
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await page.evaluate(()=>localStorage.setItem('mysoft-office-pending-v3','{damaged'));
  await page.reload();
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await expect(page.locator('#toast')).toContainText('Damaged recovery journal ignored');
  expect(await page.evaluate(()=>localStorage.getItem('mysoft-office-pending-v3'))).toBe('{damaged');
});

test('browser with blocked localStorage still opens workspace using IndexedDB',async({page})=>{
  await page.addInitScript(()=>{
    Storage.prototype.getItem=function(){throw new DOMException('Denied','SecurityError');};
    Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};
  });
  await page.goto('/');
  await expect(page.getByText('Welcome to MySoft Office').first()).toBeVisible();
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').fill('IndexedDB remains usable');
  await page.keyboard.press('Control+s');
  await expect(page.locator('#save-status')).toContainText('Saved on device');
});
