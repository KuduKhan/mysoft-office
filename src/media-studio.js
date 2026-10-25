import {distributeDrawingLayers} from './advanced-tools.js';
import {compressionSettings} from './production-tools.js';
import {ART_PALETTES,recolorArtwork} from './workflow-studio.js';
import {drawingSVG} from './media-vector.js';
import {mediaPanels,snapPoint,constrainShape,transformMediaDrawing,updateLayerAppearance,DRAWING_TOOLS} from './media-workbench.js';
import {inspectorMarkup,toolPicker,mediaButton} from './media-inspector.js';
import {applyMediaFormat,trimAudioSilence,editMediaLayer} from './media-customize.js';
import {icon} from './icons.js';
import {defaultMediaEdits,validateMediaRecord,decodeMedia,processAudio,encodeWAV,trimBounds,visualAspect,applyMediaPreset} from './media-model.js';
import {loadVideo,decodeAudio,sourceBlob,canvasBlob,exportVideo,waitMedia} from './media-io.js';
import {renderVisual,fitCanvas,drawWaveform} from './media-render.js';
import {colorHistogram} from './media-analysis.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMediaStudio(ctx){
  let file=null,source=null,audio=null,processedAudio=null,video=null,sourceURL='',previewURL='',graph=null,observer=null,epoch=0,raf=0,busy=false,controller=null,stroke=null,undo=[],redo=[];
  let selectedLayer=-1,layerSignature='',compareOriginal=false;
  let tool='view',color='#087f8c',brush=6,fill=false,inkOpacity=1,strokeStyle='solid',activePanel='draw',zoom='fit',grid=false,snap=false,previewEdits=null,pointerId=null;
  const $=id=>document.getElementById(id);
  const button=mediaButton;
  const state=()=>structuredClone({mediaEdits:file.mediaEdits,mediaLayers:file.mediaLayers});
  function remember(){undo.push(state());if(undo.length>30)undo.shift();redo=[];}
  function changed(){previewEdits=null;ctx.changed(file);refresh();if(!$('media-histogram-panel')?.hidden)updateHistogram();}
  function status(message){if($('media-status'))$('media-status').textContent=message;}
  function inspector(){return inspectorMarkup(file,{activePanel,color,brush,fill,opacity:inkOpacity,dash:strokeStyle});}
  function choosePanel(panel,focus=false){
    if(!file||!mediaPanels(file.mediaKind).includes(panel))return;activePanel=panel;
    document.querySelectorAll('[data-media-panel]').forEach(tab=>{const active=tab.dataset.mediaPanel===panel;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();});
    document.querySelectorAll('.media-tool-panel').forEach(el=>el.hidden=el.id!=='media-panel-'+panel);
  }
  function setTool(value){if(!DRAWING_TOOLS.some(([id])=>id===value))return;tool=value;if($('media-tool'))$('media-tool').value=tool;const canvas=$('media-canvas');if(canvas){canvas.style.touchAction=tool==='view'?'auto':'none';canvas.style.cursor=tool==='view'?'default':'crosshair';}if(tool!=='view')choosePanel('draw');refresh();}
  function updateHistogram(){
    const panel=$('media-histogram-panel'),graph=$('media-histogram');
    if(!panel||panel.hidden||!graph||!file||['audio','empty'].includes(file.mediaKind))return;
    if(['image','video'].includes(file.mediaKind)&&!source)return;
    const preview=document.createElement('canvas');
    renderVisual(preview,source,file);
    const sample=document.createElement('canvas');sample.width=320;sample.height=180;
    const g=sample.getContext('2d',{willReadFrequently:true});
    g.drawImage(preview,0,0,320,180);
    const data=colorHistogram(g.getImageData(0,0,320,180).data);
    const ctx=graph.getContext('2d'),w=graph.width,h=graph.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#101827';ctx.fillRect(0,0,w,h);
    const max=Math.max(1,...data.red,...data.green,...data.blue);
    for(const [channel,color] of [['red','#ff6876'],['green','#64e4ac'],['blue','#7bb9ff']]){
      ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();
      data[channel].forEach((value,i)=>{const x=i*(w-2)/63,y=h-5-value/max*(h-12);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    }
    $('media-histogram-count').textContent=data.count.toLocaleString()+' sampled non-transparent pixels · rendered composition';
  }
  function markup(f){
    file=f;activePanel=f.mediaKind==='drawing'?'draw':f.mediaKind==='audio'?'sound':'adjust';tool=f.mediaKind==='drawing'?'pen':'view';f.mediaEdits={...defaultMediaEdits(f.mediaEdits.outputWidth,f.mediaEdits.outputHeight),...f.mediaEdits};
    if(f.mediaKind==='empty')return '<section class="media-empty editor-body"><span class="media-emblem">'+icon('image',38)+'</span><h2>MySoft Media</h2><p>Your creative space for images, audio and video.</p><div class="media-launch">'+[['image','Open image','image'],['audio','Open audio','waveform'],['video','Open video','film'],['drawing','New drawing','plus']].map(([k,t,i])=>button(k,t,i)).join('')+'</div><small>Local editing · Original files preserved · Up to 16 MB per file</small></section>';
    return '<section class="media-layout"><div class="media-toolbar">'+button('open','Open media','upload')+button('undo','Undo','undo-2')+button('redo','Redo','redo-2')+button('preview-png','Save preview PNG','image')+(f.mediaKind!=='audio'?button('histogram','Color histogram','chart-column'):'')+button('reset-view','Reset canvas view','rotate-ccw')+button('canvas-zoom-out','Decrease canvas zoom','minus')+button('canvas-zoom-in','Increase canvas zoom','plus')+(f.mediaData?button('original','Original','download'):'')+(f.mediaKind==='video'?button('frame','Save frame','image')+button('storyboard','Storyboard','image'):'')+(['image','video'].includes(f.mediaKind)?button('compare','Compare original','eye'):'')+(f.mediaKind!=='audio'?toolPicker(tool):'')+'<label class="media-zoom-label">Zoom<select id="media-zoom" aria-label="Canvas zoom"><option value="fit">Fit</option>'+[25,50,75,100,150,200].map(n=>'<option value="'+n+'">'+n+'%</option>').join('')+'</select></label></div><div class="media-workspace"><div class="media-preview"><div id="media-stage" class="media-stage"><div id="media-canvas-wrap"><canvas id="media-canvas" aria-label="Media preview" tabindex="0"></canvas><div id="media-grid-overlay" aria-hidden="true" hidden></div></div></div><div id="media-playback" class="media-playback">'+(f.mediaKind==='video'?button('play','Play / pause','play')+'<input id="media-seek" aria-label="Video position" type="range" min="0" max="'+f.mediaDuration+'" step=".01" value="0">':'')+'</div><div id="media-status" class="media-status" role="status">Loading media…</div><div id="media-histogram-panel" hidden aria-label="Color histogram"><canvas id="media-histogram" width="256" height="105" role="img" aria-label="RGB channel histogram"></canvas><span id="media-histogram-count"></span></div><div id="media-progress" class="media-progress" hidden><progress max="1" value="0" aria-label="Export progress"></progress>'+button('cancel','Cancel export')+'</div></div><aside id="media-inspector" class="media-inspector" aria-label="Media adjustments">'+inspector()+'</aside></div></section>';
  }
  function paint(){if(!file||!$('media-canvas')||busy)return;if(file.mediaKind==='audio'){if(audio)drawWaveform($('media-canvas'),processedAudio?.channels||audio.channels);}else {
      const preview=compareOriginal?{...file,mediaEdits:defaultMediaEdits(file.mediaEdits.outputWidth,file.mediaEdits.outputHeight),mediaLayers:[]}:previewEdits?{...file,mediaEdits:previewEdits}:file;
      renderVisual($('media-canvas'),source,preview,compareOriginal?null:stroke);
    }layoutCanvas();}
  function layoutCanvas(){const canvas=$('media-canvas'),wrap=$('media-canvas-wrap');if(!canvas||!wrap)return;fitCanvas(canvas,$('media-stage'),zoom);wrap.style.width=canvas.style.width;wrap.style.height=canvas.style.height;const overlay=$('media-grid-overlay');overlay.hidden=!grid||file.mediaKind==='audio';const step=32*parseFloat(canvas.style.width)/canvas.width;overlay.style.backgroundSize=step+'px '+step+'px';}
  function syncLayers(){const select=$('media-layer');if(!select)return;const signature=file.mediaLayers.map(l=>l.kind+':'+l.points.length+':'+Boolean(l.locked)+':'+Boolean(l.hidden)).join('|');if(signature!==layerSignature||select.options.length!==file.mediaLayers.length+1){select.innerHTML='<option value="-1">Choose a layer</option>'+file.mediaLayers.map((l,i)=>'<option value="'+i+'">'+(i+1)+' · '+l.kind+(l.locked?' (locked)':'')+'</option>').join('');layerSignature=signature;}selectedLayer=Math.min(selectedLayer,file.mediaLayers.length-1);select.value=selectedLayer;const selected=file.mediaLayers[selectedLayer];document.querySelectorAll('[data-media-action^="layer-"]').forEach(button=>button.disabled=!selected||(Boolean(selected.locked)&&!['layer-lock'].includes(button.dataset.mediaAction)));if($('media-layer-opacity')){$('media-layer-opacity').disabled=!selected||Boolean(selected.locked);$('media-layer-opacity').value=selected?.opacity??1;}const lockButton=document.querySelector('[data-media-action="layer-lock"]');
    if(lockButton){lockButton.setAttribute('aria-pressed',String(Boolean(selected?.locked)));const span=lockButton.querySelector('span');if(span)span.textContent=selected?.locked?'Unlock layer':'Lock layer';}
    const visibility=document.querySelector('[data-media-action="layer-visibility"]');if(visibility){visibility.setAttribute('aria-pressed',String(Boolean(selected&&!selected.hidden)));visibility.setAttribute('aria-label','Layer visibility');visibility.querySelector('span').textContent=selected?.hidden?'Show layer':'Hide layer';visibility.querySelector('svg').outerHTML=icon(selected?.hidden?'eye-off':'eye',15);}for(const [id,key] of [['media-layer-color','color'],['media-layer-width','width'],['media-layer-dash','dash'],['media-layer-fill','fill']]){const control=$(id);if(!control)continue;control.disabled=!selected||Boolean(selected.locked)||(key==='fill'&&!['rect','ellipse','triangle'].includes(selected.kind));if(key==='width'){control.min=file.mediaEdits.outputWidth*.0001;control.max=file.mediaEdits.outputWidth*.2;}if(key==='fill')control.checked=selected?.fill??false;else control.value=key==='width'?Number(((selected?.width||.004)*file.mediaEdits.outputWidth).toFixed(3)):selected?.[key]??(key==='dash'?'solid':'#087f8c');}const clear=document.querySelector('[data-media-action="clear"]');if(clear)clear.disabled=!file.mediaLayers.length;}
  function refresh(){syncLayers();paint();if(video){video.playbackRate=file.mediaEdits.speed;if(graph)graph.gain.gain.value=file.mediaEdits.muted?0:file.mediaEdits.gain;}
    document.querySelector('[data-media-action="compare"]')?.setAttribute('aria-pressed',String(compareOriginal));
    document.querySelectorAll('[data-media-action="undo"]').forEach(b=>b.disabled=!undo.length);document.querySelectorAll('[data-media-action="redo"]').forEach(b=>b.disabled=!redo.length);
    if(file)status(file.mediaKind==='audio'||file.mediaKind==='video'?file.mediaKind+' · '+trimBoundsSafe()+' · '+(file.mediaKind==='audio'?'WAV export':'WebM export in real time'):((DRAWING_TOOLS.find(([id])=>id===tool)?.[1]||'Select')+' · '+file.mediaLayers.length+' drawing layers'+(snap?' · Grid snapping on':'')));

  }
  function trimBoundsSafe(){try{return trimBounds(file).duration.toFixed(2)+' seconds';}catch{return 'Choose a valid trim range';}}
  function sync(){
    document.querySelectorAll('[data-media-setting]').forEach(node=>{const values={...compressionSettings(),...file.mediaEdits},value=node.dataset.mediaSetting==='textShadow'?file.mediaEdits.textShadow!==false:values[node.dataset.mediaSetting];if(node.type==='checkbox')node.checked=value;else node.value=value;});
    if($('media-tool'))$('media-tool').value=tool;
    const background=document.querySelector('[data-media-background]');if(background)background.value=file.mediaEdits.background==='transparent'?'#ffffff':file.mediaEdits.background;
    refresh();
  }
  async function audioPreview(){if(!audio||!file)return;try{const result=processAudio(audio.channels,audio.sampleRate,file.mediaEdits),blob=new Blob([encodeWAV(result.channels,result.sampleRate)],{type:'audio/wav'});if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);processedAudio=result;const player=$('media-audio');player.pause();player.loop=Boolean(file.mediaEdits.audioLoop);player.src=previewURL;drawWaveform($('media-canvas'),result.channels);}catch(error){status(error.message);}}
  async function mount(f){
    file=f;undo=[];redo=[];zoom='fit';grid=false;snap=false;previewEdits=null;compareOriginal=false;selectedLayer=-1;layerSignature='';tool=f.mediaKind==='drawing'?'pen':'view';const token=++epoch;
    if(f.mediaKind==='empty')return;
    try{
      if(f.mediaKind==='image'){const image=await createImageBitmap(sourceBlob(f));if(token!==epoch){image.close();return;}source=image;}
      if(f.mediaKind==='audio'){const decoded=await decodeAudio(decodeMedia(f.mediaData));if(token!==epoch)return;audio=decoded;$('media-playback').innerHTML='<audio id="media-audio" controls aria-label="Edited audio preview"></audio>';await audioPreview();}
      if(f.mediaKind==='video'){const loaded=await loadVideo(sourceBlob(f));if(token!==epoch){loaded.element.removeAttribute('src');loaded.element.load();URL.revokeObjectURL(loaded.url);return;}video=loaded.element;sourceURL=loaded.url;source=video;video.addEventListener('seeked',paint);if(video.readyState<2)await waitMedia(video,'loadeddata');}
      if(token!==epoch)return;
      sync();observer=new ResizeObserver(paint);observer.observe($('media-stage'));
      const canvas=$('media-canvas');setTool(tool);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancelStroke);
      loop();
    }catch(error){if(token===epoch)status(error.message);}
  }
  function loop(){if(!file)return;if(video&&!video.paused&&!busy){paint();$('media-seek').value=video.currentTime;try{if(video.currentTime>=trimBounds(file).end)video.pause();}catch{video.pause();}}raf=requestAnimationFrame(loop);}
  function unmount(){epoch++;controller?.abort();controller=null;busy=false;cancelAnimationFrame(raf);observer?.disconnect();observer=null;source?.close?.();video?.pause();if(video){video.removeAttribute('src');video.load();}if(graph)void graph.context.close();graph=null;if(sourceURL)URL.revokeObjectURL(sourceURL);if(previewURL)URL.revokeObjectURL(previewURL);$('media-audio')?.pause();sourceURL='';previewURL='';source=null;video=null;audio=null;processedAudio=null;file=null;stroke=null;previewEdits=null;pointerId=null;}
  function point(event){const rect=$('media-canvas').getBoundingClientRect();return snapPoint([(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height],file.mediaEdits.outputWidth,file.mediaEdits.outputHeight,snap);}
  function down(event){if(busy||stroke||compareOriginal||tool==='view'||file.mediaKind==='audio'||event.button!==0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});video?.pause();stroke={kind:tool,color,width:Math.max(.0001,Math.min(.2,brush/file.mediaEdits.outputWidth)),fill,opacity:inkOpacity,dash:strokeStyle,points:[point(event)]};pointerId=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);paint();}
  function move(event){if(!stroke||event.pointerId!==pointerId)return;let p=point(event);if(!['pen','erase','line','arrow'].includes(stroke.kind))p=constrainShape(stroke.points[0],p,file.mediaEdits.outputWidth,file.mediaEdits.outputHeight,event.shiftKey);if(['pen','erase'].includes(stroke.kind)){if(stroke.points.length<2000)stroke.points.push(p);}else stroke.points=[stroke.points[0],p];paint();}
  function up(event){if(!stroke||event.pointerId!==pointerId)return;pointerId=null;const layer=stroke;stroke=null;if(layer.kind==='triangle'){const [a,b]=[layer.points[0],layer.points.at(-1)];layer.points=[[(a[0]+b[0])/2,Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.max(a[1],b[1])]];}const candidate={...file,mediaLayers:[...file.mediaLayers,layer]};if(!validateMediaRecord(candidate)){ctx.toast('Drawing limit reached. Clear some layers to continue.');paint();return;}remember();file.mediaLayers.push(layer);selectedLayer=file.mediaLayers.length-1;changed();}
  function cancelStroke(){pointerId=null;stroke=null;paint();}
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
      else{if(own.mediaKind==='image'&&!source)throw Error('Image is still loading.');const output=document.createElement('canvas');renderVisual(output,source,own);const format=frameOnly?'png':own.mediaEdits.exportFormat;let target=output;if(format==='jpeg'){target=document.createElement('canvas');target.width=output.width;target.height=output.height;const c=target.getContext('2d');c.fillStyle='#ffffff';c.fillRect(0,0,target.width,target.height);c.drawImage(output,0,0);}const blob=await canvasBlob(target,'image/'+format,own.mediaEdits.quality/100);if(token!==epoch)return;ctx.download(blob,name+'.'+(format==='jpeg'?'jpg':format),blob.type);}
      ctx.toast('Media exported');
    }catch(error){if(token===epoch)ctx.toast(error.name==='AbortError'?'Export canceled':error.message);}
    finally{if(token===epoch){busy=false;controller=null;if($('media-inspector'))$('media-inspector').inert=false;if($('media-progress'))$('media-progress').hidden=true;refresh();}}
  }
  document.addEventListener('click',async event=>{
    const panel=event.target.closest('[data-media-panel]');if(panel&&!busy){choosePanel(panel.dataset.mediaPanel);return;}
    const action=event.target.closest('[data-media-action]')?.dataset.mediaAction;if(!action)return;
    if(action==='cancel'){controller?.abort();return;}if(busy)return;
    if(action==='histogram'){const panel=$('media-histogram-panel');if(panel){panel.hidden=!panel.hidden;if(!panel.hidden)updateHistogram();}return;}
    if(['open','image','audio','video'].includes(action)){ctx.importMedia(action==='open'?'all':action);return;}if(action==='drawing'){ctx.newDrawing();return;}if(!file)return;
    try{
      if(action==='preview-png'){if(file.mediaKind==='audio'){const blob=await canvasBlob($('media-canvas'),'image/png',1);ctx.download(blob,(file.title.replace(/[^a-z0-9_-]+/gi,'-')||'audio')+'-waveform.png','image/png');ctx.toast('Waveform preview saved.');}else await exportCurrent(true);return;}
      if(action==='reset-view'){zoom='fit';$('media-zoom').value=zoom;paint();return;}
      if(action==='canvas-zoom-in'||action==='canvas-zoom-out'){const levels=[25,50,75,100,150,200],current=zoom==='fit'?100:Number(zoom);zoom=String(action==='canvas-zoom-in'?(levels.find(n=>n>current)||200):([...levels].reverse().find(n=>n<current)||25));$('media-zoom').value=zoom;paint();return;}
      if(action==='distribute-layers-h'||action==='distribute-layers-v'){const result=distributeDrawingLayers(file,action.endsWith('-h')?'horizontal':'vertical');remember();file.mediaLayers=result.layers;changed();sync();ctx.toast(result.count+' drawing layers distributed.');return;}
      if(action==='palette-apply'){
        const result=recolorArtwork(file,$('workflow-palette').value);remember();file.mediaLayers=result.layers;changed();sync();ctx.toast(result.colors+' artwork colors coordinated.');return;
      }
      if(action==='palette-export'){
        const key=$('workflow-palette').value;if(!Object.hasOwn(ART_PALETTES,key))throw Error('Choose a supported palette.');ctx.download(JSON.stringify({name:key,colors:ART_PALETTES[key]},null,2),'mysoft-'+key+'-palette.json','application/json');ctx.toast('Color palette exported.');return;
      }
      if(action==='export-svg'){
        const measure=document.createElement('canvas').getContext('2d');const svg=drawingSVG(file,(text,{size,font})=>{measure.font='600 '+size+'px "'+font+'",sans-serif';return measure.measureText(text).width;});ctx.download(svg,(file.title.replace(/[^a-z0-9_-]+/gi,'-')||'drawing')+'.svg','image/svg+xml');ctx.toast('Scalable drawing exported.');return;
      }
      if(action==='compare'){compareOriginal=!compareOriginal;refresh();return;}
      if(action==='original'){ctx.download(sourceBlob(file),file.mediaSourceName||'original',file.mediaMime);return;}
      if(action==='frame'){await exportCurrent(true);return;}
      if(action==='storyboard'){await storyboard();return;}
      if(action.startsWith('layer-')){const before=state();try{if(action==='layer-lock')updateLayerAppearance(file,selectedLayer,{locked:!file.mediaLayers[selectedLayer]?.locked});
        else if(action==='layer-visibility')updateLayerAppearance(file,selectedLayer,{hidden:!file.mediaLayers[selectedLayer]?.hidden});else selectedLayer=editMediaLayer(file,selectedLayer,action.slice(6));undo.push(before);if(undo.length>30)undo.shift();redo=[];changed();}catch(error){ctx.toast(error.message);}return;}
      if(action==='silence'){if(!audio)throw Error('Audio is still loading.');const trim=trimAudioSilence(audio.channels,audio.sampleRate);remember();Object.assign(file.mediaEdits,trim);changed();sync();await audioPreview();return;}
      if(action==='play'){if(!video)return;if(video.paused){const bounds=trimBounds(file);if(video.currentTime<bounds.start||video.currentTime>=bounds.end)video.currentTime=bounds.start;await ensureGraph();await video.play();}else video.pause();return;}
      if(action==='undo'||action==='redo'){const from=action==='undo'?undo:redo,to=action==='undo'?redo:undo;if(!from.length)return;to.push(state());Object.assign(file,from.pop());changed();sync();if(audio)await audioPreview();return;}
      remember();const e=file.mediaEdits;
      if(['reset','clear'].includes(action)&&file.mediaLayers.some(l=>l.locked))throw Error('Unlock layers before clearing or resetting them.');
      if(action==='reset'){const scale=Math.min(1,(file.mediaKind==='video'?1280:1920)/Math.max(file.mediaWidth,file.mediaHeight));file.mediaEdits=defaultMediaEdits(Math.round(file.mediaWidth*scale),Math.round(file.mediaHeight*scale));if(file.mediaKind==='drawing'){file.mediaEdits.background='#ffffff';file.mediaEdits.textColor='#203040';}file.mediaLayers=[];}
      if(['rotate','flip','flip-v'].includes(action))transformMediaDrawing(file,action);
      if(action==='transparent')e.background='transparent';
      if(action==='clear')file.mediaLayers=[];
      changed();sync();if(audio)await audioPreview();
    }catch(error){ctx.toast(error.message);}
  });
  document.addEventListener('change',async event=>{
    if(!file||busy)return;const target=event.target;
    if(target.id==='workflow-palette'){const colors=ART_PALETTES[target.value];if(colors)document.querySelectorAll('.workflow-palette-preview span').forEach((el,i)=>{el.style.backgroundColor=colors[i];});return;}
    if(target.id==='media-layer'){selectedLayer=Number(target.value);syncLayers();return;}
    const layerKeys={'media-layer-color':'color','media-layer-width':'width','media-layer-dash':'dash','media-layer-fill':'fill'};
    if(layerKeys[target.id]){const key=layerKeys[target.id],value=key==='width'?Number(target.value)/file.mediaEdits.outputWidth:key==='fill'?target.checked:target.value;try{const before=state();updateLayerAppearance(file,selectedLayer,{[key]:value});undo.push(before);if(undo.length>30)undo.shift();redo=[];changed();}catch(error){ctx.toast(error.message);syncLayers();}return;}
    if(target.id==='media-layer-opacity'){remember();try{updateLayerAppearance(file,selectedLayer,{opacity:Number(target.value)});changed();}catch(error){undo.pop();ctx.toast(error.message);}return;}
    if(target.id==='media-stroke'){strokeStyle=target.value;return;}if(target.id==='media-ink-opacity'){inkOpacity=Number(target.value);return;}
    if(target.id==='media-grid-toggle'){grid=target.checked;paint();return;}if(target.id==='media-snap-toggle'){snap=target.checked;grid=grid||snap;$('media-grid-toggle').checked=grid;refresh();return;}
    if(target.id==='media-zoom'){zoom=target.value;paint();return;}
    if(target.id==='media-tool'){setTool(target.value);return;}
    if(target.id==='media-ink'){color=target.value;return;}if(target.id==='media-brush'){brush=Number(target.value);return;}if(target.id==='media-fill'){fill=target.checked;return;}
    if(target.id==='media-seek'){if(video)video.currentTime=Number(target.value);return;}
    const key=target.dataset.mediaSetting;if(!key&&!target.hasAttribute('data-media-preset')&&!target.hasAttribute('data-media-background')&&!target.hasAttribute('data-media-format'))return;
    previewEdits=null;const before=state();let recorded=false;
    if(key){file.mediaEdits[key]=target.type==='checkbox'?target.checked:target.type==='number'||target.type==='range'?Number(target.value):target.value;
      const e=file.mediaEdits;if(e.keepAspect&&['outputWidth','outputHeight', 'cropLeft','cropRight','cropTop','cropBottom'].includes(key)){const ratio=visualAspect(file);if(key==='outputHeight')e.outputWidth=Math.max(1,Math.round(e.outputHeight*ratio));else e.outputHeight=Math.max(1,Math.round(e.outputWidth/ratio));}}
    else if(target.hasAttribute('data-media-format')){if(!target.value)return;try{applyMediaFormat(file,target.value);}catch(error){Object.assign(file,before);ctx.toast(error.message);sync();return;}}
    else if(target.hasAttribute('data-media-preset')){if(!target.value)return;applyMediaPreset(file,target.value);}else file.mediaEdits.background=target.value;
    try{if(!validateMediaRecord(file))throw Error('Choose values within the supported limits.');if(['audio','video'].includes(file.mediaKind))trimBounds(file);if(JSON.stringify(before)===JSON.stringify(state()))return;undo.push(before);if(undo.length>30)undo.shift();redo=[];recorded=true;changed();sync();if(audio)await audioPreview();}
    catch(error){Object.assign(file,before);if(recorded)undo.pop();ctx.toast(error.message);sync();}
  });
  document.addEventListener('input',event=>{const key=event.target.dataset.mediaSetting;if(!file||busy||event.target.type!=='range'||file.mediaKind==='audio'||!key)return;const candidate={...file.mediaEdits,[key]:Number(event.target.value)};if(validateMediaRecord({...file,mediaEdits:candidate})){previewEdits=candidate;paint();}});
  document.addEventListener('keydown',event=>{
    if(!file||busy||file.mediaKind==='empty'||document.querySelector('.modal-backdrop')||event.target.closest('input,textarea,select,[contenteditable]'))return;
    const tab=event.target.closest('[data-media-panel]');if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){const panels=mediaPanels(file.mediaKind),index=panels.indexOf(activePanel),next=event.key==='Home'?0:event.key==='End'?panels.length-1:(index+(event.key==='ArrowRight'?1:-1)+panels.length)%panels.length;event.preventDefault();choosePanel(panels[next],true);return;}
    if(!event.target.closest('.media-layout'))return;const key=event.key.toLowerCase();
    if((event.ctrlKey||event.metaKey)&&['z','y'].includes(key)){event.preventDefault();event.stopImmediatePropagation();document.querySelector('[data-media-action="'+(key==='y'||event.shiftKey?'redo':'undo')+'"]').click();return;}
    if(!event.ctrlKey&&!event.metaKey&&!event.altKey){if(selectedLayer>=0&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete'].includes(event.key)){event.preventDefault();const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Delete:'delete'}[event.key];document.querySelector('[data-media-action="layer-'+action+'"]').click();return;}const shortcuts={v:'view',b:'pen',e:'erase',r:'rect',o:'ellipse',l:'line',a:'arrow',t:'triangle'};if(shortcuts[key]&&file.mediaKind!=='audio'){event.preventDefault();setTool(shortcuts[key]);}if(event.key==='Escape')cancelStroke();}
  });
  return {markup,mount,unmount,exportCurrent};
}
