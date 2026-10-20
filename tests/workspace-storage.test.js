import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readLegacyWorkspace, validateWorkspace, OrderedWriteQueue, LEGACY_KEYS
} from '../src/workspace-storage.js';

const note = (id='note-1') => ({id,type:'notes',title:'Recovered note',body:'<p>Safe</p>'});
const sample = () => ({files:[note()],trash:[],versions:{}});

function storage(data) {
  return {getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null};
}

test('legacy reader preserves files, trash and revision snapshots',()=>{
  const state=readLegacyWorkspace(storage({
    [LEGACY_KEYS.files]:JSON.stringify({version:2,files:[note()]}),
    [LEGACY_KEYS.trash]:JSON.stringify([{...note('deleted'),trashedAt:120}]),
    [LEGACY_KEYS.versions]:JSON.stringify({'note-1':[{at:100,payload:note()}]})
  }));
  assert.equal(state.files[0].body,'<p>Safe</p>');
  assert.equal(state.trash[0].id,'deleted');
  assert.equal(state.versions['note-1'].length,1);
});

test('fresh workspace has no legacy data',()=>{
  assert.equal(readLegacyWorkspace(storage({})),null);
});

test('corrupt legacy data fails closed rather than silently replacing it',()=>{
  assert.throws(()=>readLegacyWorkspace(storage({
    [LEGACY_KEYS.files]:'{invalid'
  })),/invalid JSON/);
  assert.throws(()=>readLegacyWorkspace(storage({
    [LEGACY_KEYS.trash]:'[]'
  })),/files missing/);
});

test('workspace integrity checks reject duplicate and invalid file IDs',()=>{
  assert.throws(()=>validateWorkspace({
    ...sample(),trash:[note()]
  }),/duplicate/);
  assert.throws(()=>validateWorkspace({
    ...sample(),files:[{id:'broken',type:'invalid',title:'Bad'}]
  }),/Invalid/);
  assert.equal(validateWorkspace(sample()).files.length,1);
});

test('writes are serialized and snapshot mutations do not alter queued data',async()=>{
  const stored=[];
  const queue=new OrderedWriteQueue(async value=>{
    await Promise.resolve();
    stored.push(value.files[0].title);
  });
  const first=sample();
  const a=queue.save(first);
  first.files[0].title='Mutated outside queue';
  const second=sample();second.files[0].title='Second';
  await Promise.all([a,queue.save(second)]);
  assert.deepEqual(stored,['Recovered note','Second']);
});

test('failed write does not poison later retry',async()=>{
  let count=0;
  const queue=new OrderedWriteQueue(async()=>{if(++count===1)throw Error('QuotaExceededError');});
  await assert.rejects(queue.save(sample()),/QuotaExceeded/);
  await assert.doesNotReject(queue.save(sample()));
  assert.equal(count,2);
});
