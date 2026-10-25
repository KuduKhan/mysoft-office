import test from 'node:test';
import assert from 'node:assert/strict';
import {documentCallout,distributeSlideObjects,tasksMarkdown,buildTextFormula} from '../src/editor-enhancements.js';
import {evaluateCell} from '../src/formulas.js';
import {ICON_NAMES,actionIcons,icon} from '../src/icons.js';
import {readFile,readdir} from 'node:fs/promises';
import {DRAWING_TOOLS,updateLayerAppearance} from '../src/media-workbench.js';
import {createTemplatePayload} from '../src/template-catalog.js';
import {validateMediaRecord} from '../src/media-model.js';
test('callouts are structured, bounded and escape supplied markup',()=>{
 const html=documentCallout({kind:'decision',title:'Scope <review>',body:'Approve the pilot.\n\n<script>alert(1)</script>'});assert.match(html,/<blockquote>/);assert.match(html,/Decision · Scope &lt;review&gt;/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.throws(()=>documentCallout({body:''}));assert.throws(()=>documentCallout({kind:'unknown',body:'Hello'}));assert.throws(()=>documentCallout({body:'a'.repeat(3001)}));
});
test('slide distribution preserves endpoints, size and layer order with transactional failure',()=>{
 const slide={objects:[{id:'c',x:80,y:0,w:10,h:10},{id:'a',x:0,y:80,w:10,h:10},{id:'b',x:12,y:15,w:10,h:10}]};assert.equal(distributeSlideObjects(slide,'horizontal'),3);assert.deepEqual(slide.objects.map(o=>o.x),[80,0,40]);assert.deepEqual(slide.objects.map(o=>o.id),['c','a','b']);distributeSlideObjects(slide,'vertical');assert.deepEqual(slide.objects.map(o=>o.y),[0,80,40]);const invalid={objects:[{x:0,y:0,w:40,h:10},{x:10,y:0,w:40,h:10},{x:30,y:0,w:40,h:10}]},before=JSON.stringify(invalid);assert.throws(()=>distributeSlideObjects(invalid,'horizontal'));assert.equal(JSON.stringify(invalid),before);assert.throws(()=>distributeSlideObjects({objects:slide.objects.slice(0,2)},'horizontal'));
});
test('task exports retain completion and file groups while escaping Markdown',()=>{
 const md=tasksMarkdown([{title:'Team\n# Update',tasks:[{done:false,label:'Review [scope] <now>'},{done:true,label:'Approved'}]},{title:'Empty',tasks:[]}]);assert.match(md,/# Workspace tasks/);assert.match(md,/\[ \] Review \\\[scope\\\]/);assert.match(md,/- \[x\] Approved/);assert.doesNotMatch(md,/## Empty/);assert.doesNotMatch(md,/<now>/);assert.throws(()=>tasksMarkdown([]));
});
test('text tools preserve source text and support ranges, empty values and Unicode',()=>{
 const cells={A1:'  Ada   Lovelace  ',A2:'Hello',A3:'World',C1:buildTextFormula('trim','A1'),C2:buildTextFormula('upper','A2'),C3:buildTextFormula('combine','A2','A3'),D1:'=LEN(B1)',D2:'=CONCAT(A2:A3)',D3:'=LEFT("Premium",3)',D4:'=RIGHT("Premium",0)',D5:'=LOWER("ÉCOLE")'};
 assert.equal(evaluateCell('C1',cells),'Ada Lovelace');assert.equal(evaluateCell('C2',cells),'HELLO');assert.equal(evaluateCell('C3',cells),'Hello World');assert.equal(evaluateCell('D1',cells),0);assert.equal(evaluateCell('D2',cells),'HelloWorld');assert.equal(evaluateCell('D3',cells),'Pre');assert.equal(evaluateCell('D4',cells),'');assert.equal(evaluateCell('D5',cells),'école');assert.equal(cells.A1,'  Ada   Lovelace  ');assert.equal(evaluateCell('A1',{A1:'=IF(0,LEFT("x",-1),"safe")'}),'safe');assert.equal(evaluateCell('A1',{A1:'=RIGHT("x",-1)'}),'#ERROR!');assert.throws(()=>buildTextFormula('trim','AA1'));assert.throws(()=>buildTextFormula('other','A1'));
});
test('layer styling validates properties without changing geometry or original source',async()=>{
 const file=await createTemplatePayload('creative-canvas'),points=structuredClone(file.mediaLayers[0].points);updateLayerAppearance(file,0,{color:'#ff8800',width:.01,fill:false,dash:'dotted'});assert.ok(validateMediaRecord(file));assert.deepEqual(file.mediaLayers[0].points,points);const before=JSON.stringify(file);for(const patch of [{color:'red'},{width:10},{other:'x'}])assert.throws(()=>updateLayerAppearance(file,0,patch));assert.equal(JSON.stringify(file),before);assert.throws(()=>updateLayerAppearance(file,4,{fill:true}));
});
test('every editor action and named symbol resolves to an offline SVG glyph',async()=>{
 for(const name of [...Object.values(actionIcons),...DRAWING_TOOLS.map(t=>t[2])])assert.ok(ICON_NAMES.includes(name),'Missing icon '+name);
 for(const file of await readdir('src')){if(!file.endsWith('.js')||file==='icons.js')continue;const source=await readFile('src/'+file,'utf8');for(const match of source.matchAll(/\bicon\('([^']+)'/g))assert.ok(ICON_NAMES.includes(match[1]),file+': '+match[1]);}
 assert.match(icon('eye'),/data-icon="eye"/);assert.doesNotMatch(icon('eye'),/layout-grid/);assert.match(icon('not-a-glyph'),/data-icon="circle-help"/);assert.match(icon('film'),/aria-hidden="true"/);
});
