import {
  ensureWorkbook,addSheet,switchSheet,renameSheet,duplicateSheet,deleteSheet,
  setCellStyle,sheetChartData,sortSheet,wordStatistics,
  PAGE_SIZES,FONT_FAMILIES,ACCENT_COLORS
} from './office-model.js';
import {STUDIO_ACCENTS,SLIDE_PRESETS,setSlidePreset,replaceSheetValues,fillDown,clearCell} from './studio-tools.js';
import {formatRange,clearRange,copyRangeTSV,seriesFill,rangeSummary,parseRange} from './sheet-range.js';

const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLORS=['#212d48','#6555e8','#176db3','#b04472','#e05d4a','#16957d'];
const VALID_COLORS=new Set([...COLORS,...ACCENT_COLORS,'#ffffff','#f8f2ad','#eef0f5','#ffe4e6','#e0f2fe','#dcfce7']);
const PREFS_KEY='mysoft-office-preferences-v3';
const defaultPrefs={mode:'light',accent:'#ea4c24',density:'comfortable',fontScale:100,zoom:100};
let prefs=defaultPrefs;
try{prefs={...defaultPrefs,...JSON.parse(localStorage.getItem(PREFS_KEY)||'{}')};}catch{}
let selectedTab={docs:'Home',sheets:'Home',slides:'Design',notes:'Write'};
let savedRange=null;
let lastTableLocation=null;
let slideshowIndex=0;
let ribbonCollapsed=localStorage.getItem('mysoft-office-ribbon-collapsed')==='yes';
const STUDIO_ACTIONS={
  docs:['Home','Insert','Table','Layout','Review'],
  notes:['Write','Organize'],
  sheets:['Home','Format','Range','Data','Insert'],
  slides:['Design','Arrange','Present']
};

