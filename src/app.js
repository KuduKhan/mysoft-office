import {initializeRibbonWorkbench} from './ribbon-workbench.js';
import {filePreviewCards} from './mo-file-previews.js';
import {noteCanvasStyle} from './mo-workbench.js';
import {icon} from './icons.js';
import {readableEditorText} from './studio-pro-tools.js';
import {createTemplateLibrary} from './template-library.js';
import {initializeDialogFocus} from './dialog-focus.js';
import {createMediaStudio} from './media-studio.js';
import {createMediaFields,validateMediaRecord,MEDIA_MIMES} from './media-model.js';
import {inspectMedia} from './media-io.js';
import {createPDFStudio} from './pdf-studio.js';
import {inspectPDF,exportPDF,validatePDFRecord,PDF_MAX_BYTES} from './pdf-model.js';
import {studioShortcut} from './studio-shortcuts.js';
import {recentWorkspaceFiles,editorMetric} from './studio-workspace.js';
import {searchWorkspaceFiles,workspaceMatchSource} from './workspace-search.js';
import { BrowserWorkspaceStore, readLegacyWorkspace, readRecoveryJournal, validateWorkspace, LEGACY_KEYS, RECOVERY_KEY } from './workspace-storage.js';
import { COLUMNS, ROW_COUNT, displayCell } from './formulas.js';
import { addRevision, restoreRevision } from './revisions.js';
import { parseCSV, makeCSV } from './file-formats.js';
import { cloudConfigured, cloudCurrentUser, cloudSignIn, cloudSignOut, cloudPush, cloudPull } from './cloud.js';
import { ensureWorkbook, PAGE_SIZES } from './office-model.js';
import { powerRibbon, ribbonToolCommands, sheetCellAppearance, initializeOfficeTools } from './office-ui.js';
import { sheetGrid, repaintGrid } from './sheet-grid.js';
import { DocumentHistory, headingsFromHTML } from './document-history.js';
import { createDOCX, importDOCX } from './ooxml-docx.js';
import { createXLSX, importXLSX } from './ooxml-xlsx.js';
import { createPPTX, importPPTX } from './ooxml-pptx.js';
import { SLIDE_PRESETS } from './studio-tools.js';
import {renderedSlideObjects,getSlideObject,updateSlideObject,moveSlideObject} from './slide-objects.js';
import {organizeNotes,noteLocation,moveNote,renameNoteCollection} from './note-structure.js';
import {docComments,toggleDocComment,deleteDocComment,commentSummary} from './doc-review.js';
import {documentGeometry,normalizedPageSettings} from './doc-layout.js';
import {noteSearchText} from './note-search.js';
import {toggleNotePin} from './note-pin.js';
import {SheetRecalculator} from './sheet-recalc.js';
import {snapSlideCoordinate} from './slide-layers.js';
import { parseAddress, moveAddress, pasteGrid, populatedBounds, ROW_HEIGHT, HEADER_HEIGHT } from './sheet-window.js';

