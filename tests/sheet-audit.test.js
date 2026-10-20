import test from 'node:test';
import assert from 'node:assert/strict';
import {formulaDependencies,auditSheet,traceCell} from '../src/sheet-audit.js';
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
