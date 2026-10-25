// Normalize all editable shape positions to an evenly spaced canvas axis.
// All geometry is validated before any object is updated. Works with the
// existing normalized 0–100% slide model, without introducing new schema keys.
import {slideObjects} from './slide-objects.js';

export function distributeSlideObjects(slide,axis='horizontal',padding=4){
  if(!['horizontal','vertical'].includes(axis))throw Error('Choose horizontal or vertical distribution.');
  if(!Number.isFinite(padding)||padding<0||padding>20)throw Error('Invalid distribution padding.');
  const objects=slideObjects(slide);
  if(objects.length<3||objects.length>40)throw Error('Place 3–40 editable objects on the slide first.');
  for(const object of objects){
    if(!['x','y','w','h'].every(key=>Number.isFinite(object[key])))
      throw Error('A shape has invalid geometry.');
    if(object.x<0||object.y<0||object.w<5||object.h<5||object.x+object.w>100.000001||object.y+object.h>100.000001)
      throw Error('A shape lies outside the slide canvas.');
    if((Number(object.rotation)||0)!==0)
      throw Error('Rotate shapes back to zero before distribution to avoid clipping.');
  }
  const position=axis==='horizontal'?'x':'y',extent=axis==='horizontal'?'w':'h';
  const ordered=[...objects].sort((a,b)=>a[position]-b[position]);
  const total=ordered.reduce((sum,object)=>sum+object[extent],0);
  const available=100-2*padding,spacing=(available-total)/(ordered.length-1);
  if(spacing<0)throw Error('The shapes are too large to distribute without overlap. Resize them first.');
  let cursor=padding;
  const writes=ordered.map(object=>{
    const value=Math.round(cursor*1000000)/1000000;
    cursor+=object[extent]+spacing;
    return {object,value};
  });
  for(const {object,value} of writes)object[position]=value;
  return writes.length;
}
