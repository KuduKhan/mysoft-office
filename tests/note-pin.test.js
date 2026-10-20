import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleNotePin,sortedNotes} from '../src/note-pin.js';
test('pinned notes stay before normal notes without altering text',()=>{
  const a={type:'notes',id:'a',body:'unchanged',updatedAt:20};
  const b={type:'notes',id:'b',updatedAt:3};
  assert.equal(toggleNotePin(b),true);
  assert.deepEqual(sortedNotes([a,b]).map(x=>x.id),['b','a']);
  assert.equal(toggleNotePin(b),false);
  assert.equal(a.body,'unchanged');
});
