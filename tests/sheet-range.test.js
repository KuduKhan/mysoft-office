import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRange,forEachRange,formatRange,clearRange,copyRangeTSV,seriesFill,rangeSummary} from '../src/sheet-range.js';

test('range parsing validates edges and rejects oversized rectangles',()=>{
  assert.deepEqual(parseRange('C4:A1'),{top:1,bottom:4,left:0,right:2,count:12});
  assert.equal(parseRange('Z1000').count,1);
  assert.throws(()=>parseRange('A1:Z1000'),/limit/);
  assert.throws(()=>parseRange('A0:B2'));
  assert.throws(()=>parseRange('AA1:AA2'));
});
test('range formatting and clearing only touch selected region',()=>{
  const file={cells:{A1:'a',A2:'b',B1:'c'},cellStyles:{}};
  assert.equal(formatRange(file,'A1:B2','bold',true),4);
  assert.equal(file.cellStyles.B2.bold,true);
  assert.equal(copyRangeTSV(file,'A1:B2'),'a\tc\nb\t');
  clearRange(file,'B1:B2',true);
  assert.equal(file.cells.A1,'a');
  assert.equal(file.cells.B1,undefined);
  assert.equal(file.cellStyles.A2.bold,true);
  assert.equal(file.cellStyles.B2,undefined);
});
test('numeric series fill with custom step and summary',()=>{
  const file={cells:{C3:'10',C4:'15'},cellStyles:{}};
  assert.equal(seriesFill(file,'C3:C6'),4);
  assert.deepEqual(['C3','C4','C5','C6'].map(k=>file.cells[k]),['10','15','20','25']);
  assert.deepEqual(rangeSummary(file,'C3:C6'),{cells:4,nonempty:4,numeric:4,sum:70,average:17.5,min:10,max:25});
});
test('invalid fills never modify existing cells',()=>{
  const file={cells:{A1:'=B2+1',A2:'12'},cellStyles:{}};
  const before=JSON.stringify(file);
  assert.throws(()=>seriesFill(file,'A1:A3'),/numeric/);
  assert.equal(JSON.stringify(file),before);
});
