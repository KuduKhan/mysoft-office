import {getSlideObject,updateSlideObject} from './slide-objects.js';
const positions=new Set(['left','right','center','top','bottom','middle']);
export function alignSlideObject(slide,id,position){
  if(!positions.has(position))throw Error('Unsupported alignment');
  const object=getSlideObject(slide,id);
  if(!object)throw Error('Select a slide object first');
  const changes={
    left:{x:0},right:{x:100-object.w},center:{x:(100-object.w)/2},
    top:{y:0},bottom:{y:100-object.h},middle:{y:(100-object.h)/2}
  };
  return updateSlideObject(slide,id,changes[position]);
}
export function resizeSlideObject(slide,id,width,height){
  const object=getSlideObject(slide,id);
  if(!object)throw Error('Select a slide object first');
  const w=Number(width),h=Number(height);
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<5||h<5||w>100||h>100)
    throw Error('Width and height must be between 5 and 100 percent.');
  // Normalize position first so the selected size fits entirely on the stage.
  object.x=Math.min(object.x,100-w);
  object.y=Math.min(object.y,100-h);
  return updateSlideObject(slide,id,{w,h});
}
