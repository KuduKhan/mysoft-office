import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaFields,validateMediaRecord,defaultMediaEdits,processAudio,encodeWAV,encodeMedia,decodeMedia,visualAspect,applyMediaPreset,trimBounds} from '../src/media-model.js';
import {versionContent,restoreRevision} from '../src/revisions.js';
import {validateWorkspace} from '../src/workspace-storage.js';
test('media validates bounded edits and preserves originals through revisions',()=>{
  const f={id:'media1',type:'media',title:'Photo',...createMediaFields(),mediaKind:'image',mediaMime:'image/png',mediaData:encodeMedia(new Uint8Array([1,2,3,4]))};
  assert.equal(validateMediaRecord(f),true);assert.deepEqual([...decodeMedia(f.mediaData)],[1,2,3,4]);
  validateWorkspace({files:[f],trash:[],versions:{}});
  const saved=versionContent(f);assert.equal(saved.mediaData,undefined);applyMediaPreset(f,'vivid');f.mediaEdits.cropLeft=25;
  assert.equal(visualAspect(f),1280*.75/720);assert.equal(f.mediaEdits.saturation,125);
  const restored=restoreRevision(f,{content:saved});assert.equal(restored.mediaData,f.mediaData);assert.equal(restored.mediaEdits.saturation,100);
  f.mediaEdits.outputWidth=9000;assert.equal(validateMediaRecord(f),false);
});
test('audio trim, speed, reverse and stereo to mono affect encoded samples',()=>{
  const rate=8000,left=Float32Array.from({length:8000},(_,i)=>i/16000),right=Float32Array.from(left,v=>v*.5);
  const e={...defaultMediaEdits(),trimStart:.25,trimEnd:.75,speed:2,audioMono:true};
  const result=processAudio([left,right],rate,e);assert.equal(result.duration,.25);assert.equal(result.channels.length,1);assert.equal(result.channels[0][0],.09375);
  e.reverse=true;const reversed=processAudio([left,right],rate,e);assert.ok(reversed.channels[0][0]>result.channels[0][0]);
  const wav=encodeWAV(result.channels,rate),v=new DataView(wav.buffer);assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF');assert.equal(v.getUint16(22,true),1);assert.equal(v.getUint32(24,true),rate);assert.equal(v.getUint32(40,true),4000);
});
test('audio normalization and fades are real and invalid trim ranges fail',()=>{
  const e={...defaultMediaEdits(),normalize:true,fadeIn:.1,fadeOut:.1};const result=processAudio([new Float32Array(8000).fill(.2)],8000,e);
  assert.equal(result.channels[0][0],0);assert.equal(result.channels[0].at(-1),0);assert.ok(Math.abs(result.channels[0][2000]-.95)<.0001);
  assert.throws(()=>trimBounds({mediaDuration:1,mediaEdits:{...e,trimStart:.8,trimEnd:.4}}));
});
