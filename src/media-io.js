import {MEDIA_MAX_BYTES,mediaType,encodeMedia,decodeMedia,defaultMediaEdits,trimBounds} from './media-model.js';
import {renderVisual} from './media-render.js';

export function waitMedia(element,event,timeout=15000){
  return new Promise((resolve,reject)=>{
    const done=()=>{clearTimeout(timer);element.removeEventListener(event,ok);element.removeEventListener('error',bad);};
    const ok=()=>{done();resolve();},bad=()=>{done();reject(Error('This media format or codec could not be decoded by this browser.'));};
    const timer=setTimeout(()=>{done();reject(Error('Loading media timed out. Try a smaller file or another format.'));},timeout);
    element.addEventListener(event,ok,{once:true});element.addEventListener('error',bad,{once:true});
  });
}
export async function loadVideo(blob){
  const element=document.createElement('video'),url=URL.createObjectURL(blob);
  element.preload='auto';element.playsInline=true;element.muted=true;
  const loaded=waitMedia(element,'loadedmetadata');element.src=url;
  try{
    await loaded;
    let duration=element.duration;
    if(!Number.isFinite(duration)){
      const seek=waitMedia(element,'seeked',5000);element.currentTime=1e10;await seek;
      duration=Number.isFinite(element.duration)?element.duration:element.currentTime;
      const start=waitMedia(element,'seeked',5000);element.currentTime=0;await start;
    }
    if(!Number.isFinite(duration)||duration<=0||duration>600)throw Error('Video imports support clips up to 10 minutes.');
    return {element,url,duration};
  }catch(error){element.removeAttribute('src');element.load();URL.revokeObjectURL(url);throw error;}
}
export async function decodeAudio(bytes){
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Audio)throw Error('Audio editing is not supported by this browser.');
  const context=new Audio({sampleRate:48000});
  try{
    const decoded=await context.decodeAudioData(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    if(decoded.numberOfChannels>2||decoded.duration>180)throw Error('Audio imports support mono/stereo clips up to 3 minutes.');
    return {channels:Array.from({length:decoded.numberOfChannels},(_,i)=>new Float32Array(decoded.getChannelData(i))),sampleRate:decoded.sampleRate,duration:decoded.duration};
  }finally{await context.close();}
}
export async function inspectMedia(source){
  if(!source.size||source.size>MEDIA_MAX_BYTES)throw Error('Choose a nonempty media file up to 16 MB.');
  const {kind,mime}=mediaType(source),bytes=new Uint8Array(await source.arrayBuffer());
  const data={mediaKind:kind,mediaMime:mime,mediaData:encodeMedia(bytes),mediaSourceName:source.name.slice(0,200),mediaLayers:[],mediaWidth:1280,mediaHeight:720,mediaDuration:0};
  if(kind==='image'){
    const image=await createImageBitmap(new Blob([bytes],{type:mime}));
    try{
      if(image.width*image.height>32000000)throw Error('Image imports support up to 32 megapixels.');
      data.mediaWidth=image.width;data.mediaHeight=image.height;
    }finally{image.close();}
  }else if(kind==='audio')data.mediaDuration=(await decodeAudio(bytes)).duration;
  else{
    const video=await loadVideo(new Blob([bytes],{type:mime}));
    data.mediaWidth=video.element.videoWidth;data.mediaHeight=video.element.videoHeight;data.mediaDuration=video.duration;
    video.element.removeAttribute('src');video.element.load();URL.revokeObjectURL(video.url);
  }
  const limit=kind==='video'?1280:1920,scale=Math.min(1,limit/Math.max(data.mediaWidth,data.mediaHeight));
  data.mediaEdits=defaultMediaEdits(Math.max(1,Math.round(data.mediaWidth*scale)),Math.max(1,Math.round(data.mediaHeight*scale)));
  return data;
}
export function sourceBlob(file){return new Blob([decodeMedia(file.mediaData)],{type:file.mediaMime});}
export function canvasBlob(canvas,type='image/png',quality=.92){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not encode this image.')),type,quality));}
export async function exportVideo(file,video,canvas,graph,{signal,onProgress}){
  if(typeof MediaRecorder==='undefined'||!canvas.captureStream)throw Error('Video export requires a browser with MediaRecorder and canvas recording support.');
  const trim=trimBounds(file),e=file.mediaEdits;
  if(trim.duration>120)throw Error('Video export supports up to 120 seconds per clip. Shorten the trim range.');
  if(e.outputWidth*e.outputHeight>2073600||Math.max(e.outputWidth,e.outputHeight)>1920)throw Error('Set the video output to 1080p or smaller before exporting.');
  const mime=['video/webm;codecs=vp8,opus','video/webm'].find(value=>MediaRecorder.isTypeSupported(value));
  if(!mime)throw Error('This browser cannot encode WebM video. You can still export a frame or save the project backup.');
  video.pause();video.playbackRate=e.speed;
  if(Math.abs(video.currentTime-trim.start)>.002){const seek=waitMedia(video,'seeked');video.currentTime=trim.start;await seek;}
  if(signal.aborted)throw new DOMException('Export canceled','AbortError');
  renderVisual(canvas,video,file);
  const stream=canvas.captureStream(30);
  if(!e.muted)for(const track of graph.destination.stream.getAudioTracks())stream.addTrack(track.clone());
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000}),parts=[];
  return new Promise((resolve,reject)=>{
    let frame=0,clock=0,finished=false,failure=null;
    const stop=error=>{
      if(finished)return;finished=true;failure=error||null;cancelAnimationFrame(frame);clearInterval(clock);clearTimeout(watchdog);video.pause();
      if(recorder.state!=='inactive')recorder.stop();else cleanup();
    };
    const cancel=()=>stop(new DOMException('Export canceled','AbortError'));
    const cleanup=async()=>{
      signal.removeEventListener('abort',cancel);stream.getTracks().forEach(track=>track.stop());
      if(failure){reject(failure);return;}
      const output=new Blob(parts,{type:recorder.mimeType});
      if(output.size<32||!/^video\/webm(?:;|$)/i.test(output.type)){
        reject(Error('The browser did not produce a usable WebM file. Original media is unchanged.'));return;
      }
      try{
        const header=new Uint8Array(await output.slice(0,4).arrayBuffer());
        if(header[0]!==0x1a||header[1]!==0x45||header[2]!==0xdf||header[3]!==0xa3)
          throw Error('Recorded video has an invalid WebM header; export canceled.');
        resolve(output);
      }catch(error){reject(error);}
    };
    recorder.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
    recorder.onstop=cleanup;recorder.onerror=()=>stop(Error('Video encoding failed. Try a shorter clip or smaller output.'));
    const tick=()=>{
      if(finished)return;
      try{renderVisual(canvas,video,file);}catch(error){stop(error);return;}
      frame=requestAnimationFrame(tick);
    };
    clock=setInterval(()=>{
      onProgress(Math.min(1,(video.currentTime-trim.start)/(trim.end-trim.start)));
      if(video.currentTime>=trim.end-.025||video.ended)stop();
    },60);
    const watchdog=setTimeout(()=>stop(Error('Video export stopped because playback did not finish. Keep the tab visible and try again.')),(trim.duration+15)*1000);
    signal.addEventListener('abort',cancel,{once:true});
    recorder.start(200);frame=requestAnimationFrame(tick);
    video.play().catch(stop);
  });
}