const typeNames={docs:'Document',sheets:'Spreadsheet',slides:'Presentation',notes:'Note',pdf:'PDF',media:'Media project'};
const typeIcons={docs:'file-text',sheets:'table',slides:'presentation',notes:'notebook',pdf:'file-scan',media:'clapperboard'};
const fileIcon=file=>file.type==='media'?({audio:'waveform',video:'film',image:'image',drawing:'pen-tool',empty:'clapperboard'}[file.mediaKind]||typeIcons.media):typeIcons[file.type];
const labels={docs:'MySoft Docs',sheets:'MySoft Sheets',slides:'MySoft Slides',notes:'MySoft Notes',pdf:'MySoft PDF',media:'MySoft Media'};
const themes={
  violet:{label:'Violet',color:'#7161e8',dark:false},
  ocean:{label:'Ocean',color:'#2895d9',dark:false},
  forest:{label:'Forest',color:'#22a88e',dark:false},
  midnight:{label:'Midnight',color:'#a58bff',dark:true}
};
function esc(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function plain(html){
  const dom=new DOMParser().parseFromString(String(html||''),'text/html');
  return readableEditorText(dom.body);
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
    if(node.tagName==='HR'&&node.getAttribute('data-mysoft-page-break')==='true')
      wrapper.setAttribute('data-mysoft-page-break','true');
    if(node.tagName==='A'){
      const url=node.getAttribute('href')||'';
      if(/^https?:\/\//i.test(url)||/^#\/file\/[a-zA-Z0-9_-]{1,200}$/.test(url)){
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
    if(['P','DIV','H1','H2','H3','BLOCKQUOTE','LI','TD','TH'].includes(node.tagName)){
      for(const prop of ['marginTop','marginBottom','marginLeft','marginRight','textIndent']){const v=node.style?.[prop]||'';if(/^(?:\d|[1-8]\d|9[0-6])(?:\.\d+)?px$/.test(v))wrapper.style[prop]=v;}
      if(/^-?(?:[0-7](?:\.\d+)?|8)(?:px)$/.test(node.style?.letterSpacing||''))wrapper.style.letterSpacing=node.style.letterSpacing;
      if(['ltr','rtl'].includes(node.style?.direction))wrapper.style.direction=node.style.direction;
      if(['1','1.2','1.5','1.6','2','2.5','3'].includes(node.style?.lineHeight))wrapper.style.lineHeight=node.style.lineHeight;
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
  const defaults={docs:{body:''},sheets:{cells:{}},slides:{slides:[{title:'Untitled presentation',body:'Add your ideas here',theme:'violet'}]},notes:{body:''},pdf:{pdfData:'',pdfPageCount:0,pdfRotations:{},pdfText:''},media:createMediaFields()};
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
let files=[],trashFiles=[],revisions={};
let workspaceStore=null,storageReady=false,saveState='loading',saveRevision=0;
const SAVE_LABELS={loading:'Opening workspace…',saving:'Saving…',saved:'Saved on device',failed:'Save failed — export backup'};
function saveLabel(){return SAVE_LABELS[saveState]||SAVE_LABELS.failed;}
function updateSaveStatus(state){
  saveState=state;
  for(const id of ['save-status','studio-storage-status']){
    const node=document.getElementById(id);
    if(node)node.textContent=saveLabel();
  }
}
let cloudUser=null;
let pendingOfficeImport=null;
let activeObjectId=null,selectedReviewQuote='',slideDrag=null;
const recalcGraphs=new WeakMap();
function sheetRecalculator(file){
  if(!file?.cells)return null;
  let graph=recalcGraphs.get(file.cells);
  if(!graph){graph=new SheetRecalculator(file.cells);recalcGraphs.set(file.cells,graph);}
  return graph;
}
const documentHistory=new DocumentHistory();
let view='home',activeId=null,query='',fileFilter='all',selectedCell='A1',slideIndex=0,mobileOpen=false,sheetScrollTop=0;
const STUDIO_SHELL_KEY='mysoft-office-shell-v1';
let navCollapsed=false,focusMode=false,recentFileIds=[];
try{navCollapsed=JSON.parse(localStorage.getItem(STUDIO_SHELL_KEY)||'{}').collapsed===true;}catch{}
let savedTimer=0,toastTimer=0;
const app=document.getElementById('app');
const modalRoot=document.getElementById('modal-root');
initializeDialogFocus(modalRoot,app,()=>closeModal());
async function persist(workspace=workspaceSnapshot(),options={}){
  clearTimeout(savedTimer);
  const revision=++saveRevision;
  updateSaveStatus('saving');
  if(!storageReady){
    updateSaveStatus('failed');
    toast('Local storage unavailable. Export a JSON backup.');
    return false;
  }
  try{
    await workspaceStore.save(workspace,options);
    if(revision===saveRevision)updateSaveStatus('saved');
    return true;
  }catch(error){
    if(revision===saveRevision)updateSaveStatus('failed');
    toast(error?.name==='WorkspaceConflictError'?
      'Another tab changed the workspace. Export a JSON backup before reloading.':
      'Save failed. Export a JSON backup before leaving.');
    return false;
  }
}
async function saveCommand(){
  if(await persist())toast('Saved on this device');
}
function snapshot(file,force=false){if(file)revisions=addRevision(revisions,file,Date.now(),force);}
function touch(file,trackHistory=true){
  if(trackHistory&&['docs','notes'].includes(file.type))documentHistory.record(file.id,file.body||'');
  file.updatedAt=Date.now();snapshot(file);
  const mark=document.getElementById('save-status');
  ++saveRevision;
  updateSaveStatus('saving');
  if(storageReady)workspaceStore.stage(workspaceSnapshot());
  clearTimeout(savedTimer);savedTimer=setTimeout(()=>{void persist();},350);
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
const mediaStudio=createMediaStudio({importMedia:kind=>{mediaInput.accept=kind==='all'?mediaAccept:MEDIA_MIMES[kind].join(',');mediaInput.click();},newDrawing:()=>{const active=getActive(),reuse=active?.type==='media'&&active.mediaKind==='empty';const f=reuse?active:makeFile('media','Untitled drawing');f.title='Untitled drawing';f.mediaKind='drawing';f.mediaEdits.background='#ffffff';f.mediaEdits.textColor='#203040';if(!reuse)files.unshift(f);snapshot(f,true);void persist();openFile(f.id);},changed:f=>{touch(f);void persist();updateEditorMetrics();},toast,download});
const templateLibrary=createTemplateLibrary({labels,typeIcons,modalRoot,sanitize,getFiles:()=>files,getActive,makeFile,openFile,navigate,closeModal,toast,
  saveMetadata:file=>{touch(file,false);void persist();},
  addFiles:async records=>{
    let nextVersions=revisions;for(const file of records)nextVersions=addRevision(nextVersions,file,Date.now(),true);
    const next={files:[...records,...files],trash:trashFiles,versions:nextVersions};validateWorkspace(next);
    if(!await persist(next,{journal:false}))return false;
    files=next.files;revisions=next.versions;return true;
  }
});
const pdfStudio=createPDFStudio({download,toast,importPDF:()=>pdfInput.click(),changed:file=>{touch(file);void persist();updateEditorMetrics();}});
function sidebar(){
  const currentNav=view==='editor'?getActive()?.type:view;
  const nav=(id,title,ic,extra='',text=title)=>'<button type="button" class="nav-link '+(currentNav===id?'active':'')+'" data-nav="'+id+'" title="'+esc(title)+'" aria-label="'+esc(title)+'"'+(currentNav===id?' aria-current="page"':'')+'>'+icon(ic,18)+'<span class="nav-label">'+esc(text)+'</span>'+extra+'</button>';
  const action=(id,title,ic,text=title)=>'<button type="button" class="nav-link" data-action="'+id+'" title="'+esc(title)+'" aria-label="'+esc(title)+'">'+icon(ic,17)+'<span class="nav-label">'+esc(text)+'</span></button>';
  return '<aside class="sidebar '+(mobileOpen?'open':'')+'" id="studio-sidebar" aria-label="Workspace navigation">'+
    '<div class="studio-sidebar-top"><div class="brand"><img class="brand-symbol" src="assets/mysoft-mark.svg" width="42" height="42" alt="" aria-hidden="true"><div class="studio-brand-copy"><strong>MySoft <span>Office</span></strong></div><button type="button" class="studio-nav-collapse" data-action="nav-collapse" title="'+(navCollapsed?'Expand':'Collapse')+' sidebar" aria-label="'+(navCollapsed?'Expand':'Collapse')+' sidebar" aria-pressed="'+navCollapsed+'">'+icon('menu',16)+'</button><button type="button" class="studio-sidebar-dismiss" data-action="mobile-dismiss" aria-label="Close navigation" title="Close navigation">'+icon('x',17)+'</button></div></div>'+
    '<nav class="sidebar-nav" aria-label="Primary navigation"><div class="nav-caption">Workspace</div>'+nav('home','Overview','home')+nav('files','My files','folder','<span class="count">'+files.length+'</span>')+nav('starred','Starred','star')+nav('templates','Templates','grid')+nav('trash','Recycle bin','trash','<span class="count">'+trashFiles.length+'</span>')+
    '<div class="nav-caption">Applications</div>'+Object.keys(labels).map(t=>nav(t,labels[t],typeIcons[t],'',labels[t].replace('MySoft ',''))).join('')+'</nav>'+
    '<footer class="side-foot"><div class="storage-help">Files stay on this device.</div><div class="sidebar-utilities">'+
    action('cloud','Cloud snapshots','cloud','Cloud')+action('import-file','Import file','import')+action('backup','Export backup','download','Backup')+action('import','Import backup','upload','Restore')+'</div></footer></aside>';
}
function header(){
  const current=view==='editor'?labels[getActive()?.type]||'Editor':({home:'Overview',files:'My files',starred:'Starred',templates:'Templates',trash:'Recycle bin'})[view]||labels[view]||'Workspace';
  return '<header class="topbar"><div class="topbar-left"><button class="icon-btn mobile-menu" data-action="mobile" aria-label="Open navigation" aria-expanded="'+mobileOpen+'" aria-controls="studio-sidebar">'+icon('menu')+'</button><div class="studio-breadcrumb"><button data-nav="home">Workspace</button><span aria-hidden="true">/</span><strong>'+esc(current)+'</strong></div><div class="searchbox">'+icon('search',17)+'<input id="global-search" aria-label="Search filenames and content" placeholder="Search files and content  /" value="'+esc(query)+'"></div></div><div class="top-actions"><button class="btn btn-light studio-command-trigger" data-action="commands" title="Search commands (Ctrl+K)" aria-label="Search commands">'+icon('command',16)+'<span>Commands</span></button><button class="btn btn-light studio-customize" data-ot-action="preferences" title="Customize workspace" aria-label="Customize workspace">'+icon('settings',16)+'<span>Customize</span></button><button class="btn btn-primary" data-action="new">'+icon('plus',16)+'<span>New file</span></button><div class="avatar" title="Local workspace">MS</div></div></header>';
}
function appTiles(){
  const descriptions={docs:'Shape your words.',sheets:'Make sense of numbers.',slides:'Bring your story to life.',notes:'Keep every idea close.',pdf:'Read, arrange and extract.',media:'Edit, draw and create.'};
  return '<div class="app-grid">'+Object.keys(labels).map(t=>'<button class="app-card" data-create="'+t+'" aria-label="Open '+labels[t]+'"><span class="home-app-card-top"><span class="app-icon '+t+'">'+icon(typeIcons[t],22)+'</span><span class="home-app-arrow">'+icon('arrow-right',15)+'</span></span><strong>'+labels[t]+'</strong><span>'+descriptions[t]+'</span></button>').join('')+'</div>';
}
function homeDate(value){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(date):'Recently edited';}
function sectionHead(title,desc,action,actionLabel){
  return '<div class="section-head"><div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div>'+(action?'<button class="link-button" data-nav="'+action+'">'+esc(actionLabel)+' '+icon('chevron',15)+'</button>':'')+'</div>';
}
function renderRows(list,{recent=false}={}){
  if(view==='trash'){
    if(!list.length)return '<div class="empty-state">'+icon('trash',36)+'<h3>Recycle bin is empty</h3><p>Deleted files remain here until permanently removed.</p></div>';
    return '<div class="panel"><table class="data-table"><thead><tr><th>Deleted file</th><th>Type</th><th>Deleted</th><th>Recovery</th></tr></thead><tbody>'+
      list.map(f=>'<tr><td><div class="row"><span class="file-icon '+f.type+'">'+icon(fileIcon(f),17)+'</span><div class="file-name">'+esc(f.title)+'</div></div></td><td>'+typeNames[f.type]+'</td><td class="muted">'+dateText(f.trashedAt||Date.now())+'</td><td><div class="row"><button class="btn btn-soft btn-sm" data-restore-trash="'+esc(f.id)+'">Restore</button><button class="icon-btn" data-purge="'+esc(f.id)+'" title="Delete permanently">'+icon('trash',16)+'</button></div></td></tr>').join('')+'</tbody></table></div>';
  }
  if(!list.length) return '<div class="empty-state">'+icon('folder',36)+'<h3>No matching files yet</h3><p>Create a new file to get started.</p><button class="btn btn-primary" data-action="new">'+icon('plus',15)+' Create file</button></div>';
  return '<div class="panel"><table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Modified</th><th>Actions</th></tr></thead><tbody>'+
    list.map(f=>'<tr data-open="'+esc(f.id)+'" style="cursor:pointer"><td><div class="row"><span class="file-icon '+f.type+'">'+icon(fileIcon(f),17)+'</span><div><button type="button" class="file-name file-open" data-open="'+esc(f.id)+'" title="'+esc(f.title)+'">'+esc(f.title)+'</button><div class="file-type">'+labels[f.type]+(recent?'<span class="home-modified-mobile">'+esc(homeDate(f.updatedAt))+'</span>':'')+'</div>'+(query.trim()&&workspaceMatchSource(f,query)!=='name'?'<div class="workspace-search-origin">Found in '+esc(workspaceMatchSource(f,query))+'</div>':'')+'</div></div></td><td><span class="badge">'+typeNames[f.type]+'</span></td><td class="muted">'+(recent?esc(homeDate(f.updatedAt)):dateText(f.updatedAt))+'</td><td><div class="row"><button class="icon-btn '+(f.starred?'starred':'')+'" data-star="'+esc(f.id)+'" title="Toggle favorite" aria-label="Toggle favorite" aria-pressed="'+Boolean(f.starred)+'">'+icon('star',16)+'</button><button class="icon-btn" data-duplicate="'+esc(f.id)+'" title="Duplicate" aria-label="Duplicate">'+icon('copy',16)+'</button><button class="icon-btn" data-delete="'+esc(f.id)+'" title="Delete" aria-label="Delete">'+icon('trash',16)+'</button></div></td></tr>').join('')+'</tbody></table></div>';
}
function filtered(list){return searchWorkspaceFiles(list,query);}
function updateEditorMetrics(){
  const node=document.getElementById('studio-editor-metric'),f=getActive();
  if(node&&f)node.textContent=editorMetric(f,['docs','notes'].includes(f.type)?plain(f.body):'');
}
let fileDisplay='list';try{fileDisplay=localStorage.getItem('mysoft-office-file-display')==='grid'?'grid':'list';}catch{}
const previewCards=items=>filePreviewCards(items,{labels,typeIcons,dateText});
function home(){
  const sorted=filtered(files),recent=sorted.slice(0,7);
  const empty='<div class="home-empty">'+icon('folder',28)+'<h3>A fresh space for your next idea.</h3><p>Choose an app above, or bring an existing file into your workspace.</p><button class="btn btn-light" data-action="import-file">'+icon('upload',15)+' Import a file</button></div>';
  return '<div class="content home-content"><section class="home-intro" aria-labelledby="home-title"><div class="home-intro-copy"><div class="eyebrow">YOUR PERSONAL WORKSPACE</div><h1 id="home-title">Welcome to MySoft Office.</h1><p>Create something new, or pick up where you left off. Your work has a place here.</p><div class="home-intro-footer"><button class="btn btn-primary" data-nav="templates">'+icon('grid',16)+' Explore templates</button><span class="home-local-note">'+icon(storageReady&&saveState!=='failed'?'check':'info',14)+(storageReady&&saveState!=='failed'?'Stored on this device':'Local saving unavailable')+'</span></div></div><div class="home-intro-art" aria-hidden="true"><div class="home-art-halo"></div><div class="home-art-sheet home-art-back"></div><div class="home-art-sheet home-art-middle"></div><div class="home-art-sheet home-art-front"><img src="assets/mysoft-mark.svg" width="74" height="74" alt=""><span></span><span></span><span></span></div></div></section>'+
    '<section class="home-apps" aria-labelledby="home-apps-title"><div class="section-head"><div><h2 id="home-apps-title">Create with MySoft</h2><p>The right tool for your next idea.</p></div><span class="home-section-label">6 apps, one workspace</span></div>'+appTiles()+'</section>'+
    '<section class="home-recents" aria-label="Recent files">'+sectionHead('Recent files','Your latest work, ready to continue.','files','View all files')+(recent.length?previewCards(recent):empty)+'</section></div>';
}
function filesPage(){
  let list=view==='trash'?trashFiles:files;
  if(view==='starred') list=list.filter(f=>f.starred);
  else if(typeNames[view]) list=list.filter(f=>f.type===view);
  if(fileFilter!=='all') list=list.filter(f=>f.type===fileFilter);
  list=filtered(list);
  const title=view==='trash'?'Recycle bin':view==='starred'?'Starred files':typeNames[view]?labels[view]:'All files';
  return '<div class="content"><div class="spread page-heading"><div><h1>'+esc(title)+'</h1><p class="subtitle">'+(query.trim()?list.length+' results for “'+esc(query.trim().slice(0,128))+'”':list.length+' files · Saved in this browser')+'</p></div>'+(view!=='trash'?'<div class="mo-view-switch" role="group" aria-label="File display"><button type="button" data-action="files-list" aria-label="List view" aria-pressed="'+(fileDisplay==='list')+'">'+icon('list-tree',16)+'</button><button type="button" data-action="files-grid" aria-label="Grid view" aria-pressed="'+(fileDisplay==='grid')+'">'+icon('grid',16)+'</button></div>':'')+'</div>'+
    '<div class="spread file-filters"><label class="row"><span class="muted">File type</span><select id="file-filter" aria-label="Filter by file type"><option value="all">All types</option>'+Object.keys(labels).map(t=>'<option value="'+t+'" '+(fileFilter===t?'selected':'')+'>'+labels[t]+'</option>').join('')+'</select></label><span class="muted">Recently edited first</span></div>'+
    (fileDisplay==='grid'&&view!=='trash'&&list.length?previewCards(list):renderRows(list))+'</div>';
}
function templatesPage(){return templateLibrary.gallery();}
const panelState={};
let commandTools=[];
function panelsHidden(type){
  if(!(type in panelState)){try{panelState[type]=localStorage.getItem('mysoft-panels-'+type)==='hidden';}catch{panelState[type]=false;}}
  return panelState[type];
}
function editorWorkspaceActions(f){
  return '<button type="button" class="btn btn-light btn-sm mo-appearance" data-ot-action="preferences" title="Workspace appearance" aria-label="Customize workspace">'+icon('settings',15)+'</button>'+(['pdf','media'].includes(f.type)?'<button type="button" class="btn btn-light btn-sm mo-file-action" data-action="file-menu" aria-label="File actions" aria-haspopup="dialog">'+icon('folder',15)+'</button>':'')+'<button type="button" class="btn btn-light btn-sm editor-tool-search" data-action="commands" title="Find editor tools (Ctrl+K)" aria-label="Find editor tools">'+icon('search',15)+'<span>Find tools</span></button>'+(['docs','slides','notes','pdf','media'].includes(f.type)?'<button type="button" class="btn btn-light btn-sm editor-panels-toggle" data-action="editor-panels" aria-pressed="'+!panelsHidden(f.type)+'" aria-label="'+(panelsHidden(f.type)?'Show':'Hide')+' editor panels" title="Show or hide supporting panels">'+icon('panel-left',15)+'<span>Panels</span></button>':'');
}
function editorHead(f){
  return '<div class="editor-head"><button class="icon-btn" data-action="close-editor" title="Back to files">'+icon('back',19)+'</button><span class="file-icon '+f.type+'">'+icon(fileIcon(f),18)+'</span><input class="doc-title" id="document-title" aria-label="File title" value="'+esc(f.title)+'" maxlength="120"><div class="save-mark" id="save-status" role="status">'+esc(saveLabel())+'</div>'+editorWorkspaceActions(f)+templateLibrary.editorActions()+(['notes','pdf','media'].includes(f.type)?'':'<button class="btn btn-soft btn-sm" data-action="office-export">'+icon('download',15)+' '+({docs:'DOCX',sheets:'XLSX',slides:'PPTX'}[f.type])+'</button>')+'<button class="btn btn-light btn-sm" data-action="revisions">'+icon('clock',15)+' History</button><button class="btn btn-light btn-sm" data-action="export">'+icon('download',15)+' Export</button><button type="button" class="btn btn-light btn-sm studio-focus-toggle" data-action="focus-mode" aria-pressed="'+focusMode+'" title="'+(focusMode?'Exit':'Enter')+' focus mode">'+icon('focus',14)+'<span class="studio-focus-label">'+(focusMode?'Exit focus':'Focus')+'</span></button></div>';
}
function docToolbar(){
  return '<div class="toolbar">'+
    '<select id="doc-block" aria-label="Paragraph style"><option value="P">Normal text</option><option value="H1">Heading 1</option><option value="H2">Heading 2</option><option value="H3">Heading 3</option><option value="BLOCKQUOTE">Quote</option></select><span class="toolbar-divider"></span>'+
    '<button class="tool" data-cmd="undo" title="Undo">'+icon('undo-2',16)+'</button><button class="tool" data-cmd="redo" title="Redo">'+icon('redo-2',16)+'</button><span class="sheet-hint">Select text to format</span></div>';
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
  const p=documentGeometry(f.pageSettings||{});
  const prefs=normalizedPageSettings(f.pageSettings||{});
  const style='width:min(100%,'+Math.round(p.width*3.78)+'px);min-height:'+Math.round(p.height*3.78)+'px;padding:'+Math.round(p.margin*3.78)+'px;line-height:'+p.lineHeight+';background-color:'+p.background;
  const paperLabels='<div class="doc-page-metadata" aria-label="Document page setup">'+p.paper+' · '+p.orientation+' · '+Math.round(p.margin)+'mm margins</div>';
  const header='<div class="doc-paper-header" aria-label="Document header">'+esc(prefs.header)+'</div>';
  const footer='<div class="doc-paper-footer" aria-label="Document footer">'+esc(prefs.footer)+'</div>';
  return docToolbar()+'<div class="editor-body"><div class="doc-edit-layout"><aside class="doc-outline"><details class="doc-outline-disclosure"'+(isMobileLayout()?'':' open')+'><summary>Document outline</summary><div id="doc-outline-list">'+outlineItems(f)+'</div>'+reviewPanel(f)+'</details></aside><div class="doc-canvas"><div class="doc-page-frame">'+paperLabels+header+'<article id="rich-content" data-file-id="'+esc(f.id)+'" class="document-paper" style="'+style+'" contenteditable="true" spellcheck="true" role="textbox" aria-label="Document content" data-placeholder="Start writing your document...">'+sanitize(f.body)+'</article>'+footer+'</div></div></div></div>';
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
    '<div class="slide-stage-wrap"><div class="slide-stage '+(theme.dark?'dark':'')+' studio-preset'+(s.studioRoadmap?' studio-roadmap':'')+'" style="--slide-accent:'+theme.color+';--studio-slide-bg:'+studio.background+';--studio-slide-text:'+studio.foreground+';--studio-slide-highlight:'+studio.accent+'"><div class="slide-tag">MySoft Slides · '+(slideIndex+1)+' / '+f.slides.length+'</div><div class="slide-title" contenteditable="true" id="slide-title" role="textbox" aria-label="Slide title" data-placeholder="Slide title">'+esc(s.title)+'</div><div class="slide-body" contenteditable="true" id="slide-body" role="textbox" aria-label="Slide body">'+esc(s.body)+'</div><div class="studio-object-layer" aria-label="Editable slide objects">'+renderedSlideObjects(s,{editable:true,selectedId:activeObjectId})+'</div></div></div>'+
    '<div class="slide-controls"><h3>Design theme</h3>'+Object.entries(themes).map(([k,v])=>'<button class="theme-choice '+(s.theme===k?'active':'')+'" data-theme="'+k+'"><span class="theme-dot" style="background:'+v.color+'"></span>'+v.label+'</button>').join('')+
    '<h3 style="margin-top:30px">Slide actions</h3><button class="btn btn-light btn-sm" data-action="slide-duplicate" style="width:100%;margin:6px 0">'+icon('copy',14)+' Duplicate</button><button class="btn btn-light btn-sm" data-action="slide-delete" style="width:100%;margin:6px 0">'+icon('trash',14)+' Delete</button></div></div>';
}
function notesEditor(f){
  const groups=organizeNotes(files),location=noteLocation(f);
  const tree=groups.map(book=>'<div class="studio-notebook-group"><div class="studio-notebook-title">'+esc(book.name)+'</div>'+
    book.sections.map(sec=>'<div class="studio-notebook-section">'+esc(sec.title)+'</div>'+
      sec.notes.map(n=>'<button class="note-list-item '+(n.id===f.id?'active':'')+'" data-note-search-item="'+esc(noteSearchText(n).slice(0,3500))+'" data-open="'+esc(n.id)+'"><strong>'+esc(n.title)+'</strong><span>'+dateText(n.updatedAt)+'</span></button>').join('')
    ).join('')+'</div>').join('');
  return '<div class="note-layout"><div class="note-list"><div class="spread"><h3>Notebooks</h3><button class="icon-btn" data-create="notes" title="New note">'+icon('plus',16)+'</button></div>'+'<input id="note-search" type="search" class="studio-note-search" aria-label="Search notebooks and notes" placeholder="Search title, tags, content…"><p id="note-no-results" class="studio-note-no-results" hidden>No matching notes.</p><div id="note-tree">'+tree+'</div></div>'+
    '<div class="note-editor"'+(f.noteCanvas?' data-custom-canvas="true"':'')+' style="'+esc(noteCanvasStyle(f))+'"><div class="studio-note-heading"><div class="eyebrow">MY NOTES</div>'+
    '<button type="button" class="studio-pin-btn '+(f.pinned?'is-pinned':'')+'" data-note-pin="true" aria-pressed="'+Boolean(f.pinned)+'">'+icon('pin',14)+'<span>'+(f.pinned?'Pinned':'Pin note')+'</span></button></div><div class="studio-note-organizer">'+
    '<label>Notebook<input id="note-notebook" aria-label="Notebook" maxlength="40" value="'+esc(location.notebook)+'"></label>'+
    '<label>Section<input id="note-section" aria-label="Section" maxlength="40" value="'+esc(location.section)+'"></label>'+
    '<button class="btn btn-soft btn-sm" data-note-move="true">Move note</button></div>'+
    '<input class="note-title" id="note-title" aria-label="Note title" value="'+esc(f.title)+'" maxlength="120">'+
    '<div class="note-meta">Private to this browser · Autosaved · Tags: '+esc((f.tags||[]).join(', ')||'none')+'</div>'+
    '<div id="rich-content" data-file-id="'+esc(f.id)+'" class="note-content" contenteditable="true" spellcheck="true" role="textbox" aria-label="Note content" data-placeholder="Capture your thoughts...">'+sanitize(f.body)+'</div></div></div>';
}
function editor(){
  const f=getActive();
  if(!f){view='files';return filesPage();}
  if(['docs','notes'].includes(f.type))documentHistory.seed(f.id,f.body||'');
  const zoom=Math.round(parseFloat(document.documentElement.style.getPropertyValue('--studio-zoom'))||100);
  const status='<div class="studio-statusbar" role="status"><div class="studio-status-left"><span class="studio-status-dot"></span><span>MySoft '+typeNames[f.type]+'</span><span class="studio-status-divider">·</span><span id="studio-storage-status">'+esc(saveLabel())+'</span></div>'+
    '<div class="studio-status-right"><span id="studio-editor-metric">'+esc(editorMetric(f,['docs','notes'].includes(f.type)?plain(f.body):''))+'</span><span class="studio-shortcut">Ctrl+S · Save</span><button data-ot-action="zoom-out" class="studio-zoom-btn" aria-label="Zoom out">'+icon('minus',13)+'</button><span id="studio-zoom-value">'+zoom+'%</span><button data-ot-action="zoom-in" class="studio-zoom-btn" aria-label="Zoom in">'+icon('plus',13)+'</button></div></div>';
  const tabs=recentWorkspaceFiles(files,f.id,[...(f.demoPackId?files.filter(item=>item.demoPackId===f.demoPackId).map(item=>item.id):[]),...recentFileIds],f.demoPackId?6:5).map(file=>'<button type="button" class="studio-file-tab '+(file.id===f.id?'active':'')+'" data-app="'+file.type+'" data-workspace-tab="'+esc(file.id)+'" title="'+esc(file.title)+'" aria-label="Open '+esc(file.title)+'"'+(file.id===f.id?' aria-current="page"':'')+'><span class="studio-file-tab-icon '+file.type+'">'+icon(fileIcon(file),14)+'</span><span class="studio-file-tab-name">'+esc(file.title)+'</span></button>').join('');
  return '<div class="editor-shell" data-panels-hidden="'+panelsHidden(f.type)+'">'+editorHead(f)+'<nav class="studio-file-tabs" aria-label="Recent files">'+tabs+'</nav>'+(['pdf','media'].includes(f.type)?'':powerRibbon(f,selectedCell,slideIndex))+(f.type==='docs'?docsEditor(f):f.type==='sheets'?sheetsEditor(f):f.type==='slides'?slidesEditor(f):f.type==='pdf'?pdfStudio.markup(f):f.type==='media'?mediaStudio.markup(f):notesEditor(f))+status+'</div>';
}
function render(){
  pdfStudio.unmount();mediaStudio.unmount();
  const nativeApp=view==='editor'?getActive()?.type:typeNames[view]?view:'workspace';
  app.innerHTML='<div class="shell '+(navCollapsed?'nav-collapsed ':'')+(view==='editor'?'mo-editing ':'')+(focusMode&&view==='editor'?'focus-mode':'')+'">'+'<a class="studio-skip-link" href="#studio-main">Skip to main content</a>'+sidebar()+'<button type="button" class="studio-mobile-scrim" data-action="mobile-close" aria-label="Close navigation" hidden></button><main class="main" id="studio-main" data-app="'+(nativeApp||'workspace')+'" tabindex="-1">'+(view==='editor'?'':header())+(view==='editor'?editor():view==='home'?home():view==='templates'?templatesPage():filesPage())+'</main></div>';
  syncSidebarAccess();
  updateSaveStatus(saveState);
  if(view==='editor'&&getActive()?.type==='pdf')void pdfStudio.mount(getActive());
  if(view==='editor'&&getActive()?.type==='media')void mediaStudio.mount(getActive());
  if(!storageReady&&saveState==='failed'){
    const main=app.querySelector('.main');
    main?.insertAdjacentHTML('afterbegin','<p role="alert" style="margin:10px 18px;padding:12px;border:2px solid #bb4734;border-radius:8px">Local saving is unavailable. Changes will not survive a reload. Use Export backup to save your work.</p>');
  }
  const sc=document.getElementById('sheet-scroll');
  if(sc&&getActive()?.type==='sheets'){
    sheetRecalculator(getActive())?.rebuild();
    sc.scrollTop=sheetScrollTop;
    repaintGrid(sc,getActive(),selectedCell,true);
  }
}

function isMobileLayout(){return window.matchMedia('(max-width: 860px)').matches;}
function syncSidebarAccess(){
  const sidebar=document.getElementById('studio-sidebar');
  if(!sidebar)return;
  const mobile=isMobileLayout();
  if(!mobile)mobileOpen=false;
  const open=mobile&&mobileOpen;
  sidebar.classList.toggle('open',open);
  sidebar.inert=mobile&&!open;
  sidebar.setAttribute('aria-hidden',String(mobile&&!open));
  const scrim=document.querySelector('.studio-mobile-scrim');
  if(scrim)scrim.hidden=!open;
  const menu=document.querySelector('[data-action="mobile"]');
  if(menu){
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }
  document.documentElement.classList.toggle('studio-mobile-open',open);
}
function setMobileNavigation(open,restoreFocus=false){
  mobileOpen=isMobileLayout()&&open;
  syncSidebarAccess();
  if(mobileOpen)document.querySelector('.studio-sidebar-dismiss')?.focus({preventScroll:true});
  else if(restoreFocus)document.querySelector('[data-action="mobile"]')?.focus({preventScroll:true});
}
function setCollapsedSidebar(next){
  navCollapsed=Boolean(next);
  document.querySelector('.shell')?.classList.toggle('nav-collapsed',navCollapsed);
  try{localStorage.setItem(STUDIO_SHELL_KEY,JSON.stringify({collapsed:navCollapsed}));}catch{}
  const label=navCollapsed?'Expand sidebar':'Collapse sidebar';
  for(const button of document.querySelectorAll('.studio-nav-collapse')){
    button.title=label;button.setAttribute('aria-label',label);button.setAttribute('aria-pressed',String(navCollapsed));
    const span=button.querySelector('span');if(span)span.textContent=label;
  }
  const modalButton=modalRoot.querySelector('[data-action="nav-collapse"]');
  if(modalButton){modalButton.textContent=label;modalButton.setAttribute('aria-pressed',String(navCollapsed));}
}
window.addEventListener('resize',syncSidebarAccess);

function navigate(destination){
  if(view==='editor'&&getActive())snapshot(getActive(),true);
  focusMode=false;
  persist();view=destination;activeId=null;query='';fileFilter='all';mobileOpen=false;
  window.history.pushState(null,'','#/'+encodeURIComponent(destination));
  render();window.scrollTo(0,0);
}
function openFile(id){
  if(!files.some(f=>f.id===id))return;
  if(view==='editor'&&getActive())snapshot(getActive(),true);
  recentFileIds=[id,...recentFileIds.filter(value=>value!==id)].slice(0,8);
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
function modal(kind,id){
  const f=files.find(x=>x.id===id);
  if(kind==='new'){
    const preferredType=view==='editor'?getActive()?.type:view;
    modalRoot.innerHTML='<div class="modal-backdrop"><form class="modal" id="new-form"><h2>Create a new file</h2><p>Choose an app and give your file a name.</p><label for="new-type">Application</label><select id="new-type" name="type">'+Object.keys(labels).map(t=>'<option value="'+t+'"'+(t===preferredType?' selected':'')+'>'+labels[t]+'</option>').join('')+'</select><label for="new-title">File name</label><input id="new-title" name="title" placeholder="Untitled file" maxlength="120" autofocus><div class="modal-actions"><button type="button" class="btn btn-light" data-template-browse="all">Explore templates</button><button type="button" class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-primary" type="submit">Create file</button></div></form></div>';
  } else if(kind==='delete'&&f){
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Move to recycle bin?</h2><p><strong>'+esc(f.title)+'</strong> can be restored from your recycle bin.</p><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-dark" data-action="confirm-delete" data-id="'+esc(f.id)+'">Move to bin</button></div></div></div>';
  } else if(kind==='revisions'&&f){
    snapshot(f,true);persist();
    const entries=[...(revisions[f.id]||[])].reverse();
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Version history</h2><p>Up to 12 local snapshots per file. Restore an earlier version if needed.</p><div style="max-height:280px;overflow:auto">'+entries.map((v,i)=>'<div class="spread" style="padding:11px 0;border-bottom:1px solid #ecedf4"><span class="muted" style="font-size:12px">'+new Date(v.at).toLocaleString()+'</span><button class="btn btn-soft btn-sm" data-revision="'+i+'">Restore</button></div>').join('')+'</div><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Close</button></div></div></div>';
  } else if(kind==='office-export'&&f){
    const fmt={docs:'DOCX',sheets:'XLSX',slides:'PPTX'}[f.type];
    const notices={
      docs:'Exports paragraphs, headings, simple tables, supported inline styles and safe HTTP(S) hyperlinks. Images, local links, advanced layout and review comments are not faithfully reproduced.',
      sheets:'Exports the supported A1:Z1000 range, up to 20 worksheets, formulas and basic styles. MySoft conditional formatting, charts, external references, pivots and advanced Excel features are not preserved.',
      slides:'Exports slide titles, bodies, supported MySoft shapes, and plain-text speaker notes. Images, animations, slide masters and complex third-party layouts are not faithfully reproduced.'
    };
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal"><h2>Export to '+fmt+'</h2><p>'+notices[f.type]+'</p><p>For full preservation, also export a JSON workspace backup.</p><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Cancel</button><button class="btn btn-primary" data-action="office-export-confirm">Export '+fmt+'</button></div></div></div>';
  } else if(kind==='file-menu'){
    modalRoot.innerHTML='<div class="modal-backdrop"><section class="modal mo-file-dialog"><h2>File</h2><div class="mo-file-actions">'+[['action:save','Save on this device','save'],['action:history','Version history','clock'],['action:export','Export file','download'],['action:backup','Export workspace backup','download'],['nav:home','Overview','home'],['nav:files','All files','folder'],['nav:templates','Templates','grid'],['action:preferences','Workspace appearance','settings']].map(([id,label,glyph])=>'<button type="button" class="btn btn-light" data-command-run="'+id+'">'+icon(glyph,17)+label+'</button>').join('')+'<button type="button" class="btn btn-light" data-action="new">'+icon('plus',17)+'New file</button></div><div class="modal-actions"><button class="btn btn-light" data-action="modal-close">Close</button></div></section></div>';
  } else if(kind==='commands'){
    commandTools=[];
    const commands=[
      ['create:docs','New document','Docs'],['create:sheets','New spreadsheet','Sheets'],
      ['create:slides','New presentation','Slides'],['create:notes','New note','Notes'],
      ['create:pdf','Open PDF workspace','PDF'],['create:media','Open Media workspace','Media'],
      ['nav:home','Home dashboard','Workspace'],['nav:files','All files','Workspace'],
      ['nav:templates','Browse app templates','Workspace'],['nav:starred','Starred files','Workspace'],['action:preferences','Appearance and colors','Settings'],
      ['action:save','Save locally','File']
    ];
    if(view==='editor'&&getActive()){
      const current=getActive();
      commandTools=['pdf','media'].includes(current.type)?[...document.querySelectorAll('.editor-shell button[data-'+current.type+'-action]')].filter(button=>!button.disabled).map(button=>({attribute:'data-'+current.type+'-action',action:button.getAttribute('data-'+current.type+'-action'),label:button.getAttribute('aria-label')||button.getAttribute('title')||button.textContent.trim()})):ribbonToolCommands(current,selectedCell,slideIndex);
      commandTools=commandTools.map(tool=>({...tool,fileId:current.id}));
      commands.unshift(...commandTools.map((tool,i)=>['tool:'+i,tool.label,labels[current.type]+(tool.tab?' · '+tool.tab:'')]));
      commands.push(['action:history','Version history','File']);
      if(getActive().type!=='notes')commands.push(['action:export','Export file','File']);
    }
    for(const file of [...files].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,8))
      commands.push(['file:'+file.id,'Open '+file.title,'Recent']);
    modalRoot.innerHTML='<div class="modal-backdrop"><div class="modal studio-command-modal" role="dialog" aria-modal="true" aria-label="Command search">'+
      '<h2>What would you like to do?</h2><p id="studio-command-hint">Search tools and files. Use ↑ ↓ to choose, then Enter.</p>'+
      '<input id="studio-command-search" type="search" aria-label="Search commands and files" placeholder="Type an action, tool or file…" autocomplete="off">'+
      '<div class="studio-command-results" role="list">'+commands.map(([id,label,group])=>
        '<button type="button" class="studio-command-item" data-command-run="'+esc(id)+'" data-command-text="'+esc((label+' '+group).toLocaleLowerCase())+'"><span>'+esc(label)+'</span><small>'+esc(group)+'</small></button>'
      ).join('')+'</div><p id="studio-command-empty" class="muted" hidden>No matching commands.</p>'+
      '<div class="modal-actions"><button class="btn btn-light" type="button" data-action="modal-close">Close · Esc</button></div></div></div>';
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
  if(f.type==='media'){void mediaStudio.exportCurrent();return;}
  if(f.type==='pdf'){
    void exportPDF(f).then(bytes=>{download(bytes,name+'.pdf','application/pdf');toast('PDF exported');}).catch(error=>toast(String(error.message||error).slice(0,130)));
    return;
  }
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
    if(f.type==='pdf'&&!validatePDFRecord(f))return null;
    if(f.type==='media'&&!validateMediaRecord(f))return null;
    output.push(f);
  }
  return output;
}
async function applyWorkspace(payload){
  const imported=validImport(payload);
  const trash=payload?.trash?validImport({files:payload.trash}):[];
  if(!imported||!trash)return false;
  const next={
    files:imported.map(f=>({...f,updatedAt:Number(f.updatedAt)||Date.now()})),
    trash:trash.slice(0,100),
    versions:payload.versions&&typeof payload.versions==='object'&&!Array.isArray(payload.versions)?payload.versions:{}
  };
  // Persist the replacement atomically before changing the visible workspace.
  if(!await persist(next,{journal:false}))return false;
  files=next.files;trashFiles=next.trash;revisions=next.versions;
  navigate('home');return true;
}
async function importBackup(file){
  try{
    if(file.size>128000000){toast('Backup exceeds the 128 MB restore limit');return;}
    const parsed=JSON.parse(await file.text());
    if(!validImport(parsed)){toast('Invalid MySoft backup');return;}
    if(!confirm('Replace local files with this backup? Export your current workspace first.'))return;
    if(await applyWorkspace(parsed))toast('Workspace restored');
    else toast('Backup was not restored. Current files are unchanged.');
  }catch{toast('Could not read this backup');}
}
async function importExternalFile(file){
  if(/\.(png|jpe?g|webp|gif|wav|mp3|m4a|aac|flac|ogg|oga|mp4|webm|mov|ogv)$/i.test(file.name)){await importMediaFile(file);return;}
  if(file.name.toLowerCase().endsWith('.pdf')){await importPDFFile(file);return;}
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
async function importMediaFile(source){
  toast('Opening media…');
  try{
    const fields=await inspectMedia(source);
    const active=getActive(),reuse=active?.type==='media'&&active.mediaKind==='empty';
    const f=reuse?active:makeFile('media',source.name.replace(/\.[^.]+$/,'').slice(0,120));
    Object.assign(f,fields,{title:source.name.replace(/\.[^.]+$/,'').slice(0,120),updatedAt:Date.now()});if(!reuse)files.unshift(f);snapshot(f,true);
    const saved=await persist();openFile(f.id);toast(saved?'Media imported. Your original is preserved.':'Media opened; local saving failed. Export a backup.');
  }catch(error){toast(String(error.message||error).slice(0,180));}
}
async function importPDFFile(source){
  if(source.size>PDF_MAX_BYTES){toast('PDF import limit is 8 MB');return;}
  toast('Opening PDF…');
  try{
    const data=await inspectPDF(new Uint8Array(await source.arrayBuffer()));
    const existing=getActive();
    const file=existing?.type==='pdf'&&!existing.pdfData?existing:makeFile('pdf',source.name.replace(/\.pdf$/i,'').slice(0,120));
    Object.assign(file,data,{title:source.name.replace(/\.pdf$/i,'').slice(0,120),updatedAt:Date.now()});
    if(file!==existing)files.unshift(file);
    snapshot(file,true);const saved=await persist();openFile(file.id);
    toast(saved?'PDF imported · '+data.pdfPageCount+' pages':'PDF opened. Saving failed; export a backup before leaving.');
  }catch(error){toast('PDF import: '+String(error.message||error).slice(0,150));}
}
async function runCloudAction(action){
  try{
    if(action==='cloud-signout'){await cloudSignOut();cloudUser=null;modal('cloud');toast('Signed out');return;}
    if(action==='cloud-upload'){
      if(!await persist())return;
      await cloudPush(workspaceSnapshot());toast('Cloud snapshot uploaded');modal('cloud');return;
    }
    if(action==='cloud-download'){
      const row=await cloudPull();
      if(!row){toast('No cloud snapshot found');return;}
      if(!validImport(row.payload)){toast('Cloud snapshot failed validation');return;}
      if(!confirm('Replace ALL local files with cloud snapshot from '+new Date(row.updated_at).toLocaleString()+'? Download a local backup first.'))return;
      if(await applyWorkspace(row.payload)){closeModal();toast('Cloud snapshot downloaded');}
    }
  }catch(error){toast('Cloud: '+String(error.message||error).slice(0,95));}
}
function updateCell(ref,raw,rerender=false){
  const f=getActive();if(!f||f.type!=='sheets')return;
  const affected=sheetRecalculator(f).update(ref,raw);
  touch(f);
  refreshCells(affected);
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
function refreshCells(affected=null){
  const f=getActive();if(!f||f.type!=='sheets')return;
  const graph=sheetRecalculator(f);
  document.querySelectorAll('[data-cell]').forEach(el=>{
    if(document.activeElement===el||affected&&!affected.has(el.dataset.cell))return;
    const ref=el.dataset.cell;
    const computed=String(f.cells[ref]||'').startsWith('=')?graph.display(ref):displayCell(ref,f.cells);
    el.value=sheetCellAppearance(f,ref,computed).value;
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
  const object=event.target.closest('[data-slide-object]');
  if(object&&getActive()?.type==='slides'&&!event.target.closest('.studio-shape-text')){
    activeObjectId=object.dataset.slideObject;
    document.querySelectorAll('[data-slide-object]').forEach(el=>el.classList.toggle('selected',el.dataset.slideObject===activeObjectId));
    return;
  }
  const el=event.target.closest('[data-action],[data-nav],[data-create],[data-open],[data-star],[data-delete],[data-duplicate],[data-slide],[data-theme],[data-template],[data-cmd],[data-restore-trash],[data-purge],[data-revision],[data-outline-index],[data-review-toggle],[data-review-delete],[data-note-move],[data-note-pin],[data-command-run],[data-workspace-tab]');
  if(!el){
    if(event.target.classList.contains('modal-backdrop'))closeModal();
    return;
  }
  if(el.dataset.workspaceTab!==undefined){openFile(el.dataset.workspaceTab);return;}
  if(el.dataset.commandRun!==undefined){
    const id=el.dataset.commandRun;
    closeModal();
    if(id.startsWith('create:')){
      const type=id.slice(7);if(Object.hasOwn(typeNames,type))newFile(type,'Untitled '+typeNames[type]);
    }else if(id.startsWith('nav:')){
      const dest=id.slice(4);if(['home','files','starred','templates'].includes(dest))navigate(dest);
    }else if(id.startsWith('file:')){
      const target=id.slice(5);if(files.some(f=>f.id===target))openFile(target);
    }else if(id.startsWith('tool:')){
      const tool=commandTools[Number(id.slice(5))];
      // Let the dialog focus manager release the inert workspace before editing.
      queueMicrotask(()=>{if(tool&&getActive()?.id===tool.fileId){
        if(tool.tab&&!document.querySelector('[data-ot-tab="'+CSS.escape(tool.tab)+'"].active'))document.querySelector('[data-ot-tab="'+CSS.escape(tool.tab)+'"]')?.click();
        const control=document.querySelector('.editor-shell ['+tool.attribute+'="'+CSS.escape(tool.action)+'"]');
        if(control&&!control.disabled)control.click();else toast('This tool is unavailable for the current selection.');
      }});
    }else if(id==='action:preferences')document.querySelector('[data-ot-action="preferences"]')?.click();
    else if(id==='action:save'){void saveCommand();}
    else if(id==='action:history'&&getActive())modal('revisions',activeId);
    else if(id==='action:export')exportFile();
    else if(id==='action:backup')backup();
    return;
  }
  if(el.dataset.notePin!==undefined){
    const file=getActive();
    if(file?.type==='notes'){
      const isPinned=toggleNotePin(file);touch(file);persist();render();
      toast(isPinned?'Note pinned to the top':'Note unpinned');
    }
    return;
  }
  if(el.dataset.noteMove!==undefined){
    const file=getActive();
    if(file?.type==='notes'){
      moveNote(file,document.getElementById('note-notebook')?.value,document.getElementById('note-section')?.value);
      touch(file);persist();render();toast('Note moved into notebook section');
    }
    return;
  }
  if(el.dataset.reviewToggle!==undefined||el.dataset.reviewDelete!==undefined){
    const file=getActive();if(file?.type!=='docs')return;
    try{
      if(el.dataset.reviewToggle!==undefined){
        const item=docComments(file).find(x=>x.id===el.dataset.reviewToggle);
        if(!item)throw Error('Comment not found');
        toggleDocComment(file,el.dataset.reviewToggle,!item.resolved);
      }else if(confirm('Delete this review comment?'))deleteDocComment(file,el.dataset.reviewDelete);
      else return;
      touch(file);persist();render();
    }catch(error){toast(error.message);}
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
  if(action==='mobile'){setMobileNavigation(!mobileOpen);return;}
  if(action==='mobile-close'||action==='mobile-dismiss'){setMobileNavigation(false,true);return;}
  if(action==='nav-collapse'){setCollapsedSidebar(!navCollapsed);return;}
  if(action==='focus-mode'){focusMode=!focusMode;mobileOpen=false;render();document.querySelector('[data-action="focus-mode"]')?.focus();}
  if(action==='new')modal('new');
  if(action==='editor-panels'){
    const file=getActive();if(!file)return;
    panelState[file.type]=!panelsHidden(file.type);
    try{localStorage.setItem('mysoft-panels-'+file.type,panelState[file.type]?'hidden':'visible');}catch{}
    document.querySelector('.editor-shell').dataset.panelsHidden=String(panelState[file.type]);
    el.setAttribute('aria-pressed',String(!panelState[file.type]));el.setAttribute('aria-label',(panelState[file.type]?'Show':'Hide')+' editor panels');
    window.dispatchEvent(new Event('resize'));return;
  }
  if(action==='files-list'||action==='files-grid'){fileDisplay=action==='files-grid'?'grid':'list';try{localStorage.setItem('mysoft-office-file-display',fileDisplay);}catch{}render();return;}
  if(action==='file-menu')modal('file-menu');
  if(action==='commands')modal('commands');
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
  if(target.id==='studio-command-search'){
    const needle=target.value.trim().toLocaleLowerCase();
    let visible=0;
    document.querySelectorAll('[data-command-run]').forEach(item=>{
      const ok=item.dataset.commandText.includes(needle);
      item.hidden=!ok;if(ok)visible++;
    });
    const empty=document.getElementById('studio-command-empty');
    if(empty)empty.hidden=visible!==0;
    return;
  }
  if(target.id==='global-search'){query=target.value;return;}
  if(target.id==='note-search'){
    const search=target.value.trim().toLocaleLowerCase();
    let count=0;
    document.querySelectorAll('[data-note-search-item]').forEach(item=>{
      const visible=!search||item.dataset.noteSearchItem.includes(search);
      item.hidden=!visible;
      if(visible)count++;
    });
    document.querySelectorAll('.studio-notebook-group').forEach(group=>{
      group.hidden=!!search&&!group.querySelector('.note-list-item:not([hidden])');
    });
    const empty=document.getElementById('note-no-results');
    if(empty)empty.hidden=count>0;
    return;
  }
  if(!f)return;
  if(target.id==='document-title'||target.id==='note-title'){
    f.title=target.value||'Untitled '+typeNames[f.type];
    const companion=document.getElementById(target.id==='note-title'?'document-title':'note-title');
    if(companion)companion.value=f.title;
    touch(f);
  }
  if(target.id==='rich-content'){f.body=target.innerHTML;touch(f);updateDocumentOutline(f);updateEditorMetrics();}
  if(target.matches('[data-slide-object-text]')&&f.type==='slides'){
    const obj=getSlideObject(f.slides[slideIndex],target.dataset.slideObjectText);
    if(obj){updateSlideObject(f.slides[slideIndex],obj.id,{text:target.textContent||''});touch(f);}
    return;
  }
  if(target.id==='slide-title'||target.id==='slide-body'){
    f.slides[slideIndex][target.id==='slide-title'?'title':'body']=target.textContent||'';touch(f);updateEditorMetrics();
  }
  if(target.matches('[data-cell]')){
    updateCell(target.dataset.cell,target.value);updateEditorMetrics();
    const formula=document.getElementById('formula-input');if(formula)formula.value=target.value;
  }
  if(target.id==='formula-input'){
    updateCell(selectedCell,target.value);updateEditorMetrics();
    const cell=document.querySelector('[data-cell="'+selectedCell+'"]');
    if(cell&&document.activeElement!==cell)cell.value=target.value;
  }
});
document.addEventListener('selectionchange',()=>{
  const file=getActive();if(file?.type!=='docs')return;
  const selection=window.getSelection();if(!selection||selection.isCollapsed)return;
  const content=document.getElementById('rich-content');
  if(content?.contains(selection.anchorNode)&&content.contains(selection.focusNode))
    selectedReviewQuote=selection.toString().trim().slice(0,240);
});
document.addEventListener('pointerdown',event=>{
  if(getActive()?.type!=='slides')return;
  const grip=event.target.closest('.studio-shape-grip');
  if(!grip)return;
  const shape=grip.closest('[data-slide-object]'),stage=shape?.closest('.slide-stage');
  const object=getSlideObject(getActive().slides[slideIndex],shape?.dataset.slideObject);
  if(!object||!stage)return;
  activeObjectId=object.id;
  slideDrag={id:object.id,stage,startX:event.clientX,startY:event.clientY,x:object.x,y:object.y};
  event.preventDefault();
});
document.addEventListener('pointermove',event=>{
  if(!slideDrag||getActive()?.type!=='slides')return;
  const shape=document.querySelector('[data-slide-object="'+slideDrag.id+'"]');
  if(!shape)return;
  const rect=slideDrag.stage.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const slide=getActive().slides[slideIndex];
  const x=snapSlideCoordinate(slide,slideDrag.x+(event.clientX-slideDrag.startX)/rect.width*100);
  const y=snapSlideCoordinate(slide,slideDrag.y+(event.clientY-slideDrag.startY)/rect.height*100);
  updateSlideObject(slide,slideDrag.id,{x,y});
  const object=getSlideObject(slide,slideDrag.id);
  shape.style.left=object.x+'%';shape.style.top=object.y+'%';
  event.preventDefault();
});
document.addEventListener('pointerup',()=>{
  if(slideDrag&&getActive()?.type==='slides'){touch(getActive());persist();}
  slideDrag=null;
});
document.addEventListener('focusin',event=>{
  const shape=event.target.closest('[data-slide-object]');
  if(shape&&getActive()?.type==='slides'){
    activeObjectId=shape.dataset.slideObject;
    document.querySelectorAll('[data-slide-object]').forEach(el=>el.classList.toggle('selected',el.dataset.slideObject===activeObjectId));
  }
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
  const t=event.target,f=t.id==='rich-content'?files.find(file=>file.id===t.dataset.fileId):getActive();
  if(!f)return;
  if(t.id==='rich-content'){f.body=sanitize(t.innerHTML);touch(f);if(getActive()?.id===f.id)updateDocumentOutline(f);}
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
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable]')&&!modalRoot.firstChild){
    const search=document.getElementById('global-search');
    if(!search&&view==='editor'){event.preventDefault();modal('commands');return;}
    if(search){event.preventDefault();search.focus();search.select();return;}
  }
  if(mobileOpen){
    if(event.key==='Escape'){event.preventDefault();setMobileNavigation(false,true);return;}
    if(event.key==='Tab'){
      const buttons=[...document.querySelectorAll('#studio-sidebar button:not([disabled])')].filter(el=>el.getClientRects().length);
      if(buttons.length){
        const first=buttons[0],last=buttons.at(-1),current=document.activeElement;
        if(!buttons.includes(current)||(event.shiftKey&&current===first)){
          event.preventDefault();(event.shiftKey?last:first).focus();return;
        }
        if(!event.shiftKey&&current===last){event.preventDefault();first.focus();return;}
      }
    }
  }
  if(event.target.closest('.sidebar-nav')&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
    const items=[...document.querySelectorAll('.sidebar-nav .nav-link')].filter(el=>el.getClientRects().length);
    const position=items.indexOf(document.activeElement);
    if(position>=0){
      event.preventDefault();
      const index=event.key==='Home'?0:event.key==='End'?items.length-1:
        (position+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;
      items[index]?.focus();return;
    }
  }
  const shortcut=studioShortcut(event);
  if(shortcut){
    event.preventDefault();
    if(shortcut==='command-search')modal('commands');
    if(shortcut==='save'){void saveCommand();}
    if(shortcut==='export'){if(getActive())exportFile();else toast('Open a file to export');}
    if(shortcut==='new-file')modal('new');
    return;
  }
  if(event.target.id==='studio-command-search'&&event.key==='Enter'){
    event.preventDefault();document.querySelector('[data-command-run]:not([hidden])')?.click();return;
  }
  if(event.target.closest('.studio-command-modal')&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&
      (event.target.id==='studio-command-search'||event.target.hasAttribute('data-command-run'))){
    if(event.target.id==='studio-command-search'&&['Home','End'].includes(event.key))return;
    const items=[...modalRoot.querySelectorAll('[data-command-run]:not([hidden])')];if(!items.length)return;
    event.preventDefault();const index=items.indexOf(event.target);
    const next=event.key==='Home'?items[0]:event.key==='End'?items.at(-1):event.key==='ArrowDown'?items[(index+1)%items.length]:index===0?document.getElementById('studio-command-search'):index<0?items.at(-1):items[index-1];
    next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest'});return;
  }
  if(view==='editor'&&getActive()?.type==='slides'){
    const shape=event.target.closest('[data-slide-object]');
    if(shape&&!event.target.closest('[contenteditable]')&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
      const id=shape.dataset.slideObject,slide=getActive().slides[slideIndex];
      if(getSlideObject(slide,id)){
        event.preventDefault();
        const amount=event.shiftKey?10:2;
        const directions={ArrowUp:[0,-amount],ArrowDown:[0,amount],ArrowLeft:[-amount,0],ArrowRight:[amount,0]};
        moveSlideObject(slide,id,...directions[event.key]);
        activeObjectId=id;touch(getActive());persist();render();
        document.querySelector('[data-slide-object="'+id+'"]')?.focus({preventScroll:true});
        return;
      }
    }
  }
  if(view==='editor'&&['docs','notes'].includes(getActive()?.type)&&
      event.target.closest('#rich-content')&&(event.ctrlKey||event.metaKey)){
    const key=event.key.toLowerCase();
    if(key==='z'||key==='y'){
      event.preventDefault();undoDocument((key==='z'&&!event.shiftKey)?'undo':'redo');return;
    }
  }
  if(event.target.id==='global-search'&&event.key==='Enter'){event.preventDefault();view='files';fileFilter='all';render();return;}
  if(event.key==='Escape'){
    if(mobileOpen){setMobileNavigation(false,true);return;}
    if(focusMode){focusMode=false;render();return;}
    closeModal();return;
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
    event.preventDefault();void saveCommand();
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
const pdfInput=document.createElement('input');
pdfInput.type='file';pdfInput.accept='.pdf,application/pdf';pdfInput.id='pdf-upload';pdfInput.hidden=true;
pdfInput.addEventListener('change',()=>{const file=pdfInput.files?.[0];if(file)void importPDFFile(file);pdfInput.value='';});
document.body.appendChild(pdfInput);
const mediaAccept=Object.values(MEDIA_MIMES).flat().join(',');
const mediaInput=document.createElement('input');mediaInput.type='file';mediaInput.accept=mediaAccept;mediaInput.id='media-upload';mediaInput.hidden=true;
mediaInput.addEventListener('change',()=>{const source=mediaInput.files?.[0];if(source)void importMediaFile(source);mediaInput.value='';});document.body.appendChild(mediaInput);
const externalInput=document.createElement('input');
externalInput.type='file';externalInput.accept='.txt,.md,.csv,.html,.htm,.docx,.xlsx,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.gif,.wav,.mp3,.m4a,.aac,.flac,.ogg,.mp4,.webm,.mov';
externalInput.id='external-file-upload';externalInput.hidden=true;
document.body.appendChild(externalInput);
initializeRibbonWorkbench();
initializeOfficeTools({
  getFile:getActive,getFiles:()=>files,openFile,download,touch,persist,render,sanitize,toast,
  sealHistory:file=>{if(['docs','notes'].includes(file.type))documentHistory.checkpoint(file.id,file.body||'');},
  createProductionFiles:async records=>{
    if(!Array.isArray(records)||!records.length||records.length>20)throw Error('Create up to 20 files at a time.');
    const prepared=records.map(record=>{if(!['docs','notes'].includes(record.type))throw Error('Unsupported output type.');const file={...makeFile(record.type,record.title),...record};file.body=sanitize(file.body);return file;});
    let nextVersions=revisions;for(const file of prepared)nextVersions=addRevision(nextVersions,file,Date.now(),true);
    const next={files:[...prepared,...files],trash:trashFiles,versions:nextVersions};validateWorkspace(next);
    if(!await persist(next,{journal:false}))throw Error('The new files could not be saved. Your existing files are unchanged; retry or export a backup.');
    files=next.files;revisions=next.versions;openFile(prepared[0].id);return prepared.length;
  },
  createDigestNote:async(notebook,html)=>{const note=makeFile('notes',notebook+' digest');Object.assign(note,{body:sanitize(html),notebook,section:'Digests',workflowDigest:true});files.unshift(note);touch(note);const saved=await persist();openFile(note.id);return saved;},
  getSelectedCell:()=>selectedCell,getSlideIndex:()=>slideIndex,
  getSlideObjectId:()=>activeObjectId,setSlideObjectId:id=>{activeObjectId=id;},
  getReviewQuote:()=>selectedReviewQuote,
  getNoteLocation:noteLocation,renameNotes:options=>renameNoteCollection(files,options),
  setSlideIndex:i=>{slideIndex=i;activeObjectId=null;}
});
window.addEventListener('pagehide',()=>{if(saveState==='saved')return;clearTimeout(savedTimer);void persist();});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&storageReady&&saveState!=='saved'){clearTimeout(savedTimer);void persist();}
});
window.addEventListener('popstate',()=>{restoreRoute();render();});
async function bootWorkspace(){
  try{
    workspaceStore=new BrowserWorkspaceStore();
    const result=await workspaceStore.initialize(localStorage,starter);
    files=result.workspace.files;
    trashFiles=result.workspace.trash;
    revisions=result.workspace.versions;
    storageReady=true;
    restoreRoute();render();updateSaveStatus('saved');
    if(result.source==='legacy-migrated')toast('Existing workspace migrated. Original browser data kept for recovery.');
    if(result.source==='journal-recovered')toast('Unsaved edits recovered from the local recovery journal.');
    if(result.source==='journal-preserved')toast('Committed files opened. A pending recovery journal was preserved for manual backup.');
  }catch(error){
    storageReady=false;
    let legacy,recovery;
    try{recovery=readRecoveryJournal(localStorage);}catch{}
    try{legacy=readLegacyWorkspace(localStorage);}
    catch{
      if(recovery)legacy=recovery.workspace;
      else{
      app.innerHTML='<main style="max-width:720px;padding:40px;margin:auto"><h1>Workspace recovery required</h1><p>Existing browser data may be damaged. MySoft did not overwrite or delete it. Export the raw recovery data before troubleshooting.</p><button class="btn btn-primary" id="export-legacy-recovery">Export recovery data</button></main>';
      document.getElementById('export-legacy-recovery').addEventListener('click',()=>{
        const data=Object.fromEntries(Object.entries({...LEGACY_KEYS,recovery:RECOVERY_KEY}).map(([key,id])=>[key,localStorage.getItem(id)]));
        download(JSON.stringify(data,null,2),'mysoft-legacy-recovery.json','application/json');
      });
      return;
      }
    }
    const safeState=recovery?.workspace||legacy;
    files=safeState?.files||starter();
    trashFiles=safeState?.trash||[];
    revisions=safeState?.versions||{};
    restoreRoute();render();updateSaveStatus('failed');
    toast('Browser database unavailable. Export backup; editing is not durable.');
  }
}
void bootWorkspace();
