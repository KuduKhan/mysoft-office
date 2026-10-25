import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudSnapshotSummary,workspaceSignature,writeSnapshotIfCurrent,CloudSnapshotConflictError} from '../src/cloud-sync.js';
const note=(id,title)=>({id,type:'notes',title,body:'<p>'+title+'</p>'});
const state=(files=[],trash=[],versions={})=>({files,trash,versions});
test('snapshot comparison ignores exported-at metadata but detects body edits, trash and history',()=>{
 const local={...state([note('a','One'),note('b','Two')]),exportedAt:'a'};
 const remote={...state([note('a','One changed'),note('c','Three')],[note('d','Deleted')],{a:[{at:1}]}),exportedAt:'b'};
 const result=cloudSnapshotSummary(local,remote);
 assert.deepEqual(result.localOnly.map(x=>x.id),['b']);
 assert.deepEqual(result.remoteOnly.map(x=>x.id),['c','d']);
 assert.deepEqual(result.different.map(x=>x.id),['a']);
 assert.equal(result.versionsDiffer,true);
 assert.equal(cloudSnapshotSummary(local,structuredClone(local)).identical,true);
 assert.equal(cloudSnapshotSummary(local,null).remoteMissing,true);
 assert.equal(workspaceSignature({...local,exportedAt:'c'}),workspaceSignature(local));
});
test('first cloud upload uses create-only insert, no destructive upsert',async()=>{
 const actions=[];const db={from:name=>{
  assert.equal(name,'mysoft_workspaces');
  return {insert:record=>{actions.push({method:'insert',record});return {select:()=>({single:async()=>({data:{updated_at:'2026-10-25T20:01:01Z'},error:null})})};}};
 }};
 const version=await writeSnapshotIfCurrent(db,'account1',state([note('a','Doc')]),null);
 assert.equal(version,'2026-10-25T20:01:01Z');
 assert.equal(actions.length,1);assert.equal(actions[0].method,'insert');
});
test('conflicting first writer cannot overwrite the existing cloud record',async()=>{
 const db={from:()=>({insert:()=>({select:()=>({single:async()=>({error:{code:'23505',message:'duplicate'}})})})})};
 await assert.rejects(writeSnapshotIfCurrent(db,'account1',state([note('a','One')]),null),CloudSnapshotConflictError);
});
test('stale cloud revision fails closed and current conditional write succeeds',async()=>{
 const probes=[];
 const db={from:()=>({update:payload=>{
  probes.push(payload);
  const state={};
  state.eq=(key,value)=>{probes.push([key,value]);return state;};
  state.select=()=>state;
  state.maybeSingle=async()=>({data:null,error:null});
  return state;
 }})};
 await assert.rejects(writeSnapshotIfCurrent(db,'account1',state([note('a','One')]),'2026-10-25T20:01:01+00:00'),CloudSnapshotConflictError);
 assert.deepEqual(probes.slice(1,3),[['user_id','account1'],['updated_at','2026-10-25T20:01:01+00:00']]);
 const db2={from:()=>({update:payload=>{
  const q={eq:()=>q,select:()=>q,maybeSingle:async()=>({data:{updated_at:payload.updated_at},error:null})};
  return q;
 }})};
 const next=await writeSnapshotIfCurrent(db2,'account1',state([]),'2026-10-25T20:01:01Z');
 assert.ok(Date.parse(next)>Date.parse('2026-10-25T20:01:01Z'));
});
test('malformed cloud snapshots and invalid revision never reach network',async()=>{
 const db={from:()=>{throw Error('should not make request');}};
 await assert.rejects(writeSnapshotIfCurrent(db,'u',{files:[],trash:[]},null),/Invalid workspace/);
 await assert.rejects(writeSnapshotIfCurrent(db,'u',state([]),'not-a-date'),/revision/);
});
