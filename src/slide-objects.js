// MySoft Slides native editable objects, kept in the local slide model.
// Geometry is normalized 0-100% and limited to the 16:9 slide stage.
const KINDS=new Set(['text','rect','ellipse']);
const MAX_OBJECTS=40;
const safeColor=value=>/^#[0-9a-f]{6}$/i.test(String(value||''));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function slideObjects(slide){
  if(!Array.isArray(slide.objects))slide.objects=[];
  return slide.objects;
}
export function addSlideObject(slide,kind='text'){
  if(!KINDS.has(kind))throw Error('Unsupported slide object');
  const objects=slideObjects(slide);
  if(objects.length>=MAX_OBJECTS)throw Error('Maximum 40 objects per slide');
  const index=objects.length;
  const object={
    id:'sh-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
    kind,x:clamp(14+index%6*6,0,70),y:clamp(25+index%5*6,0,70),
    w:kind==='text'?44:27,h:kind==='text'?18:22,
    fill:kind==='text'?'#ffffff':'#ea4c24',
    color:'#202d48',text:kind==='text'?'Edit this text box':'',fontSize:22
  };
  objects.push(object);return object;
}
export function getSlideObject(slide,id){
  return slideObjects(slide).find(x=>x.id===id)||null;
}
export function updateSlideObject(slide,id,patch){
  const o=getSlideObject(slide,id);
  if(!o)throw Error('Slide object not found');
  for(const [k,v]of Object.entries(patch)){
    if(['x','y','w','h'].includes(k)){
      if(!Number.isFinite(Number(v)))throw Error('Invalid object geometry');
      const n=Number(v);
      if(k==='x')o.x=clamp(n,0,100-o.w);
      if(k==='y')o.y=clamp(n,0,100-o.h);
      if(k==='w')o.w=clamp(n,5,100-o.x);
      if(k==='h')o.h=clamp(n,5,100-o.y);
    }else if(k==='text'){
      o.text=String(v??'').slice(0,600);
    }else if(['fill','color'].includes(k)){
      if(!safeColor(v))throw Error('Use a six-digit hex color');
      o[k]=v;
    }else if(k==='fontSize'){
      const size=Number(v);
      if(!Number.isInteger(size)||size<10||size>56)throw Error('Text size must be 10–56');
      o.fontSize=size;
    }else throw Error('Unsupported shape property');
  }
  return o;
}
export function moveSlideObject(slide,id,dx,dy){
  const o=getSlideObject(slide,id);
  if(!o)throw Error('Slide object not found');
  if(!Number.isFinite(dx)||!Number.isFinite(dy))throw Error('Invalid movement');
  return updateSlideObject(slide,id,{x:clamp(o.x+dx,0,100-o.w),y:clamp(o.y+dy,0,100-o.h)});
}
export function duplicateSlideObject(slide,id){
  const orig=getSlideObject(slide,id);
  if(!orig)throw Error('Slide object not found');
  if(slide.objects.length>=MAX_OBJECTS)throw Error('Maximum 40 objects per slide');
  const next={...structuredClone(orig),id:'sh-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)};
  next.x=clamp(next.x+4,0,100-next.w);next.y=clamp(next.y+4,0,100-next.h);
  slide.objects.push(next);return next;
}
export function deleteSlideObject(slide,id){
  const all=slideObjects(slide),index=all.findIndex(o=>o.id===id);
  if(index<0)throw Error('Slide object not found');
  all.splice(index,1);
}
export function renderedSlideObjects(slide,{editable=false,selectedId=''}={}){
  return slideObjects(slide).map(o=>{
    if(!KINDS.has(o.kind))return '';
    const val=(n,min,max)=>clamp(Number(n)||0,min,max);
    const x=val(o.x,0,95),y=val(o.y,0,95),w=val(o.w,5,100-x),h=val(o.h,5,100-y);
    const fill=safeColor(o.fill)?o.fill:'#ea4c24',color=safeColor(o.color)?o.color:'#202d48';
    const text=String(o.text??'').slice(0,600).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const style='position:absolute;left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%;background-color:'+fill+';color:'+color+';--shape-fill:'+fill+';--shape-text:'+color+';--shape-font:'+val(o.fontSize,10,56)+'px';
    const safeId=String(o.id||'').replace(/[^a-zA-Z0-9_-]/g,'');
    if(editable)return '<div class="studio-shape studio-shape-'+o.kind+(selectedId===o.id?' selected':'')+'" data-slide-object="'+safeId+'" tabindex="0" role="button" aria-label="Editable '+o.kind+' slide object" style="'+style+'">'+
      '<span class="studio-shape-grip" title="Drag object to reposition" aria-hidden="true">⠿</span>'+
      (o.kind==='text'?'<div class="studio-shape-text" contenteditable="true" role="textbox" spellcheck="true" data-slide-object-text="'+safeId+'" aria-label="Edit slide text box">'+text+'</div>':'')+'</div>';
    return '<div class="studio-shape studio-shape-'+o.kind+'" style="'+style+'">'+
      (o.kind==='text'?'<div class="studio-shape-text">'+text+'</div>':'')+'</div>';
  }).join('');
}
