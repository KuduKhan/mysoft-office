export const MEDIA_FORMATS={square:{width:1080,height:1080},portrait:{width:1080,height:1350},story:{width:720,height:1280},landscape:{width:1280,height:720}};
export function applyMediaFormat(file,name){
  const format=MEDIA_FORMATS[name];if(!format)throw Error('Choose a supported output format.');const e=file.mediaEdits;
  let left=0,top=0;const width=e.rotation%180?file.mediaHeight:file.mediaWidth,height=e.rotation%180?file.mediaWidth:file.mediaHeight,ratio=format.width/format.height;
  if(width/height>ratio)left=(1-height*ratio/width)*50;else top=(1-width/ratio/height)*50;
  if(left>45||top>45)throw Error('This format would crop too much of the source. Resize manually instead.');
  const crop=e.rotation%180?{cropLeft:top,cropRight:top,cropTop:left,cropBottom:left}:{cropLeft:left,cropRight:left,cropTop:top,cropBottom:top};
  Object.assign(e,crop,{outputWidth:format.width,outputHeight:format.height,keepAspect:file.mediaKind!=='drawing'});
}
export function trimAudioSilence(channels,sampleRate,threshold=.01){
  if(!channels?.length||!channels[0].length)throw Error('Open audio first.');let first=0,last=channels[0].length-1;
  const loud=i=>channels.some(c=>Math.abs(c[i])>=threshold);
  while(first<=last&&!loud(first))first++;while(last>=first&&!loud(last))last--;
  if(last-first<sampleRate*.02)throw Error('No audible region was found at the silence threshold.');
  return {trimStart:Math.max(0,(first-Math.round(sampleRate*.01))/sampleRate),trimEnd:Math.min(channels[0].length,(last+1+Math.round(sampleRate*.01)))/sampleRate};
}
export function editMediaLayer(file,index,action){
  if(!Number.isInteger(index)||index<0||index>=file.mediaLayers.length)throw Error('Choose a drawing layer first.');
  const layers=structuredClone(file.mediaLayers),layer=layers[index];let selected=index;
  if(layer.locked)throw Error('Unlock the layer before editing or moving it.');
  if(action==='delete'){layers.splice(index,1);selected=Math.min(index,layers.length-1);}
  else if(action==='duplicate'){if(layers.length>=300||layers.reduce((n,l)=>n+l.points.length,0)+layer.points.length>20000)throw Error('Drawing layer limit reached.');layers.splice(index+1,0,structuredClone(layer));selected=index+1;}
  else if(action==='center'||action==='middle'){const xs=layer.points.map(p=>p[0]),ys=layer.points.map(p=>p[1]),dx=action==='center'?(1-Math.min(...xs)-Math.max(...xs))/2:0,dy=action==='middle'?(1-Math.min(...ys)-Math.max(...ys))/2:0;layer.points=layer.points.map(([x,y])=>[x+dx,y+dy]);}
  else if(action==='grow'||action==='shrink'){
    const scale=action==='grow'?1.1:1/1.1,xs=layer.points.map(p=>p[0]),ys=layer.points.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const points=layer.points.map(([x,y])=>[cx+(x-cx)*scale,cy+(y-cy)*scale]);
    if(points.some(p=>p.some(n=>n<0||n>1)))throw Error('Move this layer inward before enlarging it.');layer.points=points;
  }
  else if(action==='mirror-h'||action==='mirror-v'){const axis=action==='mirror-h'?0:1,values=layer.points.map(p=>p[axis]),sum=Math.min(...values)+Math.max(...values);layer.points=layer.points.map(point=>point.map((v,i)=>i===axis?sum-v:v));}
  else if(action==='front'||action==='back'){layers.splice(index,1);selected=action==='front'?layers.length:0;layers.splice(selected,0,layer);}
  else{let dx=action==='left'?-.02:action==='right'?.02:0,dy=action==='up'?-.02:action==='down'?.02:0;if(!dx&&!dy)throw Error('Unsupported layer operation.');const xs=layer.points.map(p=>p[0]),ys=layer.points.map(p=>p[1]);dx=Math.max(-Math.min(...xs),Math.min(1-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(1-Math.max(...ys),dy));layer.points=layer.points.map(([x,y])=>[x+dx,y+dy]);}
  file.mediaLayers=layers;return selected;
}
