import {applyMediaFormat,trimAudioSilence,editMediaLayer} from './media-customize.js';
import {icon} from './icons.js';
import {defaultMediaEdits,validateMediaRecord,decodeMedia,processAudio,encodeWAV,trimBounds,visualAspect,applyMediaPreset} from './media-model.js';
import {loadVideo,decodeAudio,sourceBlob,canvasBlob,exportVideo,waitMedia} from './media-io.js';
import {renderVisual,fitCanvas,drawWaveform} from './media-render.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMediaStudio(ctx){
  let file=null,source=null,audio=null,processedAudio=null,video=null,sourceURL='',previewURL='',graph=null,observer=null,epoch=0,raf=0,busy=false,controller=null,stroke=null,undo=[],redo=[];
  let selectedLayer=-1,layerSignature='';
  let tool='view',color='#087f8c',brush=6,fill=false;
  const $=id=>document.getElementById(id);
  const button=(action,label,ic)=>'<button class="btn btn-light btn-sm" data-media-action="'+action+'">'+(ic?icon(ic,15):'')+label+'</button>';
  const state=()=>structuredClone({mediaEdits:file.mediaEdits,mediaLayers:file.mediaLayers});
  function remember(){undo.push(state());if(undo.length>30)undo.shift();redo=[];}
  function changed(){ctx.changed(file);refresh();}
  function status(message){if($('media-status'))$('media-status').textContent=message;}
  function field(key,label,type='number',min=0,max=200,step=1){const value=file.mediaEdits[key];return '<label class="media-field"><span>'+label+'</span><input data-media-setting="'+key+'" aria-label="'+label+'" type="'+type+'" '+(type==='checkbox'?(value?'checked':''):'value="'+esc(value)+'" min="'+min+'" max="'+max+'" step="'+step+'"')+'></label>';}
  function select(key,label,options){return '<label class="media-field"><span>'+label+'</span><select aria-label="'+label+'" data-media-setting="'+key+'">'+options.map(([v,t])=>'<option value="'+v+'"'+(file.mediaEdits[key]===v?' selected':'')+'>'+t+'</option>').join('')+'</select></label>';}
  function group(title,content){return '<details class="media-group" open><summary>'+title+'</summary><div class="media-fields">'+content+'</div></details>';}
  function inspector(){
    const visual=file.mediaKind!=='audio',timed=['audio','video'].includes(file.mediaKind);let html='';
    if(visual){
      html+=group('Color & finish','<label class="media-field"><span>Look</span><select aria-label="Media look" data-media-preset><option value="">Choose a look</option>'+['natural','vivid','soft','mono','cinema'].map(n=>'<option>'+n+'</option>').join('')+'</select></label>'+field('brightness','Brightness','range')+field('contrast','Contrast','range')+field('saturation','Saturation','range')+field('blur','Softness','range',0,12,.5)+field('sepia','Sepia','range',0,100)+field('hue','Hue rotation','range',0,360));
      html+=group('Crop & size','<label class="media-field"><span>Output preset</span><select aria-label="Output preset" data-media-format><option value="">Choose a format</option><option value="square">Square · 1080 × 1080</option><option value="portrait">Portrait · 1080 × 1350</option><option value="story">Story · 720 × 1280</option><option value="landscape">Landscape · 1280 × 720</option></select></label>'+field('outputWidth','Width','number',1,4096)+field('outputHeight','Height','number',1,4096)+field('keepAspect','Keep proportions','checkbox')+['Left','Right','Top','Bottom'].map(side=>field('crop'+side,'Crop '+side.toLowerCase()+' %','number',0,45)).join('')+'<div class="media-actions">'+button('rotate','Rotate 90°','rotate-cw')+button('flip','Flip horizontally')+'</div>');
      html+=group('Text & background',field('text','Caption','text')+field('textColor','Text color','color')+field('textSize','Text size','number',8,160)+select('textFont','Caption font',[['Segoe UI','Segoe UI'],['Arial','Arial'],['Georgia','Georgia']])+select('textAlign','Caption alignment',[['left','Left'],['center','Center'],['right','Right']])+field('textOpacity','Caption opacity','range',.1,1,.05)+select('textPosition','Text position',[['top','Top'],['center','Center'],['bottom','Bottom']])+'<label class="media-field"><span>Background</span><input type="color" aria-label="Background color" data-media-background value="'+(file.mediaEdits.background==='transparent'?'#ffffff':file.mediaEdits.background)+'"></label>'+button('transparent','Transparent background'));
      html+=group('Draw & annotate','<label class="media-field"><span>Tool</span><select id="media-tool" aria-label="Drawing tool">'+[['view','Select / view'],['pen','Pen'],['erase','Eraser (drawings)'],['rect','Rectangle'],['ellipse','Ellipse'],['line','Line']].map(([v,t])=>'<option value="'+v+'"'+(tool===v?' selected':'')+'>'+t+'</option>').join('')+'</select></label><label class="media-field"><span>Ink</span><input id="media-ink" aria-label="Ink color" type="color" value="'+color+'"></label><label class="media-field"><span>Brush size</span><input id="media-brush" aria-label="Brush size" type="range" min="1" max="60" value="'+brush+'"></label><label class="media-field"><span>Fill shapes</span><input id="media-fill" aria-label="Fill shapes" type="checkbox" '+(fill?'checked':'')+'></label>'+button('clear','Clear drawings'));
      html+=group('Drawing layers','<label class="media-field"><span>Selected layer</span><select id="media-layer" aria-label="Selected drawing layer"><option value="-1">Choose a layer</option></select></label><div class="media-actions">'+[['front','To front'],['back','To back'],['duplicate','Duplicate layer'],['delete','Delete layer'],['left','Nudge left'],['right','Nudge right'],['up','Nudge up'],['down','Nudge down']].map(([a,t])=>button('layer-'+a,t)).join('')+'</div>');
    }
    if(timed)html+=group('Timing & sound',field('trimStart','Start (seconds)','number',0,file.mediaDuration,.01)+field('trimEnd','End (0 = full clip)','number',0,file.mediaDuration,.01)+field('speed','Speed','number',.5,2,.05)+field('gain','Volume','range',0,2,.05)+(visual?field('muted','Mute audio','checkbox'):field('fadeIn','Fade in (seconds)','number',0,10,.1)+field('fadeOut','Fade out (seconds)','number',0,10,.1)+field('normalize','Normalize volume','checkbox')+field('reverse','Reverse audio','checkbox')+field('audioMono','Mix to mono','checkbox')+field('audioBalance','Stereo balance','range',-1,1,.05)+field('removeDC','Remove DC offset','checkbox')+field('audioLoop','Loop preview','checkbox')+button('silence','Trim outer silence')));
    if(visual&&file.mediaKind!=='video')html+=group('Export',select('exportFormat','Image format',[['png','PNG'],['jpeg','JPEG'],['webp','WebP']])+field('quality','Quality','range',40,100));
    return html;
  }
  function markup(f){
    file=f;f.mediaEdits={...defaultMediaEdits(f.mediaEdits.outputWidth,f.mediaEdits.outputHeight),...f.mediaEdits};
    if(f.mediaKind==='empty')return '<section class="media-empty editor-body"><span class="media-emblem">'+icon('image',38)+'</span><h2>MySoft Media</h2><p>Your creative space for images, audio and video.</p><div class="media-launch">'+[['image','Open image','image'],['audio','Open audio','play'],['video','Open video','play'],['drawing','New drawing','plus']].map(([k,t,i])=>button(k,t,i)).join('')+'</div><small>Local editing · Original files preserved · Up to 16 MB per file</small></section>';
    return '<section class="media-layout"><div class="media-toolbar">'+button('open','Open media','upload')+button('drawing','New drawing','plus')+button('undo','Undo','undo-2')+button('redo','Redo','redo-2')+button('reset','Reset edits')+(f.mediaData?button('original','Original','download'):'')+(f.mediaKind==='video'?button('frame','Save frame','image')+button('storyboard','Storyboard','image'):'')+'</div><div class="media-workspace"><div class="media-preview"><div id="media-stage" class="media-stage"><canvas id="media-canvas" aria-label="Media preview"></canvas></div><div id="media-playback" class="media-playback">'+(f.mediaKind==='video'?button('play','Play / pause','play')+'<input id="media-seek" aria-label="Video position" type="range" min="0" max="'+f.mediaDuration+'" step=".01" value="0">':'')+'</div><div id="media-status" class="media-status" role="status">Loading media…</div><div id="media-progress" class="media-progress" hidden><progress max="1" value="0" aria-label="Export progress"></progress>'+button('cancel','Cancel export')+'</div></div><aside id="media-inspector" class="media-inspector" aria-label="Media adjustments">'+inspector()+'</aside></div></section>';
  }
  function paint(){if(!file||!$('media-canvas')||busy)return;if(file.mediaKind==='audio'){if(audio)drawWaveform($('media-canvas'),processedAudio?.channels||audio.channels);}else renderVisual($('media-canvas'),source,file,stroke);fitCanvas($('media-canvas'),$('media-stage'));}
  function syncLayers(){const select=$('media-layer');if(!select)return;const signature=file.mediaLayers.map(l=>l.kind+':'+l.points.length).join('|');if(signature!==layerSignature||select.options.length!==file.mediaLayers.length+1){select.innerHTML='<option value="-1">Choose a layer</option>'+file.mediaLayers.map((l,i)=>'<option value="'+i+'">'+(i+1)+' · '+l.kind+'</option>').join('');layerSignature=signature;}selectedLayer=Math.min(selectedLayer,file.mediaLayers.length-1);select.value=selectedLayer;}
  function refresh(){syncLayers();paint();if(video){video.playbackRate=file.mediaEdits.speed;if(graph)graph.gain.gain.value=file.mediaEdits.muted?0:file.mediaEdits.gain;}
    document.querySelectorAll('[data-media-action="undo"]').forEach(b=>b.disabled=!undo.length);document.querySelectorAll('[data-media-action="redo"]').forEach(b=>b.disabled=!redo.length);
    if(file)status(file.mediaKind==='audio'||file.mediaKind==='video'?file.mediaKind+' · '+trimBoundsSafe()+' · '+(file.mediaKind==='audio'?'WAV export':'WebM export in real time'):file.mediaEdits.outputWidth+' × '+file.mediaEdits.outputHeight+' · '+file.mediaLayers.length+' drawing layers');
  }
  function trimBoundsSafe(){try{return trimBounds(file).duration.toFixed(2)+' seconds';}catch{return 'Choose a valid trim range';}}
  function sync(){
    document.querySelectorAll('[data-media-setting]').forEach(node=>{const value=file.mediaEdits[node.dataset.mediaSetting];if(node.type==='checkbox')node.checked=value;else node.value=value;});
    if($('media-tool'))$('media-tool').value=tool;
    const background=document.querySelector('[data-media-background]');if(background)background.value=file.mediaEdits.background==='transparent'?'#ffffff':file.mediaEdits.background;
    refresh();
  }
  async function audioPreview(){if(!audio||!file)return;try{const result=processAudio(audio.channels,audio.sampleRate,file.mediaEdits),blob=new Blob([encodeWAV(result.channels,result.sampleRate)],{type:'audio/wav'});if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);processedAudio=result;const player=$('media-audio');player.pause();player.loop=Boolean(file.mediaEdits.audioLoop);player.src=previewURL;drawWaveform($('media-canvas'),result.channels);}catch(error){status(error.message);}}
  async function mount(f){
    file=f;undo=[];redo=[];selectedLayer=-1;layerSignature='';tool=f.mediaKind==='drawing'?'pen':'view';const token=++epoch;
    if(f.mediaKind==='empty')return;
    try{
      if(f.mediaKind==='image'){const image=await createImageBitmap(sourceBlob(f));if(token!==epoch){image.close();return;}source=image;}
      if(f.mediaKind==='audio'){const decoded=await decodeAudio(decodeMedia(f.mediaData));if(token!==epoch)return;audio=decoded;$('media-playback').innerHTML='<audio id="media-audio" controls aria-label="Edited audio preview"></audio>';await audioPreview();}
      if(f.mediaKind==='video'){const loaded=await loadVideo(sourceBlob(f));if(token!==epoch){loaded.element.removeAttribute('src');loaded.element.load();URL.revokeObjectURL(loaded.url);return;}video=loaded.element;sourceURL=loaded.url;source=video;video.addEventListener('seeked',paint);if(video.readyState<2)await waitMedia(video,'loadeddata');}
      if(token!==epoch)return;
      sync();observer=new ResizeObserver(paint);observer.observe($('media-stage'));
      const canvas=$('media-canvas');canvas.style.touchAction=tool==='view'?'auto':'none';canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelStroke);
      loop();
    }catch(error){if(token===epoch)status(error.message);}
  }
  function loop(){if(!file)return;if(video&&!video.paused&&!busy){paint();$('media-seek').value=video.currentTime;try{if(video.currentTime>=trimBounds(file).end)video.pause();}catch{video.pause();}}raf=requestAnimationFrame(loop);}
  function unmount(){epoch++;controller?.abort();controller=null;busy=false;cancelAnimationFrame(raf);observer?.disconnect();observer=null;source?.close?.();video?.pause();if(video){video.removeAttribute('src');video.load();}if(graph)void graph.context.close();graph=null;if(sourceURL)URL.revokeObjectURL(sourceURL);if(previewURL)URL.revokeObjectURL(previewURL);$('media-audio')?.pause();sourceURL='';previewURL='';source=null;video=null;audio=null;processedAudio=null;file=null;stroke=null;}
  function point(event){const rect=$('media-canvas').getBoundingClientRect();return [Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))];}
  function down(event){if(busy||tool==='view'||file.mediaKind==='audio'||event.button!==0)return;event.preventDefault();video?.pause();stroke={kind:tool,color,width:Math.max(.0001,Math.min(.2,brush/file.mediaEdits.outputWidth)),fill,points:[point(event)]};event.currentTarget.setPointerCapture(event.pointerId);paint();}
  function move(event){if(!stroke)return;const p=point(event);if(['pen','erase'].includes(stroke.kind)){if(stroke.points.length<2000)stroke.points.push(p);}else stroke.points=[stroke.points[0],p];paint();}
  function up(){if(!stroke)return;const layer=stroke;stroke=null;const candidate={...file,mediaLayers:[...file.mediaLayers,layer]};if(!validateMediaRecord(candidate)){ctx.toast('Drawing limit reached. Clear some layers to continue.');paint();return;}remember();file.mediaLayers.push(layer);selectedLayer=file.mediaLayers.length-1;changed();}
  function cancelStroke(){stroke=null;paint();}
  async function ensureGraph(){if(!graph){const context=new AudioContext(),gain=context.createGain(),destination=context.createMediaStreamDestination(),input=context.createMediaElementSource(video);input.connect(gain);gain.connect(destination);gain.connect(context.destination);graph={context,gain,destination};video.muted=false;}graph.gain.gain.value=file.mediaEdits.muted?0:file.mediaEdits.gain;await graph.context.resume();return graph;}
  async function storyboard(){
    if(!video||busy)return;const token=epoch,own=file,ownVideo=video,time=video.currentTime,range=trimBounds(file),out=document.createElement('canvas'),frame=document.createElement('canvas');
    const tw=320,th=Math.max(1,Math.round(320*own.mediaEdits.outputHeight/own.mediaEdits.outputWidth));if(th>600)throw Error('Choose a wider output aspect for a storyboard.');out.width=tw*2;out.height=(th+30)*3;const c=out.getContext('2d');c.fillStyle='#f2f5fa';c.fillRect(0,0,out.width,out.height);video.pause();controller=new AbortController();const signal=controller.signal;busy=true;$('media-inspector').inert=true;$('media-progress').hidden=false;status('Creating six-frame storyboard…');
    try{
      for(let i=0;i<6;i++){if(signal.aborted||token!==epoch)throw new DOMException('Canceled','AbortError');const at=range.start+(range.end-range.start)*(i+.5)/6;if(Math.abs(ownVideo.currentTime-at)>.002){const seek=waitMedia(ownVideo,'seeked');ownVideo.currentTime=at;await seek;}if(signal.aborted||token!==epoch)throw new DOMException('Canceled','AbortError');renderVisual(frame,ownVideo,own);const x=(i%2)*tw,y=Math.floor(i/2)*(th+30);c.drawImage(frame,x,y,tw,th);c.fillStyle='#24334c';c.font='12px Segoe UI';c.fillText(at.toFixed(2)+' s',x+10,y+th+20);$('media-progress').querySelector('progress').value=(i+1)/6;}
      const blob=await canvasBlob(out);if(token===epoch&&!signal.aborted){ctx.download(blob,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-storyboard.png','image/png');ctx.toast('Storyboard exported');}
    }catch(error){if(token===epoch)ctx.toast(error.name==='AbortError'?'Export canceled':error.message);}
    finally{if(token===epoch){busy=false;controller=null;$('media-inspector').inert=false;$('media-progress').hidden=true;ownVideo.currentTime=time;refresh();}}
  }
  async function exportCurrent(frameOnly=false){
    if(!file||file.mediaKind==='empty'){ctx.toast('Open media or start a drawing first.');return;}if(busy)return;
    const token=epoch,own=file,canvas=$('media-canvas'),name=file.title.replace(/[^a-z0-9_-]+/gi,'-')||'media';
    try{
      if(own.mediaKind==='audio'){if(!audio)throw Error('Audio is still loading.');const result=processAudio(audio.channels,audio.sampleRate,own.mediaEdits);ctx.download(encodeWAV(result.channels,result.sampleRate),name+'.wav','audio/wav');}
      else if(own.mediaKind==='video'&&!frameOnly){if(!video)throw Error('Video is still loading.');const audioGraph=await ensureGraph();if(token!==epoch)return;controller=new AbortController();busy=true;$('media-inspector').inert=true;$('media-progress').hidden=false;status('Exporting video — keep this tab visible.');const blob=await exportVideo(own,video,canvas,audioGraph,{signal:controller.signal,onProgress:value=>{if($('media-progress'))$('media-progress').querySelector('progress').value=value;}});if(token!==epoch)return;ctx.download(blob,name+'.webm',blob.type);}
      else{if(own.mediaKind==='image'&&!source)throw Error('Image is still loading.');paint();const format=frameOnly?'png':own.mediaEdits.exportFormat;let target=canvas;if(format==='jpeg'){target=document.createElement('canvas');target.width=canvas.width;target.height=canvas.height;const c=target.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,target.width,target.height);c.drawImage(canvas,0,0);}const blob=await canvasBlob(target,'image/'+format,own.mediaEdits.quality/100);if(token!==epoch)return;ctx.download(blob,name+'.'+(format==='jpeg'?'jpg':format),blob.type);}
      ctx.toast('Media exported');
    }catch(error){if(token===epoch)ctx.toast(error.name==='AbortError'?'Export canceled':error.message);}
    finally{if(token===epoch){busy=false;controller=null;if($('media-inspector'))$('media-inspector').inert=false;if($('media-progress'))$('media-progress').hidden=true;refresh();}}
  }
  document.addEventListener('click',async event=>{
    const action=event.target.closest('[data-media-action]')?.dataset.mediaAction;if(!action)return;
    if(action==='cancel'){controller?.abort();return;}if(busy)return;
    if(['open','image','audio','video'].includes(action)){ctx.importMedia(action==='open'?'all':action);return;}if(action==='drawing'){ctx.newDrawing();return;}if(!file)return;
    try{
      if(action==='original'){ctx.download(sourceBlob(file),file.mediaSourceName||'original',file.mediaMime);return;}
      if(action==='frame'){await exportCurrent(true);return;}
      if(action==='storyboard'){await storyboard();return;}
      if(action.startsWith('layer-')){const before=state();try{selectedLayer=editMediaLayer(file,selectedLayer,action.slice(6));undo.push(before);redo=[];changed();}catch(error){ctx.toast(error.message);}return;}
      if(action==='silence'){if(!audio)throw Error('Audio is still loading.');const trim=trimAudioSilence(audio.channels,audio.sampleRate);remember();Object.assign(file.mediaEdits,trim);changed();sync();await audioPreview();return;}
      if(action==='play'){if(!video)return;if(video.paused){const bounds=trimBounds(file);if(video.currentTime<bounds.start||video.currentTime>=bounds.end)video.currentTime=bounds.start;await ensureGraph();await video.play();}else video.pause();return;}
      if(action==='undo'||action==='redo'){const from=action==='undo'?undo:redo,to=action==='undo'?redo:undo;if(!from.length)return;to.push(state());Object.assign(file,from.pop());changed();sync();if(audio)await audioPreview();return;}
      remember();const e=file.mediaEdits;
      if(action==='reset'){const scale=Math.min(1,(file.mediaKind==='video'?1280:1920)/Math.max(file.mediaWidth,file.mediaHeight));file.mediaEdits=defaultMediaEdits(Math.round(file.mediaWidth*scale),Math.round(file.mediaHeight*scale));if(file.mediaKind==='drawing')file.mediaEdits.background='#ffffff';file.mediaLayers=[];}
      if(action==='rotate'){e.rotation=(e.rotation+90)%360;[e.outputWidth,e.outputHeight]=[e.outputHeight,e.outputWidth];}
      if(action==='flip')e.flipH=!e.flipH;
      if(action==='transparent')e.background='transparent';
      if(action==='clear')file.mediaLayers=[];
      changed();sync();if(audio)await audioPreview();
    }catch(error){ctx.toast(error.message);}
  });
  document.addEventListener('change',async event=>{
    if(!file||busy)return;const target=event.target;
    if(target.id==='media-layer'){selectedLayer=Number(target.value);return;}
    if(target.id==='media-tool'){tool=target.value;$('media-canvas').style.touchAction=tool==='view'?'auto':'none';return;}
    if(target.id==='media-ink'){color=target.value;return;}if(target.id==='media-brush'){brush=Number(target.value);return;}if(target.id==='media-fill'){fill=target.checked;return;}
    if(target.id==='media-seek'){if(video)video.currentTime=Number(target.value);return;}
    const key=target.dataset.mediaSetting;if(!key&&!target.hasAttribute('data-media-preset')&&!target.hasAttribute('data-media-background')&&!target.hasAttribute('data-media-format'))return;
    const before=state();let recorded=false;
    if(key){file.mediaEdits[key]=target.type==='checkbox'?target.checked:target.type==='number'||target.type==='range'?Number(target.value):target.value;
      const e=file.mediaEdits;if(e.keepAspect&&['outputWidth','outputHeight', 'cropLeft','cropRight','cropTop','cropBottom'].includes(key)){const ratio=visualAspect(file);if(key==='outputHeight')e.outputWidth=Math.max(1,Math.round(e.outputHeight*ratio));else e.outputHeight=Math.max(1,Math.round(e.outputWidth/ratio));}}
    else if(target.hasAttribute('data-media-format')){if(!target.value)return;try{applyMediaFormat(file,target.value);}catch(error){Object.assign(file,before);ctx.toast(error.message);sync();return;}}
    else if(target.hasAttribute('data-media-preset')){if(!target.value)return;applyMediaPreset(file,target.value);}else file.mediaEdits.background=target.value;
    try{if(!validateMediaRecord(file))throw Error('Choose values within the supported limits.');if(['audio','video'].includes(file.mediaKind))trimBounds(file);if(JSON.stringify(before)===JSON.stringify(state()))return;undo.push(before);if(undo.length>30)undo.shift();redo=[];recorded=true;changed();sync();if(audio)await audioPreview();}
    catch(error){Object.assign(file,before);if(recorded)undo.pop();ctx.toast(error.message);sync();}
  });
  return {markup,mount,unmount,exportCurrent};
}
