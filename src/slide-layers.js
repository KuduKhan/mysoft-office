import {getSlideObject} from './slide-objects.js';
const ACTIONS=new Set(['forward','backward','front','back']);
export function reorderSlideObject(slide,id,action){
  if(!ACTIONS.has(action))throw Error('Invalid layer action.');
  const objects=Array.isArray(slide?.objects)?slide.objects:[];
  const i=objects.findIndex(x=>x.id===id);
  if(i<0)throw Error('Select an object first.');
  const target=action==='front'?objects.length-1:action==='back'?0:
    action==='forward'?Math.min(objects.length-1,i+1):Math.max(0,i-1);
  if(i===target)return false;
  const [object]=objects.splice(i,1);
  objects.splice(target,0,object);
  return true;
}
export function snapSlideCoordinate(slide,value){
  if(!Number.isFinite(value))throw Error('Invalid stage position');
  const clamped=Math.max(0,Math.min(100,value));
  return slide?.snapToGrid?Math.round(clamped/2)*2:clamped;
}
export function selectedObjectDetails(slide,id){
  const obj=getSlideObject(slide,id);
  if(!obj)return null;
  return {kind:obj.kind,x:obj.x,y:obj.y,w:obj.w,h:obj.h,layer:slide.objects.indexOf(obj)+1,total:slide.objects.length};
}
