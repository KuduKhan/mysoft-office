import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeDocuments,pivotMatrix,slidesFromWorksheet,compressPCM,compressionSettings,handoutPlacement} from '../src/production-tools.js';
import {createMediaFields,validateMediaRecord,processAudio,defaultMediaEdits} from '../src/media-model.js';
test('document combination preserves sources, escapes titles and deep copies page setup',()=>{
 const sources=[{id:'a',type:'docs',title:'<First>',body:'<p>Keep <strong>bold</strong></p>',pageSettings:{paper:'A4'}},{id:'b',type:'docs',title:'Second',body:'<p>Two</p>'}],before=structuredClone(sources),result=mergeDocuments(sources,{title:'Combined'});
 assert.match(result.body,/&lt;First&gt;/);assert.match(result.body,/<strong>bold/);assert.match(result.body,/<hr>/);result.pageSettings.paper='Letter';assert.deepEqual(sources,before);assert.throws(()=>mergeDocuments([sources[0],sources[0]]));assert.throws(()=>mergeDocuments(sources,{title:''}));
});
test('pivot matrices use weighted averages for totals and preserve calculated source data',()=>{
 const cells={A1:'Region',B1:'Team',C1:'Revenue',A2:'North',B2:'A',C2:'10',A3:'North',B3:'A',C3:'=10+20',A4:'North',B4:'B',C4:'80',A5:'South',B5:'B',C5:'40'},before=structuredClone(cells),r=pivotMatrix(cells,'A1:C5',{operation:'average'});
 assert.equal(r.cells.B2,20);assert.equal(r.cells.C2,80);assert.equal(r.cells.D2,40);assert.equal(r.cells.D4,40);assert.equal(r.cells.C4,60);assert.equal(r.observations,4);assert.deepEqual(cells,before);assert.equal(pivotMatrix(cells,'A1:C5',{operation:'count'}).cells.D4,4);
});
test('pivot bounds and numeric errors are rejected before output creation',()=>{
 assert.throws(()=>pivotMatrix({A1:'r',B1:'c',C1:'v',A2:'X',B2:'Y',C2:'bad'},'A1:C2'));assert.throws(()=>pivotMatrix({},'A1:C2',{row:'Z'}));assert.throws(()=>pivotMatrix({},'A1:C2',{row:'B',column:'B'}));assert.throws(()=>pivotMatrix({A2:'=untrusted',B2:'Y',C2:'1'},'A1:C2'));
 const cells={A1:'==unsafe',B1:'C',C1:'V',A2:'X',B2:'Y',C2:'2'};assert.equal(pivotMatrix(cells,'A1:C2').cells.A1,'Category');
});
test('worksheet slide creation evaluates values but preserves source cells and design',()=>{
 const cells={A1:'Title',B1:'Body',A2:'North',B2:'=2+3',A3:'South',B3:'Text'},before=structuredClone(cells),slides=slidesFromWorksheet(cells,'A1:B3',{base:{theme:'ocean',studioPreset:'navy'}});assert.equal(slides.length,2);assert.equal(slides[0].body,'5');assert.equal(slides[0].theme,'ocean');assert.deepEqual(cells,before);assert.throws(()=>slidesFromWorksheet({B2:'No title'},'A1:B2'));assert.throws(()=>slidesFromWorksheet(cells,'A1:B3',{bodyColumn:'A'}));
});
test('compressor links stereo gain, retains inputs, and disabled/1:1 settings are transparent',()=>{
 const rate=8000,a=new Float32Array(rate).fill(.8),b=new Float32Array(rate).fill(.4),options={audioCompression:true,compressionThreshold:-24,compressionRatio:4,compressionAttack:1,compressionRelease:100},result=compressPCM([a,b],rate,options);
 assert.ok(result[0][rate-1]<.25);assert.ok(Math.abs(result[1][rate-1]/result[0][rate-1]-.5)<1e-6);assert.ok(Math.abs(a[rate-1]-.8)<1e-6);assert.deepEqual(compressPCM([a],rate,{...options,compressionRatio:1})[0],a);assert.deepEqual(compressPCM([a],rate,{audioCompression:false})[0],a);
 const processed=processAudio([a,b],rate,{...defaultMediaEdits(),...options});assert.ok(processed.channels[0][rate-1]<.25);assert.throws(()=>compressionSettings({compressionThreshold:NaN}));assert.throws(()=>compressionSettings({compressionRatio:13}));
});
test('legacy media records remain valid and new compressor parameters are bounded',()=>{
 const file=createMediaFields();for(const key of Object.keys(compressionSettings()))delete file.mediaEdits[key];assert.equal(validateMediaRecord(file),true);file.mediaEdits.compressionAttack=0;assert.equal(validateMediaRecord(file),false);
});
test('handout placement contains every rotated corner inside its target cell',()=>{
 const cell={x:12,y:24,width:300,height:400};for(const rotation of [0,90,180,270]){const p=handoutPlacement(200,100,rotation,cell),angle=p.rotation*Math.PI/180;for(const [x,y]of [[0,0],[200,0],[0,100],[200,100]]){const px=p.x+p.scale*(x*Math.cos(angle)-y*Math.sin(angle)),py=p.y+p.scale*(x*Math.sin(angle)+y*Math.cos(angle));assert.ok(px>=cell.x-1e-7&&px<=cell.x+cell.width+1e-7);assert.ok(py>=cell.y-1e-7&&py<=cell.y+cell.height+1e-7);}}assert.throws(()=>handoutPlacement(0,10,0,cell));
});
