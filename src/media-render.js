const overlays=new WeakMap();
export function renderVisual(canvas,source,file,extraLayer=null){
  const e=file.mediaEdits,w=e.outputWidth,h=e.outputHeight;
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);
  if(e.background!=='transparent'){ctx.fillStyle=e.background;ctx.fillRect(0,0,w,h);}
  if(source){
    const sw=file.mediaWidth,sh=file.mediaHeight;
    const x=sw*e.cropLeft/100,y=sh*e.cropTop/100,cw=sw*(1-(e.cropLeft+e.cropRight)/100),ch=sh*(1-(e.cropTop+e.cropBottom)/100);
    ctx.save();ctx.translate(w/2,h/2);ctx.scale(e.flipH?-1:1,e.flipV?-1:1);ctx.rotate(e.rotation*Math.PI/180);
    ctx.filter='brightness('+e.brightness+'%) contrast('+e.contrast+'%) saturate('+e.saturation+'%) sepia('+(e.sepia||0)+'%) hue-rotate('+(e.hue||0)+'deg) blur('+e.blur+'px)';
    const dw=e.rotation%180?h:w,dh=e.rotation%180?w:h;ctx.drawImage(source,x,y,cw,ch,-dw/2,-dh/2,dw,dh);ctx.restore();
  }
  let overlay=overlays.get(canvas);if(!overlay){overlay=document.createElement('canvas');overlays.set(canvas,overlay);}if(overlay.width!==w)overlay.width=w;if(overlay.height!==h)overlay.height=h;
  const pen=overlay.getContext('2d');pen.clearRect(0,0,w,h);
  for(const layer of [...file.mediaLayers,...(extraLayer?[extraLayer]:[])]){
    const points=layer.points;if(layer.hidden||!points.length)continue;
    pen.save();pen.globalAlpha=layer.opacity??1;pen.setLineDash(layer.dash==='dashed'?[layer.width*w*4,layer.width*w*3]:layer.dash==='dotted'?[.1,layer.width*w*2.5]:[]);pen.globalCompositeOperation=layer.kind==='erase'?'destination-out':'source-over';pen.strokeStyle=layer.color;pen.fillStyle=layer.color;pen.lineWidth=Math.max(.5,layer.width*w);pen.lineCap='round';pen.lineJoin='round';
    const [x1,y1]=[points[0][0]*w,points[0][1]*h],last=points.at(-1),[x2,y2]=[last[0]*w,last[1]*h];
    pen.beginPath();
    if(layer.kind==='rect'){pen.rect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1));}
    else if(layer.kind==='ellipse'){pen.ellipse((x1+x2)/2,(y1+y2)/2,Math.max(.1,Math.abs(x2-x1)/2),Math.max(.1,Math.abs(y2-y1)/2),0,0,Math.PI*2);}
    else if(layer.kind==='triangle'){if(points.length===3){pen.moveTo(points[0][0]*w,points[0][1]*h);points.slice(1).forEach(p=>pen.lineTo(p[0]*w,p[1]*h));}else{pen.moveTo((x1+x2)/2,Math.min(y1,y2));pen.lineTo(Math.max(x1,x2),Math.max(y1,y2));pen.lineTo(Math.min(x1,x2),Math.max(y1,y2));}pen.closePath();}
    else if(layer.kind==='arrow'){const angle=Math.atan2(y2-y1,x2-x1),head=Math.min(Math.hypot(x2-x1,y2-y1)*.4,Math.max(10,layer.width*w*4));pen.moveTo(x1,y1);pen.lineTo(x2,y2);pen.moveTo(x2-head*Math.cos(angle-Math.PI/6),y2-head*Math.sin(angle-Math.PI/6));pen.lineTo(x2,y2);pen.lineTo(x2-head*Math.cos(angle+Math.PI/6),y2-head*Math.sin(angle+Math.PI/6));}
    else {pen.moveTo(x1,y1);for(const point of points)pen.lineTo(point[0]*w,point[1]*h);if(points.length===1)pen.lineTo(x1+.01,y1+.01);}
    if(layer.fill&&['rect','ellipse','triangle'].includes(layer.kind))pen.fill();else pen.stroke();pen.restore();
  }
  ctx.drawImage(overlay,0,0);
  if(e.vignette){const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.hypot(w,h)/2);gradient.addColorStop(0,'transparent');gradient.addColorStop(.45,'transparent');gradient.addColorStop(1,'rgba(0,0,0,'+(e.vignette/100*.8)+')');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}
  if(e.text.trim()){
    const size=Math.max(8,Math.min(e.textSize,w/5)),padding=Math.max(12,w*.035),lineHeight=size*1.25;
    ctx.save();ctx.font='600 '+size+'px "'+(e.textFont||'Segoe UI')+'",sans-serif';ctx.textAlign=e.textAlign||'center';ctx.globalAlpha=e.textOpacity??1;ctx.textBaseline='top';
    const lines=[];let line='';
    for(const word of e.text.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w-2*padding&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    const visible=lines.slice(0,4),height=visible.length*lineHeight;
    const y=e.textPosition==='top'?padding:e.textPosition==='center'?(h-height)/2:h-height-padding;
    ctx.fillStyle=e.textColor;if(e.textShadow!==false){ctx.shadowColor='#00000099';ctx.shadowBlur=Math.max(2,size*.09);ctx.shadowOffsetY=Math.max(1,size*.04);}
    visible.forEach((value,i)=>ctx.fillText(value,e.textAlign==='left'?padding:e.textAlign==='right'?w-padding:w/2,y+i*lineHeight,w-2*padding));ctx.restore();
  }
  if(e.frameWidth){const width=Math.min(e.frameWidth,w,h);ctx.save();ctx.strokeStyle=e.frameColor||'#ffffff';ctx.lineWidth=width;ctx.strokeRect(width/2,width/2,w-width,h-width);ctx.restore();}
}
export function fitCanvas(canvas,container,zoom='fit'){
  const scale=zoom==='fit'?Math.min((container.clientWidth-32)/canvas.width,(container.clientHeight-32)/canvas.height,1):Math.max(.25,Math.min(2,Number(zoom)/100||1));
  canvas.style.width=Math.max(1,canvas.width*Math.max(.01,scale))+'px';canvas.style.height=Math.max(1,canvas.height*Math.max(.01,scale))+'px';
}
export function drawWaveform(canvas,channels){
  const w=canvas.width=1200,h=canvas.height=210,ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);ctx.strokeStyle='#1596a0';ctx.lineWidth=1.5;ctx.beginPath();
  const values=channels[0],step=Math.max(1,Math.floor(values.length/w));
  for(let x=0;x<w;x++){let min=0,max=0;for(let i=x*step;i<Math.min(values.length,(x+1)*step);i++){min=Math.min(min,values[i]);max=Math.max(max,values[i]);}ctx.moveTo(x,h/2+min*h*.44);ctx.lineTo(x,h/2+max*h*.44);}
  ctx.stroke();
}
