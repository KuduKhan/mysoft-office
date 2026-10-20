import test from 'node:test';
import assert from 'node:assert/strict';
import {documentContents,replacePresentationText,noteInsertTemplate} from '../src/editor-productivity.js';
import {transposeRange} from '../src/sheet-range.js';
import {evaluateCell} from '../src/formulas.js';

test('Docs contents uses only headings, excludes blank headings and escapes markup',()=>{
 const html=documentContents([
   {level:1,text:'Overview & requirements'},
   {level:2,text:'<img src=x onerror=alert(1)>'},
   {level:2,text:' '},
   {level:4,text:'Not a heading'}
 ]);
 assert.match(html,/Overview &amp; requirements/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img /);
 assert.doesNotMatch(html,/Not a heading/);
 assert.equal(documentContents([]),'');
});

test('presentation replaces titles, body and notes while preserving styling',()=>{
 const slides=[{title:'Plan: Launch',body:'PLAN plan and C++',notes:'Plan speaker',theme:'violet',objects:[{id:'x'}]},{title:'Follow-up',body:'Review'}];
 assert.equal(replacePresentationText(slides,'Plan','Mission'),4);
 assert.equal(slides[0].title,'Mission: Launch');
 assert.equal(slides[0].body,'Mission Mission and C++');
 assert.equal(slides[0].notes,'Mission speaker');
 assert.equal(slides[0].theme,'violet');
 assert.equal(slides[0].objects[0].id,'x');
 assert.equal(replacePresentationText(slides,'C++','C#'),1);
 assert.equal(slides[0].body,'Mission Mission and C#');
});

test('presentation errors never partially replace or produce unbounded edits',()=>{
 const slides=[{title:'Plan'},null];
 assert.throws(()=>replacePresentationText(slides,'Plan','Test'),/Invalid slide/);
 assert.equal(slides[0].title,'Plan');
 assert.throws(()=>replacePresentationText([{title:'Plan'}],'', ''),/Find must/);
});

test('notes meeting and daily templates are structured and validated',()=>{
 const meeting=noteInsertTemplate('meeting','2026-10-20');
 const daily=noteInsertTemplate('daily','2026-10-20');
 assert.match(meeting,/<h3>Decisions<\/h3>/);
 assert.match(meeting,/Action items/);
 assert.match(daily,/Top priorities/);
 assert.match(daily,/Notes and reflection/);
 assert.throws(()=>noteInsertTemplate('unknown','2026-10-20'));
 assert.throws(()=>noteInsertTemplate('daily','<script>alert(1)</script>'));
});

test('Sheets transpose preserves original source, formulas and blank positions',()=>{
 const file={cells:{A1:'one',B1:'two',A2:'three',B2:'=2+3',A3:'five',B3:'six',D1:'old'}};
 assert.equal(transposeRange(file,'A1:B3','D1'),6);
 assert.deepEqual([file.cells.D1,file.cells.D2,file.cells.E1,file.cells.E2,file.cells.F1,file.cells.F2],['one','two','three','=2+3','five','six']);
 assert.equal(file.cells.B2,'=2+3');
 assert.equal(file.cells.A3,'five');
 assert.equal(evaluateCell('E2',file.cells),5);
});

test('Sheets transpose snapshots overlapping destination and rejects overflow atomically',()=>{
 const file={cells:{A1:'a',B1:'b',A2:'c',B2:'d'}};
 assert.equal(transposeRange(file,'A1:B2','A1'),4);
 assert.deepEqual(file.cells,{A1:'a',B1:'c',A2:'b',B2:'d'});
 const original=JSON.stringify(file.cells);
 assert.throws(()=>transposeRange(file,'A1:B2','Z1000'),/exceed/);
 assert.equal(JSON.stringify(file.cells),original);
 assert.throws(()=>transposeRange(file,'A1:B2','C1:D2'),/one destination/);
});

test('COUNT counts numbers while COUNTA counts nonempty text and formulas',()=>{
 const cells={A1:'12',A2:'hello',A3:'',A4:'=2+3',
  B1:'=COUNT(A1:A4)',B2:'=COUNTA(A1:A4)',B3:'=COUNT(A2,A4)',B4:'=COUNTA(A2,A4)',
  B5:'=COUNT(A1:A4,9)',B6:'=COUNTA(A1:A4,9)'};
 assert.equal(evaluateCell('B1',cells),2);
 assert.equal(evaluateCell('B2',cells),3);
 assert.equal(evaluateCell('B3',cells),1);
 assert.equal(evaluateCell('B4',cells),2);
 assert.equal(evaluateCell('B5',cells),3);
 assert.equal(evaluateCell('B6',cells),4);
});
