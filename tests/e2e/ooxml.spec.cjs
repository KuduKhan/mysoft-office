const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
});

test('DOCX roundtrip preserves headings, emphasis and editable table cells',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createDOCX,importDOCX}=await import('/src/ooxml-docx.js');
    const {readZip}=await import('/src/ooxml-zip.js');
    const pkg=createDOCX({type:'docs',body:'<h1>Project Plan</h1><p>Hello <strong>team</strong>.</p><table><tr><td>Budget</td><td>250</td></tr></table>'});
    const archive=await readZip(pkg.bytes);
    const imported=await importDOCX(pkg.bytes);
    return {html:imported.body,parts:Object.keys(archive)};
  });
  expect(result.parts).toContain('word/document.xml');
  expect(result.html).toContain('<h1>Project Plan</h1>');
  expect(result.html).toContain('<strong>team</strong>');
  expect(result.html).toContain('<table>');
  expect(result.html).toContain('Budget');
});

test('XLSX roundtrip retains multiple worksheets, numeric cells, formulas and basic styles',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createXLSX,importXLSX}=await import('/src/ooxml-xlsx.js');
    const f={type:'sheets',activeSheetIndex:0,
      worksheets:[
        {name:'Costs',cells:{A1:'Label',B1:'Cost',A2:'Software',B2:'125',C2:'=B2*2'},styles:{A1:{bold:true},B2:{background:'#ffeecc'}}},
        {name:'Revenue',cells:{A1:'Sales',B1:'700'},styles:{}}
      ],
      cells:{A1:'Label',B1:'Cost',A2:'Software',B2:'125',C2:'=B2*2'},
      cellStyles:{A1:{bold:true},B2:{background:'#ffeecc'}}
    };
    const output=createXLSX(f);
    const imported=await importXLSX(output.bytes);
    return imported;
  });
  expect(result.worksheets.map(s=>s.name)).toEqual(['Costs','Revenue']);
  expect(result.worksheets[0].cells.C2).toBe('=B2*2');
  expect(result.worksheets[0].cells.B2).toBe('125');
  expect(result.worksheets[0].styles.A1.bold).toBe(true);
  expect(result.worksheets[0].styles.B2.background).toBe('#ffeecc');
  expect(result.worksheets[1].cells.B1).toBe('700');
});

test('PPTX roundtrip keeps editable slide titles and text in correct order',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createPPTX,importPPTX}=await import('/src/ooxml-pptx.js');
    const file={type:'slides',slides:[
      {title:'Opening',body:'First lesson',theme:'violet'},
      {title:'Closing',body:'Next steps\nQuestions',theme:'ocean'}
    ]};
    const output=createPPTX(file);
    const imported=await importPPTX(output.bytes);
    return imported;
  });
  expect(result.slides).toHaveLength(2);
  expect(result.slides[0].title).toBe('Opening');
  expect(result.slides[0].body).toBe('First lesson');
  expect(result.slides[1].title).toBe('Closing');
  expect(result.slides[1].body).toContain('Questions');
});

test('ZIP importer rejects malformed archives and traversal names',async({page})=>{
  const message=await page.evaluate(async()=>{
    const {readZip,makeZip}=await import('/src/ooxml-zip.js');
    let traversal='';let malformed='';
    try{makeZip({'../etc/passwd':'bad'});}catch(e){traversal=e.message;}
    try{await readZip(new Uint8Array([2,4,6]));}catch(e){malformed=e.message;}
    return {traversal,malformed};
  });
  expect(message.traversal).toContain('Unsafe');
  expect(message.malformed).toContain('Not an Office ZIP');
});

test('DOCX download and re-import require explicit compatibility review',async({page})=>{
  await page.locator('[data-create="docs"]').first().click();
  await page.locator('#document-title').fill('Native example');
  await page.locator('#rich-content').fill('Editable Office text');
  const dl=page.waitForEvent('download');
  await page.locator('[data-action="office-export"]').click();
  await expect(page.getByText('Export to DOCX')).toBeVisible();
  await page.locator('[data-action="office-export-confirm"]').click();
  const file=await dl;
  expect(file.suggestedFilename()).toBe('Native-example.docx');
  await page.locator('[data-action="close-editor"]').click();
  await page.locator('#external-file-upload').setInputFiles({
    name:file.suggestedFilename(),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer:await require('node:fs/promises').readFile(await file.path())
  });
  await expect(page.getByText('Import DOCX for editing?')).toBeVisible();
  await page.locator('[data-action="confirm-office-import"]').click();
  await expect(page.locator('#rich-content')).toContainText('Editable Office text');
});
