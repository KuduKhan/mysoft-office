import test from 'node:test';
import assert from 'node:assert/strict';
import {paragraphLayout,noteCanvas,noteCanvasStyle} from '../src/mo-workbench.js';

test('paragraph settings enforce finite bounds and supported direction',()=>{
 assert.deepEqual(paragraphLayout(),{after:14,indent:0,tracking:0,direction:'ltr'});
 assert.deepEqual(paragraphLayout({after:'80',indent:96,tracking:-1,direction:'rtl'}),{after:80,indent:96,tracking:-1,direction:'rtl'});
 for(const patch of [{after:81},{indent:-1},{tracking:9},{tracking:Infinity},{direction:'auto'}])assert.throws(()=>paragraphLayout(patch));
});
test('note canvas validates typography and safely normalizes imported appearance',()=>{
 assert.equal(noteCanvas().width,'standard');
 for(const patch of [{size:25},{size:14.5},{lineHeight:3}])assert.throws(()=>noteCanvas(patch));
 const css=noteCanvasStyle({noteCanvas:{paper:'slate',font:'Georgia',size:18,lineHeight:2,width:'focused',ruled:true}});
 assert.match(css,/--note-width:560px/);assert.match(css,/--note-leading:36px/);assert.match(css,/linear-gradient/);
 const unsafe=noteCanvasStyle({noteCanvas:{font:'url(evil)',paper:'<script>',size:NaN}});
 assert.doesNotMatch(unsafe,/evil|script|NaN/);assert.match(unsafe,/font-size:15px/);
});
