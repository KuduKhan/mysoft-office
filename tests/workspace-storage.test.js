import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readLegacyWorkspace, readRecoveryJournal, validateWorkspace, OrderedWriteQueue, LEGACY_KEYS, RECOVERY_KEY
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


test('recovery journal reader validates pending edits and sequence',()=>{
  const pending={sequence:8,workspace:sample()};
  const recovered=readRecoveryJournal(storage({
    [RECOVERY_KEY]:JSON.stringify(pending)
  }));
  assert.equal(recovered.sequence,8);
  assert.equal(recovered.workspace.files[0].title,'Recovered note');
  assert.equal(readRecoveryJournal(storage({})),null);
  assert.throws(()=>readRecoveryJournal(storage({[RECOVERY_KEY]:'broken'})),/invalid JSON/);
  assert.throws(()=>readRecoveryJournal(storage({
    [RECOVERY_KEY]:JSON.stringify({sequence:-1,workspace:sample()})
  })),/invalid sequence/);
});


test('restore saves can opt out of pending replay journal',async()=>{
  const writes=[],changes=[];
  const store={
    db:{},nextSequence:9,
    stage(){throw Error('A rejected restore must not touch the journal');},
    queue:new OrderedWriteQueue(async workspace=>writes.push(workspace))
  };
  const {BrowserWorkspaceStore}=await import('../src/workspace-storage.js');
  await BrowserWorkspaceStore.prototype.save.call(store,sample(),{journal:false});
  assert.equal(writes[0]._sequence,10);
  assert.equal(writes[0].files[0].id,'note-1');
  assert.equal(store.nextSequence,10);
});

test('invalid recovery journal cannot overwrite a valid committed database',async()=>{
  const {BrowserWorkspaceStore}=await import('../src/workspace-storage.js');
  const store=new BrowserWorkspaceStore({});
  store.db={};
  store.read=async()=>sample();
  const result=await store.initialize(storage({[RECOVERY_KEY]:'{invalid'}),()=>[]);
  assert.equal(result.source,'journal-ignored');
  assert.equal(result.workspace.files[0].title,'Recovered note');
});

test('unavailable localStorage can still initialize an IndexedDB-backed workspace',async()=>{
  const {BrowserWorkspaceStore}=await import('../src/workspace-storage.js');
  const store=new BrowserWorkspaceStore({});
  store.db={};
  store.read=async()=>null;
  store.queue=new OrderedWriteQueue(async()=>{});
  const noAccess={getItem(){const err=new Error('Denied');err.name='SecurityError';throw err;}};
  const result=await store.initialize(noAccess,()=>[note()]);
  assert.equal(result.source,'new');
  assert.equal(result.workspace.files.length,1);
});
