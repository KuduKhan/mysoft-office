import test from 'node:test';
import assert from 'node:assert/strict';
import {copyRangeTo,shiftRelativeFormula} from '../src/sheet-range.js';
test('Copy to shifts formulas, preserves style and original cells',()=>{
 const f={cells:{A1:'10',B1:'=A1+5',A2:'20',B2:'=A2+5'},cellStyles:{B1:{bold:true}}};
 assert.equal(copyRangeTo(f,'A1:B2','D3'),4);
 assert.equal(f.cells.D3,'10');assert.equal(f.cells.E3,'=D3+5');
 assert.equal(f.cells.E4,'=D4+5');assert.deepEqual(f.cellStyles.E3,{bold:true});
 assert.equal(f.cells.B1,'=A1+5');
});
test('Invalid copies are rejected without altering any cells',()=>{
 const f={cells:{A1:'=Z1000',B1:'old'},cellStyles:{}},old=JSON.stringify(f);
 assert.throws(()=>copyRangeTo(f,'A1','B1'),/outside/);
 assert.equal(JSON.stringify(f),old);
 assert.throws(()=>copyRangeTo(f,'A1:B1','Z999'),/exceed/);
 assert.equal(JSON.stringify(f),old);
 assert.equal(shiftRelativeFormula('=A1+A2',2,1),'=B3+B4');
 assert.throws(()=>shiftRelativeFormula('=$A$1',1,1),/Absolute/);
});
