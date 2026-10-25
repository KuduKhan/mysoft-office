import test from 'node:test';
import assert from 'node:assert/strict';
import {filteredSnapshot,repeatObjectGrid,importMarkdown} from '../src/studio-expansion.js';
import {createMediaFields,validateMediaRecord} from '../src/media-model.js';
import {drawingSVG} from '../src/media-vector.js';
import {mergePDF,encodePDF} from '../src/pdf-model.js';
test('filtered snapshots use computed values, preserve data and reject formula-like output',()=>{
 const source={A1:'Name',B1:'Cost',A2:'North',B2:10,A3:'South',B3:'=B2*3',A4:'north east',B4:4},before=structuredClone(source);
 assert.deepEqual(filteredSnapshot(source,'A1:B4',{column:'B',operator:'greater',query:20}).cells,{A1:'Name',B1:'Cost',A2:'South',B2:'30'});
 assert.equal(filteredSnapshot(source,'A1:B4',{query:'NORTH'}).matches,2);assert.equal(filteredSnapshot(source,'A1:B4',{operator:'equals',query:'north'}).matches,1);assert.throws(()=>filteredSnapshot(source,'A1:B4',{column:'Z'}),/inside/);assert.throws(()=>filteredSnapshot(source,'A1:B4',{column:'B',operator:'greater',query:'NaN'}),/finite/);assert.throws(()=>filteredSnapshot(source,'A1:B4',{query:'no match'}),/No rows/);assert.deepEqual(source,before);
 assert.throws(()=>filteredSnapshot({A1:'Label',A2:'="=B3"'},'A1:A2',{query:''}),/unsafe/);
});
test('object grids preserve the source and layer order and validate before mutation',()=>{
 const slide={objects:[{id:'source',kind:'rect',x:5,y:5,w:20,h:15,fill:'#123456',text:'Label'}]},before=structuredClone(slide);
 assert.equal(repeatObjectGrid(slide,'source',{columns:3,rows:2,gapX:2,gapY:4}),5);assert.deepEqual(slide.objects.map(o=>[o.x,o.y]),[[5,5],[27,5],[49,5],[5,24],[27,24],[49,24]]);assert.equal(new Set(slide.objects.map(o=>o.id)).size,6);assert.deepEqual(slide.objects[0],before.objects[0]);const saved=structuredClone(slide);assert.throws(()=>repeatObjectGrid(slide,'source',{columns:6,rows:6,gapX:2,gapY:2}),/40 objects/);assert.deepEqual(slide,saved);assert.throws(()=>repeatObjectGrid(slide,'source',{columns:6,rows:1,gapX:20,gapY:0}),/outside/);assert.deepEqual(slide,saved);
});
test('Markdown import supports tasks and formatting while refusing executable HTML and links',()=>{
 const result=importMarkdown('# Plan\n\n- [ ] Review **scope**\n- [x] Read [source](https://example.com)\n\n<script>alert(1)</script>\n[bad](javascript:alert(1))');
 assert.ok(result.includes('<h1>Plan</h1>'));assert.ok(result.includes('☐ Review <strong>scope</strong>'));assert.ok(result.includes('☑ Read <a href="https://example.com">source</a>'));assert.ok(result.includes('&lt;script&gt;'));assert.ok(!result.includes('<script>'));assert.ok(!result.includes('href="javascript:'));assert.throws(()=>importMarkdown(''));assert.throws(()=>importMarkdown('x'.repeat(20001)));assert.throws(()=>importMarkdown('\u00000\u0000'));
});
test('finishing effects are backward compatible, bounded and included in vector drawings',()=>{
 const file={...createMediaFields(),title:'Frame',mediaKind:'drawing'};assert.equal(validateMediaRecord(file),true);Object.assign(file.mediaEdits,{vignette:50,frameWidth:12,frameColor:'#123456'});assert.equal(validateMediaRecord(file),true);const svg=drawingSVG(file);assert.ok(svg.includes('id="finishing-vignette"'));assert.ok(svg.includes('stop-opacity="0.4"'));assert.ok(svg.includes('stroke="#123456" stroke-width="12"'));file.mediaEdits.vignette=101;assert.equal(validateMediaRecord(file),false);file.mediaEdits.vignette=0;file.mediaEdits.frameColor='red';assert.equal(validateMediaRecord(file),false);delete file.mediaEdits.frameColor;delete file.mediaEdits.frameWidth;delete file.mediaEdits.vignette;assert.equal(validateMediaRecord(file),true);
});
test('PDF merging refuses invalid inputs before loading or altering documents',async()=>{
 const file={pdfData:encodePDF(new TextEncoder().encode('%PDF-1.7\n')),pdfPageCount:1,pdfRotations:{}};
 await assert.rejects(mergePDF(file,[]),/1–10/);await assert.rejects(mergePDF(file,[new Uint8Array(8*1024*1024+1)]),/8 MB/);await assert.rejects(mergePDF(file,[new TextEncoder().encode('invalid')]),/valid PDF header/);assert.deepEqual(file.pdfRotations,{});
});
