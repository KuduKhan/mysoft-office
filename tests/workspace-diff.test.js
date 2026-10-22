import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceRecordChanges} from '../src/workspace-diff.js';

const file=(id,title)=>({id,type:'notes',title,body:'<p>Text</p>'});
test('workspace patch writes only modified records and their revisions',()=>{
 const original={files:[file('one','First'),file('two','Second')],trash:[],versions:{one:[{id:1}]}};
 const updated=structuredClone(original);updated.files[1].title='Updated';
 updated.versions.two=[{id:2}];
 const changes=workspaceRecordChanges(original,updated);
 assert.deepEqual(changes.files.put.map(x=>x.id),['two']);
 assert.deepEqual(changes.files.remove,[]);
 assert.deepEqual(changes.trash,{put:[],remove:[]});
 assert.deepEqual(changes.versions.put.map(x=>x.id),['two']);
 assert.equal(original.files[1].title,'Second');
});
test('workspace patch handles fresh saves, removal, trash and restore',()=>{
 const original={files:[file('one','One')],trash:[],versions:{one:[]}};
 const updated={files:[file('two','Two')],trash:[file('one','One')],versions:{two:[]}};
 const changes=workspaceRecordChanges(original,updated);
 assert.deepEqual(changes.files.remove,['one']);
 assert.deepEqual(changes.files.put.map(x=>x.id),['two']);
 assert.deepEqual(changes.trash.put.map(x=>x.id),['one']);
 assert.deepEqual(changes.versions.remove,['one']);
 assert.deepEqual(workspaceRecordChanges(null,updated).files.put.map(x=>x.id),['two']);
});
test('workspace patch refuses to skip mutated content sharing the same metadata',()=>{
 const a={files:[{...file('x','X'),body:'<p>A</p>',updatedAt:12}],trash:[],versions:{}};
 const b={files:[{...file('x','X'),body:'<p>B</p>',updatedAt:12}],trash:[],versions:{}};
 assert.equal(workspaceRecordChanges(a,b).files.put.length,1);
});
