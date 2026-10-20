import test from 'node:test';
import assert from 'node:assert/strict';
import {filterNotes} from '../src/note-search.js';
test('notebook search includes section, tags and content',()=>{
 const files=[{id:'1',type:'notes',title:'Training',notebook:'Academy',section:'Lessons',tags:['coding'],body:'<p>Learn APIs</p>'},
 {id:'2',type:'notes',title:'Shopping',body:'<p>Fruit</p>'},{id:'3',type:'docs',title:'Academy'}];
 assert.deepEqual(filterNotes(files,'api').map(x=>x.id),['1']);
 assert.deepEqual(filterNotes(files,'Academy').map(x=>x.id),['1']);
 assert.deepEqual(filterNotes(files,'coding').map(x=>x.id),['1']);
 assert.equal(filterNotes(files,'none').length,0);
});
