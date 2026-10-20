export const MEDIA_MAX_BYTES=16*1024*1024;
export const MEDIA_MAX_LAYERS=300;
export const MEDIA_MAX_POINTS=20000;
export const MEDIA_MIMES={
  image:['image/png','image/jpeg','image/webp','image/gif'],
  audio:['audio/wav','audio/x-wav','audio/mpeg','audio/ogg','audio/mp4','audio/aac','audio/flac','audio/webm'],
  video:['video/mp4','video/webm','video/ogg','video/quicktime']
};
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const hex=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
export function defaultMediaEdits(width=1280,height=720){return {
  outputWidth:width,outputHeight:height,keepAspect:true,brightness:100,contrast:100,saturation:100,blur:0,
  rotation:0,flipH:false,flipV:false,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,background:'transparent',
  text:'',textColor:'#ffffff',textSize:40,textPosition:'bottom',
  trimStart:0,trimEnd:0,gain:1,speed:1,fadeIn:0,fadeOut:0,normalize:false,reverse:false,audioMono:false,muted:false,
  exportFormat:'png',quality:92,sepia:0,hue:0,textFont:'Segoe UI',textAlign:'center',textOpacity:1,audioBalance:0,removeDC:false,audioLoop:false
};}
export function createMediaFields(){return {mediaKind:'empty',mediaData:'',mediaMime:'',mediaSourceName:'',mediaWidth:1280,mediaHeight:720,mediaDuration:0,mediaEdits:defaultMediaEdits(),mediaLayers:[]};}
export function validateMediaRecord(file){
  if(!file||!['empty','drawing','image','audio','video'].includes(file.mediaKind)||typeof file.mediaData!=='string'||file.mediaData.length>Math.ceil(MEDIA_MAX_BYTES/3)*4)return false;
  if(typeof file.mediaSourceName!=='string'||file.mediaSourceName.length>200||typeof file.mediaMime!=='string')return false;
  if(file.mediaData&&(file.mediaData.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.mediaData)))return false;
  if(['image','audio','video'].includes(file.mediaKind)&&(!file.mediaData||!MEDIA_MIMES[file.mediaKind].includes(file.mediaMime)))return false;
  if(['empty','drawing'].includes(file.mediaKind)&&file.mediaData)return false;
  if(!finite(file.mediaWidth,1,32768)||!finite(file.mediaHeight,1,32768)||!finite(file.mediaDuration,0,600))return false;
  if(file.mediaKind==='audio'&&file.mediaDuration>180)return false;
  const e=file.mediaEdits;
  if(!e||!Number.isInteger(e.outputWidth)||!Number.isInteger(e.outputHeight)||!finite(e.outputWidth,1,4096)||!finite(e.outputHeight,1,4096)||e.outputWidth*e.outputHeight>12000000)return false;
  for(const key of ['brightness','contrast','saturation'])if(!finite(e[key],0,200))return false;
  for(const key of ['cropLeft','cropRight','cropTop','cropBottom'])if(!finite(e[key],0,45))return false;
  if(e.cropLeft+e.cropRight>=90||e.cropTop+e.cropBottom>=90||!finite(e.blur,0,12)||![0,90,180,270].includes(e.rotation))return false;
  if(e.background!=='transparent'&&!hex(e.background)||!hex(e.textColor)||typeof e.text!=='string'||e.text.length>160||!finite(e.textSize,8,160)||!['top','center','bottom'].includes(e.textPosition))return false;
  for(const key of ['keepAspect','flipH','flipV','normalize','reverse','audioMono','muted'])if(typeof e[key]!=='boolean')return false;
  if(!finite(e.trimStart,0,600)||!finite(e.trimEnd,0,600)||!finite(e.gain,0,2)||!finite(e.speed,.5,2)||!finite(e.fadeIn,0,10)||!finite(e.fadeOut,0,10))return false;
  if(!['png','jpeg','webp'].includes(e.exportFormat)||!finite(e.quality,40,100))return false;
  for(const [key,min,max] of [['sepia',0,100],['hue',0,360],['textOpacity',.1,1],['audioBalance',-1,1]])if(e[key]!==undefined&&!finite(e[key],min,max))return false;
  if(e.textFont!==undefined&&!['Segoe UI','Georgia','Arial'].includes(e.textFont)||e.textAlign!==undefined&&!['left','center','right'].includes(e.textAlign))return false;
  for(const key of ['removeDC','audioLoop'])if(e[key]!==undefined&&typeof e[key]!=='boolean')return false;
  if(!Array.isArray(file.mediaLayers)||file.mediaLayers.length>MEDIA_MAX_LAYERS)return false;
  let count=0;
  for(const layer of file.mediaLayers){
    if(!layer||!['pen','erase','rect','ellipse','line'].includes(layer.kind)||!hex(layer.color)||!finite(layer.width,.0001,.2)||typeof layer.fill!=='boolean'||!Array.isArray(layer.points)||!layer.points.length||layer.points.length>2000)return false;
    count+=layer.points.length;
    if(layer.points.some(p=>!Array.isArray(p)||p.length!==2||!finite(p[0],0,1)||!finite(p[1],0,1)))return false;
  }
  return count<=MEDIA_MAX_POINTS;
}
export function encodeMedia(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>MEDIA_MAX_BYTES)throw Error('Media import limit is 16 MB per file.');
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return btoa(binary);
}
export function decodeMedia(data){
  if(typeof data!=='string'||data.length>Math.ceil(MEDIA_MAX_BYTES/3)*4)throw Error('Media source exceeds the supported size.');
  return Uint8Array.from(atob(data),c=>c.charCodeAt(0));
}
export function mediaType(source){
  const ext=String(source.name||'').toLowerCase().split('.').pop();
  const mime=source.type||({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',wav:'audio/wav',mp3:'audio/mpeg',ogg:'audio/ogg',oga:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',ogv:'video/ogg',mov:'video/quicktime'})[ext];
  if(mime==='audio/x-m4a')return {kind:'audio',mime:'audio/mp4'};
  for(const [kind,mimes] of Object.entries(MEDIA_MIMES))if(mimes.includes(mime))return {kind,mime};
  throw Error('Choose a PNG, JPEG, WebP, GIF, supported audio, or MP4/WebM video file.');
}
export function trimBounds(file){
  const duration=file.mediaDuration,e=file.mediaEdits;
  const start=Math.min(duration,Math.max(0,e.trimStart));
  const end=e.trimEnd===0?duration:Math.min(duration,e.trimEnd);
  if(end-start<.02)throw Error('Trim end must be at least 0.02 seconds after trim start.');
  return {start,end,duration:(end-start)/e.speed};
}
export function visualAspect(file){
  const e=file.mediaEdits;
  const width=file.mediaWidth*(1-(e.cropLeft+e.cropRight)/100),height=file.mediaHeight*(1-(e.cropTop+e.cropBottom)/100);
  return e.rotation%180?height/width:width/height;
}
export function applyMediaPreset(file,name){
  const presets={natural:{brightness:100,contrast:100,saturation:100,blur:0},vivid:{brightness:104,contrast:112,saturation:125,blur:0},soft:{brightness:106,contrast:92,saturation:90,blur:0},mono:{brightness:102,contrast:112,saturation:0,blur:0},cinema:{brightness:96,contrast:118,saturation:78,blur:0}};
  if(!Object.hasOwn(presets,name))throw Error('Unknown media preset.');
  Object.assign(file.mediaEdits,presets[name]);
}
export function processAudio(channels,sampleRate,edits){
  if(!Array.isArray(channels)||!channels.length||channels.length>2||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>96000||channels.some(c=>!(c instanceof Float32Array)||c.length!==channels[0].length))throw Error('Only mono or stereo audio is supported.');
  const file={mediaDuration:channels[0].length/sampleRate,mediaEdits:edits},trim=trimBounds(file);
  if(trim.duration>180)throw Error('Audio output limit is 180 seconds. Trim the clip or increase its speed.');
  const first=Math.floor(trim.start*sampleRate),end=Math.min(channels[0].length,Math.floor(trim.end*sampleRate));
  const count=Math.max(1,Math.floor((end-first)/edits.speed));
  const output=Array.from({length:edits.audioMono?1:channels.length},()=>new Float32Array(count));
  const offsets=channels.map(channel=>{if(!edits.removeDC)return 0;let sum=0;for(let i=first;i<end;i++)sum+=channel[i];return sum/Math.max(1,end-first);});
  const balance=edits.audioBalance||0,weights=channels.map((_,i)=>channels.length===1?1:i===0?1-Math.max(0,balance):1+Math.min(0,balance));
  let peak=0;
  for(let i=0;i<count;i++){
    const pos=edits.reverse?end-1-i*edits.speed:first+i*edits.speed;
    const p=Math.max(first,Math.min(end-1,Math.floor(pos))),next=Math.min(end-1,p+1),fraction=Math.max(0,pos-p);
    for(let c=0;c<output.length;c++){
      let value=0;
      const inputs=edits.audioMono?channels:[channels[c]];
      for(const input of inputs){const channel=channels.indexOf(input);value+=(((input[p]||0)*(1-fraction)+(input[next]||0)*fraction)-offsets[channel])*weights[channel];}
      output[c][i]=value/inputs.length;peak=Math.max(peak,Math.abs(output[c][i]));
    }
  }
  const normalization=edits.normalize&&peak>0?.95/peak:1;
  const fadeIn=Math.min(edits.fadeIn,trim.duration/2)*sampleRate,fadeOut=Math.min(edits.fadeOut,trim.duration/2)*sampleRate;
  for(const channel of output)for(let i=0;i<count;i++){
    const fade=Math.min(1,fadeIn?i/fadeIn:1,fadeOut?(count-1-i)/fadeOut:1);
    channel[i]=Math.max(-1,Math.min(1,channel[i]*normalization*edits.gain*fade));
  }
  return {channels:output,sampleRate,duration:count/sampleRate};
}
export function encodeWAV(channels,sampleRate){
  const frames=channels[0]?.length||0,channelCount=channels.length;
  if(!frames||channelCount<1||channelCount>2||channels.some(c=>c.length!==frames))throw Error('Invalid audio buffer.');
  const dataSize=frames*channelCount*2,buffer=new ArrayBuffer(44+dataSize),view=new DataView(buffer);
  const text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+dataSize,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channelCount,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channelCount*2,true);view.setUint16(32,channelCount*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,dataSize,true);
  for(let i=0,at=44;i<frames;i++)for(let c=0;c<channelCount;c++,at+=2){const value=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(at,value<0?value*32768:value*32767,true);}
  return new Uint8Array(buffer);
}
