export const DRAWING_TOOLS=[['view','Select','mouse-pointer-2'],['pen','Pen','pencil-line'],['erase','Eraser','eraser'],['rect','Rectangle','square'],['ellipse','Ellipse','circle'],['line','Line','minus'],['arrow','Arrow','arrow-right'],['triangle','Triangle','triangle']];
export function mediaPanels(kind){return kind==='audio'?['sound']:kind==='drawing'?['canvas','draw','text','layers']:['adjust','canvas','draw','text','layers',...(kind==='video'?['timing']:[])];}
export function snapPoint(point,width,height,enabled){return point.map((n,i)=>Math.max(0,Math.min(1,enabled?Math.round(n*(i?height:width)/32)*32/(i?height:width):n)));}
export function constrainShape(start,end,width,height,enabled){
  if(!enabled)return end;const dx=(end[0]-start[0])*width,dy=(end[1]-start[1])*height,size=Math.max(Math.abs(dx),Math.abs(dy));
  const maxX=(dx<0?start[0]:1-start[0])*width,maxY=(dy<0?start[1]:1-start[1])*height,side=Math.min(size,maxX,maxY);
  return [start[0]+(dx<0?-1:1)*side/width,start[1]+(dy<0?-1:1)*side/height];
}
export function transformMediaDrawing(file,action){
  if(!['rotate','flip','flip-v'].includes(action))throw Error('Unsupported canvas transform.');
  if(file.mediaLayers.some(layer=>layer.locked))throw Error('Unlock drawing layers before rotating or flipping the entire canvas.');
  const layers=file.mediaLayers.map(layer=>({...layer,points:layer.points.map(([x,y])=>action==='rotate'?[1-y,x]:action==='flip'?[1-x,y]:[x,1-y])}));
  if(action==='rotate'){file.mediaEdits.rotation=(file.mediaEdits.rotation+90)%360;[file.mediaEdits.outputWidth,file.mediaEdits.outputHeight]=[file.mediaEdits.outputHeight,file.mediaEdits.outputWidth];}
  else file.mediaEdits[action==='flip'?'flipH':'flipV']=!file.mediaEdits[action==='flip'?'flipH':'flipV'];
  file.mediaLayers=layers;
}
export function updateLayerAppearance(file,index,patch){
  if(!Number.isInteger(index)||!file.mediaLayers[index])throw Error('Select a drawing layer first.');
  if(Object.keys(patch).some(k=>!['opacity','hidden','dash','color','width','fill','locked'].includes(k)))throw Error('Unsupported layer property.');
  if(file.mediaLayers[index].locked&&!(Object.keys(patch).length===1&&patch.locked===false))throw Error('Unlock the layer before editing.');
  if(patch.locked!==undefined&&typeof patch.locked!=='boolean')throw Error('Invalid layer lock.');
  if(patch.opacity!==undefined&&(!Number.isFinite(patch.opacity)||patch.opacity<.1||patch.opacity>1))throw Error('Layer opacity must be between 10% and 100%.');
  if(patch.hidden!==undefined&&typeof patch.hidden!=='boolean')throw Error('Invalid visibility.');
  if(patch.dash!==undefined&&!['solid','dashed','dotted'].includes(patch.dash))throw Error('Choose a supported stroke style.');
  if(patch.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(patch.color))throw Error('Choose a valid layer color.');
  if(patch.width!==undefined&&(!Number.isFinite(patch.width)||patch.width<.0001||patch.width>.2))throw Error('Choose a supported stroke width.');
  if(patch.fill!==undefined&&(typeof patch.fill!=='boolean'||!['rect','ellipse','triangle'].includes(file.mediaLayers[index].kind)))throw Error('Choose a shape layer to change its fill.');
  file.mediaLayers=file.mediaLayers.map((layer,i)=>i===index?{...layer,...patch}:layer);
}
