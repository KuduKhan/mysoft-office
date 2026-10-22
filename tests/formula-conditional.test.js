import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCell} from '../src/formulas.js';

test('IF skips invalid computations in the unselected branch',()=>{
 const cells={A1:'=IF(1,42,7/0)',A2:'=IF(0,9/0,17)',
   A3:'=IF(2>1,IF(0,1/0,22),1/0)',A4:'=IF(1,13,B4)',B4:'=B4'};
 assert.equal(evaluateCell('A1',cells),42);
 assert.equal(evaluateCell('A2',cells),17);
 assert.equal(evaluateCell('A3',cells),22);
 assert.equal(evaluateCell('A4',cells),13);
});
test('AND and OR short-circuit while maintaining safe full parsing',()=>{
 const cells={A1:'=AND(0,1/0)',A2:'=OR(1,1/0)',A3:'=AND(1,4>2)',A4:'=OR(0,0,2>1)'};
 assert.equal(evaluateCell('A1',cells),0);
 assert.equal(evaluateCell('A2',cells),1);
 assert.equal(evaluateCell('A3',cells),1);
 assert.equal(evaluateCell('A4',cells),1);
});
test('selected erroneous branches still raise errors and inactive syntax is checked',()=>{
 const cells={A1:'=IF(1,1/0,3)',A2:'=IF(0,3/0,1/0)',A3:'=IF(1,4,IMAGINARY(3))'};
 assert.equal(evaluateCell('A1',cells),'#DIV/0!');
 assert.equal(evaluateCell('A2',cells),'#DIV/0!');
 assert.equal(evaluateCell('A3',cells),'#ERROR!');
});
