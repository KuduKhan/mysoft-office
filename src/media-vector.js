import {validateMediaRecord} from './media-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=value=>Number(value.toFixed(4));
export function drawingSVG(file,measureText=null){
  if(file.mediaKind!=='drawing'||!validateMediaRecord(file))throw Error('SVG export supports valid drawing projects. Export photos and video as images instead.');
  const e=file.mediaEdits,w=e.outputWidth,h=e.outputHeight;let artwork='',masks='';
  for(const [index,layer] of file.mediaLayers.entries()){
    if(layer.hidden||!layer.points.length)continue;
    const pts=layer.points.map(([x,y])=>[n(x*w),n(y*h)]),[x1,y1]=pts[0],[x2,y2]=pts.at(-1),width=Math.max(.5,layer.width*w),filled=layer.fill&&['rect','ellipse','triangle'].includes(layer.kind);
    let shape='';
    if(layer.kind==='rect')shape='<rect x="'+Math.min(x1,x2)+'" y="'+Math.min(y1,y2)+'" width="'+Math.abs(x2-x1)+'" height="'+Math.abs(y2-y1)+'"/>';
    else if(layer.kind==='ellipse')shape='<ellipse cx="'+n((x1+x2)/2)+'" cy="'+n((y1+y2)/2)+'" rx="'+Math.max(.1,n(Math.abs(x2-x1)/2))+'" ry="'+Math.max(.1,n(Math.abs(y2-y1)/2))+'"/>';
    else if(layer.kind==='triangle'){const points=pts.length===3?pts:[[(x1+x2)/2,Math.min(y1,y2)],[Math.max(x1,x2),Math.max(y1,y2)],[Math.min(x1,x2),Math.max(y1,y2)]];shape='<polygon points="'+points.map(p=>p.map(n).join(',')).join(' ')+'"/>';}
    else if(layer.kind==='arrow'){
      const angle=Math.atan2(y2-y1,x2-x1),head=Math.min(Math.hypot(x2-x1,y2-y1)*.4,Math.max(10,width*4));shape='<path d="M'+x1+' '+y1+'L'+x2+' '+y2+'M'+n(x2-head*Math.cos(angle-Math.PI/6))+' '+n(y2-head*Math.sin(angle-Math.PI/6))+'L'+x2+' '+y2+'L'+n(x2-head*Math.cos(angle+Math.PI/6))+' '+n(y2-head*Math.sin(angle+Math.PI/6))+'"/>';
    }else{shape='<path d="M'+pts.map(p=>p.join(' ')).join('L')+(pts.length===1?'l.01 0':'')+'"/>';}
    const color=layer.kind==='erase'?'#000000':esc(layer.color),style=' fill="'+(filled?color:'none')+'" stroke="'+(filled?'none':color)+'" stroke-width="'+n(width)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(layer.opacity??1)+'"'+(layer.dash==='dashed'?' stroke-dasharray="'+n(width*4)+' '+n(width*3)+'"':layer.dash==='dotted'?' stroke-dasharray=".1 '+n(width*2.5)+'"':'');
    const element='<g'+style+'>'+shape+'</g>';
    if(layer.kind==='erase'){const id='erase-'+index;masks+='<mask id="'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+w+'" height="'+h+'" style="mask-type:luminance"><rect width="'+w+'" height="'+h+'" fill="white"/>'+element+'</mask>';artwork='<g mask="url(#'+id+')">'+artwork+'</g>';}
    else artwork+=element;
  }
  let caption='';
  if(e.text.trim()){
    const size=Math.max(8,Math.min(e.textSize,w/5)),padding=Math.max(12,w*.035),lineHeight=size*1.25,measure=measureText||((text)=>text.length*size*.6),lines=[];let line='';
    for(const word of e.text.split(/\s+/)){const next=line?line+' '+word:word;if(measure(next,{size,font:e.textFont||'Segoe UI'})>w-2*padding&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    const visible=lines.slice(0,4),height=visible.length*lineHeight,y=e.textPosition==='top'?padding:e.textPosition==='center'?(h-height)/2:h-height-padding,x=e.textAlign==='left'?padding:e.textAlign==='right'?w-padding:w/2,anchor=e.textAlign==='left'?'start':e.textAlign==='right'?'end':'middle';
    caption='<text fill="'+esc(e.textColor)+'" font-family="'+esc(e.textFont||'Segoe UI')+', sans-serif" font-size="'+size+'" font-weight="600" opacity="'+(e.textOpacity??1)+'" text-anchor="'+anchor+'"'+(e.textShadow!==false?' filter="url(#caption-shadow)"':'')+'>'+visible.map((line,index)=>'<tspan x="'+x+'" y="'+n(y+index*lineHeight+size*.8)+'"'+(measure(line,{size,font:e.textFont||'Segoe UI'})>w-2*padding?' textLength="'+n(w-2*padding)+'" lengthAdjust="spacingAndGlyphs"':'')+'>'+esc(line)+'</tspan>').join('')+'</text>';
  }
  const vignette=e.vignette?'<rect width="'+w+'" height="'+h+'" fill="url(#finishing-vignette)"/>':'',frame=Math.min(e.frameWidth||0,w,h),border=frame?'<rect x="'+frame/2+'" y="'+frame/2+'" width="'+(w-frame)+'" height="'+(h-frame)+'" fill="none" stroke="'+esc(e.frameColor||'#ffffff')+'" stroke-width="'+frame+'"/>':'';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img"><title>'+esc(file.title||'MySoft drawing')+'</title><defs>'+masks+(e.vignette?'<radialGradient id="finishing-vignette" gradientUnits="userSpaceOnUse" cx="'+w/2+'" cy="'+h/2+'" r="'+Math.hypot(w,h)/2+'"><stop offset="0" stop-color="black" stop-opacity="0"/><stop offset=".45" stop-color="black" stop-opacity="0"/><stop offset="1" stop-color="black" stop-opacity="'+(e.vignette/100*.8)+'"/></radialGradient>':'')+(e.textShadow!==false?'<filter id="caption-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".6"/></filter>':'')+'</defs>'+(e.background!=='transparent'?'<rect width="'+w+'" height="'+h+'" fill="'+esc(e.background)+'"/>':'')+artwork+vignette+caption+border+'</svg>';
}
