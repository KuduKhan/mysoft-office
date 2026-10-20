import test from 'node:test';
import assert from 'node:assert/strict';
import {noteLocation,moveNote,organizeNotes,safeCollectionName} from '../src/note-structure.js';
test('older Notes files migrate without content changes',()=>{
 const note={type:'notes',id:'a',body:'<p>Archive</p>'};
 assert.deepEqual(noteLocation(note),{notebook:'Personal',section:'General'});
 moveNote(note,'Work','Meetings');
 assert.equal(note.body,'<p>Archive</p>');
 assert.deepEqual(noteLocation(note),{notebook:'Work',section:'Meetings'});
});
test('notes group into notebooks and sections with recent first',()=>{
 const notes=[
 {type:'notes',id:'a',notebook:'Work',section:'Notes',updatedAt:5},
 {type:'notes',id:'b',notebook:'Work',section:'Notes',updatedAt:10},
 {type:'notes',id:'c',notebook:'Personal',section:'Journal',updatedAt:20},
 {type:'docs',id:'x'}
 ];
 const groups=organizeNotes(notes);
 assert.equal(groups.length,2);
 assert.deepEqual(groups[1].sections[0].notes.map(x=>x.id),['b','a']);
 assert.equal(safeCollectionName(' <Hello> '),'Hello');
});
