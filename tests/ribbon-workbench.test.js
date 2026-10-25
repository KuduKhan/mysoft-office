import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateFormula} from '../src/ribbon-workbench.js';
import {evaluateCell} from '../src/formulas.js';
test('ribbon aggregate formulas normalize ranges and evaluate live without replacing input',()=>{
 const cells={A1:'5',A2:'10'},before=structuredClone(cells);assert.equal(aggregateFormula(cells,'A3','MAX',' a2:a1 '),'=MAX(A1:A2)');assert.equal(evaluateCell('A3',{...cells,A3:aggregateFormula(cells,'A3','COUNT','A1:A2')}),2);assert.deepEqual(cells,before);
});
test('ribbon aggregate insertion refuses occupied cells, circular ranges and unsafe operations',()=>{
 for(const args of [[{A3:'0'},'A3','SUM','A1:A2'],[{},'A3','SUM','A1:A4'],[{},'Z1001','SUM','A1:A2'],[{},'A3','EXEC','A1:A2'],[{},'A3','SUM','A1:Z1000']])assert.throws(()=>aggregateFormula(...args));
});
