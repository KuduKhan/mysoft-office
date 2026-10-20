export const MAX_REVISIONS = 12;
export const MIN_REVISION_INTERVAL = 120000;

export function versionContent(file) {
  if (!file || !['docs','sheets','slides','notes'].includes(file.type)) throw new Error('Invalid file');
  const version = {title:String(file.title||''),type:file.type};
  if (file.type==='docs' || file.type==='notes') version.body=String(file.body||'');
  if (file.type==='docs') version.comments=structuredClone(file.comments||[]);
  if (file.type==='notes') {
    version.notebook=String(file.notebook||'Personal');
    version.section=String(file.section||'General');
    version.tags=structuredClone(file.tags||[]);
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
  if(file.type==='docs'||file.type==='notes') copy.body=data.body;
  if(file.type==='docs')copy.comments=data.comments||[];
  if(file.type==='notes'){
    copy.notebook=data.notebook||'Personal';
    copy.section=data.section||'General';
    copy.tags=data.tags||[];
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
  copy.updatedAt=Date.now();
  return copy;
}
