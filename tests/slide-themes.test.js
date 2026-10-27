import test from 'node:test';
import assert from 'node:assert/strict';
import {SLIDE_THEMES,SLIDE_PRESETS,slideAppearance,applySlideTheme,copySlideAppearance,setSlidePreset} from '../src/studio-tools.js';
test('theme selection clears a stale backdrop and leaves content and object appearance intact',()=>{
 const object={id:'shape',fill:'#ff0000'},slide={theme:'violet',studioPreset:'night',title:'Keep',objects:[object],notes:'Retain'};
 applySlideTheme(slide,'forest');assert.deepEqual(slideAppearance(slide),SLIDE_THEMES.forest);assert.equal(slide.studioPreset,undefined);assert.equal(slide.objects[0],object);assert.equal(slide.title,'Keep');assert.equal(slide.notes,'Retain');
 const before=structuredClone(slide);assert.throws(()=>applySlideTheme(slide,'invalid'));assert.deepEqual(slide,before);
});
test('custom backdrops override the palette only until Follow theme is chosen',()=>{
 const slide={theme:'midnight'};setSlidePreset(slide,'sunset');assert.deepEqual(slideAppearance(slide),SLIDE_PRESETS.sunset);setSlidePreset(slide,'theme');assert.deepEqual(slideAppearance(slide),SLIDE_THEMES.midnight);
 assert.deepEqual(slideAppearance({theme:'constructor',studioPreset:'__proto__'}),SLIDE_THEMES.violet);
 const palette=slideAppearance(slide);palette.background='#000000';assert.equal(slideAppearance(slide).background,SLIDE_THEMES.midnight.background);
});
test('copying appearance clears stale target overrides and preserves independent content',()=>{
 const target={title:'Target',studioPreset:'sunset',theme:'ocean',objects:[{fill:'#ffffff'}],layout:'section'};copySlideAppearance({theme:'forest'},target);assert.equal(target.studioPreset,undefined);assert.equal(target.theme,'forest');assert.equal(target.title,'Target');assert.equal(target.layout,'section');assert.deepEqual(target.objects,[{fill:'#ffffff'}]);copySlideAppearance({theme:'violet',studioPreset:'night'},target);assert.equal(target.studioPreset,'night');
});
