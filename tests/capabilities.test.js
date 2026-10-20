import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCellWhitespace,transformedTable,slidesFromOutline,slideOutline,paragraphOptions,noteLinkIds} from '../src/capability-core.js';
import {parsePDFPages,pdfOrder,validatePDFRecord} from '../src/pdf-model.js';
import {applyMediaFormat,trimAudioSilence,editMediaLayer} from '../src/media-customize.js';
import {createMediaFields,processAudio,defaultMediaEdits,validateMediaRecord} from '../src/media-model.js';
import {versionContent,restoreRevision} from '../src/revisions.js';
test('worksheet cleanup is atomic and cannot convert text into formulas',()=>{
  const cells={A1:'  Alice   A ',A2:' =SUM(B1:B2)',B1:'=2+2'};assert.throws(()=>cleanCellWhitespace(cells,'A1:B2'));assert.equal(cells.A1,'  Alice   A ');delete cells.A2;assert.equal(cleanCellWhitespace(cells,'A1:B2'),1);assert.equal(cells.A1,'Alice A');assert.equal(cells.B1,'=2+2');
});
test('unique and split outputs preserve source and enforce bounds',()=>{
  const cells={A1:'Name',B1:'Score',A2:'Alex',B2:'=1+1',A3:'Alex',B3:'2',A4:'Sam',B4:'3'};const original=structuredClone(cells),result=transformedTable(cells,'A1:B4','unique');assert.equal(result.rows,3);assert.equal(result.cells.B2,'2');assert.deepEqual(cells,original);
  assert.equal(transformedTable({A1:'red, green, blue'},'A1','split').cells.C1,'blue');assert.throws(()=>transformedTable({A1:'a,=1+1'},'A1','split'));assert.throws(()=>transformedTable({A1:Array(28).fill('x').join(',')},'A1','split'));
});
test('outline creation validates before appending and carries current design',()=>{
  const slides=slidesFromOutline('# Opening\n- Welcome\n\nNext\nDetails',{theme:'blue',studioPreset:'midnight'});assert.equal(slides[0].title,'Opening');assert.equal(slides[0].body,'Welcome');assert.equal(slides[1].studioPreset,'midnight');slides[1].notes='Present privately';assert.match(slideOutline(slides),/Present privately/);assert.throws(()=>slidesFromOutline(''));assert.throws(()=>slidesFromOutline('x'.repeat(501)));
});
test('paragraph options and note links stay bounded',()=>{
  assert.equal(paragraphOptions({before:0,after:12,indent:24,line:1.5}).indent,24);assert.throws(()=>paragraphOptions({before:0,after:999,indent:0,line:2}));assert.deepEqual(noteLinkIds('<a href="#/file/abc-123">Page</a>'),['abc-123']);
});
test('PDF page order supports extraction, reversal and duplication while history preserves source',()=>{
  const f={type:'pdf',title:'PDF',pdfData:'JVBERi0=',pdfPageCount:4,pdfRotations:{},pdfPageOrder:[4,1,1]};assert.equal(validatePDFRecord(f),true);assert.deepEqual(parsePDFPages('4, 2-1, 1',4),[4,2,1,1]);assert.throws(()=>parsePDFPages('0,99',4));assert.throws(()=>parsePDFPages('1-4,'.repeat(150),4));const revision=versionContent(f);f.pdfPageOrder=[2];const restored=restoreRevision(f,{content:revision});assert.deepEqual(pdfOrder(restored),[4,1,1]);assert.equal(restored.pdfData,f.pdfData);
});
test('media aspect presets crop centrally without changing original bytes',()=>{
  const f={...createMediaFields(),mediaKind:'image',mediaData:'AQID',mediaMime:'image/png'};applyMediaFormat(f,'square');assert.equal(f.mediaEdits.outputWidth,1080);assert.equal(f.mediaEdits.cropLeft,f.mediaEdits.cropRight);assert.equal(f.mediaData,'AQID');assert.equal(validateMediaRecord(f),true);
});
test('drawing layers can be moved, duplicated and arranged within the canvas',()=>{
  const f={...createMediaFields(),mediaKind:'drawing',mediaLayers:[{kind:'line',color:'#ffffff',width:.01,fill:false,points:[[0,.1],[.9,.2]]}]};assert.equal(editMediaLayer(f,0,'duplicate'),1);editMediaLayer(f,0,'left');assert.equal(f.mediaLayers[0].points[0][0],0);editMediaLayer(f,0,'front');editMediaLayer(f,1,'delete');assert.equal(f.mediaLayers.length,1);assert.equal(validateMediaRecord(f),true);
});
test('audio DC removal, stereo balance and outer-silence trim change samples',()=>{
  const e={...defaultMediaEdits(),removeDC:true,audioBalance:1},input=[new Float32Array(8000).fill(.25),Float32Array.from({length:8000},(_,i)=>.1+.2*Math.sin(i*2*Math.PI/80))];const result=processAudio(input,8000,e);assert.ok(result.channels[0].every(n=>n===0));const mean=result.channels[1].reduce((a,b)=>a+b,0)/8000;assert.ok(Math.abs(mean)<.00001);
  const sound=new Float32Array(8000);sound.fill(.5,2000,6000);const trim=trimAudioSilence([sound],8000);assert.ok(trim.trimStart>.2);assert.ok(trim.trimEnd<.8);assert.throws(()=>trimAudioSilence([new Float32Array(1000)],8000));
});
