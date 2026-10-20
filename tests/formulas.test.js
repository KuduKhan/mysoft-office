import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCell, cellRange, columnIndex } from '../src/formulas.js';

test('understands coordinates and ranges', () => {
  assert.equal(columnIndex('A'), 0);
  assert.equal(columnIndex('AA'), 26);
  assert.deepEqual(cellRange('B2','A1'), ['A1','B1','A2','B2']);
});

test('evaluates arithmetic and cell references', () => {
  const cells={ A1:'10', A2:'5', B1:'=A1+A2*2', B2:'=(A1+A2)/3' };
  assert.equal(evaluateCell('B1',cells),20);
  assert.equal(evaluateCell('B2',cells),5);
});

test('supports aggregate functions', () => {
  const cells={ A1:'10', A2:'20', A3:'30', B1:'=SUM(A1:A3)', B2:'=AVERAGE(A1:A3)', B3:'=MIN(A1:A3)', B4:'=MAX(A1:A3)' };
  assert.equal(evaluateCell('B1',cells),60);
  assert.equal(evaluateCell('B2',cells),20);
  assert.equal(evaluateCell('B3',cells),10);
  assert.equal(evaluateCell('B4',cells),30);
});

test('reports invalid expressions, cycles and division by zero', () => {
  const cells={A1:'=B1',B1:'=A1',C1:'=5/0',D1:'=alert(1)'};
  assert.equal(evaluateCell('A1',cells),'#CYCLE!');
  assert.equal(evaluateCell('C1',cells),'#DIV/0!');
  assert.equal(evaluateCell('D1',cells),'#ERROR!');
});
