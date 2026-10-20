import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderSlideObject,snapSlideCoordinate,selectedObjectDetails} from '../src/slide-layers.js';
test('slide objects can be moved across layers without modifying geometry',()=>{
  const slide={objects:[{id:'a',x:4},{id:'b',x:6},{id:'c',x:8}]};
  assert.equal(reorderSlideObject(slide,'a','front'),true);
  assert.deepEqual(slide.objects.map(x=>x.id),['b','c','a']);
  assert.equal(reorderSlideObject(slide,'c','back'),true);
  assert.deepEqual(slide.objects.map(x=>x.id),['c','b','a']);
  assert.equal(selectedObjectDetails(slide,'b').layer,2);
  assert.throws(()=>reorderSlideObject(slide,'b','delete'));
  assert.equal(slide.objects[1].x,6);
});
test('snap-to-grid is an opt-in stage preference',()=>{
  assert.equal(snapSlideCoordinate({snapToGrid:true},5.4),6);
  assert.equal(snapSlideCoordinate({snapToGrid:false},5.4),5.4);
  assert.equal(snapSlideCoordinate({snapToGrid:true},103),100);
});
