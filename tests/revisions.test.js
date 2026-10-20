import test from 'node:test';
import assert from 'node:assert/strict';
import {addRevision,restoreRevision,MAX_REVISIONS} from '../src/revisions.js';
test('captures bounded deep copies and rejects duplicate revisions',()=>{
  const f={id:'abc',type:'sheets',title:'Budget',cells:{A1:'10'}};
  const one=addRevision({},f,1000,true);
  f.cells.A1='50';
  assert.equal(one.abc[0].content.cells.A1,'10');
  assert.equal(addRevision(one,{...f,cells:{A1:'10'}},1100,true),one);
  let versions=one;
  for(let n=0;n<20;n++)versions=addRevision(versions,{...f,title:String(n)},10000+n*180000);
  assert.equal(versions.abc.length,MAX_REVISIONS);
});
test('restoring a revision leaves snapshot immutable',()=>{
  const f={id:'f',type:'docs',title:'New',body:'Latest'};
  const prev=addRevision({}, {...f,title:'Old',body:'Before'},1,true).f[0];
  const restored=restoreRevision(f,prev);
  assert.equal(restored.body,'Before');
  assert.equal(restored.title,'Old');
  restored.title='Edited';
  assert.equal(prev.content.title,'Old');
});
test('refuses revision of different file type',()=>{
  assert.throws(()=>restoreRevision({type:'docs'}, {content:{type:'sheets'}}));
});
