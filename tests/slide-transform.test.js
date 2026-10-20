import test from 'node:test';
import assert from 'node:assert/strict';
import {addSlideObject,renderedSlideObjects} from '../src/slide-objects.js';
import {rotateSlideObject} from '../src/slide-transform.js';
test('slide object quarter turns and HTML transform are stable',()=>{
  const slide={},object=addSlideObject(slide,'text');
  assert.equal(rotateSlideObject(slide,object.id,'right').rotation,90);
  assert.match(renderedSlideObjects(slide),/rotate\(90deg\)/);
  assert.equal(rotateSlideObject(slide,object.id,'right').rotation,180);
  assert.equal(rotateSlideObject(slide,object.id,'left').rotation,90);
  assert.throws(()=>rotateSlideObject(slide,object.id,'unknown'));
});
