import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceLinks,setWorkspaceLink} from '../src/workspace-links.js';
import {validateWorkspace} from '../src/workspace-storage.js';
import {relocateNoteCollection} from '../src/note-structure.js';
import {createMediaFields,validateMediaRecord} from '../src/media-model.js';
import {updateLayerAppearance,transformMediaDrawing} from '../src/media-workbench.js';
import {editMediaLayer} from '../src/media-customize.js';
test('cross-application links persist as stable edges and resolve backlinks after renames',()=>{
  const files=['docs','sheets','slides','notes','pdf','media'].map((type,i)=>({id:'item'+i,type,title:'Title '+i}));
  assert.equal(setWorkspaceLink(files,'item5','item0'),true);
  assert.equal(setWorkspaceLink(files,'item5','item0'),false);
  files[0].title='Renamed';
  assert.deepEqual(workspaceLinks(files,'item5').outgoing.map(f=>f.title),['Renamed']);
  assert.deepEqual(workspaceLinks(files,'item0').incoming.map(f=>f.id),['item5']);
  assert.equal(setWorkspaceLink(files,'item5','item0',false),true);
  assert.equal(workspaceLinks(files,'item0').incoming.length,0);
  assert.throws(()=>setWorkspaceLink(files,'item1','item1'),/different/);
});
test('workspace validation rejects malformed and repeated knowledge edges before writing',()=>{
  const file={id:'a',type:'notes',title:'A',body:'',linkedFileIds:['b']};
  const snapshot={files:[file],trash:[],versions:{}};
  assert.equal(validateWorkspace(snapshot),snapshot);
  assert.throws(()=>validateWorkspace({...snapshot,files:[{...file,linkedFileIds:['b','b']}]}),/links/);
  assert.throws(()=>validateWorkspace({...snapshot,files:[{...file,linkedFileIds:['a']}]}),/links/);
});
test('notebook/section moves preserve bodies, IDs and do not affect other notebooks',()=>{
  const files=[{id:'a',type:'notes',notebook:'A',section:'One',body:'<p>keep</p>'},
    {id:'b',type:'notes',notebook:'A',section:'Two',body:'<p>other</p>'},
    {id:'c',type:'notes',notebook:'B',section:'One',body:'B'}];
  const changed=relocateNoteCollection(files,{notebook:'A',section:'One',destinationNotebook:'Archive'});
  assert.deepEqual(changed.map(f=>f.id),['a']);assert.equal(files[0].notebook,'Archive');
  assert.equal(files[0].body,'<p>keep</p>');assert.equal(files[1].notebook,'A');
  assert.throws(()=>relocateNoteCollection(files,{notebook:'A',destinationNotebook:'<>bad'}),/1–40/);
});
test('locked Media layers survive validation and refuse appearance, motion, deletion and canvas transform',()=>{
  const f={...createMediaFields(),mediaKind:'drawing'},layer={kind:'rect',color:'#ff0000',width:.01,fill:false,points:[[.2,.2],[.5,.5]],locked:true};
  f.mediaLayers=[layer];assert.equal(validateMediaRecord(f),true);
  const before=structuredClone(f);
  assert.throws(()=>editMediaLayer(f,0,'delete'),/Unlock/);
  assert.throws(()=>updateLayerAppearance(f,0,{opacity:.5}),/Unlock/);
  assert.throws(()=>transformMediaDrawing(f,'rotate'),/Unlock/);
  assert.deepEqual(f,before);
  updateLayerAppearance(f,0,{locked:false});assert.equal(f.mediaLayers[0].locked,false);
  assert.equal(editMediaLayer(f,0,'duplicate'),1);
  assert.equal(validateMediaRecord({...f,mediaLayers:[{...layer,locked:'yes'}]}),false);
});
