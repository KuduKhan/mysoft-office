import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSheetRules,applySheetRule,removeSheetRules,matchingRule} from '../src/sheet-rules.js';
test('conditional formats honor ranges, precedence and numeric comparisons',()=>{
  const file={activeSheetIndex:0,worksheets:[{name:'Sheet 1',cells:{}}]};
  applySheetRule(file,'A1:C4','greater','10','#ffe2c7');
  assert.equal(matchingRule(file,'B2','11').color,'#ffe2c7');
  assert.equal(matchingRule(file,'B2','9'),null);
  assert.equal(matchingRule(file,'D2','11'),null);
  applySheetRule(file,'B2','contains','VIP','#dff6e9');
  assert.equal(matchingRule(file,'B2','Very VIP').color,'#dff6e9');
  assert.equal(removeSheetRules(file),2);
  assert.equal(matchingRule(file,'B2','VIP'),null);
});
test('rules are worksheet scoped and reject unsafe input',()=>{
  const file={activeSheetIndex:0,worksheets:[{},{}]};
  applySheetRule(file,'A1:A3','less','20');
  file.activeSheetIndex=1;
  assert.equal(activeSheetRules(file).length,0);
  assert.equal(matchingRule(file,'A1','5'),null);
  assert.throws(()=>applySheetRule(file,'A1','greater','Infinity'));
  assert.throws(()=>applySheetRule(file,'A1','contains','x','red; background:blue'));
  assert.throws(()=>applySheetRule(file,'A1:Z1000','equal','3'));
});
