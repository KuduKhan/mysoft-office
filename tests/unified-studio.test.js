import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWorkspace} from '../src/workspace-audit.js';
import {versionContent,restoreRevision} from '../src/revisions.js';
test('unified knowledge health distinguishes missing IDs from recycled targets',()=>{
 const files=[{id:'A',type:'notes',title:'Note',body:'',linkedFileIds:['B','C','D']},
 {id:'B',type:'docs',title:'Doc',body:''}],trash=[{id:'C',type:'notes',title:'Old note',body:''}];
 const report=auditWorkspace({files,trash,versions:{A:[{at:500,content:{}}]}});
 assert.equal(report.edges.length,1);assert.equal(report.broken.length,1);
 assert.equal(report.broken[0].targetId,'D');assert.equal(report.recycledEdges.length,1);
 assert.equal(report.recycledEdges[0].target.title,'Old note');
 assert.equal(report.history[0].file.id,'A');
 assert.equal(files[0].linkedFileIds.length,3);
});
test('version snapshots retain newer file link graph, forms and PDF annotations',()=>{
 const source={id:'a',title:'Example',type:'pdf',linkedFileIds:['b'],pdfRotations:{},
  pdfFormValues:{Name:'Amy'},pdfAnnotations:[{id:'one',type:'note',page:1,rect:[1,2,3,4],text:'ok'}]};
 const content=versionContent(source);
 source.linkedFileIds=[];source.pdfFormValues={};source.pdfAnnotations=[];
 const restored=restoreRevision(source,{content});
 assert.deepEqual(restored.linkedFileIds,['b']);assert.deepEqual(restored.pdfFormValues,{Name:'Amy'});
 assert.equal(restored.pdfAnnotations[0].text,'ok');
 assert.deepEqual(source.pdfAnnotations,[]);
});
