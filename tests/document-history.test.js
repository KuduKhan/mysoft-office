import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentHistory,headingsFromHTML} from '../src/document-history.js';
test('document editing maintains undo, redo and edit branches',()=>{
  const h=new DocumentHistory(12,100);
  h.seed('file','<p>Start</p>');
  h.record('file','<p>First</p>',1000);
  h.record('file','<p>Second</p>',1050);
  assert.equal(h.undo('file'),'<p>Start</p>');
  assert.equal(h.redo('file'),'<p>Second</p>');
  assert.equal(h.undo('file'),'<p>Start</p>');
  h.record('file','<p>Changed</p>',2000);
  assert.equal(h.redo('file'),null);
  assert.equal(h.undo('file'),'<p>Start</p>');
});
test('history cap protects memory usage',()=>{
  const h=new DocumentHistory(3,0);
  h.seed('a','0');
  for(let i=1;i<=10;i++)h.record('a',String(i),i*1000);
  assert.equal(h.documents.get('a').entries.length,3);
  assert.equal(h.undo('a'),'9');
});
test('document outline follows heading depth',()=>{
  assert.deepEqual(headingsFromHTML('<h1>Welcome</h1><p>x</p><h2>Section &amp; text</h2>'),
    [{index:0,level:1,title:'Welcome'},{index:1,level:2,title:'Section & text'}]);
});
