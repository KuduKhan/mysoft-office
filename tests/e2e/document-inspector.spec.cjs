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
