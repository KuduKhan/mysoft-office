import test from 'node:test';
import assert from 'node:assert/strict';
import {sortedSnapshot,agendaSlides,recolorArtwork,ART_PALETTES,croppedBox} from '../src/workflow-studio.js';
import {DocumentHistory} from '../src/document-history.js';
import {inspectWorkingFile} from '../src/file-check.js';
test('handoff checks surface unresolved template fields',()=>{
 const result=inspectWorkingFile({type:'docs',title:'Brief',body:'<h1>{{project}}</h1><p>Prepared for {{client}}</p>'});assert.ok(result.checks.some(check=>check.label==='Template fields'&&check.status==='review'&&check.detail.startsWith('2 unfilled')));
 assert.ok(!inspectWorkingFile({type:'docs',title:'Brief',body:'<h1>Aurora</h1>'}).checks.some(check=>check.label==='Template fields'));
});
test('workflow history checkpoints separate rapid transformations from typing',()=>{
 const history=new DocumentHistory();history.seed('doc','');history.record('doc','{{client}}');history.checkpoint('doc','{{client}}');history.record('doc','Ada');history.checkpoint('doc','Ada');history.record('doc','Ada!');assert.equal(history.undo('doc'),'Ada');assert.equal(history.undo('doc'),'{{client}}');assert.equal(history.redo('doc'),'Ada');
});
test('multi-column sort is stable, blanks last and leaves source formulas intact',()=>{
 const cells={A1:'Team',B1:'Score',C1:'Person',A2:'North',B2:'=5+5',C2:'Ada',A3:'North',B3:'2',C3:'Bo',A4:'South',B4:'10',C4:'Cy',A5:'North',B5:'10',C5:'Di'},before=structuredClone(cells);
 const result=sortedSnapshot(cells,'A1:C5',{primary:'B',secondary:'A',numeric:true,direction:'desc'});
 assert.equal(result.rows,4);assert.equal(result.cells.B2,'10');assert.equal(result.cells.C2,'Ada');assert.equal(result.cells.C3,'Di');assert.equal(result.cells.C4,'Cy');assert.equal(result.cells.C5,'Bo');assert.deepEqual(cells,before);
 assert.equal(sortedSnapshot({A1:'x',A2:'',A3:'3'},'A1:A3',{direction:'desc'}).cells.A2,'3');
});
test('sort rejects invalid ranges, numeric data and unsafe snapshots before mutation',()=>{
 const cells={A1:'Name',A2:'=1',B1:'N',B2:'text'},before=structuredClone(cells);
 for(const options of [{primary:'Z'},{primary:'B',numeric:true},{primary:'A',secondary:'A'},{direction:'bad'}])assert.throws(()=>sortedSnapshot(cells,'A1:B2',options));
 assert.throws(()=>sortedSnapshot({A1:'Header',A2:' =malicious'},'A1:A2'));assert.deepEqual(cells,before);
});
test('agenda pagination preserves deck design and excludes generated agendas',()=>{
 const slides=Array.from({length:9},(_,i)=>({title:'Topic '+i,theme:'forest',studioPreset:'ocean',objects:[{id:'keep'}]})),before=structuredClone(slides),pages=agendaSlides([...slides,{workflowAgenda:true,title:'Old agenda'}],'Today');
 assert.equal(pages.length,2);assert.match(pages[1].body,/9\. Topic 8/);assert.equal(pages[0].studioPreset,'ocean');assert.deepEqual(slides,before);assert.throws(()=>agendaSlides(Array(200).fill({title:'Full'})));assert.throws(()=>agendaSlides([],''));
});
test('palette mapping coordinates repeated colors and retains layer geometry and visibility',()=>{
 const file={mediaLayers:[{color:'#FF0000',points:[[0,0],[1,1]],hidden:true},{color:'#ff0000',opacity:.4},{color:'#00ff00'}]},before=structuredClone(file),result=recolorArtwork(file,'ocean');
 assert.equal(result.colors,2);assert.equal(result.layers[0].color,ART_PALETTES.ocean[0]);assert.equal(result.layers[1].color,result.layers[0].color);assert.equal(result.layers[2].color,ART_PALETTES.ocean[1]);assert.equal(result.layers[0].hidden,true);assert.deepEqual(file,before);assert.throws(()=>recolorArtwork(file,'unknown'));assert.throws(()=>recolorArtwork({mediaLayers:[]},'ocean'));
});
test('crop margins follow rotated page coordinates and retain crop-box origin',()=>{
 const box={x:10,y:20,width:200,height:100},margins={top:10,right:20,bottom:30,left:40};
 const near=(actual,expected)=>Object.keys(expected).forEach(key=>assert.ok(Math.abs(actual[key]-expected[key])<1e-9,key));
 near(croppedBox(box,0,margins),{x:90,y:50,width:80,height:60});
 near(croppedBox(box,90,margins),{x:30,y:60,width:120.00000000000001,height:40});
 near(croppedBox(box,180,margins),{x:50,y:30,width:80,height:60});
 near(croppedBox(box,270,margins),{x:70,y:40,width:120,height:40});
 assert.throws(()=>croppedBox(box,0,{top:41}));assert.throws(()=>croppedBox(box,0,{top:NaN}));assert.throws(()=>croppedBox(box,45,{}));
});
