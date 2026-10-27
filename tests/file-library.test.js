import test from 'node:test';
import assert from 'node:assert/strict';
import {sortLibraryFiles,normalizeLibrarySort} from '../src/file-library.js';
test('library ordering is stable, natural, case insensitive and leaves file records intact',()=>{
 const files=[{id:'a',title:'Draft 10',type:'docs',updatedAt:30},{id:'b',title:'draft 2',type:'notes',updatedAt:10},{id:'c',title:'draft 2',type:'docs',updatedAt:20}];
 const snapshot=structuredClone(files);
 assert.deepEqual(sortLibraryFiles(files,'name').map(f=>f.id),['b','c','a']);
 assert.deepEqual(sortLibraryFiles(files,'type').map(f=>f.id),['c','a','b']);
 assert.deepEqual(sortLibraryFiles(files).map(f=>f.id),['a','c','b']);
 assert.deepEqual(sortLibraryFiles(files,'updated-asc').map(f=>f.id),['b','c','a']);
 assert.deepEqual(files,snapshot);assert.equal(sortLibraryFiles(files)[0],files[0]);
});
test('library handles older date formats, deleted dates and invalid saved preferences',()=>{
 const files=[{id:'a',updatedAt:'2026-10-20T00:00:00Z'},{id:'b',updatedAt:0,trashedAt:Date.parse('2026-10-23')},{id:'c',updatedAt:'invalid'},{id:'d'}];
 assert.deepEqual(sortLibraryFiles(files).map(f=>f.id),['b','a','c','d']);
 for(const value of [null,undefined,'__proto__','constructor','bad'])assert.equal(normalizeLibrarySort(value),'updated-desc');
 assert.deepEqual(sortLibraryFiles([],null),[]);
});
