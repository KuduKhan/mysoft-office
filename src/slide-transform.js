import {getSlideObject,updateSlideObject} from './slide-objects.js';
// Quarter turns preserve a supported transform in the editable MySoft/PPTX model.
export function rotateSlideObject(slide,id,direction='right'){
  if(!['left','right'].includes(direction))throw Error('Choose left or right rotation.');
  const object=getSlideObject(slide,id);
  if(!object)throw Error('Select a slide object.');
  const current=Number(object.rotation)||0;
  const rotation=((current+(direction==='right'?90:-90))%360+360)%360;
  const rotated=rotation%180===90;
  const aspect=16/9;
  const halfX=rotated?object.h/(2*aspect):object.w/2;
  const halfY=rotated?object.w*aspect/2:object.h/2;
  if(halfX>50||halfY>50)throw Error('This object is too large to rotate within the slide.');
  const centerX=Math.max(halfX,Math.min(100-halfX,object.x+object.w/2));
  const centerY=Math.max(halfY,Math.min(100-halfY,object.y+object.h/2));
  // Apply with existing bounded geometry rules.
  updateSlideObject(slide,id,{x:centerX-object.w/2,y:centerY-object.h/2});
  object.rotation=rotation;
  return object;
}
