export const MAX_REVISIONS = 12;
export const MIN_REVISION_INTERVAL = 120000;

export function versionContent(file) {
  if (!file || !['docs','sheets','slides','notes','pdf','media'].includes(file.type)) throw new Error('Invalid file');
  const version = {title:String(file.title||''),type:file.type};
  if(Array.isArray(file.linkedFileIds))version.linkedFileIds=structuredClone(file.linkedFileIds);
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
  next[file.id]=saved.slice(-MAX_REVISIONS);
  return next;
}
export function restoreRevision(file,revision) {
  if(!revision || !revision.content || revision.content.type!==file.type) throw new Error('Mismatched revision');
  const copy=structuredClone(file);
  const data=structuredClone(revision.content);
  copy.title=data.title;
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
