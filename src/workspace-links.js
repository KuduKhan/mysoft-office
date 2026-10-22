import {noteLinkIds} from './capability-core.js';

// Source content can contain local file hyperlinks; references resolve by stable
// file ID so moving, renaming or reordering a file does not break local links.
export function workspaceLinks(files,sourceId){
  const safe=Array.isArray(files)?files.filter(f=>f&&typeof f.id==='string'):[];
  const source=safe.find(f=>f.id===sourceId);
  const outgoingIds=new Set(noteLinkIds(source?.body||''));
  const outgoing=safe.filter(f=>f.id!==sourceId&&outgoingIds.has(f.id));
  const incoming=safe.filter(f=>f.id!==sourceId&&
    ['docs','notes'].includes(f.type)&&noteLinkIds(f.body||'').includes(sourceId));
  const missing=[...outgoingIds].filter(id=>!safe.some(f=>f.id===id));
  return {outgoing,incoming,missing};
}
