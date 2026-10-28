import test from 'node:test';
import assert from 'node:assert/strict';
import {formulaDependencies,auditSheet,traceCell,debugFormula} from '../src/sheet-audit.js';
test('formula audit finds cycles and division errors without evaluating JavaScript',()=>{
  const cells={A1:'5',A2:'10',B1:'=SUM(A1:A2)',B2:'=B3+1',B3:'=B2+1',C1:'=10/0'};
  assert.deepEqual(formulaDependencies('=SUM(A1:A2)'),['A1','A2']);
  const audit=auditSheet(cells);
  assert.equal(audit.formulaCount,4);
  assert.equal(audit.errorCount,3);
  assert.ok(audit.errors.some(e=>e.result==='#CYCLE!'));
  assert.ok(audit.errors.some(e=>e.result==='#DIV/0!'));
  const trace=traceCell(cells,'A1');
  assert.deepEqual(trace.dependents,['B1']);
  assert.deepEqual(trace.deps,[]);
});
test('audit safely handles empty workbooks and invalid trace',()=>{
 assert.deepEqual(auditSheet({}).errors,[]);
 assert.throws(()=>traceCell({},'ZZ5000'));
});

test('formula debugger expands inputs, intermediate calculations and direct dependents without mutation',()=>{
 const cells={A1:3,A2:4,B1:'=A1+A2',C1:'=B1*2',D1:'=C1+1'},before=structuredClone(cells);
 const report=debugFormula(cells,'C1');
 assert.equal(report.root.value,14);
 assert.deepEqual(report.root.dependencies.map(x=>x.cell),['B1']);
 assert.deepEqual(report.root.dependencies[0].dependencies.map(x=>x.cell),['A1','A2']);
 assert.equal(report.root.dependencies[0].value,7);
 assert.deepEqual(report.dependents,['D1']);
 assert.equal(report.truncated,false);
 assert.deepEqual(cells,before);
});
test('formula debugger surfaces cycles, spreadsheet errors and bounded branches',()=>{
 const cells={A1:'=B1+1',B1:'=A1+1',C1:'=1/0',D1:'=A1+C1'};
 const result=debugFormula(cells,'D1');
 assert.ok(result.root.dependencies.some(x=>x.value==='#CYCLE!'));
 assert.ok(result.root.dependencies.some(x=>x.value==='#DIV/0!'));
 assert.equal(result.root.dependencies[0].dependencies[0].dependencies[0].cycle,true);
 assert.equal(debugFormula(cells,'D1',{maxDepth:1}).truncated,true);
 assert.equal(debugFormula(cells,'D1',{maxNodes:2}).truncated,true);
 assert.throws(()=>debugFormula(cells,'AA1'),/Select a cell/);
 assert.throws(()=>debugFormula(cells,'D1',{maxNodes:0}),/limits/);
});
