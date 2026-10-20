import test from 'node:test';
import assert from 'node:assert/strict';
import {findTextPositions,nextMatchIndex} from '../src/doc-find.js';
test('find operations are case tolerant, bounded and non-mutating',()=>{
  const content='MySoft Office mysoft office MYSoft';
  assert.deepEqual(findTextPositions(content,'mysoft').map(x=>x.start),[0,14,28]);
  assert.deepEqual(findTextPositions(content,'MYSoft',{caseSensitive:true}).map(x=>x.start),[28]);
  assert.deepEqual(findTextPositions(content,''),[]);
  assert.equal(nextMatchIndex([0,1,2],2),0);
  assert.equal(nextMatchIndex([0,1,2],0,-1),2);
  assert.equal(nextMatchIndex([]),-1);
});
