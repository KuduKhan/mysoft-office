import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCell,cellRange} from '../src/formulas.js';

test('advanced numeric formulas compute standard statistics',()=>{
  const cells={A1:'10',A2:'12',A3:'14',B1:'=MOD(14,5)',B2:'=INT(-2.2)',B3:'=CEILING(12,5)',
    C1:'=FLOOR(12,5)',C2:'=SUMSQ(A1:A3)',C3:'=STDEV(A1:A3)',D1:'=VAR(A1:A3)',D2:'=SIGN(-7)'};
  assert.equal(evaluateCell('B1',cells),4);
  assert.equal(evaluateCell('B2',cells),-3);
  assert.equal(evaluateCell('B3',cells),15);
  assert.equal(evaluateCell('C1',cells),10);
  assert.equal(evaluateCell('C2',cells),440);
  assert.equal(evaluateCell('C3',cells),2);
  assert.equal(evaluateCell('D1',cells),4);
  assert.equal(evaluateCell('D2',cells),-1);
});
test('numeric error handling and range validation are bounded',()=>{
  const cells={B1:'=MOD(12,0)',B2:'=CEILING(4,0)',B3:'=STDEV(3)'};
  assert.equal(evaluateCell('B1',cells),'#DIV/0!');
  assert.equal(evaluateCell('B2',cells),'#DIV/0!');
  assert.equal(evaluateCell('B3',cells),'#ERROR!');
  assert.throws(()=>cellRange('A1','AA2'));
  assert.throws(()=>cellRange('A1','A1001'));
  assert.deepEqual(cellRange('Z999','Z1000'),['Z999','Z1000']);
});
