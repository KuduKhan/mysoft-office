import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATE_CATALOG,DEMO_PACK_IDS,findTemplate,filterTemplates,createTemplatePayload,templateCopy,EDITOR_GUIDES} from '../src/template-catalog.js';
import {inspectWorkingFile} from '../src/file-check.js';
import {validateWorkspace} from '../src/workspace-storage.js';
import {validateMediaRecord,processAudio,decodeMedia} from '../src/media-model.js';
import {validatePDFRecord,decodePDF} from '../src/pdf-model.js';
import {displayCell} from '../src/formulas.js';
import {matchingRule} from '../src/sheet-rules.js';
globalThis.self=globalThis;
test('demo pack covers every app exactly once and catalog IDs are stable and unique',()=>{
 assert.equal(new Set(TEMPLATE_CATALOG.map(t=>t.id)).size,TEMPLATE_CATALOG.length);assert.deepEqual(DEMO_PACK_IDS.map(id=>findTemplate(id).type),['docs','sheets','slides','notes','pdf','media']);
 for(const t of TEMPLATE_CATALOG){assert.ok(t.title&&t.description&&t.features.length&&t.preview.length===3);assert.equal(EDITOR_GUIDES[t.type].length,3);}
 assert.equal(filterTemplates(TEMPLATE_CATALOG,'pdf').length,2);assert.equal(filterTemplates(TEMPLATE_CATALOG,'sheets','  variance  ')[0].id,'project-budget');assert.deepEqual(filterTemplates(TEMPLATE_CATALOG,'docs','no-such-example'),[]);
});
test('budget demonstrates real recalculation, isolated worksheets and conditional formatting',async()=>{
 const f={type:'sheets',...await createTemplatePayload('project-budget')};assert.equal(displayCell('D3',f.cells),'300');assert.equal(displayCell('B8',f.cells),'8500');assert.equal(displayCell('C8',f.cells),'8110');assert.equal(matchingRule(f,'D3',300).color,'#fce2e6');assert.equal(matchingRule(f,'D2',-150),null);
 f.cells.B3='5000';assert.equal(displayCell('D3',f.cells),'100');assert.equal(f.worksheets[1].cells.B2,'700');assert.equal(inspectWorkingFile({...f,title:'Budget'}).reviewCount,0);
});
test('sales margin formulas evaluate and factories never share editable objects',async()=>{
 const a=await createTemplatePayload('sales-dashboard'),b=await createTemplatePayload('sales-dashboard');assert.equal(displayCell('D2',a.cells),'3100');assert.equal(displayCell('B9',a.cells),'62400');a.cells.B2='1';a.worksheets[1].cells.B2='1';assert.equal(b.cells.B2,'8200');assert.equal(b.worksheets[1].cells.B2,'10000');
 const deck=await createTemplatePayload('pitch-deck');deck.slides[1].objects[0].text='Changed';assert.equal((await createTemplatePayload('pitch-deck')).slides[1].objects[0].text,'Focus on the customer');
});
test('all pack records validate and round-trip through workspace backup JSON',async()=>{
 const files=await Promise.all(DEMO_PACK_IDS.map(async(id,i)=>({id:'demo-'+i,type:findTemplate(id).type,title:findTemplate(id).title,...await createTemplatePayload(id)})));
 const workspace={files,trash:[],versions:{}};assert.equal(validateWorkspace(JSON.parse(JSON.stringify(workspace))).files.length,6);const pdf=files.find(f=>f.type==='pdf');assert.ok(validatePDFRecord(pdf));assert.match(new TextDecoder().decode(decodePDF(pdf.pdfData).slice(0,8)),/%PDF/);assert.ok(validateMediaRecord(files.find(f=>f.type==='media')));
});
test('reusable template copies own their IDs, layer data and checklist progress',async()=>{
 const source={id:'original',title:'My canvas',type:'media',reusableTemplate:true,starred:true,demoPackId:'northstar-v1',...await createTemplatePayload('creative-canvas')};const copy=templateCopy(source,{id:'copy',title:'New design',now:123});assert.equal(copy.createdAt,123);assert.equal(copy.starred,false);assert.equal(copy.reusableTemplate,undefined);assert.equal(copy.demoPackId,undefined);copy.mediaLayers[0].points[0][0]=.9;assert.notEqual(source.mediaLayers[0].points[0][0],.9);assert.throws(()=>templateCopy(source,{id:'original'}));
});
test('generated audio is a real bounded stereo WAV with reversible processing inputs',async()=>{
 const f=await createTemplatePayload('sound-studio');assert.ok(validateMediaRecord(f));const bytes=decodeMedia(f.mediaData),v=new DataView(bytes.buffer);assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF');assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),22050);assert.equal(bytes.length,44+6*22050*4);const before=f.mediaData;const channel=new Float32Array(8000);channel[1]=.5;processAudio([channel],8000,{...f.mediaEdits,fadeIn:0,fadeOut:0});assert.equal(f.mediaData,before);
});
test('file checks identify actionable calculation, content and output problems without mutation',async()=>{
 const f={type:'sheets',title:'Model',cells:{A1:'=1/0'}};const before=JSON.stringify(f);assert.equal(inspectWorkingFile(f).reviewCount,1);assert.equal(JSON.stringify(f),before);
 const pdf={type:'pdf',title:'Review',...await createTemplatePayload('review-pdf'),pdfPageOrder:[2,3]};assert.equal(inspectWorkingFile(pdf).checks.find(c=>c.label==='Bookmark destinations').status,'review');
 const note={type:'notes',title:'Decisions',body:'<p>☐ Follow up</p>',notebook:'Team',section:'Actions'};assert.equal(inspectWorkingFile(note).checks.find(c=>c.label==='Action items').status,'review');
 const media={type:'media',title:'Clip',...await createTemplatePayload('sound-studio')};media.mediaEdits.trimStart=4;media.mediaEdits.trimEnd=2;assert.equal(inspectWorkingFile(media).checks.find(c=>c.label==='Clip range').status,'review');
});