export function applyPreferences(){
  const root=document.documentElement;
  root.dataset.mode=prefs.mode==='dark'?'dark':'light';
  root.dataset.density=prefs.density==='compact'?'compact':'comfortable';
  const shade=STUDIO_ACCENTS.find(c=>c.value===prefs.accent)||STUDIO_ACCENTS[0];
  root.style.setProperty('--ot-accent',ACCENT_COLORS.includes(prefs.accent)?prefs.accent:defaultPrefs.accent);
  root.style.setProperty('--studio-accent-soft',shade.soft);
  root.style.setProperty('--studio-accent',shade.value);
  root.style.setProperty('--studio-zoom',String(Math.max(75,Math.min(150,Number(prefs.zoom)||100)))+'%');
  root.style.setProperty('--ot-font-scale',String(Math.max(85,Math.min(120,Number(prefs.fontScale)||100))/100));
}
const button=(label,action,title='')=>'<button type="button" class="ot-btn" data-ot-action="'+action+'" title="'+escapeHTML(title||label)+'">'+label+'</button>';
const choice=(name,options,current)=>'<label class="ot-select-label">'+escapeHTML(name)+' <select data-ot-input="'+name.toLowerCase().replace(/\s+/g,'-')+'">'+options.map(([value,text])=>'<option value="'+escapeHTML(value)+'"'+(value===current?' selected':'')+'>'+escapeHTML(text)+'</option>').join('')+'</select></label>';
const color=(label,name,value)=>'<label class="ot-select-label">'+escapeHTML(label)+' <input type="color" data-ot-input="'+name+'" value="'+(/^#[0-9a-fA-F]{6}$/.test(value)?value:'#6555e8')+'"></label>';
function tabsFor(type){
  return STUDIO_ACTIONS[type]||[];
}
export function powerRibbon(file,selectedCell='A1',slideIndex=0){
  if(!file)return '';
  const active=selectedTab[file.type]||tabsFor(file.type)[0];
  const tabs=tabsFor(file.type).map(tab=>'<button class="ot-tab '+(tab===active?'active':'')+'" data-ot-tab="'+tab+'">'+tab+'</button>').join('');
  let body='';
  if(file.type==='docs'||file.type==='notes'){
    if(active==='Home'||active==='Write'){
      body=choice('Font',FONT_FAMILIES.map(x=>[x,x]),'Arial')+
        choice('Font size',[['2','Small'],['3','Normal'],['4','Large'],['5','Heading'],['6','Display']], '3')+
        color('Text','text-color','#212d48')+color('Highlight','highlight','#f8f2ad')+
        button('<b>B</b>','text-bold','Bold selection')+button('<i>I</i>','text-italic','Italic selection')+button('<u>U</u>','text-underline','Underline selection')+
        button('≡','align-left','Align left')+button('☰','align-center','Align center')+button('≡›','align-right','Align right')+
        button('• List','bullet-list')+button('1. List','numbered-list')+
        button('<b>S</b>','strike','Strikethrough')+button('x²','superscript')+button('x₂','subscript')+
        button('Clear','clear-format','Remove text formatting');
    } else if(active==='Insert'){
      body=button('⊞ Table 3×3','insert-table')+button('Table size…','custom-table')+button('Picture','insert-picture')+button('— Divider','insert-hr')+
        button('🔗 Link','insert-link')+button('☐ Checklist','insert-checklist')+button('📅 Date','insert-date')+
        button('❝ Quote','insert-quote')+button('¶ Page break','insert-page-break');
    } else if(active==='Table'){
      body=button('＋ Row below','table-add-row')+button('＋ Column right','table-add-column')+
        button('− Delete row','table-remove-row')+button('− Delete column','table-remove-column')+
        '<span class="ot-metric">Place your cursor inside an existing table cell first.</span>';
    } else if(active==='Layout'){
      const p=file.pageSettings||{};
      body=choice('Paper',Object.keys(PAGE_SIZES).map(v=>[v,v]),p.paper||'A4')+
        choice('Orientation',[['portrait','Portrait'],['landscape','Landscape']],p.orientation||'portrait')+
        choice('Margins',[['narrow','Narrow'],['normal','Normal'],['wide','Wide']],p.margins||'normal')+
        choice('Line spacing',[['1.2','Compact'],['1.6','Normal'],['2','Double']],String(p.lineHeight||'1.6'))+
        color('Page color','page-color',p.background||'#ffffff')+button('Print / PDF','print');
    } else if(active==='Review'){
      const stats=wordStatistics(file.body||'');
      body='<span class="ot-metric">'+stats.words+' words · '+stats.characters+' chars · ~'+stats.readMinutes+' min read</span>'+
        '<label class="ot-select-label">Find <input class="ot-text" data-ot-input="find-text" id="ot-find" placeholder="Find text"></label>'+
        '<label class="ot-select-label">Replace <input class="ot-text" data-ot-input="replace-text" id="ot-replace" placeholder="New text"></label>'+
        button('Replace all','replace-all')+button('Print / PDF','print');
    } else if(active==='Organize'){
      body='<label class="ot-select-label">Tags <input class="ot-text" data-ot-input="tags" maxlength="180" value="'+escapeHTML((file.tags||[]).join(', '))+'" placeholder="ideas, meetings, work"></label>'+
        button('☐ Checklist','insert-checklist')+button('Print / PDF','print')+
        '<span class="ot-metric">'+wordStatistics(file.body||'').words+' words</span>';
    }
  } else if(file.type==='sheets'){
    if(active==='Home'){
      body=button('＋ Worksheet','sheet-add')+button('Rename','sheet-rename')+button('Duplicate','sheet-duplicate')+button('Delete','sheet-delete')+
        button('<b>B</b>','cell-bold')+button('<i>I</i>','cell-italic')+
        color('Font','cell-color','#212d48')+color('Fill','cell-background','#ffffff')+
        button('KES','cell-currency','Kenyan shilling')+button('%','cell-percent')+
        button('Reset style','cell-reset');
    } else if(active==='Format'){
      body=button('⇤ Align left','cell-align-left')+button('↔ Center','cell-align-center')+
        button('⇥ Align right','cell-align-right')+
        color('Text','cell-color','#212d48')+color('Fill','cell-background','#ffffff')+
        button('KES','cell-currency')+button('%','cell-percent')+
        button('Reset style','cell-reset');
    } else if(active==='Range'){
      body=button('Bold range','range-bold')+button('Highlight range','range-highlight')+
        button('Clear range','range-clear')+button('Copy range','range-copy')+
        button('Fill number series','range-series')+button('Range statistics','range-summary')+
        '<span class="ot-metric">Choose a range such as A1:C10 (up to 2,600 cells).</span>';
    } else if(active==='Data'){
      body=button('Find / Replace','sheet-find-replace')+
        button('Fill down 5','sheet-fill-down')+button('Clear cell','sheet-clear-cell')+
        button('Sort A → Z','sort-asc')+button('Sort Z → A','sort-desc')+
        button('Auto SUM','insert-sum')+button('Auto AVERAGE','insert-avg')+
        '<span class="ot-metric">Sorting applies to column A and keeps row 1 as header. Formula sheets are protected.</span>';
    } else {
      body=button('▥ Bar chart','chart-bar')+button('◷ Line chart','chart-line')+
        '<span class="ot-metric">Chart preview uses labels in column A and numbers in column B, rows 2–1000.</span>';
    }
  } else if(file.type==='slides'){
    const slide=file.slides[slideIndex]||file.slides[0];
    if(active==='Design'){
      body=choice('Backdrop',Object.keys(SLIDE_PRESETS).map(k=>[k,k.charAt(0).toUpperCase()+k.slice(1)]),slide.studioPreset||'ivory')+
        choice('Layout',[['title','Title & content'],['section','Section heading'],['minimal','Minimal']],slide.layout||'title')+
        choice('Transition',[['none','None'],['fade','Fade'],['slide','Slide']],slide.transition||'none')+
        choice('Text size',[['normal','Normal'],['large','Large'],['compact','Compact']],slide.textScale||'normal')+
        button('Apply theme to all','theme-all');
    } else if(active==='Arrange'){
      body=button('↑ Move up','slide-up')+button('↓ Move down','slide-down')+
        button('＋ New slide','slide-new')+button('Clone slide','slide-copy')+
        button('Delete slide','slide-remove');
    } else {
      body=button('▶ Start presentation','present')+
        '<label class="ot-select-label">Speaker notes <textarea class="ot-notes" data-ot-input="speaker-notes" placeholder="Presenter-only notes">'+escapeHTML(slide.notes||'')+'</textarea></label>';
    }
  }
  const sheetTabs=file.type==='sheets'?'<div class="ot-sheet-tabs">'+(file.worksheets||[{name:'Sheet 1'}]).map((sh,i)=>'<button class="ot-sheet-tab '+((file.activeSheetIndex||0)===i?'active':'')+'" data-ot-sheet="'+i+'">'+escapeHTML(sh.name)+'</button>').join('')+'<button class="ot-sheet-tab" data-ot-action="sheet-add">＋</button></div>':'';
  return '<section class="ot-ribbon'+(ribbonCollapsed?' collapsed':'')+'" aria-label="Editing tools"><div class="ot-ribbon-top"><div class="ot-ribbon-tabs" role="tablist" aria-label="Editor tool categories">'+tabs+'</div>'+
    '<div class="ot-ribbon-meta"><span class="ot-ribbon-version">MYSoft Studio · 0.5.1</span>'+
    button(ribbonCollapsed?'Show tools ▾':'Hide tools ▴','ribbon-toggle')+'</div></div>'+
    '<div class="ot-ribbon-tools">'+body+'</div>'+sheetTabs+'</section>';
}
export function sheetCellAppearance(file,ref,value){
  const st=(file.cellStyles||{})[ref]||{};
  const rules=[];
  if(st.bold)rules.push('font-weight:750');
  if(st.italic)rules.push('font-style:italic');
  if(['left','center','right'].includes(st.align))rules.push('text-align:'+st.align);
  if(/^#[0-9a-fA-F]{6}$/.test(st.color||''))rules.push('color:'+st.color);
  if(/^#[0-9a-fA-F]{6}$/.test(st.background||''))rules.push('background-color:'+st.background);
  let formatted=String(value);
  const num=Number(formatted);
  if(formatted.trim()!=='' && Number.isFinite(num) && !String(value).startsWith('#')){
    if(st.format==='currency') formatted='KES '+num.toLocaleString('en-KE',{minimumFractionDigits:2,maximumFractionDigits:2});
    else if(st.format==='percent')formatted=(num*100).toLocaleString('en-KE',{maximumFractionDigits:2})+'%';
  }
  return {style:rules.join(';'),value:formatted};
}
function printDoc(file){
  if(file.type==='notes')window.print();
  else window.print();
}
function svgChart(data,mode){
  const max=Math.max(1,...data.map(d=>Math.abs(d.value)));
  const scale=440/max;
  if(mode==='line'){
    const values=data.map((d,i)=>({x:80+i*(470/Math.max(1,data.length-1)),y:245-(d.value/max)*175}));
    return '<svg role="img" aria-label="Line chart preview" viewBox="0 0 630 310" width="100%" style="max-height:350px"><line x1="70" y1="245" x2="570" y2="245" stroke="#b6bbcc" />'+
      '<polyline fill="none" stroke="#6555e8" stroke-width="4" points="'+values.map(p=>p.x+','+p.y).join(' ')+'"/>'+
      values.map((p,i)=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#6555e8"/><text x="'+p.x+'" y="268" text-anchor="middle" font-size="10" fill="#6a748e">'+escapeHTML(data[i].label.slice(0,10))+'</text><text x="'+p.x+'" y="'+(p.y-12)+'" text-anchor="middle" font-size="10" fill="#4f5a78">'+data[i].value+'</text>').join('')+'</svg>';
  }
  return '<div class="ot-chart-bars">'+data.map(d=>'<div class="ot-chart-row"><span>'+escapeHTML(d.label)+'</span><div class="ot-chart-track"><div style="width:'+Math.round(Math.abs(d.value)*100/max)+'%;background:'+(d.value<0?'#df847b':'#6555e8')+'"></div></div><strong>'+d.value+'</strong></div>').join('')+'</div>';
}
function editorSelection(){
  const rich=document.getElementById('rich-content');
  const selection=window.getSelection();
  if(!rich||!selection?.rangeCount)return;
  const range=selection.getRangeAt(0);
  if(rich.contains(range.commonAncestorContainer)) savedRange=range.cloneRange();
}
function selectedTableCell(ctx){
  const editable=document.getElementById('rich-content');
  const selection=window.getSelection();
  const anchor=selection?.anchorNode;
  const node=anchor?.nodeType===Node.ELEMENT_NODE?anchor:anchor?.parentElement;
  const live=node?.closest?.('td,th');
  if(live&&editable?.contains(live))return live;
  if(lastTableLocation?.fileId!==ctx.getFile()?.id)return null;
  const table=editable?.querySelectorAll('table')[lastTableLocation.table];
  const row=table?.rows[lastTableLocation.row];
  return row?.cells[lastTableLocation.col]||null;
}
function recordTableLocation(ctx,target){
  const cell=target?.closest?.('#rich-content td,#rich-content th');
  if(!cell)return;
  const table=cell.closest('table'),row=cell.closest('tr');
  if(!table||!row)return;
  const editor=document.getElementById('rich-content');
  lastTableLocation={
    fileId:ctx.getFile()?.id,
    table:[...editor.querySelectorAll('table')].indexOf(table),
    row:[...table.rows].indexOf(row),
    col:[...row.cells].indexOf(cell)
  };
}
function tableEdit(ctx,action){
  const cell=selectedTableCell(ctx);
  if(!cell)throw Error('Click inside a table cell first.');
  const row=cell.closest('tr'),table=cell.closest('table');
  if(!row||!table)throw Error('Select a valid table.');
  const rows=[...table.rows],index=rows.indexOf(row),col=[...row.cells].indexOf(cell);
  if(action==='table-add-row'){
    if(rows.length>=40)throw Error('Maximum 40 table rows.');
    const next=table.insertRow(index+1);
    for(let i=0;i<row.cells.length;i++)next.insertCell(i).textContent='Cell';
  }else if(action==='table-add-column'){
    if(row.cells.length>=15)throw Error('Maximum 15 table columns.');
    if(rows.some(r=>r.cells.length!==row.cells.length))throw Error('This table has irregular rows. Edit it manually.');
    for(const r of rows)r.insertCell(col+1).textContent='Cell';
  }else if(action==='table-remove-row'){
    if(rows.length<2)throw Error('Keep at least one row.');
    row.remove();
  }else if(action==='table-remove-column'){
    if(row.cells.length<2)throw Error('Keep at least one column.');
    if(rows.some(r=>r.cells.length!==row.cells.length))throw Error('This table has irregular rows. Edit it manually.');
    for(const r of rows)r.cells[col].remove();
  }
  const file=ctx.getFile(),editable=document.getElementById('rich-content');
  if(file&&editable){file.body=ctx.sanitize(editable.innerHTML);ctx.touch(file);ctx.persist();}
}
function richCommand(ctx,command,value=null){
  const el=document.getElementById('rich-content');
  if(!el)return;
  el.focus();
  if(savedRange && el.contains(savedRange.commonAncestorContainer)){
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(savedRange);
  }
  document.execCommand(command,false,value);
  editorSelection();
  const f=ctx.getFile();
  if(f){f.body=ctx.sanitize(el.innerHTML);ctx.touch(f);}
}
function replaceAllText(ctx,needle,replacement){
  const el=document.getElementById('rich-content');
  if(!el||!needle)return 0;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  let count=0;
  for(const node of nodes){
    const text=node.textContent||'';
    if(!text.includes(needle))continue;
    const occurrences=text.split(needle).length-1;
    node.textContent=text.split(needle).join(replacement);
    count+=occurrences;
  }
  if(count){const f=ctx.getFile();f.body=ctx.sanitize(el.innerHTML);ctx.touch(f);}
  return count;
}
function presentationHTML(slide){
  const scheme=SLIDE_PRESETS[slide.studioPreset]||SLIDE_PRESETS.ivory;
  return '<div class="ot-present-page ot-present-'+(slide.layout||'title')+' ot-effect-'+(['fade','slide'].includes(slide.transition)?slide.transition:'none')+'" style="--present-color:'+scheme.accent+';--studio-slide-bg:'+scheme.background+';--studio-slide-text:'+scheme.foreground+'"><h1>'+escapeHTML(slide.title)+'</h1><p>'+escapeHTML(slide.body)+'</p></div>';
}
function showPresentation(ctx,index=0){
  const file=ctx.getFile();if(!file?.slides)return;
  slideshowIndex=Math.max(0,Math.min(file.slides.length-1,index));
  let overlay=document.getElementById('ot-presentation');
  if(!overlay){overlay=document.createElement('section');overlay.id='ot-presentation';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Slide show');document.body.appendChild(overlay);}
  const slide=file.slides[slideshowIndex];
  overlay.innerHTML=presentationHTML(slide)+'<div class="ot-present-controls"><button data-ot-action="present-back">← Previous</button><span>'+(slideshowIndex+1)+' / '+file.slides.length+'</span><button data-ot-action="present-next">Next →</button><button data-ot-action="present-close">Close ✕</button></div>';
  overlay.focus();
}
function modal(content){
  document.getElementById('modal-root').innerHTML='<div class="modal-backdrop"><div class="modal ot-settings-modal">'+content+'</div></div>';
}
function preferencesModal(){
  modal('<h2>Workspace appearance</h2><p>Customize your MySoft Office experience. Preferences are saved in this browser.</p>'+
    '<label for="ot-mode">Appearance</label><select id="ot-mode" data-ot-pref="mode"><option value="light" '+(prefs.mode==='light'?'selected':'')+'>Light</option><option value="dark" '+(prefs.mode==='dark'?'selected':'')+'>Dark</option></select>'+
    '<label for="ot-accent">Accent color</label><select id="ot-accent" data-ot-pref="accent">'+STUDIO_ACCENTS.map(x=>'<option value="'+x.value+'" '+(prefs.accent===x.value?'selected':'')+'>'+x.name+'</option>').join('')+'</select>'+
    '<div class="studio-swatches" role="group" aria-label="Color accents">'+STUDIO_ACCENTS.map(x=>
      '<button class="studio-swatch '+(prefs.accent===x.value?'active':'')+'" type="button" data-ot-palette="'+x.value+'" style="--swatch:'+x.value+'" title="'+x.name+'" aria-label="'+x.name+'" aria-pressed="'+(prefs.accent===x.value)+'"><span></span><small>'+x.name+'</small></button>'
    ).join('')+'</div>'+
    '<label for="ot-density">Density</label><select id="ot-density" data-ot-pref="density"><option value="comfortable" '+(prefs.density==='comfortable'?'selected':'')+'>Comfortable</option><option value="compact" '+(prefs.density==='compact'?'selected':'')+'>Compact</option></select>'+
    '<label for="ot-font-scale">UI scale</label><select id="ot-font-scale" data-ot-pref="fontScale">'+[85,100,110,120].map(n=>'<option value="'+n+'" '+(Number(prefs.fontScale)===n?'selected':'')+'>'+n+'%</option>').join('')+'</select>'+
    '<label for="ot-zoom">Editor zoom</label><select id="ot-zoom" data-ot-pref="zoom">'+[75,90,100,110,125,150].map(n=>'<option value="'+n+'" '+(Number(prefs.zoom)===n?'selected':'')+'>'+n+'%</option>').join('')+'</select>'+
    '<div class="modal-actions"><button class="btn btn-light" data-ot-action="settings-close">Done</button></div>');
}
function syncSheet(ctx,f){
  if(f.type==='sheets')ensureWorkbook(f);
  ctx.touch(f);ctx.persist();ctx.render();
}
export function initializeOfficeTools(ctx){
  applyPreferences();
  document.addEventListener('selectionchange',editorSelection);
  document.addEventListener('pointerdown',event=>recordTableLocation(ctx,event.target));
  document.addEventListener('focusin',event=>recordTableLocation(ctx,event.target));
  document.addEventListener('mousedown',e=>{
    if(e.target.closest('button[data-ot-action]')?.dataset.otAction && ['strike','superscript','subscript','clear-format','insert-table','insert-hr','insert-checklist','insert-date','insert-quote','insert-page-break','text-bold','text-italic','text-underline','align-left','align-center','align-right','bullet-list','numbered-list','table-add-row','table-add-column','table-remove-row','table-remove-column'].includes(e.target.closest('button').dataset.otAction))e.preventDefault();
  });
  document.addEventListener('click',event=>{
    const palette=event.target.closest('[data-ot-palette]');
    if(palette){
      prefs.accent=palette.dataset.otPalette;
      localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));
      applyPreferences();preferencesModal();return;
    }
    const tab=event.target.closest('[data-ot-tab]');
    if(tab){const f=ctx.getFile();if(f){selectedTab[f.type]=tab.dataset.otTab;ctx.render();}return;}
    const switcher=event.target.closest('[data-ot-sheet]');
    if(switcher){const f=ctx.getFile();if(f){switchSheet(f,Number(switcher.dataset.otSheet));ctx.touch(f);ctx.render();}return;}
    const target=event.target.closest('[data-ot-action]');
    if(!target)return;
    const action=target.dataset.otAction;
    const f=ctx.getFile();
    if(action==='preferences'){preferencesModal();return;}
    if(action==='zoom-in'||action==='zoom-out'){
      prefs.zoom=Math.max(75,Math.min(150,(Number(prefs.zoom)||100)+(action==='zoom-in'?10:-10)));
      localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));applyPreferences();
      const label=document.getElementById('studio-zoom-value');if(label)label.textContent=prefs.zoom+'%';
      return;
    }
    if(action==='ribbon-toggle'){
      ribbonCollapsed=!ribbonCollapsed;
      localStorage.setItem('mysoft-office-ribbon-collapsed',ribbonCollapsed?'yes':'no');
      ctx.render();return;
    }
    if(action==='settings-close'){document.getElementById('modal-root').innerHTML='';return;}
    if(action==='present-close'){document.getElementById('ot-presentation')?.remove();return;}
    if(action==='present-next'||action==='present-back'){showPresentation(ctx,slideshowIndex+(action==='present-next'?1:-1));return;}
    if(!f)return;
    try{
      const textActions={
        'text-bold':'bold','text-italic':'italic','text-underline':'underline',
        'align-left':'justifyLeft','align-center':'justifyCenter','align-right':'justifyRight',
        'bullet-list':'insertUnorderedList','numbered-list':'insertOrderedList',
        strike:'strikeThrough','clear-format':'removeFormat',superscript:'superscript',subscript:'subscript'
      };
      if(Object.hasOwn(textActions,action)){richCommand(ctx,textActions[action]);return;}
      if(['table-add-row','table-add-column','table-remove-row','table-remove-column'].includes(action)){
        tableEdit(ctx,action);return;
      }
      if(action==='insert-table'){richCommand(ctx,'insertHTML','<table><tbody>'+Array.from({length:3},()=>'<tr><td>Cell</td><td>Cell</td><td>Cell</td></tr>').join('')+'</tbody></table><p></p>');return;}
      if(action==='custom-table'){
        const rows=Number(prompt('How many rows? (1–10)','4'));
        if(!Number.isInteger(rows)||rows<1||rows>10)return ctx.toast('Rows must be between 1 and 10');
        const cols=Number(prompt('How many columns? (1–10)','3'));
        if(!Number.isInteger(cols)||cols<1||cols>10)return ctx.toast('Columns must be between 1 and 10');
        richCommand(ctx,'insertHTML','<table><tbody>'+Array.from({length:rows},()=>'<tr>'+Array.from({length:cols},()=>'<td>Cell</td>').join('')+'</tr>').join('')+'</tbody></table><p></p>');
        return;
      }
      if(action==='insert-picture'){
        let input=document.getElementById('ot-picture-upload');
        if(!input){
          input=document.createElement('input');
          input.type='file';input.accept='image/png,image/jpeg,image/webp';input.hidden=true;input.id='ot-picture-upload';
          document.body.appendChild(input);
          input.addEventListener('change',async()=>{
            const file=input.files?.[0];if(!file)return;
            try{
              if(file.size>150000)throw Error('Picture must be smaller than 150 KB for local storage.');
              if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use PNG, JPEG or WebP.');
              const data=await new Promise((resolve,reject)=>{
                const reader=new FileReader();
                reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Cannot read picture'));
                reader.readAsDataURL(file);
              });
              if(!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(data))throw Error('Invalid image format');
              richCommand(ctx,'insertHTML','<img src="'+data+'" alt="'+escapeHTML(file.name.slice(0,80))+'">');
              ctx.toast('Picture inserted locally');
            }catch(error){ctx.toast(error.message||'Picture could not be inserted');}
            finally{input.value='';}
          });
        }
        input.click();return;
      }
      if(action==='insert-hr'){richCommand(ctx,'insertHTML','<hr><p></p>');return;}
      if(action==='insert-quote'){richCommand(ctx,'insertHTML','<blockquote><p>Quote or important information</p></blockquote><p></p>');return;}
      if(action==='insert-page-break'){richCommand(ctx,'insertHTML','<hr><p></p>');ctx.toast('Page separator inserted (print pagination is browser-controlled).');return;}
      if(action==='insert-checklist'){richCommand(ctx,'insertHTML','<ul><li>☐ Task</li></ul>');return;}
      if(action==='insert-date'){richCommand(ctx,'insertText',new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date()));return;}
      if(action==='insert-link'){
        const url=prompt('Enter an HTTPS link:','https://');
        if(!url)return;
        try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))throw Error();richCommand(ctx,'createLink',url);}
        catch{ctx.toast('Only HTTP/HTTPS links are supported.');}return;
      }
      if(action==='print'){printDoc(f);return;}
      if(action==='replace-all'){
        const find=document.getElementById('ot-find')?.value||'';
        const replacement=document.getElementById('ot-replace')?.value||'';
        const count=replaceAllText(ctx,find,replacement);
        ctx.toast(count?count+' occurrences replaced':'No matches');return;
      }
      if(['range-bold','range-highlight','range-clear','range-copy','range-series','range-summary'].includes(action)){
        const range=prompt('Cell range (e.g. A1:C10):',ctx.getSelectedCell());
        if(range===null)return;
        parseRange(range);
        if(action==='range-bold')formatRange(f,range,'bold',true);
        if(action==='range-highlight')formatRange(f,range,'background','#ffe8bd');
        if(action==='range-clear'){
          if(!confirm('Clear all values in '+range+'?'))return;
          clearRange(f,range,false);
        }
        if(action==='range-series')seriesFill(f,range);
        if(action==='range-copy'){
          const contents=copyRangeTSV(f,range);
          if(navigator.clipboard?.writeText){
            navigator.clipboard.writeText(contents).then(()=>ctx.toast('Range copied as tabular text')).catch(()=>ctx.toast('Clipboard permission denied'));
          }else{
            modal('<h2>Copy range '+escapeHTML(range)+'</h2><p>Copy the values below:</p><textarea readonly class="ot-copy-values">'+escapeHTML(contents)+'</textarea>'+
              '<div class="modal-actions"><button class="btn btn-light" data-ot-action="settings-close">Done</button></div>');
          }
          return;
        }
        if(action==='range-summary'){
          const result=rangeSummary(f,range);
          modal('<h2>Range statistics · '+escapeHTML(range)+'</h2><p>Cells: '+result.cells+' · Nonempty: '+result.nonempty+' · Numeric: '+result.numeric+
            '</p><p>Sum: '+result.sum+' · Mean: '+result.average+' · Min: '+(result.min??'—')+' · Max: '+(result.max??'—')+'</p>'+
            '<div class="modal-actions"><button class="btn btn-light" data-ot-action="settings-close">Close</button></div>');
          return;
        }
        ctx.toast('Range '+range+' updated');syncSheet(ctx,f);return;
      }
      if(action==='sheet-find-replace'){
        const needle=prompt('Find in current worksheet (text only):','');
        if(needle===null)return;
        const replacement=prompt('Replace matching text with:','');
        if(replacement===null)return;
        const count=replaceSheetValues(f.cells,needle,replacement);
        if(count){ctx.toast(count+' cells updated');syncSheet(ctx,f);}else ctx.toast('No matches');
        return;
      }
      if(action==='sheet-fill-down'){
        const amount=Number(prompt('Fill the selected value downward across how many rows? (1–50)','5'));
        if(!Number.isInteger(amount)||amount<1||amount>50)throw Error('Enter a number from 1 to 50');
        const count=fillDown(f.cells,ctx.getSelectedCell(),amount);
        ctx.toast(count+' cells filled');syncSheet(ctx,f);return;
      }
      if(action==='sheet-clear-cell'){
        if(!confirm('Clear selected cell and formatting?'))return;
        clearCell(f.cells,f.cellStyles,ctx.getSelectedCell());
        syncSheet(ctx,f);return;
      }
      if(['cell-align-left','cell-align-center','cell-align-right'].includes(action)){
        setCellStyle(f,ctx.getSelectedCell(),'align',action.split('-').at(-1));
        syncSheet(ctx,f);return;
      }
      if(action==='sheet-add')addSheet(f);
      else if(action==='sheet-rename'){const name=prompt('New worksheet name:',f.worksheets[f.activeSheetIndex].name);if(name===null)return;renameSheet(f,name);}
      else if(action==='sheet-duplicate')duplicateSheet(f);
      else if(action==='sheet-delete'){if(!confirm('Delete this worksheet?'))return;deleteSheet(f);}
      else if(action==='cell-bold'||action==='cell-italic'){
        const ref=ctx.getSelectedCell(),field=action==='cell-bold'?'bold':'italic';
        setCellStyle(f,ref,field,!f.cellStyles?.[ref]?.[field]);
      }
      else if(action==='cell-currency'||action==='cell-percent')setCellStyle(f,ctx.getSelectedCell(),'format',action==='cell-currency'?'currency':'percent');
      else if(action==='cell-reset'){ensureWorkbook(f);delete f.cellStyles[ctx.getSelectedCell()];}
      else if(action==='sort-asc'||action==='sort-desc')sortSheet(f,'A',action==='sort-asc'?'asc':'desc');
      else if(action==='insert-sum'||action==='insert-avg'){
        const ref=ctx.getSelectedCell();
        f.cells[ref]=action==='insert-sum'?'=SUM(B2:B10)':'=AVERAGE(B2:B10)';
      } else if(action==='chart-bar'||action==='chart-line'){
        const data=sheetChartData(f);
        if(!data.length){ctx.toast('Add labels in column A and numeric values in B, rows 2–30.');return;}
        modal('<h2>'+ (action==='chart-bar'?'Bar':'Line') +' chart preview</h2><p>Uses current worksheet A:B data (up to 20 points). Preview only—editable embedded charts come later.</p>'+svgChart(data,action==='chart-bar'?'bar':'line')+'<div class="modal-actions"><button class="btn btn-light" data-ot-action="settings-close">Close</button></div>');
        return;
      } else if(action==='theme-all'){
        const current=f.slides[ctx.getSlideIndex()].theme;
        f.slides.forEach(slide=>slide.theme=current);
      } else if(action==='slide-up'||action==='slide-down'){
        const idx=ctx.getSlideIndex(),other=idx+(action==='slide-up'?-1:1);
        if(other<0||other>=f.slides.length)return;
        [f.slides[idx],f.slides[other]]=[f.slides[other],f.slides[idx]];
        ctx.setSlideIndex(other);
      } else if(action==='slide-new'){f.slides.push({title:'New slide',body:'Add content here',theme:'violet'});ctx.setSlideIndex(f.slides.length-1);}
      else if(action==='slide-copy'){f.slides.splice(ctx.getSlideIndex()+1,0,structuredClone(f.slides[ctx.getSlideIndex()]));ctx.setSlideIndex(ctx.getSlideIndex()+1);}
      else if(action==='slide-remove'){if(f.slides.length<2)throw Error('Keep at least one slide');if(!confirm('Delete slide?'))return;f.slides.splice(ctx.getSlideIndex(),1);ctx.setSlideIndex(Math.max(0,ctx.getSlideIndex()-1));}
      else if(action==='present'){showPresentation(ctx,ctx.getSlideIndex());return;}
      else return;
      syncSheet(ctx,f);
    }catch(error){ctx.toast(error.message||'Tool action failed');}
  });
  document.addEventListener('change',event=>{
    const p=event.target.closest('[data-ot-pref]');
    if(p){const key=p.dataset.otPref;if(Object.hasOwn(defaultPrefs,key)){prefs[key]=p.value;localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));applyPreferences();}return;}
    const input=event.target.closest('[data-ot-input]');
    if(!input)return;
    const name=input.dataset.otInput,f=ctx.getFile();
    if(!f)return;
    const value=input.value;
    if(['font','font-size','text-color','highlight'].includes(name)){
      const cmd={'font':'fontName','font-size':'fontSize','text-color':'foreColor','highlight':'hiliteColor'}[name];
      richCommand(ctx,cmd,value);return;
    }
    if(['paper','orientation','margins','line-spacing','page-color'].includes(name)){
      const key={'paper':'paper','orientation':'orientation','margins':'margins','line-spacing':'lineHeight','page-color':'background'}[name];
      f.pageSettings={...(f.pageSettings||{}),[key]:value};
      ctx.touch(f);ctx.render();return;
    }
    if(name==='tags'){
      f.tags=Array.from(new Set(value.split(',').map(x=>x.trim().slice(0,24)).filter(Boolean))).slice(0,12);
      ctx.touch(f);return;
    }
    if(name.startsWith('cell-')){
      const prop={'cell-color':'color','cell-background':'background'}[name];
      if(prop){setCellStyle(f,ctx.getSelectedCell(),prop,value);ctx.touch(f);ctx.persist();ctx.render();}return;
    }
    if(name==='backdrop'&&f.type==='slides'){
      setSlidePreset(f.slides[ctx.getSlideIndex()],value);ctx.touch(f);ctx.render();return;
    }
    if(['layout','transition','text-size'].includes(name)&&f.type==='slides'){
      const prop={'layout':'layout','transition':'transition','text-size':'textScale'}[name];
      f.slides[ctx.getSlideIndex()][prop]=value;ctx.touch(f);ctx.render();
    }
  });
  document.addEventListener('input',event=>{
    if(event.target.matches('[data-ot-input="speaker-notes"]')){
      const f=ctx.getFile();
      if(f?.type==='slides'){f.slides[ctx.getSlideIndex()].notes=event.target.value;ctx.touch(f);}
    }
  });
  document.addEventListener('keydown',event=>{
    if(!document.getElementById('ot-presentation'))return;
    if(event.key==='Escape'){document.getElementById('ot-presentation').remove();return;}
    if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();showPresentation(ctx,slideshowIndex+1);}
    if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();showPresentation(ctx,slideshowIndex-1);}
  });
}
