import test from 'node:test';
import assert from 'node:assert/strict';
import {colorHistogram} from '../src/media-analysis.js';
test('RGB histogram ignores transparent pixels and bins color channels',()=>{
 const samples=new Uint8ClampedArray([255,0,4,255,20,40,60,255,250,250,250,0]);
 const h=colorHistogram(samples);
 assert.equal(h.count,2);assert.equal(h.red[63],1);assert.equal(h.red[5],1);
 assert.equal(h.green[0],1);assert.equal(h.green[10],1);assert.equal(h.blue[15],1);
});
test('histogram fails closed for oversized input',()=>{
 const h=colorHistogram(new Uint8ClampedArray(600004));assert.equal(h.count,0);
});
