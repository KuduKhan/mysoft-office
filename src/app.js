import { COLUMNS, ROW_COUNT, displayCell } from './formulas.js';
import { addRevision, restoreRevision } from './revisions.js';
import { parseCSV, makeCSV } from './file-formats.js';
import { cloudConfigured, cloudCurrentUser, cloudSignIn, cloudSignOut, cloudPush, cloudPull } from './cloud.js';
import { ensureWorkbook, PAGE_SIZES } from './office-model.js';
import { powerRibbon, sheetCellAppearance, initializeOfficeTools } from './office-ui.js';
import { sheetGrid, repaintGrid } from './sheet-grid.js';
import { DocumentHistory, headingsFromHTML } from './document-history.js';
import { createDOCX, importDOCX } from './ooxml-docx.js';
import { createXLSX, importXLSX } from './ooxml-xlsx.js';
import { createPPTX, importPPTX } from './ooxml-pptx.js';
import { SLIDE_PRESETS } from './studio-tools.js';
import {renderedSlideObjects,getSlideObject,updateSlideObject} from './slide-objects.js';
import {organizeNotes,noteLocation,moveNote} from './note-structure.js';
import {docComments,toggleDocComment,deleteDocComment,commentSummary} from './doc-review.js';
import { parseAddress, moveAddress, pasteGrid, populatedBounds, ROW_HEIGHT, HEADER_HEIGHT } from './sheet-window.js';

