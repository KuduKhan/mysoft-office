import {icon} from './icons.js';
import {loadPDF,closePDF,rotatePDFPage,pdfOrder,parsePDFPages,exportPDF,setPDFBookmark,removePDFBookmark} from './pdf-model.js';

export function createPDFStudio(ctx){
  let doc=null,currentFile=null,generation=0,drawGeneration=0,renderTask=null,pageNumber=1,zoom='fit',searchGeneration=0;

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bookmarkRows=file=>{
    const visible=pdfOrder(file);
    return (file.pdfBookmarks||[]).length
      ?file.pdfBookmarks.map(b=>{const index=visible.indexOf(b.page);return '<div class="pdf-bookmark-row"><button type="button" data-pdf-action="bookmark-jump" data-source-page="'+b.page+'" '+(index<0?'disabled':'')+'>'+esc(b.label)+' · source '+b.page+(index<0?' (omitted)':'')+'</button><button type="button" data-pdf-action="bookmark-remove" data-source-page="'+b.page+'" aria-label="Remove bookmark">×</button></div>';}).join('')
      :'<p>No bookmarks. Save the current source page to return to it later.</p>';
  };
  const bookmarkPanel=file=>'<details class="pdf-bookmarks-panel pdf-organize-style"><summary>MySoft bookmarks</summary><p>Saved in MySoft, not embedded in exported PDFs.</p><button type="button" class="btn btn-light btn-sm" data-pdf-action="bookmark-add">Bookmark current page</button><div id="pdf-bookmarks-list">'+bookmarkRows(file)+'</div></details>';
  const refreshBookmarks=()=>{const node=document.getElementById('pdf-bookmarks-list');if(node&&currentFile)node.innerHTML=bookmarkRows(currentFile);};
  const button=(action,label,ic)=>'<button type="button" class="btn btn-light btn-sm" data-pdf-action="'+action+'" aria-label="'+label+'" title="'+label+'">'+icon(ic,16)+'</button>';
  function markup(file){
    if(!file.pdfData)return '<section class="pdf-empty editor-body"><div class="pdf-empty-icon">'+icon('file-text',38)+'</div><h2>MySoft PDF</h2><p>Read, rotate and export PDFs in your workspace.</p><button class="btn btn-primary" data-pdf-action="import">'+icon('upload',17)+' Open PDF</button><small>Up to 8 MB · 500 pages · Stored on this device</small></section>';
    return '<section class="pdf-layout"><div class="pdf-toolbar" aria-label="PDF tools"><div class="pdf-tool-group">'+button('previous','Previous page','arrow-left')+
      '<label class="pdf-page-label">Page <input id="pdf-page-number" type="number" min="1" max="'+file.pdfPageCount+'" value="1" aria-label="PDF page number"></label><span class="pdf-page-total">of '+file.pdfPageCount+'</span>'+button('next','Next page','arrow-right')+'</div>'+
      '<label class="pdf-zoom-label">Zoom <select id="pdf-zoom" aria-label="PDF zoom"><option value="fit">Fit width</option>'+[50,75,100,125,150,200].map(n=>'<option value="'+n+'">'+n+'%</option>').join('')+'</select></label><div class="pdf-tool-group">'+button('rotate-left','Rotate page left','rotate-ccw')+button('rotate-right','Rotate page right','rotate-cw')+'<button class="btn btn-light btn-sm" data-pdf-action="reset">Reset rotations</button></div><button class="btn btn-light btn-sm" data-pdf-action="import">'+icon('upload',15)+'<span>Open PDF</span></button></div>'+
      '<div class="pdf-extra-tools"><div class="pdf-search-row"><input id="pdf-find" type="search" maxlength="120" aria-label="Find in PDF" placeholder="Find throughout this PDF"><button class="btn btn-light btn-sm" data-pdf-action="find">Search</button></div><div id="pdf-search-results" class="pdf-search-results" role="status"></div><details class="pdf-organize"><summary>Organize &amp; extract pages</summary><p>Use original source page numbers. Repeat pages to duplicate them, omit pages to remove them, or change their order. Original bytes stay intact.</p><label>Source pages<input id="pdf-page-order" aria-label="Source page order" maxlength="3000" value="'+pdfOrder(file).join(',')+'" placeholder="3,1-2"></label><div class="pdf-tool-group"><button class="btn btn-light btn-sm" data-pdf-action="order">Apply page order</button><button class="btn btn-light btn-sm" data-pdf-action="extract">Export these pages</button><button class="btn btn-light btn-sm" data-pdf-action="reset-order">Restore original order</button></div></details>'+bookmarkPanel(file)+'</div><div id="pdf-status" class="pdf-status" role="status">Opening PDF…</div><div id="pdf-viewport" class="pdf-viewport" aria-busy="true"><canvas id="pdf-canvas" role="img" aria-label="PDF page"></canvas></div><details class="pdf-text-panel"><summary>Page text</summary><pre id="pdf-page-text">Loading page text…</pre></details></section>';
  }
  function unmount(){
    generation++;drawGeneration++;searchGeneration++;renderTask?.cancel();renderTask=null;
    const old=doc;doc=null;currentFile=null;
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
      const scale=zoom==='fit'?Math.min(3,Math.max(.05,(viewportNode.clientWidth-32)/base.width)):Number(zoom)/100;
      const viewport=page.getViewport({scale,rotation});
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
    currentFile=file;pageNumber=1;zoom='fit';
    try{
      const loaded=await loadPDF(file.pdfData);
      if(token!==generation||!document.getElementById('pdf-canvas')){await closePDF(loaded);return;}
      doc=loaded;await draw();
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
    if(!doc||!currentFile)return;
    try{
    if(action==='bookmark-add'){
      const sourcePage=pdfOrder(currentFile)[pageNumber-1];
      const label=prompt('Bookmark name for source page '+sourcePage+':','Page '+sourcePage);
      if(label===null)return;
      setPDFBookmark(currentFile,sourcePage,label);ctx.changed(currentFile);
      refreshBookmarks();ctx.toast('PDF bookmark saved locally');return;
    }
    if(action==='bookmark-remove'){
      if(removePDFBookmark(currentFile,Number(target.dataset.sourcePage))){
        ctx.changed(currentFile);refreshBookmarks();ctx.toast('Bookmark removed');
      }return;
    }
    if(action==='bookmark-jump'){
      const index=pdfOrder(currentFile).indexOf(Number(target.dataset.sourcePage));
      if(index<0){ctx.toast('Source page omitted from current order.');return;}
      pageNumber=index+1;void draw();return;
    }
    if(action==='find'){
      const query=document.getElementById('pdf-find').value.trim().toLocaleLowerCase(),results=document.getElementById('pdf-search-results'),token=generation,ownSearch=++searchGeneration,own=doc;
      results.textContent=query?'Searching pages…':'Enter a search term.';if(!query)return;const matches=[],order=pdfOrder(currentFile);
      for(let i=0;i<order.length&&matches.length<50;i++){const page=await own.getPage(order[i]),content=await page.getTextContent();if(token!==generation||ownSearch!==searchGeneration)return;const text=content.items.map(item=>item.str||'').join(' '),at=text.toLocaleLowerCase().indexOf(query);if(at>=0)matches.push({page:i+1,text:text.slice(Math.max(0,at-35),at+95)});}
      if(token!==generation||ownSearch!==searchGeneration)return;results.textContent=matches.length?matches.length+' matching pages (up to 50)':'No matching text. Scanned pages require OCR.';
      for(const match of matches){const button=document.createElement('button');button.type='button';button.className='pdf-match';button.dataset.pdfAction='match';button.dataset.page=match.page;button.textContent='Page '+match.page+' · '+match.text;results.appendChild(button);}return;
    }
    if(action==='match')pageNumber=Math.max(1,Math.min(pdfOrder(currentFile).length,Number(target.dataset.page)||1));
    if(action==='order'||action==='extract'){const pages=parsePDFPages(document.getElementById('pdf-page-order').value,currentFile.pdfPageCount);if(action==='extract'){const bytes=await exportPDF({...currentFile,pdfPageOrder:pages});ctx.download(bytes,currentFile.title.replace(/[^a-z0-9_-]+/gi,'-')+'-pages.pdf','application/pdf');ctx.toast('Selected PDF pages exported');return;}searchGeneration++;currentFile.pdfPageOrder=pages;pageNumber=1;document.getElementById('pdf-search-results').textContent='';ctx.changed(currentFile);refreshBookmarks();}
    if(action==='reset-order'){searchGeneration++;document.getElementById('pdf-search-results').textContent='';delete currentFile.pdfPageOrder;pageNumber=1;document.getElementById('pdf-page-order').value=pdfOrder(currentFile).join(',');ctx.changed(currentFile);refreshBookmarks();}
    if(action==='previous')pageNumber=Math.max(1,pageNumber-1);
    if(action==='next')pageNumber=Math.min(pdfOrder(currentFile).length,pageNumber+1);
    if(action==='rotate-left'||action==='rotate-right'){
      rotatePDFPage(currentFile,pdfOrder(currentFile)[pageNumber-1],action==='rotate-right'?90:-90);
      ctx.changed(currentFile);
    }
    if(action==='reset'){currentFile.pdfRotations={};ctx.changed(currentFile);}
    void draw();
    }catch(error){ctx.toast(String(error.message||error).slice(0,160));}
  });
  document.addEventListener('change',event=>{
    if(!doc)return;
    if(event.target.id==='pdf-page-number'){
      const number=Number(event.target.value);pageNumber=Number.isInteger(number)?Math.max(1,Math.min(pdfOrder(currentFile).length,number)):pageNumber;void draw();
    }
    if(event.target.id==='pdf-zoom'){zoom=event.target.value;void draw();}
  });
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(doc&&zoom==='fit')void draw();},120);});
  return {markup,mount,unmount};
}
