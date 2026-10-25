import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTable,preciseObjectPatch,taskCaptureHTML} from '../src/studio-pro-tools.js';
import {drawingSVG} from '../src/media-vector.js';
import {createMediaFields} from '../src/media-model.js';
import {pdfStampOptions} from '../src/pdf-model.js';
import {editMediaLayer} from '../src/media-customize.js';
test('group summaries evaluate formulas, handle blank groups and preserve source data',()=>{
 const cells={A1:'Team',B1:'Cost',A2:'Design',B2:'10',A3:'Design',B3:'=B2*2',A4:'Engineering',B4:5,A5:'',B5:3},before=structuredClone(cells);
 assert.deepEqual(summarizeTable(cells,'A1:B5').cells,{A1:'Team',B1:'Sum',A2:'Design',B2:30,A3:'Engineering',B3:5,A4:'(Blank)',B4:3});assert.equal(summarizeTable(cells,'A1:B5',{operation:'average'}).cells.B2,15);assert.equal(summarizeTable(cells,'A1:B5',{operation:'min'}).cells.B2,10);assert.equal(summarizeTable(cells,'A1:B5',{operation:'max'}).cells.B2,20);assert.equal(summarizeTable(cells,'A1:B5',{operation:'count'}).cells.B2,2);assert.deepEqual(cells,before);
 assert.throws(()=>summarizeTable({...cells,B4:'unknown'},'A1:B5'),/numeric/);assert.throws(()=>summarizeTable(cells,'A1:B5',{group:'C'}),/inside/);assert.throws(()=>summarizeTable({A1:'x',A2:'="=SUM(B1)"',B2:10},'A1:B2'),/safely/);assert.throws(()=>summarizeTable({A1:'x',A2:'A',B2:'=1/0'},'A1:B2'),/formula error/);
});
test('precise geometry is transactional and retains unrelated object properties',()=>{
 const object={id:'a',kind:'rect',x:1,y:1,w:20,h:20,rotation:0,text:''},before=structuredClone(object),input={x:'20',y:'30',w:'50',h:'25',rotation:'90',fontSize:'24',fill:'#123456',color:'#ffffff',text:'Launch'};
 const patch=preciseObjectPatch(object,input);assert.equal(patch.id,'a');assert.equal(patch.x,20);assert.equal(patch.rotation,90);assert.equal(patch.text,'Launch');assert.deepEqual(object,before);assert.throws(()=>preciseObjectPatch(object,{...input,x:80}),/inside/);assert.throws(()=>preciseObjectPatch(object,{...input,fontSize:'NaN'}),/finite/);assert.throws(()=>preciseObjectPatch(object,{...input,rotation:45}),/quarter/);assert.deepEqual(object,before);
});
test('quick task capture escapes markup and refuses empty or excessive tasks',()=>{
 assert.equal(taskCaptureHTML('- Review\n☐ <script>hello</script>'),'<ul><li>☐ Review</li><li>☐ &lt;script&gt;hello&lt;/script&gt;</li></ul>');assert.throws(()=>taskCaptureHTML(' \n '));assert.throws(()=>taskCaptureHTML(Array(31).fill('Task').join('\n')));assert.throws(()=>taskCaptureHTML('x'.repeat(201)));
});
test('vector export retains layers, caption escaping, eraser masks and hides hidden layers',()=>{
 const file={...createMediaFields(),title:'A <drawing>',mediaKind:'drawing'};file.mediaEdits.text='A < B';file.mediaEdits.background='#ffffff';file.mediaLayers=[{kind:'rect',color:'#112233',width:.01,fill:true,points:[[.1,.2],[.4,.6]]},{kind:'erase',color:'#000000',width:.02,fill:false,points:[[.2,.3],[.3,.4]]},{kind:'pen',color:'#deadbe',width:.01,fill:false,points:[[0,0],[1,1]],hidden:true}];const before=structuredClone(file),svg=drawingSVG(file);assert.ok(svg.startsWith('<svg '));assert.ok(svg.includes('<mask id="erase-1"'));assert.ok(svg.includes('url(#erase-1)'));assert.ok(svg.includes('A &lt; B'));assert.ok(svg.includes('A &lt;drawing&gt;'));assert.ok(!svg.includes('#deadbe'));assert.deepEqual(file,before);assert.throws(()=>drawingSVG({...file,mediaKind:'image'}),/drawing/);
});
test('layer resize retains its center, is reversible and rejects overflow before mutation',()=>{
 const file={mediaLayers:[{kind:'rect',points:[[.2,.3],[.6,.7]]}]},before=structuredClone(file);editMediaLayer(file,0,'grow');assert.ok(Math.abs(file.mediaLayers[0].points[0][0]-.18)<1e-10);editMediaLayer(file,0,'shrink');file.mediaLayers[0].points.flat().forEach((n,i)=>assert.ok(Math.abs(n-before.mediaLayers[0].points.flat()[i])<1e-10));file.mediaLayers[0].points=[[0,0],[1,1]];const full=structuredClone(file);assert.throws(()=>editMediaLayer(file,0,'grow'),/inward/);assert.deepEqual(file,full);
});
test('PDF finishing validates text and numbering before writing',()=>{
 assert.deepEqual(pdfStampOptions({watermark:' DRAFT ',pageNumbers:true,startNumber:'8'}),{watermark:'DRAFT',pageNumbers:true,startNumber:8});assert.throws(()=>pdfStampOptions({watermark:'α'}),/printable/);assert.throws(()=>pdfStampOptions({startNumber:0}));assert.throws(()=>pdfStampOptions({watermark:'x'.repeat(81)}));
});
