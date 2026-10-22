const {test,expect}=require('@playwright/test');
const {readFile}=require('node:fs/promises');

test('DOCX safely preserves web hyperlinks, styles, and table-cell links',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {createDOCX,importDOCX}=await import('/src/ooxml-docx.js');
    const {readZip}=await import('/src/ooxml-zip.js');
    const body='<h2>References</h2><p>Visit <a href="https://example.org/help?a=1&amp;b=two"><strong>Help centre</strong></a> H<sub>2</sub>O x<sup>2</sup> <s>old</s></p>'+
      '<table><tr><td><a href="https://example.org/help?a=1&amp;b=two">Same reference</a></td></tr></table>'+
      '<p><a href="javascript:alert(1)">Unsupported scheme</a></p>';
    const exported=createDOCX({type:'docs',body});
    const archive=await readZip(exported.bytes);
    const imported=await importDOCX(exported.bytes);
    return {doc:archive['word/document.xml'],rels:archive['word/_rels/document.xml.rels'],
      html:imported.body,warnings:exported.warnings,importWarnings:imported.warnings};
  });
  expect(result.rels).toContain('TargetMode="External"');
  expect(result.rels).toContain('https://example.org/help?a=1&amp;b=two');
  expect(result.rels.match(/Type="[^"]+hyperlink"/g)).toHaveLength(1);
  expect(result.rels).not.toContain('javascript:');
  expect(result.doc).toContain('w:hyperlink');
  expect(result.html).toContain('<a href="https://example.org/help?a=1&amp;b=two">');
  expect(result.html).toContain('<sup>2</sup>');
  expect(result.html).toContain('<sub>2</sub>');
  expect(result.html).toContain('<s>old</s>');
  expect(result.html).toContain('Unsupported scheme');
  expect(result.html).not.toContain('javascript:');
  expect(result.warnings.join(' ')).toContain('unsupported hyperlinks');
});

test('DOCX imports a third-party external hyperlink relationship',async({page})=>{
  const content=await readFile('.artifacts/fixtures/external.docx');
  await page.goto('/');
  const result=await page.evaluate(async bytes=>{
    const {importDOCX}=await import('/src/ooxml-docx.js');
    return importDOCX(Uint8Array.from(bytes));
  },Array.from(content));
  expect(result.body).toContain('href="https://example.org/guide?revision=2"');
  expect(result.body).toContain('Read guide');
});

test('PPTX speaker notes survive native export, import and third-party import',async({page})=>{
  await page.goto('/');
  const native=await page.evaluate(async()=>{
    const {createPPTX,importPPTX}=await import('/src/ooxml-pptx.js');
    const {readZip}=await import('/src/ooxml-zip.js');
    const original=createPPTX({type:'slides',slides:[
      {title:'Plan',body:'Budget',theme:'ocean',notes:'Briefing & Q&A\nSecond note'},
      {title:'Next',body:'Action',theme:'violet',notes:''}
    ]});
    const archive=await readZip(original.bytes);
    const imported=await importPPTX(original.bytes);
    return {parts:Object.keys(archive),notesXml:archive['ppt/notesSlides/notesSlide1.xml'],
      notes:imported.slides.map(s=>s.notes)};
  });
  expect(native.parts).toContain('ppt/notesSlides/notesSlide1.xml');
  expect(native.parts).toContain('ppt/notesMasters/notesMaster1.xml');
  expect(native.parts).not.toContain('ppt/notesSlides/notesSlide2.xml');
  expect(native.notesXml).toContain('Briefing &amp; Q&amp;A');
  expect(native.notes).toEqual(['Briefing & Q&A\nSecond note','']);
  const fixture=await readFile('.artifacts/fixtures/external.pptx');
  const other=await page.evaluate(async bytes=>{
    const {importPPTX}=await import('/src/ooxml-pptx.js');
    return importPPTX(Uint8Array.from(bytes));
  },Array.from(fixture));
  expect(other.slides[0].notes).toContain('External presenter briefing');
  expect(other.slides[0].notes).toContain('Second instruction');
});

test('PPTX rejects exports beyond the safe package part count',async({page})=>{
  await page.goto('/');
  const message=await page.evaluate(async()=>{
    const {createPPTX}=await import('/src/ooxml-pptx.js');
    try{
      createPPTX({type:'slides',slides:Array.from({length:70},(_,i)=>({
        title:'Slide '+i,body:'',notes:'speaker note',theme:'violet'
      }))});
      return '';
    }catch(error){return error.message;}
  });
  expect(message).toContain('180-part');
});

test('PPTX does not silently truncate oversized speaker notes',async({page})=>{
  await page.goto('/');
  const message=await page.evaluate(async()=>{
    const {createPPTX}=await import('/src/ooxml-pptx.js');
    try{
      createPPTX({type:'slides',slides:[{title:'Long notes',body:'Body',notes:'N'.repeat(20001)}]});
      return '';
    }catch(error){return error.message;}
  });
  expect(message).toContain('20,000 character');
});
