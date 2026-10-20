import test from 'node:test';
import assert from 'node:assert/strict';
import {addSlideObject} from '../src/slide-objects.js';
import {alignSlideObject,resizeSlideObject} from '../src/slide-align.js';
test('alignments and resizing stay within bounds',()=>{
 const slide={},obj=addSlideObject(slide,'rect');
 alignSlideObject(slide,obj.id,'right');assert.equal(obj.x,100-obj.w);
 alignSlideObject(slide,obj.id,'middle');assert.equal(obj.y,(100-obj.h)/2);
 resizeSlideObject(slide,obj.id,75,55);
 assert.ok(obj.x+obj.w<=100);assert.ok(obj.y+obj.h<=100);
 alignSlideObject(slide,obj.id,'center');assert.equal(obj.x,12.5);
 assert.throws(()=>resizeSlideObject(slide,obj.id,120,20));
 assert.throws(()=>alignSlideObject(slide,obj.id,'diagonal'));
});
