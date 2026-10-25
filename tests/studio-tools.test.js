import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_ACCENTS,SLIDE_PRESETS,replaceSheetValues,fillDown,clearCell,setSlidePreset} from '../src/studio-tools.js';

test('palette values are unique, valid and include orangered',()=>{
  assert.ok(STUDIO_ACCENTS.some(p=>p.name==='Orangered'));
  assert.equal(new Set(STUDIO_ACCENTS.map(p=>p.value)).size,STUDIO_ACCENTS.length);
  for(const c of STUDIO_ACCENTS)assert.match(c.value,/^#[0-9a-f]{6}$/);
});
test('find and replace does not alter formulas or other cells',()=>{
  const cells={A1:'Apple',A2:'green apple',B1:'=SUM(A1:A2)',C3:'Pineapple'};
  const count=replaceSheetValues(cells,'apple','orange');
  assert.equal(count,3);
  assert.equal(cells.B1,'=SUM(A1:A2)');
  assert.equal(cells.A1,'orange');
  assert.equal(cells.A2,'green orange');
  assert.equal(cells.C3,'Pineorange');
  assert.throws(()=>replaceSheetValues(cells,'','x'));
});
test('fill down and clear are bounded and formula safe',()=>{
  const cells={A998:'Text'};
  assert.equal(fillDown(cells,'A998',10),2);
  assert.equal(cells.A1000,'Text');
  cells.B2='=A2*2';
  assert.equal(fillDown(cells,'B2',5),5);
  assert.equal(cells.B3,'=A3*2');
  assert.equal(cells.B7,'=A7*2');
  const styles={A999:{bold:true}};
  clearCell(cells,styles,'A999');
  assert.equal(cells.A999,undefined);
  assert.equal(styles.A999,undefined);
});
test('slide design presets are guarded',()=>{
  const slide={title:'Design'};
  setSlidePreset(slide,'sunset');
  assert.equal(slide.studioPreset,'sunset');
  assert.ok(SLIDE_PRESETS.sunset.accent);
  assert.throws(()=>setSlidePreset(slide,'javascript:evil'));
});
