import test from 'node:test';
import assert from 'node:assert/strict';
import {recentWorkspaceFiles,editorMetric} from '../src/studio-workspace.js';

const f=(id,type='docs',updatedAt=0)=>({id,title:'File '+id,type,updatedAt});
test('recent file navigation de-duplicates, includes active and skips removed files',()=>{
  const files=[f('a'),f('b','sheets',4),f('c','notes',2)];
  assert.deepEqual(recentWorkspaceFiles(files,'a',['c','a','missing','b']).map(x=>x.id),['a','c','b']);
  assert.deepEqual(recentWorkspaceFiles(files,null,['missing'],2).map(x=>x.id),['b','c']);
});
test('editor metrics support unicode, cells and slides',()=>{
  assert.equal(editorMetric(f('a'),'Hello κόσμε'),'2 words · 11 characters');
  assert.equal(editorMetric({...f('b','sheets'),cells:{A1:'2',A2:''}}),'1 populated cells');
  assert.equal(editorMetric({...f('c','slides'),slides:[{},{}]}),'2 slides');
});
