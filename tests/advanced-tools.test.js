import test from 'node:test';
import assert from 'node:assert/strict';
import {replacementPattern,goalSeek,roadmapSlide,combineNotes,distributeDrawingLayers} from '../src/advanced-tools.js';
test('literal replacement matching honors case and Unicode whole-word boundaries',()=>{
 assert.deepEqual([...('Cat cat concatenate cat_ cat. écat').matchAll(replacementPattern('cat',{wholeWord:true}))].map(m=>m[0]),['Cat','cat','cat']);assert.equal([...('Cat cat').matchAll(replacementPattern('cat',{matchCase:true}))].length,1);assert.equal([...('a.b aXb').matchAll(replacementPattern('a.b'))].length,1);assert.throws(()=>replacementPattern(''));
});
test('Goal Seek solves linear and decreasing formulas without mutating inputs',()=>{
 const cells={A1:'5',B1:'=A1*3+7'},before=structuredClone(cells),result=goalSeek(cells,{resultCell:'B1',inputCell:'A1',target:100,lower:0,upper:100});assert.ok(Math.abs(result.input-31)<1e-6);assert.ok(Math.abs(result.result-100)<1e-6);assert.deepEqual(cells,before);assert.ok(Math.abs(goalSeek({A1:1,B1:'=100-A1*2'},{resultCell:'B1',inputCell:'A1',target:60,lower:0,upper:50}).input-20)<1e-6);
});
test('Goal Seek rejects unbracketed, discontinuous and invalid formulas transactionally',()=>{
 const options={resultCell:'B1',inputCell:'A1',target:5,lower:0,upper:10};assert.throws(()=>goalSeek({A1:1,B1:'=A1+20'},options));assert.throws(()=>goalSeek({A1:'=2',B1:'=A1'},options));assert.throws(()=>goalSeek({A1:1,B1:'=1/0'},options));assert.throws(()=>goalSeek({A1:1,B1:'=IF(A1<5,0,10)'},options));assert.throws(()=>goalSeek({A1:1,B1:'=A1'},{...options,lower:''}));
});
test('roadmap cards have independent IDs, bounded geometry, editable text and contrasting ink',()=>{
 const slide=roadmapSlide({title:'Launch',milestones:'Research\nBuild\nTest\nLaunch',accent:'#ffffff'});assert.equal(slide.objects.length,4);assert.equal(new Set(slide.objects.map(o=>o.id)).size,4);for(const object of slide.objects){assert.ok(object.x+object.w<=100&&object.y+object.h<=100);assert.equal(object.color,'#000000');}assert.throws(()=>roadmapSlide({milestones:'Only\nTwo'}));
});
test('combining notes retains full bodies and copies first-source canvas without editing sources',()=>{
 const notes=[{id:'a',type:'notes',title:'A<script>',body:'<p>Full content</p>',notebook:'Research',tags:['one'],noteCanvas:{paper:'linen'}},{id:'b',type:'notes',title:'B',body:'<table><tr><td>Data</td></tr></table>',tags:['two','one']}],before=structuredClone(notes),result=combineNotes(notes);assert.match(result.body,/A&lt;script&gt;/);assert.match(result.body,/<table>/);assert.deepEqual(result.tags,['one','two']);result.noteCanvas.paper='slate';assert.deepEqual(notes,before);assert.throws(()=>combineNotes([notes[0],notes[0]]));
});
test('drawing distribution preserves layer order, endpoints, hidden layers, geometry and sources',()=>{
 const file={mediaLayers:[{kind:'rect',color:'#000000',points:[[0,.1],[.1,.3]]},{kind:'rect',color:'#000000',points:[[.2,.1],[.3,.3]]},{kind:'rect',color:'#000000',points:[[.8,.1],[.9,.3]]},{kind:'erase',points:[[0,0],[1,1]]},{kind:'rect',hidden:true,points:[[.4,0],[.5,.3]]}]},before=structuredClone(file),result=distributeDrawingLayers(file,'horizontal');assert.equal(result.count,3);assert.ok(Math.abs(result.layers[1].points[0][0]-.4)<1e-9);assert.deepEqual(result.layers[3],before.mediaLayers[3]);assert.deepEqual(result.layers[4],before.mediaLayers[4]);assert.deepEqual(file,before);assert.throws(()=>distributeDrawingLayers({mediaLayers:[file.mediaLayers[0]]},'horizontal'));
});
