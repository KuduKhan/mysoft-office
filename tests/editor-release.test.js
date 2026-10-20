import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCell} from '../src/formulas.js';
import {renameNoteCollection,noteLocation} from '../src/note-structure.js';
import {addSlideObject,renderedSlideObjects} from '../src/slide-objects.js';
import {isPublicPath} from '../scripts/public-paths.mjs';
import {SECURITY_HEADERS} from '../scripts/security-headers.mjs';

test('numeric comparisons, IF, AND, OR, NOT evaluate deterministically',()=>{
 const cells={A1:'14',A2:'5',
 B1:'=IF(A1>10,100,0)',B2:'=IF(A2<=10,A1*2,5)',
 B3:'=AND(A1>10,A2<10)',B4:'=OR(A1=0,A2<>0)',
 B5:'=NOT(A2>=10)',B6:'=IF(A1=A2,1,2)',B7:'=IF(0,6,9)'};
 assert.deepEqual(['B1','B2','B3','B4','B5','B6','B7'].map(ref=>evaluateCell(ref,cells)),
 [100,28,1,1,1,2,9]);
 assert.equal(evaluateCell('A1',{A1:'=IF(1,10)'}),10);
});
test('new formula functions fail closed for invalid syntax',()=>{
 const cells={A1:'=IF(1)',A2:'=NOT(1,2)',A3:'=IF(1>2,3,4)+2',A4:'=IF(1=1,5,8)'};
 assert.equal(evaluateCell('A1',cells),'#ERROR!');
 assert.equal(evaluateCell('A2',cells),'#ERROR!');
 assert.equal(evaluateCell('A3',cells),6);
 assert.equal(evaluateCell('A4',cells),5);
});
test('rename notebook across matching notes without touching unrelated files',()=>{
 const notes=[{type:'notes',notebook:'Projects',section:'Design'},
 {type:'notes',notebook:'Projects',section:'Releases'},
 {type:'notes',notebook:'Personal',section:'Design'},
 {type:'docs',notebook:'Projects',section:'Design'}];
 assert.equal(renameNoteCollection(notes,{notebook:'Projects',newName:'Work'}),2);
 assert.equal(noteLocation(notes[0]).notebook,'Work');
 assert.equal(noteLocation(notes[1]).notebook,'Work');
 assert.equal(noteLocation(notes[2]).notebook,'Personal');
 assert.equal(notes[3].notebook,'Projects');
 assert.equal(renameNoteCollection(notes,{notebook:'Work',section:'Design',newName:'Creative'}),1);
 assert.equal(notes[0].section,'Creative');
 assert.equal(notes[1].section,'Releases');
});
test('collection rename rejects invalid names and keeps note collection unchanged',()=>{
 const notes=[{type:'notes',notebook:'Work',section:'General'}];
 const original=JSON.stringify(notes);
 for(const newName of ['', '<script>', 'x'.repeat(41)]){
  assert.throws(()=>renameNoteCollection(notes,{notebook:'Work',newName}));
  assert.equal(JSON.stringify(notes),original);
 }
 assert.throws(()=>renameNoteCollection(notes,{notebook:'Missing',newName:'Next'}));
});
test('native rounded rectangle and triangle shapes produce editable safe markup',()=>{
 const slide={objects:[]};
 assert.equal(addSlideObject(slide,'roundRect').kind,'roundRect');
 assert.equal(addSlideObject(slide,'triangle').kind,'triangle');
 const rendered=renderedSlideObjects(slide,{editable:true});
 assert.match(rendered,/studio-shape-roundRect/);
 assert.match(rendered,/studio-shape-triangle/);
 assert.throws(()=>addSlideObject(slide,'script'),/Unsupported/);
});
test('development server blocks internal and hidden files',()=>{
 for(const path of ['/', '/index.html','/src/app.js','/src/workspace-storage.js','/src/shell-polish.css','/assets/favicon.svg'])
  assert.equal(isPublicPath(path),true,path);
 for(const path of ['/.git/config','/package.json','/vercel.json','/.env.local','/supabase/schema.sql',
 '/scripts/server.mjs','/tests/e2e/ooxml.spec.cjs','/src/../.git/config','/src/secrets.json'])
  assert.equal(isPublicPath(path),false,path);
});
test('security headers include CSP and deny frame embedding',()=>{
 assert.equal(SECURITY_HEADERS['X-Frame-Options'],'DENY');
 assert.match(SECURITY_HEADERS['Content-Security-Policy'],/frame-ancestors 'none'/);
 assert.match(SECURITY_HEADERS['Content-Security-Policy'],/object-src 'none'/);
 assert.match(SECURITY_HEADERS['Permissions-Policy'],/camera=\(\)/);
});
