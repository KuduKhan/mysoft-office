const {test,expect}=require('@playwright/test');

test('Docs preflight locates broken bookmarks, duplicate IDs, template fields and accessibility issues',async({page})=>{
  await page.goto('/');
  const issues=await page.evaluate(async()=>{
    const {writingReview}=await import('/src/studio-pro-tools.js');
    const root=document.createElement('article');
    root.innerHTML='<h1 id="intro">Title</h1><h3 id="intro">Jump</h3>'+
      '<p>Dear {{customer.name}}, please <a href="#missing">click here</a>.</p>'+
      '<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=">'+
      '<table><tr><td>Value</td></tr></table>';
    return writingReview(root).issues.map(x=>x.label);
  });
  expect(issues.some(x=>x.includes('Heading level jumps'))).toBe(true);
  expect(issues.some(x=>x.includes('Duplicate bookmark'))).toBe(true);
  expect(issues.some(x=>x.includes('Broken internal bookmark'))).toBe(true);
  expect(issues.some(x=>x.includes('Unfilled mail-merge'))).toBe(true);
  expect(issues.some(x=>x.includes('Image needs'))).toBe(true);
  expect(issues.some(x=>x.includes('Table has no header'))).toBe(true);
});

test('Docs preflight respects decorative alt and existing reference targets',async({page})=>{
  await page.goto('/');
  const issues=await page.evaluate(async()=>{
    const {writingReview}=await import('/src/studio-pro-tools.js');
    const root=document.createElement('article');
    root.innerHTML='<h1 id="intro">Title</h1><p><a href="#intro">Read introduction</a></p>'+
      '<p><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="></p>';
    return writingReview(root).issues.map(x=>x.label);
  });
  expect(issues).toEqual([]);
});

test('Docs inspector opens in compact Tools ribbon and locates an issue',async({page})=>{
  await page.goto('/');
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#rich-content').evaluate(root=>{
    root.innerHTML='<h1>Project brief</h1><p>Dear {{recipient.name}}</p>';
    root.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('[data-ot-tab="Tools"]').click();
  await page.locator('[data-capability-action="writing-review"]').click();
  await expect(page.locator('#modal-root')).toContainText('Document inspector');
  await expect(page.locator('#modal-root')).toContainText('Unfilled mail-merge');
  await page.locator('[data-pro-review-target]').first().click();
  await expect(page.locator('#modal-root')).toBeEmpty();
});

test('Sheets formula debugger displays evaluated precedents without changing data',async({page})=>{
  await page.goto('/');
  await page.locator('[data-create="sheets"]').first().click();
  for(const [ref,value] of Object.entries({A1:'3',A2:'4',B1:'=A1+A2',C1:'=B1*2'})){
    await page.locator('[data-cell="'+ref+'"]').fill(value);
    await page.locator('[data-cell="'+ref+'"]').press('Enter');
  }
  await page.locator('[data-cell="C1"]').click();
  await page.locator('[data-ot-tab="Tools"]').click();
  await page.locator('[data-capability-action="formula-debugger"]').click();
  const modal=page.locator('#modal-root');
  await expect(modal).toContainText('Formula debugger');
  await expect(modal).toContainText('B1');
  await expect(modal).toContainText('A1');
  await expect(modal).toContainText('14');
  await modal.locator('[data-capability-action="close"]').click();
  await expect(page.locator('[data-cell="C1"]')).toHaveValue('14');
});
