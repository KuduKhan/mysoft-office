import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceLinks} from '../src/workspace-links.js';
test('workspace links resolve across documents, notes, sheets and slides',()=>{
 const files=[
  {id:'doc',type:'docs',title:'Report',body:'<p><a href="#/file/sheet">Budget</a> <a href="#/file/lost">Gone</a></p>'},
  {id:'sheet',type:'sheets',title:'Budget'},
  {id:'notes',type:'notes',title:'Research',body:'<p><a href="#/file/doc">Report</a></p>'},
  {id:'slides',type:'slides',title:'Deck'}
 ];
 const report=workspaceLinks(files,'doc');
 assert.deepEqual(report.outgoing.map(f=>f.id),['sheet']);
 assert.deepEqual(report.incoming.map(f=>f.id),['notes']);
 assert.deepEqual(report.missing,['lost']);
 files[1].title='Renamed budget';
 assert.equal(workspaceLinks(files,'doc').outgoing[0].title,'Renamed budget');
});
test('workspace reference lookup tolerates missing and empty source',()=>{
 assert.deepEqual(workspaceLinks([], 'missing'),{outgoing:[],incoming:[],missing:[]});
});
