export const MAX_REVISIONS = 12;
export const MIN_REVISION_INTERVAL = 120000;

export function versionContent(file) {
  if (!file || !['docs','sheets','slides','notes','pdf','media'].includes(file.type)) throw new Error('Invalid file');
  const version = {title:String(file.title||''),type:file.type};
  if(Array.isArray(file.linkedFileIds))version.linkedFileIds=structuredClone(file.linkedFileIds);
  version.folderPath=String(file.folderPath||'');
  version.starred=Boolean(file.starred);
  if(file.type!=='notes')version.tags=structuredClone(file.tags||[]);
  if (file.type==='docs' || file.type==='notes') version.body=String(file.body||'');
  if(file.type==='docs')version.pageSettings=structuredClone(file.pageSettings||{});
  if (file.type==='docs') version.comments=structuredClone(file.comments||[]);
  if (file.type==='notes') {
    version.notebook=String(file.notebook||'Personal');
    version.section=String(file.section||'General');
    version.tags=structuredClone(file.tags||[]);
    version.pinned=Boolean(file.pinned);
  }
  if (file.type==='sheets') {
    version.cells=structuredClone(file.cells||{});
    if(Array.isArray(file.worksheets)){
      version.worksheets=structuredClone(file.worksheets);
      version.activeSheetIndex=file.activeSheetIndex||0;
      version.cellStyles=structuredClone(file.cellStyles||{});
    }
  }
  if (file.type==='slides') version.slides=structuredClone(file.slides||[]);
  if(file.type==='pdf'){version.pdfRotations=structuredClone(file.pdfRotations||{});if(file.pdfPageOrder)version.pdfPageOrder=structuredClone(file.pdfPageOrder);version.pdfBookmarks=structuredClone(file.pdfBookmarks||[]);version.pdfFormValues=structuredClone(file.pdfFormValues||{});version.pdfAnnotations=structuredClone(file.pdfAnnotations||[]);}
  if(file.type==='media'){version.mediaEdits=structuredClone(file.mediaEdits);version.mediaLayers=structuredClone(file.mediaLayers);}
  return version;
}
export function addRevision(revisions,file,at=Date.now(),force=false) {
  const next={...revisions};
  const saved=Array.isArray(next[file.id])?[...next[file.id]]:[];
  const content=versionContent(file);
  const signature=JSON.stringify(content);
  const last=saved.at(-1);
  if(last && JSON.stringify(last.content)===signature) return revisions;
  if(!force && last && at-last.at<MIN_REVISION_INTERVAL) return revisions;
  saved.push({at,content});
  while(saved.length>MAX_REVISIONS){const idx=saved.findIndex((v,i)=>i<saved.length-1&&!v.name);saved.splice(idx<0?0:idx,1);}
  next[file.id]=saved;
  return next;
}
export function restoreRevision(file,revision) {
  if(!revision || !revision.content || revision.content.type!==file.type) throw new Error('Mismatched revision');
  const copy=structuredClone(file);
  const data=structuredClone(revision.content);
  copy.title=data.title;
  if(data.folderPath!==undefined)copy.folderPath=data.folderPath;
  if(data.starred!==undefined)copy.starred=data.starred;
  if(file.type!=='notes'&&data.tags!==undefined)copy.tags=data.tags;
  if(data.linkedFileIds!==undefined)copy.linkedFileIds=data.linkedFileIds;
  else delete copy.linkedFileIds;
  if(file.type==='docs'||file.type==='notes') copy.body=data.body;
  if(file.type==='docs'){copy.comments=data.comments||[];copy.pageSettings=data.pageSettings||{};}
  if(file.type==='notes'){
    copy.notebook=data.notebook||'Personal';
    copy.section=data.section||'General';
    copy.tags=data.tags||[];
    copy.pinned=Boolean(data.pinned);
  }
  if(file.type==='sheets'){
    copy.cells=data.cells;
    if(Array.isArray(data.worksheets)){
      copy.worksheets=data.worksheets;
      copy.activeSheetIndex=data.activeSheetIndex||0;
      copy.cellStyles=data.cellStyles||{};
    }else{
      delete copy.worksheets;
      delete copy.activeSheetIndex;
      delete copy.cellStyles;
    }
  }
  if(file.type==='slides') copy.slides=data.slides;
  if(file.type==='pdf'){copy.pdfRotations=data.pdfRotations||{};if(data.pdfPageOrder)copy.pdfPageOrder=data.pdfPageOrder;else delete copy.pdfPageOrder;copy.pdfBookmarks=data.pdfBookmarks||[];copy.pdfFormValues=data.pdfFormValues||{};copy.pdfAnnotations=data.pdfAnnotations||[];}
  if(file.type==='media'){copy.mediaEdits=data.mediaEdits;copy.mediaLayers=data.mediaLayers;}
  copy.updatedAt=Date.now();
  return copy;
}

export function nameRevision(revisions,file,name,at=Date.now()){
 const label=String(name??'').trim();
 if(!label||label.length>80||/[\\u0000-\\u001f]/.test(label))throw Error('Milestones need a name of 1–80 characters.');
 const content=versionContent(file),items=[...(revisions[file.id]||[])],last=items.at(-1);
 if(last&&JSON.stringify(last.content)===JSON.stringify(content))items[items.length-1]={...last,name:label};
 else items.push({at,content,name:label});
 while(items.length>MAX_REVISIONS){const i=items.findIndex(v=>!v.name);items.splice(i<0?0:i,1);}
 return {...revisions,[file.id]:items};
}
export function compareRevision(file,revision){
 const now=versionContent(file),before=revision?.content;
 if(before?.type!==file.type)throw Error('Cannot compare unrelated file types.');
 return [...new Set([...Object.keys(now),...Object.keys(before)])]
  .filter(key=>key!=='type'&&JSON.stringify(now[key])!==JSON.stringify(before[key]));
}
export function restoreRevisionPart(file,revision,mode='all'){
 if(!['all','content','organization'].includes(mode))throw Error('Choose all, content or organization.');
 const prior=restoreRevision(file,revision);if(mode==='all')return prior;
 const next=structuredClone(file);
 const keys=mode==='organization'?['folderPath','tags','starred','linkedFileIds']:
  ({docs:['body','pageSettings','comments'],notes:['body','notebook','section','pinned'],
    sheets:['cells','worksheets','activeSheetIndex','cellStyles'],
    slides:['slides'],pdf:['pdfRotations','pdfPageOrder','pdfBookmarks','pdfFormValues','pdfAnnotations'],
    media:['mediaEdits','mediaLayers']})[file.type];
 for(const key of keys){if(Object.hasOwn(prior,key))next[key]=structuredClone(prior[key]);else delete next[key];}
 next.updatedAt=Date.now();return next;
}
