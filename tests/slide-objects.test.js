import test from 'node:test';
import assert from 'node:assert/strict';
import {slideObjects,addSlideObject,updateSlideObject,moveSlideObject,duplicateSlideObject,deleteSlideObject,renderedSlideObjects} from '../src/slide-objects.js';
test('freeform slide shapes remain bounded and editable',()=>{
 const slide={title:'Test'};
 const object=addSlideObject(slide,'text');
 updateSlideObject(slide,object.id,{text:'Hello <world>',x:96,y:98,fontSize:34});
 assert.ok(object.x<=100-object.w);
 assert.ok(object.y<=100-object.h);
 assert.match(renderedSlideObjects(slide,{editable:true}),/Hello &lt;world&gt;/);
 moveSlideObject(slide,object.id,-100,-100);
 assert.equal(object.x,0);assert.equal(object.y,0);
 const clone=duplicateSlideObject(slide,object.id);
 assert.notEqual(clone.id,object.id);
 deleteSlideObject(slide,object.id);assert.equal(slideObjects(slide).length,1);
});
test('slide object operations reject unsafe types and invalid colors',()=>{
 const s={};assert.throws(()=>addSlideObject(s,'script'));
 const x=addSlideObject(s,'ellipse');
 assert.throws(()=>updateSlideObject(s,x.id,{fill:'url(javascript:1)'}));
 assert.throws(()=>updateSlideObject(s,x.id,{fontSize:500}));
 assert.throws(()=>updateSlideObject(s,x.id,{foo:1}));
 assert.equal(renderedSlideObjects(s).includes('script'),false);
});
