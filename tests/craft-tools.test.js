import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateCellGroups,duplicatedSlideRange,notebookHTML,alignedDrawingLayers,duplicateHighlightInk} from '../src/craft-tools.js';
test('duplicate review compares displayed values, ignores blanks and separates formula errors',()=>{
 const cells={A1:'Header',A2:' Alpha ',A3:'alpha',A4:'ALPHA',B2:'5',B3:'=2+3',B4:'=1/0',C2:' '},before=structuredClone(cells);
 const result=duplicateCellGroups(cells,'A1:C4',{header:true});assert.deepEqual(result.refs,['A2','A3','A4','B2','B3']);assert.deepEqual(result.errors,['B4']);assert.deepEqual(cells,before);
 assert.equal(duplicateCellGroups(cells,'A1:C4',{matchCase:true}).groups.length,1);assert.equal(duplicateCellGroups(cells,'A2:A3',{trim:false}).groups.length,0);
 assert.throws(()=>duplicateCellGroups(cells,'A1:Z1000'));assert.throws(()=>duplicateCellGroups(cells,'invalid'));assert.equal(duplicateHighlightInk('#000000'),'#ffffff');assert.equal(duplicateHighlightInk('#fff0a8'),'#000000');assert.throws(()=>duplicateHighlightInk('bad'));
});
test('bulk slide copies are independent, preserve source data, renew object IDs and enforce deck limits',()=>{
 const source=[{title:'One',notes:'Speaker note',objects:[{id:'object',text:'Keep',x:3}]},{title:'Two',objects:[]}],before=structuredClone(source),result=duplicatedSlideRange(source,1,1,2);
 assert.equal(result.first,1);assert.equal(result.count,2);assert.equal(result.slides.length,4);assert.equal(new Set(result.slides.slice(1,3).map(s=>s.objects[0].id)).size,2);
 result.slides[1].objects[0].text='Changed';assert.deepEqual(source,before);assert.equal(result.slides[2].objects[0].text,'Keep');
 for(const args of [[0,1,1],[2,1,1],[1,3,1],[1,1,6]])assert.throws(()=>duplicatedSlideRange(source,...args));assert.throws(()=>duplicatedSlideRange(Array(200).fill(source[0]),1,1));
});
test('notebook export escapes titles, requires sanitation and never truncates note bodies',()=>{
 const notes=[{type:'notes',notebook:'Work & ideas',section:'Plan <one>',title:'A <title>',body:'<p>Full writing</p>'},{type:'notes',title:'Other',body:'Keep'}],before=structuredClone(notes);let calls=0;
 const html=notebookHTML(notes,'Work & ideas',body=>{calls++;return body;});assert.match(html,/A &lt;title&gt;/);assert.match(html,/Plan &lt;one&gt;/);assert.match(html,/<p>Full writing<\/p>/);assert.match(html,/href="#note-0"/);assert.equal(calls,1);assert.deepEqual(notes,before);
 assert.throws(()=>notebookHTML(notes,'Work & ideas'));assert.throws(()=>notebookHTML(notes,'Missing',x=>x));assert.throws(()=>notebookHTML(Array(101).fill(notes[0]),'Work & ideas',x=>x));
});
test('visible layer alignment preserves geometry, styles, hidden layers, erasers and source records',()=>{
 const file={mediaKind:'drawing',mediaLayers:[{kind:'rect',points:[[.1,.2],[.3,.4]],color:'#123456'},{kind:'rect',points:[[.5,.6],[.9,.8]]},{kind:'erase',points:[[.6,.2],[.8,.4]]},{kind:'rect',hidden:true,points:[[.7,.1],[.8,.2]]}]},before=structuredClone(file);
 for(const mode of ['left','center','right','top','middle','bottom']){
  const {layers,count}=alignedDrawingLayers(file,mode);assert.equal(count,2);assert.deepEqual(layers[2],before.mediaLayers[2]);assert.deepEqual(layers[3],before.mediaLayers[3]);assert.equal(layers[0].color,'#123456');for(const l of layers)for(const p of l.points)assert.ok(p.every(v=>v>=0&&v<=1));
 }
 const left=alignedDrawingLayers(file,'left').layers;assert.ok(Math.abs(left[1].points[0][0]-.1)<1e-12);assert.equal(left[1].points[0][1],.6);assert.deepEqual(file,before);
 assert.throws(()=>alignedDrawingLayers({...file,mediaKind:'image'},'left'));assert.throws(()=>alignedDrawingLayers({...file,mediaLayers:[file.mediaLayers[0]]},'left'));
});
