const {test,expect}=require('@playwright/test');
test('MySoft cloud is disabled without a dedicated project and preserves local edits',async({page})=>{
 await page.goto('/');
 await page.locator('[data-create="docs"]').first().click();
 await page.locator('#rich-content').fill('Cloud safety milestone local copy');
 await page.keyboard.press('Control+s');await expect(page.locator('#save-status')).toHaveText('Saved on device');
 await page.locator('[data-action="close-editor"]').click();
 await page.locator('.sidebar [data-action="cloud"]').click();
 await expect(page.locator('.modal')).toContainText('Cloud is not configured yet.');
 await expect(page.locator('[data-action="cloud-upload"]')).toHaveCount(0);
 await page.keyboard.press('Escape');
 await page.locator('[data-open]').first().click();
 await page.reload();
 await expect(page.locator('#rich-content')).toContainText('Cloud safety milestone local copy');
});
test('cloud comparison engine runs in browser and identifies conflicts without mutating workspace',async({page})=>{
 await page.goto('/');
 const output=await page.evaluate(async()=>{
  const {cloudSnapshotSummary}=await import('/src/cloud-sync.js');
  const local={files:[{id:'a',title:'Draft',type:'notes',body:'old'}],trash:[],versions:{}};
  const remote={files:[{id:'a',title:'Draft',type:'notes',body:'new'},{id:'b',title:'Remote',type:'notes',body:'cloud'}],trash:[],versions:{}};
  const before=JSON.stringify(local);
  const result=cloudSnapshotSummary(local,remote);
  return {different:result.different.length,remoteOnly:result.remoteOnly.length,unchanged:JSON.stringify(local)===before};
 });
 expect(output).toEqual({different:1,remoteOnly:1,unchanged:true});
});
