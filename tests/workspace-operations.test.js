import test from 'node:test';
import assert from 'node:assert/strict';
import {editMediaLayer} from '../src/media-customize.js';
import {renderedSlideObjects} from '../src/slide-objects.js';
test('mirroring stays inside a selected layer bounds, is reversible and preserves other layers',()=>{
 const file={mediaLayers:[{kind:'pen',points:[[.1,.2],[.4,.3],[.2,.7]],color:'#087f8c'},{kind:'line',points:[[0,0],[1,1]]}]};const before=structuredClone(file);
 assert.equal(editMediaLayer(file,0,'mirror-h'),0);assert.deepEqual(file.mediaLayers[0].points,[[.4,.2],[.09999999999999998,.3],[.3,.7]]);assert.deepEqual(file.mediaLayers[1],before.mediaLayers[1]);editMediaLayer(file,0,'mirror-h');file.mediaLayers[0].points.flat().forEach((v,i)=>assert.ok(Math.abs(v-before.mediaLayers[0].points.flat()[i])<1e-12));editMediaLayer(file,0,'mirror-v');assert.ok(Math.abs(file.mediaLayers[0].points[0][1]-.7)<1e-12);assert.equal(file.mediaLayers[0].color,'#087f8c');
});
test('shape labels escape markup in both editable and presentation views',()=>{
 const slide={objects:[{id:'safe',kind:'roundRect',x:10,y:10,w:30,h:20,text:'<script>alert(1)</script>',fill:'#ffffff',color:'#222222'}]};for(const editable of [true,false]){const result=renderedSlideObjects(slide,{editable});assert.ok(result.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));assert.ok(!result.includes('<script>'));if(editable)assert.ok(result.includes('aria-label="Edit shape label"'));}
});
