import {exportPDFHandout,exportResizedPDF} from './pdf-handout.js';
import {icon} from './icons.js';
import {addAnnotation,deleteAnnotation} from './pdf-annotations.js';
import {inspectPDFForms,setPDFFormValue} from './pdf-forms.js';
import {PDFEditHistory,orderedPDFText} from './pdf-edits.js';
import {loadPDF,closePDF,rotatePDFPage,pdfOrder,parsePDFPages,exportPDF,mergePDF,setPDFBookmark,removePDFBookmark} from './pdf-model.js';

export function createPDFStudio(ctx){
  let doc=null,currentFile=null,generation=0,drawGeneration=0,renderTask=null,pageNumber=1,zoom='fit',searchGeneration=0;
  let edits=null,viewportObserver=null,formFields=[],markMode='',markViewport=null,markStart=null;
  function refreshHistory(){for(const action of ['undo','redo']){const control=document.querySelector('[data-pdf-action="'+action+'"]');if(control)control.disabled=!edits?.[action==='undo'?'canUndo':'canRedo'];}}
  function commitChange(){if(!currentFile)return;if(edits?.checkpoint(currentFile))ctx.changed(currentFile);refreshHistory();}

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bookmarkRows=file=>{
    const visible=pdfOrder(file);
    return (file.pdfBookmarks||[]).length
      ?file.pdfBookmarks.map(b=>{const index=visible.indexOf(b.page);return '<div class="pdf-bookmark-row"><button type="button" data-pdf-action="bookmark-jump" data-source-page="'+b.page+'" '+(index<0?'disabled':'')+'>'+esc(b.label)+' · source '+b.page+(index<0?' (omitted)':'')+'</button><button type="button" data-pdf-action="bookmark-remove" data-source-page="'+b.page+'" aria-label="Remove bookmark">'+icon('x',13)+'</button></div>';}).join('')
      :'<p>No bookmarks. Save the current source page to return to it later.</p>';
  };
  const bookmarkPanel=file=>'<details class="pdf-bookmarks-panel pdf-organize-style"><summary>MySoft bookmarks</summary><p>Saved in MySoft, not embedded in exported PDFs.</p><button type="button" class="btn btn-light btn-sm" data-pdf-action="bookmark-add">Bookmark current page</button><div id="pdf-bookmarks-list">'+bookmarkRows(file)+'</div></details>';
  const refreshBookmarks=()=>{const node=document.getElementById('pdf-bookmarks-list');if(node&&currentFile)node.innerHTML=bookmarkRows(currentFile);};
  const formRows=()=>formFields.length?formFields.map(field=>
    '<div class="pdf-bookmark-row"><span>'+esc(field.name)+' · '+field.kind+' · '+esc(field.kind==='checkbox'?(field.value?'Checked':'Unchecked'):String(field.value??'').slice(0,80))+'</span>'+
    (field.kind!=='unsupported'?'<button class="btn btn-light btn-sm" data-pdf-action="form-edit" data-pdf-field="'+esc(field.name)+'">Edit field</button>':'')+'</div>').join(''):
    '<p>No supported fillable text or checkbox fields were found.</p>';
  const markRows=file=>(file.pdfAnnotations||[]).length?file.pdfAnnotations.map(a=>
    '<div class="pdf-bookmark-row"><button data-pdf-action="mark-jump" data-source-page="'+a.page+'">'+esc(a.kind)+' · page '+a.page+' · '+esc(a.text.slice(0,60))+'</button><button data-pdf-action="mark-remove" data-mark-id="'+esc(a.id)+'">Delete</button></div>').join(''):
    '<p>Use Note or Highlight, then click or drag on the PDF page.</p>';
  const updateMarks=()=>{const el=document.getElementById('pdf-mark-list');if(el&&currentFile)el.innerHTML=markRows(currentFile);};
  const button=(action,label,ic)=>'<button type="button" class="btn btn-light btn-sm" data-pdf-action="'+action+'" aria-label="'+label+'" title="'+label+'">'+icon(ic,16)+'</button>';
  function markup(file){
    if(!file.pdfData)return '<section class="pdf-empty editor-body"><div class="pdf-empty-icon">'+icon('file-text',38)+'</div><h2>MySoft PDF</h2><p>Read, rotate and export PDFs in your workspace.</p><button class="btn btn-primary" data-pdf-action="import">'+icon('upload',17)+' Open PDF</button><small>Up to 8 MB · 500 pages · Stored on this device</small></section>';
    return '<section class="pdf-layout"><div class="pdf-toolbar" aria-label="PDF tools"><div class="pdf-tool-group">'+button('first','First PDF page','chevrons-left')+button('previous','Previous page','arrow-left')+
      '<label class="pdf-page-label">Page <input id="pdf-page-number" type="number" min="1" max="'+file.pdfPageCount+'" value="1" aria-label="PDF page number"></label><span class="pdf-page-total">of '+file.pdfPageCount+'</span>'+button('next','Next page','arrow-right')+button('last','Last PDF page','chevrons-right')+'</div>'+
      '<label class="pdf-zoom-label">Zoom <select id="pdf-zoom" aria-label="PDF zoom"><option value="fit">Fit width</option><option value="height">Fit height</option>'+[50,75,100,125,150,200].map(n=>'<option value="'+n+'">'+n+'%</option>').join('')+'</select></label>'+button('zoom-out','Decrease PDF zoom','minus')+button('zoom-in','Increase PDF zoom','plus')+'<div class="pdf-tool-group">'+button('undo','Undo PDF edit','undo-2')+button('redo','Redo PDF edit','redo-2')+button('rotate-left','Rotate page left','rotate-ccw')+button('rotate-right','Rotate page right','rotate-cw')+'<button class="btn btn-light btn-sm" data-pdf-action="reset">Reset rotations</button></div>'+button('export-text','Export PDF text','file-text')+button('mark-note','Add PDF sticky note','notebook-pen')+button('mark-highlight','Highlight PDF rectangle','highlighter')+button('stamp-dialog','Watermark and page numbers','type')+button('merge','Merge PDFs and export','copy')+button('crop-dialog','Crop PDF pages','crop')+button('handout-dialog','PDF handout','grid')+button('size-dialog','Resize PDF pages','sliders-horizontal')+'<button class="btn btn-light btn-sm" data-pdf-action="import">'+icon('upload',15)+'<span>Open PDF</span></button></div>'+
      '<div class="pdf-extra-tools"><div class="pdf-search-row"><input id="pdf-find" type="search" maxlength="120" aria-label="Find in PDF" placeholder="Find throughout this PDF"><button class="btn btn-light btn-sm" data-pdf-action="find">Search</button></div><div id="pdf-search-results" class="pdf-search-results" role="status"></div><details class="pdf-organize"><summary>Organize &amp; extract pages</summary><p>Use original source page numbers. Repeat pages to duplicate them, omit pages to remove them, or change their order. Original bytes stay intact.</p><label>Source pages<input id="pdf-page-order" aria-label="Source page order" maxlength="3000" value="'+pdfOrder(file).join(',')+'" placeholder="3,1-2"></label><div class="pdf-tool-group"><button class="btn btn-light btn-sm" data-pdf-action="order">Apply page order</button><button class="btn btn-light btn-sm" data-pdf-action="extract">Export these pages</button><button class="btn btn-light btn-sm" data-pdf-action="reset-order">Restore original order</button><button class="btn btn-light btn-sm" data-pdf-action="reverse-order">Reverse order</button><button class="btn btn-light btn-sm" data-pdf-action="duplicate-page">Duplicate current page</button><button class="btn btn-light btn-sm" data-pdf-action="remove-page">Remove current page</button></div></details>'+bookmarkPanel(file)+'<details class="pdf-organize-style pdf-forms-panel"><summary>Fillable forms</summary><p>Changes are saved locally. Export preserves native text and checkbox fields when the original page order is retained.</p><div id="pdf-form-fields">Inspecting fields…</div></details><details class="pdf-organize-style"><summary>PDF notes and highlights</summary><p>Native PDF annotations, not redactions or digital signatures.</p><div id="pdf-mark-list">'+markRows(file)+'</div></details></div><div id="pdf-status" class="pdf-status" role="status">Opening PDF…</div><div id="pdf-viewport" class="pdf-viewport" aria-busy="true"><canvas id="pdf-canvas" role="img" aria-label="PDF page"></canvas></div><details class="pdf-text-panel"><summary>Page text</summary><pre id="pdf-page-text">Loading page text…</pre></details><input id="pdf-merge-input" type="file" accept="application/pdf,.pdf" multiple hidden aria-label="PDFs to append"></section>';
  }
  function unmount(){
    viewportObserver?.disconnect();viewportObserver=null;clearTimeout(resizeTimer);
    generation++;drawGeneration++;searchGeneration++;renderTask?.cancel();renderTask=null;
    const old=doc;doc=null;currentFile=null;edits=null;formFields=[];markMode='';markStart=null;markViewport=null;
    if(old)void closePDF(old).catch(()=>{});
  }
  async function draw(){
    const canvas=document.getElementById('pdf-canvas'),viewportNode=document.getElementById('pdf-viewport');
    if(!doc||!canvas||!currentFile)return;
    const token=++drawGeneration,ownDoc=doc,file=currentFile;
    const previous=renderTask;previous?.cancel();
    if(previous)await previous.promise.catch(()=>{});
    if(token!==drawGeneration||!canvas.isConnected)return;
    viewportNode.setAttribute('aria-busy','true');
    try{
      const order=pdfOrder(file),sourcePage=order[pageNumber-1];
      const page=await ownDoc.getPage(sourcePage);
      if(token!==drawGeneration||!canvas.isConnected)return;
      const rotation=(page.rotate+(file.pdfRotations?.[sourcePage]||0))%360;
      const base=page.getViewport({scale:1,rotation});
      const scale=zoom==='fit'?Math.min(3,Math.max(.05,(viewportNode.clientWidth-32)/base.width)):zoom==='height'?Math.min(3,Math.max(.05,(viewportNode.clientHeight-32)/base.height)):Number(zoom)/100;
      const viewport=page.getViewport({scale,rotation});
      markViewport={viewport,sourcePage};
      if(viewport.width>8000||viewport.height>16000)throw Error('This page is too large at this zoom. Choose Fit width.');
      const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(16000000/(viewport.width*viewport.height)));
      canvas.width=Math.max(1,Math.floor(viewport.width*ratio));canvas.height=Math.max(1,Math.floor(viewport.height*ratio));
      canvas.style.width=Math.floor(viewport.width)+'px';canvas.style.height=Math.floor(viewport.height)+'px';
      canvas.setAttribute('aria-label','PDF page '+pageNumber+' of '+order.length);
      document.getElementById('pdf-page-number').value=pageNumber;document.getElementById('pdf-page-number').max=order.length;document.querySelector('.pdf-page-total').textContent='of '+order.length;
      document.querySelector('[data-pdf-action="previous"]').disabled=pageNumber===1;
      document.querySelector('[data-pdf-action="next"]').disabled=pageNumber===order.length;
      renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});
      await renderTask.promise;
      if(token!==drawGeneration||!canvas.isConnected)return;
      const pen=canvas.getContext('2d');pen.save();pen.scale(ratio,ratio);
      for(const a of file.pdfAnnotations||[]){
        if(a.page!==sourcePage)continue;
        const p=viewport.convertToViewportPoint(a.rect[0],a.rect[1]),q=viewport.convertToViewportPoint(a.rect[2],a.rect[3]);
        pen.fillStyle=a.kind==='highlight'?'rgba(255,206,35,.32)':'rgba(252,165,45,.82)';
        pen.fillRect(Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]));
      }
      pen.restore();
      const text=await page.getTextContent();
      if(token!==drawGeneration||!canvas.isConnected)return;
      document.getElementById('pdf-page-text').textContent=text.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('').slice(0,100000)||'No extractable text on this page. Scanned pages require OCR, which is not included.';
      document.getElementById('pdf-status').textContent='Page '+pageNumber+' of '+order.length+((file.pdfRotations?.[sourcePage]||0)?' · Rotated '+file.pdfRotations[sourcePage]+'°':'');
      viewportNode.setAttribute('aria-busy','false');
    }catch(error){
      if(token!==drawGeneration||error?.name==='RenderingCancelledException')return;
      document.getElementById('pdf-status').textContent='Could not display this page: '+String(error.message||error).slice(0,160);
      viewportNode.setAttribute('aria-busy','false');
    }
  }
  async function mount(file){
    if(!file.pdfData)return;
    const token=++generation;
    currentFile=file;pageNumber=1;zoom='fit';edits=new PDFEditHistory(file);refreshHistory();
    try{
      const loaded=await loadPDF(file.pdfData);
      if(token!==generation||!document.getElementById('pdf-canvas')){await closePDF(loaded);return;}
      doc=loaded;await draw();
      try{const found=await inspectPDFForms(file),list=document.getElementById('pdf-form-fields');if(token===generation&&list){formFields=found;list.innerHTML=formRows();}}
      catch(error){const list=document.getElementById('pdf-form-fields');if(token===generation&&list)list.textContent='Could not inspect forms: '+error.message;}
      viewportObserver?.disconnect();viewportObserver=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(doc&&['fit','height'].includes(zoom))void draw();},80);});viewportObserver.observe(document.getElementById('pdf-viewport'));
    }catch(error){
      if(token===generation&&document.getElementById('pdf-status')){
        document.getElementById('pdf-status').textContent='Could not open PDF: '+String(error.message||error).slice(0,160);
        document.getElementById('pdf-viewport').setAttribute('aria-busy','false');
      }
    }
  }
  document.addEventListener('click',async event=>{
    const target=event.target.closest('[data-pdf-action]');if(!target)return;
    const action=target.dataset.pdfAction;
    if(action==='import'){ctx.importPDF();return;}
    if(action==='stamp-close'){document.getElementById('modal-root').innerHTML='';return;}
    // Bookmarks appear before PDF.js has necessarily finished loading the document.
    // Queue a requested page even during mount; mount will draw the selected page.
    if(action==='bookmark-jump'&&currentFile){
      const index=pdfOrder(currentFile).indexOf(Number(target.dataset.sourcePage));
      if(index<0){ctx.toast('Source page omitted from current order.');return;}
      pageNumber=index+1;
      if(doc)void draw();
      return;
    }
    if(!doc||!currentFile)return;
    try{
    if(action==='undo'||action==='redo'){
      if(edits?.[action](currentFile)){ctx.changed(currentFile);searchGeneration++;document.getElementById('pdf-search-results').textContent='';pageNumber=Math.min(pageNumber,pdfOrder(currentFile).length);document.getElementById('pdf-page-order').value=pdfOrder(currentFile).join(',');refreshBookmarks();updateMarks();formFields.forEach(f=>{if(Object.hasOwn(currentFile.pdfFormValues||{},f.name))f.value=currentFile.pdfFormValues[f.name];});const list=document.getElementById('pdf-form-fields');if(list)list.innerHTML=formRows();refreshHistory();void draw();}return;
    }
    if(action==='form-edit'){
      const field=formFields.find(f=>f.name===target.dataset.pdfField);
      if(!field||field.kind==='unsupported')throw Error('Choose a supported field.');
      let value;
      if(field.kind==='text'){value=prompt('Text value for '+field.name+':',String(field.value??''));if(value===null)return;}
      else value=confirm('Check '+field.name+'? Cancel clears the checkbox.');
      setPDFFormValue(currentFile,field.name,value);field.value=value;commitChange();
      const list=document.getElementById('pdf-form-fields');if(list)list.innerHTML=formRows();return;
    }
    if(action==='mark-note'||action==='mark-highlight'){
      markMode=markMode===action.slice(5)?'':action.slice(5);
      document.getElementById('pdf-canvas').style.cursor=markMode?'crosshair':'';
      for(const control of document.querySelectorAll('[data-pdf-action="mark-note"],[data-pdf-action="mark-highlight"]'))control.setAttribute('aria-pressed',String(control.dataset.pdfAction==='mark-'+markMode));
      ctx.toast(markMode==='note'?'Click the page to place a note.':markMode==='highlight'?'Drag over an area to highlight.':'Annotation mode canceled.');return;
    }
    if(action==='mark-jump'){const index=pdfOrder(currentFile).indexOf(Number(target.dataset.sourcePage));if(index<0)throw Error('This source page was omitted.');pageNumber=index+1;void draw();return;}
    if(action==='mark-remove'){if(deleteAnnotation(currentFile,target.dataset.markId)){commitChange();updateMarks();void draw();}return;}
    if(action==='merge'){document.getElementById('pdf-merge-input').click();return;}
    if(action==='size-dialog'){
      document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal workflow-dialog advanced-dialog"><div class="workflow-kicker">MYSOFT / ADVANCED STUDIO</div><h2>Resize PDF pages</h2><p>Export up to 200 standardized sheets, one per output page, fitting vector content inside your chosen paper and margins. Rotations and crop boxes are respected. Interactive annotations and form fields are not copied.</p><div class="cap-form"><label class="cap-field">Paper size<select id="advanced-pdf-paper" aria-label="Resize paper size"><option>A4</option><option>Letter</option></select></label><label class="cap-field">Orientation<select id="advanced-pdf-orientation" aria-label="Resize orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label class="cap-field">Margin (pt)<input id="advanced-pdf-margin" aria-label="Resize margin (pt)" type="number" min="12" max="60" value="24"></label></div><div class="modal-actions"><button class="btn btn-light" data-pdf-action="stamp-close">Cancel</button><button class="btn btn-primary" data-pdf-action="size-export">Export resized PDF</button></div></section></div>';return;
    }
    if(action==='size-export'){
      const token=generation,own=currentFile,options={paper:document.getElementById('advanced-pdf-paper').value,orientation:document.getElementById('advanced-pdf-orientation').value,margin:document.getElementById('advanced-pdf-margin').value};target.disabled=true;try{const bytes=await exportResizedPDF(own,options);if(token!==generation)return;ctx.download(bytes,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-resized.pdf','application/pdf');document.getElementById('modal-root').innerHTML='';ctx.toast('Standardized PDF exported; source retained.');}finally{target.disabled=false;}return;
    }
    if(action==='handout-dialog'){
      document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal workflow-dialog"><div class="workflow-kicker">MYSOFT / PRODUCTION STUDIO</div><h2>PDF handout</h2><p>Place pages from the current output order on fewer sheets. Page rotations and crop boxes are respected. This export includes static page content; interactive annotations and form fields are not copied.</p><div class="cap-form"><label class="cap-field">Pages per sheet<select id="production-per-sheet" aria-label="Pages per sheet"><option value="2">2 · landscape</option><option value="4">4 · portrait</option></select></label><label class="cap-field">Paper size<select id="production-paper" aria-label="Handout paper size"><option>A4</option><option>Letter</option></select></label><label class="cap-field">Outer margin (pt)<input id="production-margin" aria-label="Outer margin (pt)" type="number" min="12" max="60" value="24"></label><label class="cap-field">Page gap (pt)<input id="production-gap" aria-label="Page gap (pt)" type="number" min="0" max="36" value="12"></label></div><div class="modal-actions"><button class="btn btn-light" data-pdf-action="stamp-close">Cancel</button><button class="btn btn-primary" data-pdf-action="handout-export">Export handout</button></div></section></div>';return;
    }
    if(action==='handout-export'){
      const token=generation,own=currentFile,options={perSheet:document.getElementById('production-per-sheet').value,paper:document.getElementById('production-paper').value,margin:document.getElementById('production-margin').value,gap:document.getElementById('production-gap').value};target.disabled=true;
      try{const bytes=await exportPDFHandout(own,options);if(token!==generation)return;ctx.download(bytes,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-handout.pdf','application/pdf');document.getElementById('modal-root').innerHTML='';ctx.toast('PDF handout exported; source retained.');}finally{target.disabled=false;}return;
    }
    if(action==='crop-dialog'){
      document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal workflow-dialog"><div class="workflow-kicker">MYSOFT / PAGE STUDIO</div><h2>Crop PDF pages</h2><p>Trim the visible margins of every page in the current output order. Margins follow the rotated view. Cropping hides content outside the page box; it does not redact or delete it.</p><div class="cap-form">'+['top','right','bottom','left'].map(side=>'<label class="cap-field">'+side.charAt(0).toUpperCase()+side.slice(1)+' margin (%)<input id="workflow-crop-'+side+'" aria-label="'+side+' margin (%)" type="number" min="0" max="40" step="any" value="5"></label>').join('')+'</div><div class="modal-actions"><button class="btn btn-light" data-pdf-action="stamp-close">Cancel</button><button class="btn btn-primary" data-pdf-action="crop-export">Export cropped PDF</button></div></section></div>';return;
    }
    if(action==='crop-export'){
      const token=generation,own=currentFile,crop=Object.fromEntries(['top','right','bottom','left'].map(side=>[side,document.getElementById('workflow-crop-'+side).value]));target.disabled=true;
      try{const bytes=await exportPDF(own,{crop});if(token!==generation)return;ctx.download(bytes,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-cropped.pdf','application/pdf');document.getElementById('modal-root').innerHTML='';ctx.toast('Cropped PDF exported; workspace source retained.');}finally{target.disabled=false;}return;
    }
    if(action==='stamp-dialog'){
      document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><section class="modal cap-modal"><h2>PDF finishing</h2><p>Export a separate copy with a watermark, page numbers, or both. Your workspace PDF remains unchanged.</p><label class="cap-field">Watermark text<input id="pro-pdf-watermark" aria-label="Watermark text" maxlength="80" placeholder="DRAFT"></label><p class="muted">Up to 80 printable English letters, numbers and punctuation.</p><div class="cap-form"><label class="cap-field"><span>Add page numbers</span><input id="pro-pdf-numbers" type="checkbox" checked></label><label class="cap-field">First page number<input id="pro-pdf-start" type="number" min="1" max="99999" value="1"></label></div><div class="modal-actions"><button class="btn btn-light" data-pdf-action="stamp-close">Cancel</button><button class="btn btn-primary" data-pdf-action="stamp-export">Export finished PDF</button></div></section></div>';return;
    }
    if(action==='stamp-export'){
      const token=generation,own=currentFile,options={watermark:document.getElementById('pro-pdf-watermark').value,pageNumbers:document.getElementById('pro-pdf-numbers').checked,startNumber:document.getElementById('pro-pdf-start').value};
      target.disabled=true;try{const bytes=await exportPDF(own,options);if(token!==generation)return;ctx.download(bytes,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-finished.pdf','application/pdf');document.getElementById('modal-root').innerHTML='';ctx.toast('Finished PDF exported.');}finally{target.disabled=false;}return;
    }
    if(action==='export-text'){
      const token=generation,own=currentFile,source=doc;target.disabled=true;
      try{const content=await orderedPDFText(source,[...pdfOrder(own)],{isCanceled:()=>token!==generation});if(token!==generation)return;ctx.download(content,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-text.txt','text/plain;charset=utf-8');ctx.toast('PDF text exported in current page order');}catch(error){if(token!==generation)return;throw error;}finally{if(token===generation)target.disabled=false;}return;
    }
    if(action==='bookmark-add'){
      const sourcePage=pdfOrder(currentFile)[pageNumber-1];
      const label=prompt('Bookmark name for source page '+sourcePage+':','Page '+sourcePage);
      if(label===null)return;
      setPDFBookmark(currentFile,sourcePage,label);commitChange();
      refreshBookmarks();ctx.toast('PDF bookmark saved locally');return;
    }
    if(action==='bookmark-remove'){
      if(removePDFBookmark(currentFile,Number(target.dataset.sourcePage))){
        commitChange();refreshBookmarks();ctx.toast('Bookmark removed');
      }return;
    }
    if(action==='find'){
      const query=document.getElementById('pdf-find').value.trim().toLocaleLowerCase(),results=document.getElementById('pdf-search-results'),token=generation,ownSearch=++searchGeneration,own=doc;
      results.textContent=query?'Searching pages…':'Enter a search term.';if(!query)return;const matches=[],order=pdfOrder(currentFile);
      for(let i=0;i<order.length&&matches.length<50;i++){const page=await own.getPage(order[i]),content=await page.getTextContent();if(token!==generation||ownSearch!==searchGeneration)return;const text=content.items.map(item=>item.str||'').join(' '),at=text.toLocaleLowerCase().indexOf(query);if(at>=0)matches.push({page:i+1,text:text.slice(Math.max(0,at-35),at+95)});}
      if(token!==generation||ownSearch!==searchGeneration)return;results.textContent=matches.length?matches.length+' matching pages (up to 50)':'No matching text. Scanned pages require OCR.';
      for(const match of matches){const button=document.createElement('button');button.type='button';button.className='pdf-match';button.dataset.pdfAction='match';button.dataset.page=match.page;button.textContent='Page '+match.page+' · '+match.text;results.appendChild(button);}return;
    }
    if(action==='match')pageNumber=Math.max(1,Math.min(pdfOrder(currentFile).length,Number(target.dataset.page)||1));
    if(action==='order'||action==='extract'){const pages=parsePDFPages(document.getElementById('pdf-page-order').value,currentFile.pdfPageCount);if(action==='extract'){const bytes=await exportPDF({...currentFile,pdfPageOrder:pages});ctx.download(bytes,currentFile.title.replace(/[^a-z0-9_-]+/gi,'-')+'-pages.pdf','application/pdf');ctx.toast('Selected PDF pages exported');return;}searchGeneration++;currentFile.pdfPageOrder=pages;pageNumber=1;document.getElementById('pdf-search-results').textContent='';commitChange();refreshBookmarks();}
    if(action==='reset-order'){searchGeneration++;document.getElementById('pdf-search-results').textContent='';delete currentFile.pdfPageOrder;pageNumber=1;document.getElementById('pdf-page-order').value=pdfOrder(currentFile).join(',');commitChange();refreshBookmarks();}
    if(['reverse-order','duplicate-page','remove-page'].includes(action)){
      const order=[...pdfOrder(currentFile)];
      if(action==='remove-page'&&order.length===1)throw Error('Keep at least one page in the PDF.');
      if(action==='duplicate-page'&&order.length>=500)throw Error('A PDF workspace supports up to 500 pages.');
      if(action==='reverse-order'){order.reverse();pageNumber=order.length-pageNumber+1;}
      if(action==='duplicate-page'){order.splice(pageNumber,0,order[pageNumber-1]);pageNumber++;}
      if(action==='remove-page'){order.splice(pageNumber-1,1);pageNumber=Math.min(pageNumber,order.length);}
      currentFile.pdfPageOrder=order;searchGeneration++;document.getElementById('pdf-search-results').textContent='';document.getElementById('pdf-page-order').value=order.join(',');commitChange();refreshBookmarks();
    }
    if(action==='first')pageNumber=1;
    if(action==='last')pageNumber=pdfOrder(currentFile).length;
    if(action==='zoom-in'||action==='zoom-out'){const levels=[50,75,100,125,150,200],current=['fit','height'].includes(zoom)?100:Number(zoom);zoom=String(action==='zoom-in'?(levels.find(n=>n>current)||200):([...levels].reverse().find(n=>n<current)||50));document.getElementById('pdf-zoom').value=zoom;}
    if(action==='previous')pageNumber=Math.max(1,pageNumber-1);
    if(action==='next')pageNumber=Math.min(pdfOrder(currentFile).length,pageNumber+1);
    if(action==='rotate-left'||action==='rotate-right'){
      rotatePDFPage(currentFile,pdfOrder(currentFile)[pageNumber-1],action==='rotate-right'?90:-90);
      commitChange();
    }
    if(action==='reset'){currentFile.pdfRotations={};commitChange();}
    void draw();
    }catch(error){ctx.toast(String(error.message||error).slice(0,160));}
  });
  // A simple click places a note. Pointer capture is reserved for dragged
  // highlights, so keyboard/mouse clicks are not accidentally suppressed.
  document.addEventListener('click',event=>{
    if(event.target.id!=='pdf-canvas'||markMode!=='note'||!doc||!currentFile||!markViewport)return;
    const box=event.target.getBoundingClientRect(),vp=markViewport.viewport;
    const x=Math.max(0,Math.min(vp.width,(event.clientX-box.left)*vp.width/box.width));
    const y=Math.max(0,Math.min(vp.height,(event.clientY-box.top)*vp.height/box.height));
    const point=vp.convertToPdfPoint(x,y);
    const text=prompt('Sticky note (up to 1000 characters):','');
    if(text===null)return;
    try{
      addAnnotation(currentFile,{id:crypto.randomUUID(),kind:'note',page:markViewport.sourcePage,
        rect:[point[0],point[1],point[0]+18,point[1]+18],text:text.slice(0,1000)});
      commitChange();updateMarks();markMode='';event.target.style.cursor='';
      document.querySelector('[data-pdf-action="mark-note"]')?.setAttribute('aria-pressed','false');
      void draw();
    }catch(error){ctx.toast(error.message);}
  });
  document.addEventListener('pointerdown',event=>{
    if(markMode!=='highlight'||!doc||!currentFile||event.target.id!=='pdf-canvas'||event.button!==0||!markViewport)return;
    event.preventDefault();
    const rect=event.target.getBoundingClientRect(),{viewport,sourcePage}=markViewport;
    markStart={viewport,sourcePage,token:drawGeneration,
      x:Math.max(0,Math.min(viewport.width,(event.clientX-rect.left)*viewport.width/rect.width)),
      y:Math.max(0,Math.min(viewport.height,(event.clientY-rect.top)*viewport.height/rect.height))};
    event.target.setPointerCapture(event.pointerId);
  });
  document.addEventListener('pointerup',event=>{
    if(!markStart||event.target.id!=='pdf-canvas'||!currentFile)return;
    const start=markStart;markStart=null;
    if(start.token!==drawGeneration||start.sourcePage!==markViewport?.sourcePage)return;
    const box=event.target.getBoundingClientRect(),vp=start.viewport;
    const x=Math.max(0,Math.min(vp.width,(event.clientX-box.left)*vp.width/box.width));
    const y=Math.max(0,Math.min(vp.height,(event.clientY-box.top)*vp.height/box.height));
    const p=vp.convertToPdfPoint(start.x,start.y),q=vp.convertToPdfPoint(x,y);
    const rect=markMode==='note'?[p[0],p[1],p[0]+18,p[1]+18]:
      [Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1])];
    if(markMode==='highlight'&&(Math.abs(x-start.x)<8||Math.abs(y-start.y)<8)){ctx.toast('Drag a larger area to highlight.');return;}
    const comment=prompt(markMode==='note'?'Sticky note (up to 1000 characters):':'Highlight comment (optional):','');
    if(comment===null)return;
    try{
      addAnnotation(currentFile,{id:crypto.randomUUID(),kind:markMode,page:start.sourcePage,rect,text:comment.slice(0,1000)});
      commitChange();updateMarks();markMode='';document.getElementById('pdf-canvas').style.cursor='';
      for(const control of document.querySelectorAll('[data-pdf-action="mark-note"],[data-pdf-action="mark-highlight"]'))control.setAttribute('aria-pressed','false');
      void draw();
    }catch(error){ctx.toast(error.message);}
  });
  let mergeBusy=false;
  document.addEventListener('change',async event=>{
    if(event.target.id!=='pdf-merge-input'||!currentFile||mergeBusy)return;
    const choices=[...event.target.files];event.target.value='';if(!choices.length)return;
    const token=generation,own={...currentFile,pdfPageOrder:[...pdfOrder(currentFile)],pdfRotations:{...currentFile.pdfRotations}},button=document.querySelector('[data-pdf-action="merge"]');
    mergeBusy=true;if(button)button.disabled=true;
    try{
      if(choices.length>10||choices.some(file=>file.size>8*1024*1024)||choices.reduce((sum,file)=>sum+file.size,Math.floor(own.pdfData.length*3/4))>32*1024*1024)throw Error('Choose 1–10 PDFs, up to 8 MB each and 32 MB combined.');
      ctx.toast('Merging PDF pages…');const bytes=await Promise.all(choices.map(async file=>new Uint8Array(await file.arrayBuffer()))),merged=await mergePDF(own,bytes,{isCanceled:()=>generation!==token});if(token!==generation)return;ctx.download(merged,own.title.replace(/[^a-z0-9_-]+/gi,'-')+'-merged.pdf','application/pdf');ctx.toast('Merged PDF exported. Workspace files were kept.');
    }catch(error){if(token===generation)ctx.toast(String(error.message||error).slice(0,180));}finally{mergeBusy=false;if(button?.isConnected)button.disabled=false;}
  });
  document.addEventListener('change',event=>{
    if(!doc)return;
    if(event.target.id==='pdf-page-number'){
      const number=Number(event.target.value);pageNumber=Number.isInteger(number)?Math.max(1,Math.min(pdfOrder(currentFile).length,number)):pageNumber;void draw();
    }
    if(event.target.id==='pdf-zoom'){zoom=event.target.value;void draw();}
  });
  let resizeTimer;
  document.addEventListener('keydown',event=>{
    if(!doc||!currentFile||!event.target.closest('.pdf-layout')||event.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('.modal-backdrop'))return;
    const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&['z','y'].includes(key)){event.preventDefault();event.stopImmediatePropagation();document.querySelector('[data-pdf-action="'+(key==='y'||event.shiftKey?'redo':'undo')+'"]').click();}
  });
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(doc&&['fit','height'].includes(zoom))void draw();},120);});
  return {markup,mount,unmount};
}
