import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceMatchSource,searchWorkspaceFiles} from '../src/workspace-search.js';
const records=[
{id:'1',type:'docs',title:'Report',body:'<h2>Project horizon</h2><p>Milestones</p>',updatedAt:10},
{id:'2',type:'notes',title:'Ideas',body:'<p>Remember to ship</p>',tags:['delivery','planning'],updatedAt:20},
{id:'3',type:'sheets',title:'Budget',worksheets:[{name:'Forecast',cells:{A1:'Workstreams',B1:'500'}}],cells:{A1:'fallback'},updatedAt:30},
{id:'4',type:'slides',title:'Launch deck',slides:[{title:'Opening',body:'Milestone sequence',notes:'Presenter briefing',objects:[{text:'Banner text'}]}],updatedAt:40}
];
test('searches document and note content without interpreting markup',()=>{
 assert.equal(workspaceMatchSource(records[0],'HORIZON'),'document content');
 assert.equal(workspaceMatchSource(records[1],'planning'),'tag');
 assert.equal(workspaceMatchSource(records[1],'remember'),'document content');
 assert.equal(workspaceMatchSource(records[0],'onclick'),null);
});
test('searches worksheet cells and slide text and notes',()=>{
 assert.equal(workspaceMatchSource(records[2],'workstreams'),'cell content');
 assert.equal(workspaceMatchSource(records[2],'forecast'),'worksheet name');
 assert.equal(workspaceMatchSource(records[3],'presenter briefing'),'slide content');
 assert.equal(workspaceMatchSource(records[3],'banner text'),'slide content');
});
test('returns recent matches and does not mutate the caller',()=>{
 assert.deepEqual(searchWorkspaceFiles(records,'MILESTONE').map(x=>x.id),['4','1']);
 assert.deepEqual(searchWorkspaceFiles(records,'').map(x=>x.id),['4','3','2','1']);
 assert.deepEqual(records.map(x=>x.id),['1','2','3','4']);
 assert.deepEqual(searchWorkspaceFiles(records,'nothing'),[]);
});
test('handles missing optional file data',()=>{
 assert.equal(workspaceMatchSource(null,'missing'),null);
 assert.equal(workspaceMatchSource({type:'sheets',cells:{}},'needle'),null);
});