const STORAGE_KEY='mysoft-office-v1';
const TRASH_KEY='mysoft-office-trash-v2';
const HISTORY_KEY='mysoft-office-revisions-v2';
const typeNames={docs:'Document',sheets:'Spreadsheet',slides:'Presentation',notes:'Note'};
const typeIcons={docs:'file-text',sheets:'table',slides:'presentation',notes:'notebook'};
const labels={docs:'MySoft Docs',sheets:'MySoft Sheets',slides:'MySoft Slides',notes:'MySoft Notes'};
const themes={
  violet:{label:'Violet',color:'#7161e8',dark:false},
  ocean:{label:'Ocean',color:'#2895d9',dark:false},
  forest:{label:'Forest',color:'#22a88e',dark:false},
  midnight:{label:'Midnight',color:'#a58bff',dark:true}
};
const icons={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  star:'<path d="m12 2 3 6.5 7 1-5 4.9 1.2 7L12 18l-6.2 3.4 1.2-7-5-4.9 7-1z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  table:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  presentation:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5M8 21h8M7 9h10"/>',
  notebook:'<path d="M6 3h13a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 3v18M11 8h6M11 12h5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 17v3h16v-3"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  back:'<path d="m15 18-6-6 6-6M9 12h12"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
  'more':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sparkles:'<path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
  x:'<path d="M5 5l14 14M19 5 5 19"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>'
};
function icon(name,size=18){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.grid)+'</svg>';
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function plain(html){
  const dom=new DOMParser().parseFromString(String(html||''),'text/html');
  return dom.body.textContent||'';
}
function sanitize(html){
  const parsed=new DOMParser().parseFromString(String(html||''),'text/html');
  const allowed=new Set(['P','DIV','BR','H1','H2','H3','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','SPAN','A','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','HR','SUP','SUB','MARK','FONT','IMG']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','META','LINK','BASE','VIDEO','AUDIO']);
  const isColor=x=>/^#[0-9a-fA-F]{3,8}$/.test(x)||/^rgba?\([0-9 ,.]+\)$/.test(x);
  const fonts=new Set(['arial','calibri','georgia','garamond','tahoma','times new roman','verdana']);
  function clean(node,doc){
    if(node.nodeType===Node.TEXT_NODE)return doc.createTextNode(node.nodeValue||'');
    if(node.nodeType!==Node.ELEMENT_NODE)return doc.createTextNode('');
    if(blocked.has(node.tagName))return doc.createTextNode('');
    if(node.tagName==='IMG'){
      const data=node.getAttribute('src')||'';
      if(data.length<225000&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(data)){
        const picture=doc.createElement('img');
        picture.setAttribute('src',data);
        picture.setAttribute('alt',String(node.getAttribute('alt')||'Inserted picture').slice(0,100));
        return picture;
      }
      return doc.createTextNode('');
    }
    const tag=allowed.has(node.tagName)?node.tagName.toLowerCase():'span';
    const wrapper=doc.createElement(tag==='font'?'span':tag);
    if(node.tagName==='A'){
      const url=node.getAttribute('href')||'';
      if(/^https?:\/\//i.test(url)){
        wrapper.setAttribute('href',url);
        wrapper.setAttribute('rel','noopener noreferrer');
      }
    }
    if(['SPAN','P','DIV','FONT','TH','TD'].includes(node.tagName)){
      const align=node.style?.textAlign;
      if(['left','center','right','justify'].includes(align))wrapper.style.textAlign=align;
      const foreground=node.style?.color||node.getAttribute('color');
      const background=node.style?.backgroundColor;
      const family=(node.style?.fontFamily||node.getAttribute('face')||'').replace(/["']/g,'');
      const size=node.style?.fontSize;
      if(foreground&&isColor(foreground))wrapper.style.color=foreground;
      if(background&&isColor(background))wrapper.style.backgroundColor=background;
      if(fonts.has(family.toLowerCase()))wrapper.style.fontFamily=family;
      if(size&&/^(?:[1-9]|[12]\d|3[0-6])(?:px|pt)$/.test(size))wrapper.style.fontSize=size;
      if(node.tagName==='FONT'){
        const n=Number(node.getAttribute('size'));
        if(Number.isInteger(n)&&n>=1&&n<=7)wrapper.style.fontSize=({1:10,2:13,3:16,4:18,5:24,6:32,7:48})[n]+'px';
      }
    }
    if(['TD','TH'].includes(node.tagName)){
      for(const attr of ['colspan','rowspan']){
        const n=Number(node.getAttribute(attr)||1);
        if(Number.isInteger(n)&&n>1&&n<=8)wrapper.setAttribute(attr,String(n));
      }
    }
    for(const child of node.childNodes)wrapper.appendChild(clean(child,doc));
    return wrapper;
  }
  const output=document.implementation.createHTMLDocument('');
  for(const child of parsed.body.childNodes)output.body.appendChild(clean(child,output));
  return output.body.innerHTML;
}
function uuid(){return globalThis.crypto?.randomUUID?.()||'f'+Date.now()+Math.random().toString(36).slice(2);}
function makeFile(type,title){
  const defaults={docs:{body:''},sheets:{cells:{}},slides:{slides:[{title:'Untitled presentation',body:'Add your ideas here',theme:'violet'}]},notes:{body:''}};
  return {id:uuid(),type,title:title||'Untitled '+typeNames[type],starred:false,createdAt:Date.now(),updatedAt:Date.now(),...structuredClone(defaults[type])};
}
function starter(){
  const doc=makeFile('docs','Welcome to MySoft Office');
  doc.body='<h1>Welcome to MySoft Office</h1><p>Your work. Your space.</p><p>Create professional documents, work with spreadsheets, build presentations and capture notes in one place.</p><h2>Getting started</h2><ul><li>Choose an app on the dashboard.</li><li>Your edits are saved automatically in this browser.</li><li>Use Export backup to keep a copy of your workspace.</li></ul>';
  const sheet=makeFile('sheets','Project budget');
  sheet.cells={A1:'Item',B1:'Units',C1:'Unit cost',D1:'Total',A2:'Design',B2:'3',C2:'150',D2:'=B2*C2',A3:'Development',B3:'6',C3:'300',D3:'=B3*C3',A4:'Testing',B4:'2',C4:'100',D4:'=B4*C4',C6:'Grand total',D6:'=SUM(D2:D4)'};
  const slides=makeFile('slides','MySoft product vision');
  slides.slides=[{title:'MySoft Office',body:'Your work. Your space.',theme:'violet'},{title:'One connected workspace',body:'Documents • Spreadsheets • Presentations • Notes',theme:'ocean'},{title:'Build with confidence',body:'Work simply. Save locally. Export whenever you need.',theme:'midnight'}];
  const note=makeFile('notes','Ideas and notes');
  note.body='<h2>Brainstorm</h2><p>Write down your thoughts and develop your next great idea.</p>';
  return [doc,sheet,slides,note];
}
function load(){
  try {
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(parsed && Array.isArray(parsed.files)) return parsed.files.filter(f=>f && typeNames[f.type] && typeof f.id==='string').slice(0,500);
  }catch{}
  return starter();
}
function readStored(key,fallback){
  try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch{return fallback;}
}
let files=load();
let trashFiles=readStored(TRASH_KEY,[]);
if(!Array.isArray(trashFiles))trashFiles=[];
let revisions=readStored(HISTORY_KEY,{});
if(!revisions||typeof revisions!=='object'||Array.isArray(revisions))revisions={};
let cloudUser=null;
let pendingOfficeImport=null;
let activeObjectId=null,selectedReviewQuote='',slideDrag=null;
const documentHistory=new DocumentHistory();
let view='home',activeId=null,query='',fileFilter='all',selectedCell='A1',slideIndex=0,mobileOpen=false,sheetScrollTop=0;
let savedTimer=0,toastTimer=0;
const app=document.getElementById('app');
const modalRoot=document.getElementById('modal-root');
function persist(){
  let saved=true;
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,files}));
    localStorage.setItem(TRASH_KEY,JSON.stringify(trashFiles));
    localStorage.setItem(HISTORY_KEY,JSON.stringify(revisions));
  }catch{saved=false;toast('Browser save failed: storage full. Export your work.');}
  const mark=document.getElementById('save-status');
  if(mark)mark.innerHTML=saved?icon('check',13)+' Saved locally':'Save failed';
  return saved;
}
function snapshot(file,force=false){if(file)revisions=addRevision(revisions,file,Date.now(),force);}
function touch(file,trackHistory=true){
  if(trackHistory&&['docs','notes'].includes(file.type))documentHistory.record(file.id,file.body||'');
  file.updatedAt=Date.now();snapshot(file);
  const mark=document.getElementById('save-status');
  if(mark)mark.textContent='Saving…';
  clearTimeout(savedTimer);savedTimer=setTimeout(persist,350);
}
function workspaceSnapshot(){return {version:2,exportedAt:new Date().toISOString(),files,trash:trashFiles,versions:revisions};}
function toast(message){
  const el=document.getElementById('toast');
  el.textContent=message;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);
}
function dateText(time){
  const value=new Date(time);
  return new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(Number.isFinite(value.getTime())?value:new Date());
}
function getActive(){return files.find(f=>f.id===activeId);}
function download(content,name,type){
  const blob=new Blob([content],{type});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1500);
}
function slug(name){return String(name).replace(/[^a-z0-9 -]/gi,'').trim().replace(/\s+/g,'-').slice(0,70)||'mysoft-file';}
function sidebar(){
  const nav=(id,title,ic,extra='')=>'<button class="nav-link '+(view===id?'active':'')+'" data-nav="'+id+'">'+icon(ic,17)+esc(title)+extra+'</button>';
  const usage=Math.min(100,Math.round(JSON.stringify(files).length/40000));
  return '<aside class="sidebar '+(mobileOpen?'open':'')+'"><div class="brand"><span class="brand-symbol"><b></b><b></b><b></b><b></b></span><div><strong>MySoft Office</strong><small>Your work. Your space.</small></div></div>'+
    '<div class="nav-caption">Workspace</div>'+nav('home','Overview','home')+nav('files','My files','folder','<span class="count">'+files.length+'</span>')+nav('starred','Starred','star')+nav('templates','Templates','grid')+nav('trash','Recycle bin','trash','<span class="count">'+trashFiles.length+'</span>')+
    '<div class="nav-caption">Applications</div>'+['docs','sheets','slides','notes'].map(t=>nav(t,labels[t],typeIcons[t])).join('')+
    '<div class="sidebar-spacer"></div><div class="side-foot"><div class="storage-label"><span>Local workspace</span><strong>'+files.length+' files</strong></div><div class="storage-track"><span class="storage-fill" style="width:'+usage+'%"></span></div><div class="storage-help">Local autosave. Cloud snapshots are optional.</div><button class="nav-link" data-action="cloud" style="margin-top:13px">'+icon('upload',17)+'Cloud snapshots</button><button class="nav-link" data-action="import-file">'+icon('plus',17)+'Import file</button><button class="nav-link" data-action="backup">'+icon('download',17)+'Export backup</button><button class="nav-link" data-action="import">'+icon('upload',17)+'Import backup</button></div></aside>';
}
function header(){
  return '<header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu" data-action="mobile" aria-label="Open menu">'+icon('menu')+'</button><div class="searchbox">'+icon('search',17)+'<input id="global-search" aria-label="Search files" placeholder="Search your files (Enter)" value="'+esc(query)+'"></div></div><div class="top-actions"><button class="btn btn-light" data-ot-action="preferences">⚙ Customize</button><button class="btn btn-primary" data-action="new">'+icon('plus',16)+' New file</button><div class="avatar" title="Local workspace">MS</div></div></header>';
}
function appTiles(){
  const descriptions={docs:'Write and format',sheets:'Calculate and analyze',slides:'Present your ideas',notes:'Capture your thoughts'};
  return '<div class="app-grid">'+Object.keys(labels).map(t=>'<button class="app-card" data-create="'+t+'"><span class="app-icon '+t+'">'+icon(typeIcons[t],23)+'</span><strong>'+labels[t]+'</strong><span>'+descriptions[t]+'</span></button>').join('')+'</div>';
}
function sectionHead(title,desc,action,actionLabel){
  return '<div class="section-head"><div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div>'+(action?'<button class="link-button" data-nav="'+action+'">'+esc(actionLabel)+' '+icon('chevron',15)+'</button>':'')+'</div>';
}
function renderRows(list){
  if(view==='trash'){
    if(!list.length)return '<div class="empty-state">'+icon('trash',36)+'<h3>Recycle bin is empty</h3><p>Deleted files remain here until permanently removed.</p></div>';
    return '<div class="panel"><table class="data-table"><thead><tr><th>Deleted file</th><th>Type</th><th>Deleted</th><th>Recovery</th></tr></thead><tbody>'+
      list.map(f=>'<tr><td><div class="row"><span class="file-icon '+f.type+'">'+icon(typeIcons[f.type],17)+'</span><div class="file-name">'+esc(f.title)+'</div></div></td><td>'+typeNames[f.type]+'</td><td class="muted">'+dateText(f.trashedAt||Date.now())+'</td><td><div class="row"><button class="btn btn-soft btn-sm" data-restore-trash="'+esc(f.id)+'">Restore</button><button class="icon-btn" data-purge="'+esc(f.id)+'" title="Delete permanently">'+icon('trash',16)+'</button></div></td></tr>').join('')+'</tbody></table></div>';
  }
  if(!list.length) return '<div class="empty-state">'+icon('folder',36)+'<h3>No matching files yet</h3><p>Create a new file to get started.</p><button class="btn btn-primary" data-action="new">'+icon('plus',15)+' Create file</button></div>';
  return '<div class="panel"><table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Modified</th><th>Actions</th></tr></thead><tbody>'+
    list.map(f=>'<tr data-open="'+esc(f.id)+'" style="cursor:pointer"><td><div class="row"><span class="file-icon '+f.type+'">'+icon(typeIcons[f.type],17)+'</span><div><div class="file-name">'+esc(f.title)+'</div><div class="file-type">'+labels[f.type]+'</div></div></div></td><td><span class="badge">'+typeNames[f.type]+'</span></td><td class="muted">'+dateText(f.updatedAt)+'</td><td><div class="row"><button class="icon-btn '+(f.starred?'starred':'')+'" data-star="'+esc(f.id)+'" title="Toggle favorite" aria-label="Toggle favorite">'+icon('star',16)+'</button><button class="icon-btn" data-duplicate="'+esc(f.id)+'" title="Duplicate" aria-label="Duplicate">'+icon('copy',16)+'</button><button class="icon-btn" data-delete="'+esc(f.id)+'" title="Delete" aria-label="Delete">'+icon('trash',16)+'</button></div></td></tr>').join('')+'</tbody></table></div>';
}
function filtered(list){return list.filter(f=>f.title.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>b.updatedAt-a.updatedAt);}
function home(){
  const sorted=filtered(files);
  return '<div class="content"><div class="eyebrow">YOUR PERSONAL WORKSPACE</div><h1 style="margin-top:8px">Welcome to MySoft Office <span style="font-size:26px">✦</span></h1><p class="subtitle">Everything you need to create, organize and get things done.</p>'+
    '<div class="hero"><div><div class="eyebrow" style="color:#d7d0ff">THE WORKSPACE THAT WORKS FOR YOU</div><h1>Your ideas deserve a better space.</h1><p>Bring your documents, numbers, stories and thoughts together — in one beautiful place.</p><button class="btn" data-action="new">'+icon('plus',16)+' Create something</button></div><div class="hero-art"><div class="art-page"><div class="art-dot"></div><div class="art-line"></div><div class="art-line short"></div><div class="art-line"></div></div><div class="art-page second"><div class="art-dot"></div><div class="art-line"></div><div class="art-line"></div><div class="art-line short"></div></div></div></div>'+
    sectionHead('Create with MySoft','Choose an app and start making something great.')+appTiles()+
    sectionHead('Recent files','Pick up where you left off.','files','View all files')+renderRows(sorted.slice(0,7))+'</div>';
}
function filesPage(){
  let list=view==='trash'?trashFiles:files;
  if(view==='starred') list=list.filter(f=>f.starred);
  else if(typeNames[view]) list=list.filter(f=>f.type===view);
  if(fileFilter!=='all') list=list.filter(f=>f.type===fileFilter);
  list=filtered(list);
  const title=view==='trash'?'Recycle bin':view==='starred'?'Starred files':typeNames[view]?labels[view]:'All files';
  return '<div class="content"><div class="spread page-heading"><div><div class="eyebrow">WORKSPACE / LIBRARY</div><h1 style="margin-top:8px">'+esc(title)+'</h1><p class="subtitle">'+list.length+' files · Saved in this browser</p></div><button class="btn btn-primary" data-action="new">'+icon('plus',16)+' New file</button></div>'+
    '<div class="spread" style="margin-bottom:18px"><div class="row"><span class="muted" style="font-size:12px">Filter by type</span><select id="file-filter" style="padding:9px;border-radius:9px;border:1px solid var(--line)"><option value="all">All types</option>'+Object.keys(labels).map(t=>'<option value="'+t+'" '+(fileFilter===t?'selected':'')+'>'+labels[t]+'</option>').join('')+'</select></div><span class="muted" style="font-size:11px">Most recently edited first</span></div>'+
    renderRows(list)+'</div>';
}
function templatesPage(){
  const templates=[
    {type:'docs',title:'Project proposal',description:'Start with a clear project outline.'},
    {type:'sheets',title:'Simple budget',description:'Organize costs and formulas.'},
    {type:'slides',title:'Pitch deck',description:'Tell a compelling story.'},
    {type:'notes',title:'Meeting notes',description:'Capture decisions and next actions.'}
  ];
  return '<div class="content"><div class="eyebrow">START WITH A HEAD START</div><h1 style="margin:8px 0">Templates</h1><p class="subtitle">Useful starting points for your next project.</p><div class="templates-grid" style="margin-top:27px">'+templates.map((t,i)=>'<button class="template-card" data-template="'+i+'"><span class="app-icon '+t.type+'">'+icon(typeIcons[t.type],22)+'</span><h3>'+t.title+'</h3><p>'+t.description+'</p></button>').join('')+'</div></div>';
}
function editorHead(f){
  return '<div class="editor-head"><button class="icon-btn" data-action="close-editor" title="Back to files">'+icon('back',19)+'</button><span class="file-icon '+f.type+'">'+icon(typeIcons[f.type],18)+'</span><input class="doc-title" id="document-title" aria-label="File title" value="'+esc(f.title)+'" maxlength="120"><div class="save-mark" id="save-status">'+icon('check',13)+' Saved locally</div>'+(f.type==='notes'?'':'<button class="btn btn-soft btn-sm" data-action="office-export">'+icon('download',15)+' '+({docs:'DOCX',sheets:'XLSX',slides:'PPTX'}[f.type])+'</button>')+'<button class="btn btn-light btn-sm" data-action="revisions">'+icon('clock',15)+' History</button><button class="btn btn-light btn-sm" data-action="export">'+icon('download',15)+' Export</button></div>';
}
function docToolbar(){
  return '<div class="toolbar">'+
    '<select id="doc-block" aria-label="Paragraph style"><option value="P">Normal text</option><option value="H1">Heading 1</option><option value="H2">Heading 2</option><option value="H3">Heading 3</option><option value="BLOCKQUOTE">Quote</option></select><span class="toolbar-divider"></span>'+
    [['bold','B'],['italic','I'],['underline','U']].map(([cmd,label])=>'<button class="tool" data-cmd="'+cmd+'" title="'+cmd+'">'+label+'</button>').join('')+
    '<span class="toolbar-divider"></span><button class="tool" data-cmd="insertUnorderedList" title="Bulleted list">☷</button><button class="tool" data-cmd="insertOrderedList" title="Numbered list">≡</button>'+
    '<span class="toolbar-divider"></span><button class="tool" data-cmd="justifyLeft" title="Align left">☰</button><button class="tool" data-cmd="justifyCenter" title="Align center">≡</button><button class="tool" data-cmd="justifyRight" title="Align right">☷</button>'+
    '<span class="toolbar-divider"></span><button class="tool" data-cmd="undo" title="Undo">↶</button><button class="tool" data-cmd="redo" title="Redo">↷</button><span class="sheet-hint">Select text to format</span></div>';
}
function outlineItems(f){
  const headings=headingsFromHTML(sanitize(f.body));
  return headings.length?headings.map((h,i)=>'<button class="doc-outline-link indent-'+h.level+'" data-outline-index="'+i+'">'+esc(h.title)+'</button>').join(''):'<p>Use headings to build an outline automatically.</p>';
}
function reviewPanel(f){
  const comments=docComments(f),status=commentSummary(f);
  return '<section class="studio-review-section"><strong>Review notes · '+status.open+' open</strong>'+
    (comments.length?comments.map(item=>
      '<div class="studio-review-comment '+(item.resolved?'resolved':'')+'"><blockquote>'+esc(item.quote)+'</blockquote><p>'+esc(item.body)+'</p>'+
      '<div class="studio-review-actions"><button type="button" data-review-toggle="'+esc(item.id)+'">'+(item.resolved?'Reopen':'Resolve')+'</button>'+
      '<button type="button" data-review-delete="'+esc(item.id)+'">Delete</button></div></div>').join(''):
      '<p>No review comments yet. Select text, then choose Add comment under Review.</p>')+'</section>';
}
function docsEditor(f){
  const prefs=f.pageSettings||{};
  const paper=PAGE_SIZES[prefs.paper]||PAGE_SIZES.A4;
  const mm=prefs.orientation==='landscape'?[paper[1],paper[0]]:paper;
  const margin={narrow:24,normal:60,wide:85}[prefs.margins]||60;
  const background=/^#[0-9a-f]{6}$/i.test(prefs.background||'')?prefs.background:'#ffffff';
  const lineHeight=['1.2','1.6','2'].includes(String(prefs.lineHeight))?prefs.lineHeight:'1.6';
  const style='width:min(100%,'+Math.round(mm[0]*3.78)+'px);min-height:'+Math.round(mm[1]*3.78)+'px;padding:'+margin+'px;line-height:'+lineHeight+';background-color:'+background;
  return docToolbar()+'<div class="editor-body"><div class="doc-edit-layout"><aside class="doc-outline"><strong>Document outline</strong><div id="doc-outline-list">'+outlineItems(f)+'</div>'+reviewPanel(f)+'</aside><div class="doc-canvas"><article id="rich-content" class="document-paper" style="'+style+'" contenteditable="true" spellcheck="true" role="textbox" aria-label="Document content" data-placeholder="Start writing your document...">'+sanitize(f.body)+'</article></div></div></div>';
}
function sheetsEditor(f){
  ensureWorkbook(f);
  return '<div class="sheet-layout"><div class="sheet-formula">'+
    '<input id="cell-address" aria-label="Cell address" title="Enter a cell, for example Z1000" value="'+esc(selectedCell)+'" spellcheck="false">'+
    '<span style="color:#8c97ad;font-weight:800">fx</span>'+
    '<input id="formula-input" aria-label="Formula" value="'+esc(f.cells[selectedCell]||'')+'" placeholder="Type text, numbers or =SUM(A1:A3)">'+
    '<span class="sheet-capacity">A1–Z1000 · Ctrl+G to navigate</span></div>'+
    sheetGrid(f,selectedCell)+'</div>';
}
function slidesEditor(f){
  const s=f.slides[slideIndex]||f.slides[0];
  const theme=themes[s.theme]||themes.violet;
  const studio=SLIDE_PRESETS[s.studioPreset]||SLIDE_PRESETS.ivory;
  return '<div class="slide-layout"><div class="slide-list"><button class="btn btn-soft btn-sm" data-action="slide-add" style="width:100%;margin-bottom:12px">'+icon('plus',14)+' Add slide</button>'+
    f.slides.map((slide,i)=>'<button class="slide-item '+(i===slideIndex?'active':'')+'" data-slide="'+i+'"><span>'+(i+1)+'</span><div class="slide-thumb"><strong>'+esc(slide.title)+'</strong><small>'+esc(slide.body).slice(0,46)+'</small></div></button>').join('')+'</div>'+
    '<div class="slide-stage-wrap"><div class="slide-stage '+(theme.dark?'dark':'')+' studio-preset" style="--slide-accent:'+theme.color+';--studio-slide-bg:'+studio.background+';--studio-slide-text:'+studio.foreground+';--studio-slide-highlight:'+studio.accent+'"><div class="slide-tag">MySoft Slides · '+(slideIndex+1)+' / '+f.slides.length+'</div><div class="slide-title" contenteditable="true" id="slide-title" role="textbox" aria-label="Slide title" data-placeholder="Slide title">'+esc(s.title)+'</div><div class="slide-body" contenteditable="true" id="slide-body" role="textbox" aria-label="Slide body">'+esc(s.body)+'</div><div class="studio-object-layer" aria-label="Editable slide objects">'+renderedSlideObjects(s,{editable:true,selectedId:activeObjectId})+'</div></div></div>'+
    '<div class="slide-controls"><h3>Design theme</h3>'+Object.entries(themes).map(([k,v])=>'<button class="theme-choice '+(s.theme===k?'active':'')+'" data-theme="'+k+'"><span class="theme-dot" style="background:'+v.color+'"></span>'+v.label+'</button>').join('')+
    '<h3 style="margin-top:30px">Slide actions</h3><button class="btn btn-light btn-sm" data-action="slide-duplicate" style="width:100%;margin:6px 0">'+icon('copy',14)+' Duplicate</button><button class="btn btn-light btn-sm" data-action="slide-delete" style="width:100%;margin:6px 0">'+icon('trash',14)+' Delete</button></div></div>';
}
function notesEditor(f){
  const groups=organizeNotes(files),location=noteLocation(f);
  const tree=groups.map(book=>'<div class="studio-notebook-group"><div class="studio-notebook-title">'+esc(book.name)+'</div>'+
    book.sections.map(sec=>'<div class="studio-notebook-section">'+esc(sec.title)+'</div>'+
      sec.notes.map(n=>'<button class="note-list-item '+(n.id===f.id?'active':'')+'" data-open="'+esc(n.id)+'"><strong>'+esc(n.title)+'</strong><span>'+dateText(n.updatedAt)+'</span></button>').join('')
    ).join('')+'</div>').join('');
  return '<div class="note-layout"><div class="note-list"><div class="spread"><h3>Notebooks</h3><button class="icon-btn" data-create="notes" title="New note">'+icon('plus',16)+'</button></div>'+tree+'</div>'+
    '<div class="note-editor"><div class="eyebrow">MY NOTES</div><div class="studio-note-organizer">'+
    '<label>Notebook<input id="note-notebook" aria-label="Notebook" maxlength="40" value="'+esc(location.notebook)+'"></label>'+
    '<label>Section<input id="note-section" aria-label="Section" maxlength="40" value="'+esc(location.section)+'"></label>'+
    '<button class="btn btn-soft btn-sm" data-note-move="true">Move note</button></div>'+
    '<input class="note-title" id="note-title" aria-label="Note title" value="'+esc(f.title)+'" maxlength="120">'+
    '<div class="note-meta">Private to this browser · Autosaved · Tags: '+esc((f.tags||[]).join(', ')||'none')+'</div>'+
    '<div id="rich-content" class="note-content" contenteditable="true" spellcheck="true" role="textbox" aria-label="Note content" data-placeholder="Capture your thoughts...">'+sanitize(f.body)+'</div></div></div>';
}
function editor(){
  const f=getActive();
  if(!f){view='files';return filesPage();}
  if(['docs','notes'].includes(f.type))documentHistory.seed(f.id,f.body||'');
  const zoom=Math.round(parseFloat(document.documentElement.style.getPropertyValue('--studio-zoom'))||100);
  const status='<div class="studio-statusbar" role="status"><div class="studio-status-left"><span class="studio-status-dot"></span><span>MySoft '+typeNames[f.type]+'</span><span class="studio-status-divider">·</span><span>Saved in this browser</span></div>'+
    '<div class="studio-status-right"><span class="studio-shortcut">Ctrl+S · Save</span><button data-ot-action="zoom-out" class="studio-zoom-btn" aria-label="Zoom out">−</button><span id="studio-zoom-value">'+zoom+'%</span><button data-ot-action="zoom-in" class="studio-zoom-btn" aria-label="Zoom in">+</button></div></div>';
  return '<div class="editor-shell">'+editorHead(f)+powerRibbon(f,selectedCell,slideIndex)+(f.type==='docs'?docsEditor(f):f.type==='sheets'?sheetsEditor(f):f.type==='slides'?slidesEditor(f):notesEditor(f))+status+'</div>';
}
function render(){
  app.innerHTML='<div class="shell">'+sidebar()+'<main class="main">'+header()+(view==='editor'?editor():view==='home'?home():view==='templates'?templatesPage():filesPage())+'</main></div>';
  const sc=document.getElementById('sheet-scroll');
  if(sc&&getActive()?.type==='sheets'){
    sc.scrollTop=sheetScrollTop;
    repaintGrid(sc,getActive(),selectedCell,true);
  }
}
function navigate(destination){
  if(view==='editor'&&getActive())snapshot(getActive(),true);
  persist();view=destination;activeId=null;query='';fileFilter='all';mobileOpen=false;
  window.history.pushState(null,'','#/'+encodeURIComponent(destination));
  render();window.scrollTo(0,0);
}
function openFile(id){
  if(!files.some(f=>f.id===id))return;
  if(view==='editor'&&getActive())snapshot(getActive(),true);
  activeId=id;view='editor';slideIndex=0;activeObjectId=null;selectedReviewQuote='';selectedCell='A1';sheetScrollTop=0;mobileOpen=false;
  window.history.pushState(null,'','#/file/'+encodeURIComponent(id));
  snapshot(getActive(),true);persist();render();
}
function restoreRoute(){
  const route=window.location.hash;
  if(route.startsWith('#/file/')){
    try{
      const id=decodeURIComponent(route.slice(7));
      if(files.some(f=>f.id===id)){activeId=id;view='editor';return;}
    }catch{}
  }
  const page=route.startsWith('#/')?route.slice(2):'home';
  if(['home','files','starred','templates','trash',...Object.keys(typeNames)].includes(page)){view=page;activeId=null;}
  else {view='home';activeId=null;}
}
function newFile(type,title){
  const f=makeFile(type,title);
  files.unshift(f);persist();openFile(f.id);toast('Created '+typeNames[type].toLowerCase());
  return f;
}
function createTemplate(index){
  const types=['docs','sheets','slides','notes'];
  const names=['Project proposal','Simple budget','Pitch deck','Meeting notes'];
  const type=types[index];if(!type) return;
  const f=newFile(type,names[index]);
  if(type==='docs') f.body='<h1>Project Proposal</h1><h2>Overview</h2><p>Describe the problem and your proposed solution.</p><h2>Objectives</h2><ul><li>Objective 1</li><li>Objective 2</li></ul><h2>Timeline</h2><p>Add your project milestones here.</p>';
  if(type==='sheets') f.cells={A1:'Category',B1:'Planned',C1:'Actual',A2:'Equipment',B2:'1000',C2:'850',A3:'Software',B3:'400',C3:'450',A5:'Total',B5:'=SUM(B2:B3)',C5:'=SUM(C2:C3)'};
  if(type==='slides') f.slides=[{title:'The opportunity',body:'Describe the challenge and what could change.',theme:'violet'},{title:'Our solution',body:'Share your unique approach.',theme:'ocean'},{title:'Next steps',body:'Outline the way forward.',theme:'midnight'}];
  if(type==='notes') f.body='<h2>Meeting agenda</h2><p>Date:</p><h2>Discussion</h2><p></p><h2>Decisions</h2><p></p><h2>Action items</h2><p></p>';
  persist();render();
}
function modal(kind,id){
  const f=files.find(x=>x.id===id);
  if(kind==='new'){
    modalRoot.innerHTML='<div class="modal-backdrop"><form class="modal" id="new-form"><h2>Create a new file</h2><p>Choose an app and give your file a name.</p><label for="new-type">Application</label><select id="new-type" name="type">'+Object.keys(labels).map(t=>'<option value="'+t+'">'+labels[t]+'</option>').join('')+'</select><label for="new-title">File name</label><input id="new-title" name="title" placeholder="Untitled file" maxlength="120" autofocus><div class="modal-actions"><button type="button" class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-primary" type="submit">Create file</button></div></form></div>';
  } else if(kind==='delete'&&f){
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Move to recycle bin?</h2><p><strong>'+esc(f.title)+'</strong> can be restored from your recycle bin.</p><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-dark" data-action="confirm-delete" data-id="'+esc(f.id)+'">Move to bin</button></div></div></div>';
  } else if(kind==='revisions'&&f){
    snapshot(f,true);persist();
    const entries=[...(revisions[f.id]||[])].reverse();
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Version history</h2><p>Up to 12 local snapshots per file. Restore an earlier version if needed.</p><div style="max-height:280px;overflow:auto">'+entries.map((v,i)=>'<div class="spread" style="padding:11px 0;border-bottom:1px solid #ecedf4"><span class="muted" style="font-size:12px">'+new Date(v.at).toLocaleString()+'</span><button class="btn btn-soft btn-sm" data-revision="'+i+'">Restore</button></div>').join('')+'</div><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Close</button></div></div></div>';
  } else if(kind==='office-export'&&f){
    const fmt={docs:'DOCX',sheets:'XLSX',slides:'PPTX'}[f.type];
    const notices={
      docs:'Only paragraphs, basic headings, emphasis, simple tables and visible text are retained. Images, hyperlinks, complex layout and comments are not faithfully exported.',
      sheets:'Exports the supported A1:Z1000 range, up to 20 worksheets, formulas and basic styles. Charts, external references, pivots and advanced Excel features are not included.',
      slides:'Exports editable title and body text into each slide. Custom objects, images, speaker notes, animations and precise layouts are not preserved.'
    };
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Export to '+fmt+'</h2><p>'+notices[f.type]+'</p><p>For full preservation, also export a JSON workspace backup.</p><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-primary" data-action="office-export-confirm">Export '+fmt+'</button></div></div></div>';
  } else if(kind==='cloud'){
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>MySoft Cloud snapshots</h2>'+
      (!cloudConfigured?'<p>Cloud is not configured yet. Your data remains on this browser until a dedicated MySoft Supabase project is connected.</p><p>Follow <strong>CLOUD_SETUP.md</strong> in the repository.</p>':
        cloudUser?'<p>Signed in as <strong>'+esc(cloudUser.email||'MySoft user')+'</strong>. Cloud operations are manual snapshot transfers, not continuous synchronization.</p><div class="row" style="flex-wrap:wrap"><button class="btn btn-primary" data-action="cloud-upload">Upload snapshot</button><button class="btn btn-light" data-action="cloud-download">Download snapshot</button><button class="btn btn-light" data-action="cloud-signout">Sign out</button></div>':
        '<p>Sign in to upload and recover workspace snapshots across devices.</p><form id="cloud-form"><label>Email</label><input name="email" type="email" autocomplete="email" required><label>Password</label><input name="password" type="password" autocomplete="current-password" minlength="8" required><div class="row"><button class="btn btn-primary" type="submit" name="mode" value="login">Sign in</button><button class="btn btn-soft" type="submit" name="mode" value="register">Create account</button></div></form>')+
      '<div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Close</button></div></div></div>';
  }
  modalRoot.querySelector('input')?.focus();
}
function closeModal(){modalRoot.innerHTML='';pendingOfficeImport=null;}
function duplicate(id){
  const source=files.find(f=>f.id===id);if(!source)return;
  const copy=structuredClone(source);copy.id=uuid();copy.title+=' (copy)';copy.createdAt=Date.now();copy.updatedAt=Date.now();copy.starred=false;
  files.unshift(copy);persist();render();toast('File duplicated');
}
function remove(id){
  const f=files.find(v=>v.id===id);if(!f)return;
  snapshot(f,true);
  trashFiles.unshift({...structuredClone(f),trashedAt:Date.now()});
  trashFiles=trashFiles.slice(0,100);
  files=files.filter(v=>v.id!==id);closeModal();persist();
  if(activeId===id)navigate('files');else render();
  toast('Moved to recycle bin');
}
function restoreTrash(id){
  const found=trashFiles.find(f=>f.id===id);if(!found)return;
  const f=structuredClone(found);delete f.trashedAt;f.updatedAt=Date.now();
  if(files.some(v=>v.id===id))f.id=uuid();
  files.unshift(f);trashFiles=trashFiles.filter(v=>v.id!==id);persist();render();toast('File restored');
}
function purgeTrash(id){
  const found=trashFiles.find(f=>f.id===id);
  if(!found||!confirm('Permanently delete '+found.title+'?'))return;
  trashFiles=trashFiles.filter(f=>f.id!==id);delete revisions[id];persist();render();toast('Permanently deleted');
}
function exportFile(){
  const f=getActive();if(!f)return;
  const name=slug(f.title);
  if(f.type==='docs'){
    const content='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(f.title)+'</title></head><body>'+sanitize(f.body)+'</body></html>';
    download(content,name+'.html','text/html;charset=utf-8');
  }
  if(f.type==='notes') download(plain(f.body),name+'.txt','text/plain;charset=utf-8');
  if(f.type==='sheets'){
    const {maxRow,maxCol}=populatedBounds(f.cells);
    const values=Array.from({length:maxRow},(_,i)=>COLUMNS.slice(0,maxCol).map(c=>displayCell(c+(i+1),f.cells)));
    const csv=makeCSV(values);
    download(csv,name+'.csv','text/csv;charset=utf-8');
  }
  if(f.type==='slides'){
    const styles='body{font-family:Arial,sans-serif;background:#eaeefa;margin:0;padding:24px}section{box-sizing:border-box;aspect-ratio:16/9;background:white;border-top:12px solid #7564db;padding:8%;margin:0 auto 30px;max-width:1000px;page-break-after:always;display:flex;flex-direction:column;justify-content:center}h1{font-size:42px;color:#25334d}p{font-size:24px;white-space:pre-wrap;color:#68758c}@media print{body{padding:0;background:white}section{max-width:none;margin:0}}';
    const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(f.title)+'</title><style>'+styles+'</style></head><body>'+f.slides.map(s=>'<section style="border-color:'+(themes[s.theme]||themes.violet).color+'"><h1>'+esc(s.title)+'</h1><p>'+esc(s.body)+'</p></section>').join('')+'</body></html>';
    download(html,name+'.html','text/html;charset=utf-8');
  }
  toast('Exported '+typeNames[f.type].toLowerCase());
}
function exportOfficeFile(){
  const file=getActive();if(!file)return;
  try{
    const result=file.type==='docs'?createDOCX(file):file.type==='sheets'?createXLSX(file):file.type==='slides'?createPPTX(file):null;
    if(!result)throw Error('Unsupported Office export.');
    const ext={docs:'docx',sheets:'xlsx',slides:'pptx'}[file.type];
    download(result.bytes,slug(file.title)+'.'+ext,'application/zip');
    closeModal();toast(ext.toUpperCase()+' file exported (limited fidelity)');
  }catch(error){toast('Office export: '+String(error.message||error).slice(0,100));}
}
function confirmOfficeImport(){
  if(!pendingOfficeImport)return;
  const {result,title}=pendingOfficeImport;
  pendingOfficeImport=null;
  if(!typeNames[result.type]){toast('Unsupported import type');return;}
  const f=makeFile(result.type,title);
  if(result.type==='docs')f.body=sanitize(result.body);
  if(result.type==='sheets'){
    f.worksheets=result.worksheets;f.activeSheetIndex=result.activeSheetIndex;
    f.cells=result.cells;f.cellStyles=result.cellStyles;ensureWorkbook(f);
  }
  if(result.type==='slides')f.slides=result.slides;
  files.unshift(f);closeModal();persist();openFile(f.id);
  toast('Office file imported; review formatting');
}
function officeImportReview(result,title){
  pendingOfficeImport={result,title};
  const fmt={docs:'DOCX',sheets:'XLSX',slides:'PPTX'}[result.type];
  const notes=['This file will be converted to MySoft\'s supported editing model. Unsupported features may be lost on re-export.',...(result.warnings||[])];
  modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Import '+fmt+' for editing?</h2><p><strong>'+esc(title)+'</strong></p><ul class="import-warning-list">'+notes.slice(0,8).map(note=>'<li>'+esc(note)+'</li>').join('')+'</ul><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-primary" data-action="confirm-office-import">Import editable file</button></div></div></div>';
}
function backup(){download(JSON.stringify(workspaceSnapshot(),null,2),'mysoft-office-backup.json','application/json');toast('Workspace backup exported');}
function validImport(payload){
  if(!payload||!Array.isArray(payload.files)||payload.files.length>500) return null;
  const output=[];
  for(const f of payload.files){
    if(!f||!typeNames[f.type]||typeof f.title!=='string'||f.title.length>120||typeof f.id!=='string') return null;
    if(f.type==='docs'||f.type==='notes'){
      if(typeof f.body!=='string'||f.body.length>1000000) return null;
    }
    if(f.type==='sheets'&&(!f.cells||typeof f.cells!=='object'||Array.isArray(f.cells)||Object.keys(f.cells).length>26000)) return null;
    if(f.type==='slides'&&(!Array.isArray(f.slides)||f.slides.length<1||f.slides.length>200||f.slides.some(s=>!s||typeof s.title!=='string'||typeof s.body!=='string'||s.title.length>500||s.body.length>20000))) return null;
    output.push(f);
  }
  return output;
}
function applyWorkspace(payload){
  const imported=validImport(payload);
  const trash=payload?.trash?validImport({files:payload.trash}):[];
  if(!imported||!trash)return false;
  files=imported.map(f=>({...f,updatedAt:Number(f.updatedAt)||Date.now()}));
  trashFiles=trash.slice(0,100);
  revisions=payload.versions&&typeof payload.versions==='object'&&!Array.isArray(payload.versions)?payload.versions:{};
  persist();navigate('home');return true;
}
async function importBackup(file){
  try{
    if(file.size>10000000){toast('Backup is too large');return;}
    const parsed=JSON.parse(await file.text());
    if(!validImport(parsed)){toast('Invalid MySoft backup');return;}
    if(!confirm('Replace local files with this backup? Export your current workspace first.'))return;
    if(applyWorkspace(parsed))toast('Workspace restored');
    else toast('Backup failed validation');
  }catch{toast('Could not read this backup');}
}
async function importExternalFile(file){
  if(file.size>18000000){toast('File exceeds the 18 MB import limit');return;}
  const ext=file.name.toLowerCase().split('.').pop();
  const title=file.name.replace(/\.[^.]+$/,'').slice(0,120);
  if(['docx','xlsx','pptx'].includes(ext)){
    try {
      const data=await file.arrayBuffer();
      const result=ext==='docx'?await importDOCX(data):ext==='xlsx'?await importXLSX(data):await importPPTX(data);
      officeImportReview(result,title);
    } catch(error){toast('Office import failed: '+String(error.message||error).slice(0,95));}
    return;
  }
  if(file.size>1000000){toast('Text/CSV import limit is 1 MB');return;}
  if(!['csv','txt','md','html','htm'].includes(ext)){toast('Unsupported file format');return;}
  const source=await file.text();
  if(ext==='csv'){
    const f=newFile('sheets',title);f.cells=parseCSV(source);touch(f);render();
  }else if(ext==='html'||ext==='htm'){
    const f=newFile('docs',title);f.body=sanitize(source);touch(f);render();
  }else{
    const f=newFile('notes',title);f.body=esc(source).replace(/\n/g,'<br>');touch(f);render();
  }
  toast('File imported');
}
async function runCloudAction(action){
  try{
    if(action==='cloud-signout'){await cloudSignOut();cloudUser=null;modal('cloud');toast('Signed out');return;}
    if(action==='cloud-upload'){
      if(!persist())return;
      await cloudPush(workspaceSnapshot());toast('Cloud snapshot uploaded');modal('cloud');return;
    }
    if(action==='cloud-download'){
      const row=await cloudPull();
      if(!row){toast('No cloud snapshot found');return;}
      if(!validImport(row.payload)){toast('Cloud snapshot failed validation');return;}
      if(!confirm('Replace ALL local files with cloud snapshot from '+new Date(row.updated_at).toLocaleString()+'? Download a local backup first.'))return;
      if(applyWorkspace(row.payload)){closeModal();toast('Cloud snapshot downloaded');}
    }
  }catch(error){toast('Cloud: '+String(error.message||error).slice(0,95));}
}
function updateCell(ref,raw,rerender=false){
  const f=getActive();if(!f||f.type!=='sheets')return;
  f.cells[ref]=raw;
  touch(f);
  if(rerender) refreshCells();
}
function updateDocumentOutline(file){
  const list=document.getElementById('doc-outline-list');
  if(list&&file?.type==='docs')list.innerHTML=outlineItems(file);
}
function undoDocument(direction){
  const file=getActive();
  if(!file||!['docs','notes'].includes(file.type))return;
  const html=direction==='undo'?documentHistory.undo(file.id):documentHistory.redo(file.id);
  if(html===null){toast('No more '+direction+' steps in this session');return;}
  file.body=sanitize(html);
  const editor=document.getElementById('rich-content');
  if(editor){editor.innerHTML=file.body;editor.focus();}
  updateDocumentOutline(file);
  touch(file,false);persist();
}
function refreshCells(){
  const f=getActive();if(!f||f.type!=='sheets')return;
  document.querySelectorAll('[data-cell]').forEach(el=>{
    if(document.activeElement!==el)el.value=sheetCellAppearance(f,el.dataset.cell,displayCell(el.dataset.cell,f.cells)).value;
  });
}
function goToCell(address,focus=true){
  const location=parseAddress(address);
  if(!location){toast('Enter a cell from A1 to Z1000');return false;}
  selectedCell=location.address;
  const scroll=document.getElementById('sheet-scroll');
  if(!scroll)return false;
  const desiredTop=(location.row-1)*ROW_HEIGHT;
  const topVisible=Math.floor(scroll.scrollTop/ROW_HEIGHT)+1;
  const lastVisible=topVisible+Math.floor(scroll.clientHeight/ROW_HEIGHT)-3;
  if(location.row<topVisible||location.row>lastVisible)scroll.scrollTop=Math.max(0,desiredTop-HEADER_HEIGHT);
  const desiredLeft=location.col*124;
  if(desiredLeft<scroll.scrollLeft||desiredLeft>scroll.scrollLeft+scroll.clientWidth-150)
    scroll.scrollLeft=Math.max(0,desiredLeft-124);
  sheetScrollTop=scroll.scrollTop;
  repaintGrid(scroll,getActive(),selectedCell,true);
  const input=scroll.querySelector('[data-cell="'+location.address+'"]');
  if(focus&&input)input.focus({preventScroll:true});
  const bar=document.getElementById('formula-input');
  if(bar)bar.value=getActive().cells[selectedCell]||'';
  const name=document.getElementById('cell-address');
  if(name)name.value=selectedCell;
  return true;
}
document.addEventListener('scroll',event=>{
  const target=event.target;
  if(target?.id!=='sheet-scroll'||view!=='editor')return;
  sheetScrollTop=target.scrollTop;
  const f=getActive();
  if(f?.type==='sheets')repaintGrid(target,f,selectedCell);
},true);
document.addEventListener('mousedown',event=>{
  if(event.target.closest('[data-cmd]')) event.preventDefault();
});
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action],[data-nav],[data-create],[data-open],[data-star],[data-delete],[data-duplicate],[data-slide],[data-theme],[data-template],[data-cmd],[data-restore-trash],[data-purge],[data-revision],[data-outline-index]');
  if(!el){
    if(event.target.classList.contains('modal-backdrop'))closeModal();
    return;
  }
  if(el.dataset.outlineIndex!==undefined){
    document.querySelectorAll('#rich-content h1,#rich-content h2,#rich-content h3')[Number(el.dataset.outlineIndex)]?.scrollIntoView({block:'center',behavior:'smooth'});
    return;
  }
  if(el.dataset.restoreTrash){restoreTrash(el.dataset.restoreTrash);return;}
  if(el.dataset.purge){purgeTrash(el.dataset.purge);return;}
  if(el.dataset.revision!==undefined){
    const file=getActive(),index=Number(el.dataset.revision);
    if(file){
      const history=[...(revisions[file.id]||[])].reverse();
      const revision=history[index];
      if(revision&&confirm('Restore this version? The latest version remains in history.')){
        snapshot(file,true);
        Object.assign(file,restoreRevision(file,revision));
        persist();closeModal();render();toast('Version restored');
      }
    }
    return;
  }
  if(el.dataset.nav){navigate(el.dataset.nav);return;}
  if(el.dataset.open){openFile(el.dataset.open);return;}
  if(el.dataset.create){newFile(el.dataset.create);return;}
  if(el.dataset.star){const f=files.find(x=>x.id===el.dataset.star);if(f){f.starred=!f.starred;touch(f);render();}return;}
  if(el.dataset.duplicate){duplicate(el.dataset.duplicate);return;}
  if(el.dataset.delete){modal('delete',el.dataset.delete);return;}
  if(el.dataset.template!==undefined){createTemplate(Number(el.dataset.template));return;}
  if(el.dataset.slide!==undefined){slideIndex=Number(el.dataset.slide);activeObjectId=null;render();return;}
  if(el.dataset.theme){const f=getActive();if(f?.type==='slides'){f.slides[slideIndex].theme=el.dataset.theme;touch(f);render();}return;}
  if(el.dataset.cmd){
    if(['undo','redo'].includes(el.dataset.cmd)){undoDocument(el.dataset.cmd);return;}
    const editable=document.getElementById('rich-content');
    editable?.focus();
    document.execCommand(el.dataset.cmd,false,null);
    if(editable){const f=getActive();f.body=sanitize(editable.innerHTML);touch(f);}
    return;
  }
  const action=el.dataset.action;
  if(action==='mobile'){mobileOpen=!mobileOpen;render();}
  if(action==='new')modal('new');
  if(action==='modal-close')closeModal();
  if(action==='confirm-delete')remove(el.dataset.id);
  if(action==='close-editor')navigate('files');
  if(action==='export')exportFile();
  if(action==='office-export')modal('office-export',activeId);
  if(action==='office-export-confirm')exportOfficeFile();
  if(action==='confirm-office-import')confirmOfficeImport();
  if(action==='backup')backup();
  if(action==='import')document.getElementById('backup-upload').click();
  if(action==='import-file')document.getElementById('external-file-upload').click();
  if(action==='revisions')modal('revisions',activeId);
  if(action==='cloud')cloudCurrentUser().then(user=>{cloudUser=user;modal('cloud');}).catch(()=>toast('Could not open cloud sign-in'));
  if(action?.startsWith('cloud-'))runCloudAction(action);
  const f=getActive();
  if(f?.type==='slides'){
    if(action==='slide-add'){f.slides.push({title:'New slide',body:'Add your ideas here',theme:'violet'});slideIndex=f.slides.length-1;touch(f);render();}
    if(action==='slide-duplicate'){const s=structuredClone(f.slides[slideIndex]);f.slides.splice(slideIndex+1,0,s);slideIndex++;touch(f);render();}
    if(action==='slide-delete'){if(f.slides.length===1){toast('Keep at least one slide');return;}f.slides.splice(slideIndex,1);slideIndex=Math.max(0,slideIndex-1);touch(f);render();}
  }
});
document.addEventListener('submit',event=>{
  if(event.target.id==='cloud-form'){
    event.preventDefault();
    const mode=event.submitter?.value;
    const data=new FormData(event.target);
    const email=String(data.get('email')||''),password=String(data.get('password')||'');
    cloudSignIn(email,password,mode==='register').then(async()=>{
      cloudUser=await cloudCurrentUser();modal('cloud');
      toast(cloudUser?'Signed in successfully':'Account created. Check your email for verification.');
    }).catch(error=>toast('Cloud login: '+String(error.message||error).slice(0,90)));
    return;
  }
  if(event.target.id!=='new-form')return;
  event.preventDefault();
  const data=new FormData(event.target),type=data.get('type'),title=String(data.get('title')||'').trim();
  if(!typeNames[type])return;
  closeModal();newFile(type,title);
});
document.addEventListener('input',event=>{
  const target=event.target,f=getActive();
  if(target.id==='global-search'){query=target.value;return;}
  if(!f)return;
  if(target.id==='document-title'||target.id==='note-title'){
    f.title=target.value||'Untitled '+typeNames[f.type];
    const companion=document.getElementById(target.id==='note-title'?'document-title':'note-title');
    if(companion)companion.value=f.title;
    touch(f);
  }
  if(target.id==='rich-content'){f.body=target.innerHTML;touch(f);updateDocumentOutline(f);}
  if(target.id==='slide-title'||target.id==='slide-body'){
    f.slides[slideIndex][target.id==='slide-title'?'title':'body']=target.textContent||'';touch(f);
  }
  if(target.matches('[data-cell]')){
    updateCell(target.dataset.cell,target.value);
    const formula=document.getElementById('formula-input');if(formula)formula.value=target.value;
  }
  if(target.id==='formula-input'){
    updateCell(selectedCell,target.value);
    const cell=document.querySelector('[data-cell="'+selectedCell+'"]');
    if(cell&&document.activeElement!==cell)cell.value=target.value;
  }
});
document.addEventListener('focusin',event=>{
  const cell=event.target.closest('[data-cell]');if(!cell)return;
  const f=getActive();if(!f||f.type!=='sheets')return;
  document.querySelectorAll('.sheet-table td.selected').forEach(td=>td.classList.remove('selected'));
  selectedCell=cell.dataset.cell;cell.parentElement.classList.add('selected');
  cell.value=f.cells[selectedCell]||'';
  const name=document.getElementById('cell-address'),formula=document.getElementById('formula-input');
  if(name)name.value=selectedCell;
  if(formula)formula.value=cell.value;
});
document.addEventListener('focusout',event=>{
  const t=event.target,f=getActive();
  if(!f)return;
  if(t.id==='rich-content'){t.innerHTML=sanitize(t.innerHTML);f.body=t.innerHTML;touch(f);updateDocumentOutline(f);}
  if(t.matches('[data-cell]'))setTimeout(refreshCells,0);
  if(t.id==='formula-input')setTimeout(refreshCells,0);
});
document.addEventListener('change',event=>{
  if(event.target.id==='file-filter'){fileFilter=event.target.value;render();return;}
  if(event.target.id==='doc-block'){
    document.getElementById('rich-content')?.focus();
    document.execCommand('formatBlock',false,event.target.value);
    const f=getActive(),editable=document.getElementById('rich-content');
    if(f&&editable){f.body=sanitize(editable.innerHTML);touch(f);}
    return;
  }
  if(event.target.id==='backup-upload'&&event.target.files[0]){
    importBackup(event.target.files[0]);event.target.value='';
  }
  if(event.target.id==='external-file-upload'&&event.target.files[0]){
    importExternalFile(event.target.files[0]).catch(()=>toast('File import failed'));event.target.value='';
  }
});
document.addEventListener('keydown',event=>{
  if(view==='editor'&&['docs','notes'].includes(getActive()?.type)&&
      event.target.closest('#rich-content')&&(event.ctrlKey||event.metaKey)){
    const key=event.key.toLowerCase();
    if(key==='z'||key==='y'){
      event.preventDefault();undoDocument((key==='z'&&!event.shiftKey)?'undo':'redo');return;
    }
  }
  if(event.target.id==='global-search'&&event.key==='Enter'){event.preventDefault();view='files';fileFilter='all';render();return;}
  if(event.key==='Escape'){closeModal();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
    event.preventDefault();persist();toast('Saved locally');
  }
  if(event.target.id==='formula-input'&&event.key==='Enter'){event.preventDefault();event.target.blur();refreshCells();}
  if(event.target.id==='cell-address'&&event.key==='Enter'){
    event.preventDefault();goToCell(event.target.value);
    return;
  }
  if(view==='editor'&&getActive()?.type==='sheets'){
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='g'){
      event.preventDefault();document.getElementById('cell-address')?.focus();document.getElementById('cell-address')?.select();return;
    }
    const cell=event.target.closest('[data-cell]');
    if(cell&&!event.ctrlKey&&!event.metaKey){
      const deltas={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],Enter:[event.shiftKey?-1:1,0],Tab:[0,event.shiftKey?-1:1]};
      if(deltas[event.key]){
        event.preventDefault();
        const [dr,dc]=deltas[event.key];
        const f=getActive();const raw=cell.value;
        if(raw!==String(f.cells[cell.dataset.cell]||''))updateCell(cell.dataset.cell,raw);
        goToCell(moveAddress(cell.dataset.cell,dr,dc));
        return;
      }
    }
  }
});
document.addEventListener('paste',event=>{
  const cell=event.target.closest('[data-cell]');
  if(cell&&view==='editor'&&getActive()?.type==='sheets'){
    const input=event.clipboardData.getData('text/plain');
    if(input.includes('\t')||input.includes('\n')||input.includes('\r')){
      event.preventDefault();
      const f=getActive();
      const count=pasteGrid(f.cells,cell.dataset.cell,input);
      touch(f);persist();
      repaintGrid(document.getElementById('sheet-scroll'),f,selectedCell,true);
      toast(count+' cells pasted');
      return;
    }
  }
  if(event.target.closest('[contenteditable="true"]')){
    event.preventDefault();
    document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
  }
});
document.addEventListener('drop',event=>{
  if(event.target.closest('[contenteditable="true"]')) event.preventDefault();
});
const backupInput=document.createElement('input');
backupInput.type='file';backupInput.accept='.json,application/json';backupInput.id='backup-upload';backupInput.hidden=true;
document.body.appendChild(backupInput);
const externalInput=document.createElement('input');
externalInput.type='file';externalInput.accept='.txt,.md,.csv,.html,.htm,.docx,.xlsx,.pptx';
externalInput.id='external-file-upload';externalInput.hidden=true;
document.body.appendChild(externalInput);
initializeOfficeTools({
  getFile:getActive,touch,persist,render,sanitize,toast,
  getSelectedCell:()=>selectedCell,getSlideIndex:()=>slideIndex,
  setSlideIndex:i=>{slideIndex=i;}
});
window.addEventListener('pagehide',()=>{clearTimeout(savedTimer);persist();});
window.addEventListener('popstate',()=>{restoreRoute();render();});
restoreRoute();
persist();
render();
