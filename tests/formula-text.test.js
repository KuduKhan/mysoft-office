import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCell} from '../src/formulas.js';
import {formulaDependencies} from '../src/sheet-audit.js';
import {shiftRelativeFormula} from '../src/sheet-range.js';
import {SheetRecalculator} from '../src/sheet-recalc.js';
import {createXLSX} from '../src/ooxml-xlsx.js';
import {readZip} from '../src/ooxml-zip.js';
test('text IF results preserve case, escaped quotes and short-circuit errors',()=>{
 const cells={A1:'12',B1:'=if(A1>10,"Over budget","Within plan")',C1:'=IF(0,1/0,"He said ""Ready""")',D1:'=IF(1,"Ready",D1)',E1:'=B1'};assert.equal(evaluateCell('B1',cells),'Over budget');assert.equal(evaluateCell('C1',cells),'He said "Ready"');assert.equal(evaluateCell('D1',cells),'Ready');assert.equal(evaluateCell('E1',cells),'Over budget');
 assert.equal(evaluateCell('A1',{A1:'=IF(0,"bad",1/0)'}),'#DIV/0!');assert.equal(evaluateCell('A1',{A1:'=IF(1,"Good","unterminated)'}),'#ERROR!');
});
test('text comparison and concatenation work alongside numeric formulas',()=>{
 const cells={A1:'Ready',A2:'=IF(A1="ready","Approved","Pending")',B1:'="Total: " & SUM(2,3) & " units"',C1:'=SUM(2,IF(1,"3","none"))',D1:'=COUNT("text","2",3)',E1:'=COUNTA("a","b")'};assert.equal(evaluateCell('A2',cells),'Approved');assert.equal(evaluateCell('B1',cells),'Total: 5 units');assert.equal(evaluateCell('C1',cells),5);assert.equal(evaluateCell('D1',cells),2);assert.equal(evaluateCell('E1',cells),2);
 assert.equal(evaluateCell('A1',{A1:'=1 + 2  '}),3);assert.equal(evaluateCell('A1',{A1:'=globalThis.alert(1)'}),'#ERROR!');
 assert.equal(evaluateCell('B1',{A1:'=IF(1,"",7)',A2:'2',A3:'word',B1:'=COUNT(A1:A3)'}),1);
});
test('copy, dependency tracing and recalculation protect quoted cell-like text',()=>{
 const f='=IF(A1>0,"A1 and Z999 and $B$4","B2")';assert.deepEqual(formulaDependencies(f),['A1']);assert.equal(shiftRelativeFormula(f,1,1),'=IF(B2>0,"A1 and Z999 and $B$4","B2")');const cells={A1:'1',B1:'=IF(A1>0,"Ready","Pending")'},graph=new SheetRecalculator(cells);graph.rebuild();assert.equal(evaluateCell('B1',cells),'Ready');assert.equal(graph.display('B1'),'Ready');graph.update('A1','0');assert.equal(graph.display('B1'),'Pending');
});
test('XLSX stores text formula results with their cached value and preserves formulas',async()=>{
 const result=createXLSX({type:'sheets',cells:{A1:'=IF(1,"Ready & approved","Pending")',A2:'=2+3',A3:'="123"'}});const zip=await readZip(result.bytes),xml=zip['xl/worksheets/sheet1.xml'];assert.match(xml,/<c r="A1" t="str"><f>IF\(1,&quot;Ready &amp; approved&quot;,&quot;Pending&quot;\)<\/f><v>Ready &amp; approved<\/v><\/c>/);assert.match(xml,/<c r="A2"><f>2\+3<\/f><v>5<\/v><\/c>/);assert.match(xml,/<c r="A3" t="str">/);
});
