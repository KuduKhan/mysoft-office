import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAddress,viewportStart,moveAddress,pasteGrid,populatedBounds,parseTSV} from '../src/sheet-window.js';
test('addresses cover a bounded 26x1000 grid',()=>{
  assert.deepEqual(parseAddress('z1000'),{col:25,row:1000,address:'Z1000'});
  assert.equal(parseAddress('AA4'),null);
  assert.equal(parseAddress('A1001'),null);
  assert.equal(parseAddress('Z0'),null);
  assert.equal(moveAddress('Z1000',1,1),'Z1000');
  assert.equal(moveAddress('B2',-1,-1),'A1');
});
test('virtual window remains inside grid',()=>{
  assert.equal(viewportStart(0),1);
  assert.equal(viewportStart(100000),953);
  assert.ok(viewportStart(1350)>1);
});
test('tab-separated grid paste and bounds preserve values',()=>{
  const f={A1:'Header'};
  assert.equal(pasteGrid(f,'Y999','10\t20\n30\t40'),4);
  assert.equal(f.Y999,'10');
  assert.equal(f.Z1000,'40');
  assert.deepEqual(populatedBounds(f),{maxRow:1000,maxCol:26});
  assert.deepEqual(parseTSV('a\tb\nc\td'),[['a','b'],['c','d']]);
});
