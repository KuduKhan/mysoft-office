const {test,expect}=require('@playwright/test');
test('Knowledge Studio shows file connections, history and empty integrity state',async({page})=>{
 await page.goto('/');
 await page.locator('[data-nav="knowledge"]').click();
 await expect(page.getByRole('heading',{name:'Knowledge Studio',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Link integrity'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Project history'})).toBeVisible();
 await expect(page.getByText('No missing or recycled link targets.')).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Knowledge Studio',exact:true})).toBeVisible();
});
