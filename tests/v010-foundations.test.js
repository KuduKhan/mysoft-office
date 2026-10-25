import test from 'node:test';
import assert from 'node:assert/strict';
import {fillDown} from '../src/studio-tools.js';
import {evaluateCell} from '../src/formulas.js';
import {addSlideObject,updateSlideObject} from '../src/slide-objects.js';
import {resizeSlideObject} from '../src/slide-align.js';

test('relative formula fill translates references while copying independent formatting',()=>{
 const cells={A1:'5',A2:'7',A3:'9',B1:'=A1*2'},styles={B1:{bold:true,color:'#225588'},B2:{italic:true}};
 assert.equal(fillDown(cells,'B1',2,styles),2);
 assert.deepEqual([cells.B1,cells.B2,cells.B3],['=A1*2','=A2*2','=A3*2']);
 assert.equal(evaluateCell('B3',cells),18);
 assert.deepEqual(styles.B2,styles.B1);
 styles.B2.bold=false;
 assert.equal(styles.B3.bold,true);
});
test('a failing formula translation leaves values and styles unchanged',()=>{
 const cells={A998:'=B999',A999:'Prior',A1000:'Keep'},styles={A998:{bold:true},A999:{italic:true}};
 const originalCells=structuredClone(cells),originalStyles=structuredClone(styles);
 assert.throws(()=>fillDown(cells,'A998',2,styles),/outside A1:Z1000/);
 assert.deepEqual(cells,originalCells);
 assert.deepEqual(styles,originalStyles);
 assert.throws(()=>fillDown(cells,'A998',51,styles),/1 and 50/);
});
test('slide property validation is atomic even with mixed valid and invalid edits',()=>{
 const s={},o=addSlideObject(s,'rect'),identity=o,before=structuredClone(o);
 assert.throws(()=>updateSlideObject(s,o.id,{x:12,y:20,color:'not-hex'}),/color/);
 assert.deepEqual(o,before);assert.equal(o,identity);
 assert.throws(()=>updateSlideObject(s,o.id,{w:55,text:'Changed',unknown:'x'}),/Unsupported/);
 assert.deepEqual(o,before);
 assert.throws(()=>updateSlideObject(s,o.id,{x:'',w:50}),/geometry/);
 assert.deepEqual(o,before);
 updateSlideObject(s,o.id,{x:20,y:5,w:65,h:65,text:'Approved'});
 assert.deepEqual([o.x,o.y,o.w,o.h],[20,5,65,65]);
 assert.equal(o.text,'Approved');
});
test('object resizing retains center when possible and never mutates on invalid dimensions',()=>{
 const s={},o=addSlideObject(s,'rect');
 updateSlideObject(s,o.id,{x:80,y:75,w:10,h:10});
 const state=structuredClone(o);
 assert.throws(()=>resizeSlideObject(s,o.id,101,10),/between/);
 assert.deepEqual(o,state);
 assert.throws(()=>resizeSlideObject(s,o.id,20,NaN),/between/);
 assert.deepEqual(o,state);
 resizeSlideObject(s,o.id,30,40);
 assert.deepEqual([o.x,o.y,o.w,o.h],[70,60,30,40]);
});
