import test from 'node:test';
import assert from 'node:assert/strict';
import {SheetRecalculator} from '../src/sheet-recalc.js';
test('incremental calculation updates chains and dependencies',()=>{
  const cells={A1:'2',B1:'=A1*3',C1:'=B1+1',D1:'8'};
  const recalc=new SheetRecalculator(cells);
  assert.equal(recalc.display('C1'),'7');
  const affected=recalc.update('A1','4');
  assert.deepEqual([...affected].sort(),['A1','B1','C1']);
  assert.equal(recalc.display('C1'),'13');
  assert.equal(recalc.display('D1'),'8');
  assert.deepEqual([...recalc.update('B1','=D1+1')].sort(),['B1','C1']);
  assert.equal(recalc.display('C1'),'10');
  assert.deepEqual([...recalc.update('A1','100')],['A1']);
  assert.equal(recalc.display('C1'),'10');
});
test('cycles are not expanded forever',()=>{
  const recalc=new SheetRecalculator({A1:'=B1+1',B1:'=A1+1'});
  assert.equal(recalc.display('A1'),'#CYCLE!');
  assert.deepEqual([...recalc.update('A1','1')].sort(),['A1','B1']);
  assert.equal(recalc.display('B1'),'2');
});
