import {noteLinkIds} from './capability-core.js';
const LINK_ID=/^[a-zA-Z0-9_-]{1,200}$/;
function idsOf(file){
  const typed=Array.isArray(file?.linkedFileIds)?file.linkedFileIds.filter(id=>typeof id==='string'&&LINK_ID.test(id)):[];
  const inline=['docs','notes'].includes(file?.type)?noteLinkIds(file.body||''):[];
  return [...new Set([...typed,...inline])].filter(id=>id!==file?.id);
}
export function workspaceLinks(files,sourceId){
  const safe=Array.isArray(files)?files.filter(f=>f&&typeof f.id==='string'):[];
  const source=safe.find(f=>f.id===sourceId);
  const outgoingIds=new Set(idsOf(source));
  const outgoing=safe.filter(f=>f.id!==sourceId&&outgoingIds.has(f.id));
  const incoming=safe.filter(f=>f.id!==sourceId&&idsOf(f).includes(sourceId));
  const missing=[...outgoingIds].filter(id=>!safe.some(f=>f.id===id));
  return {outgoing,incoming,missing};
}
// Stable, user-managed knowledge relationships across all six applications.
// Source content, original asset bytes and unrelated links are unchanged.
export function setWorkspaceLink(files,sourceId,targetId,enabled=true){
  if(!Array.isArray(files)||!LINK_ID.test(sourceId)||!LINK_ID.test(targetId)||sourceId===targetId)
    throw Error('Select two different workspace files.');
  const source=files.find(f=>f?.id===sourceId),target=files.find(f=>f?.id===targetId);
  if(!source||!target||!['docs','sheets','slides','notes','pdf','media'].includes(source.type))
    throw Error('Both files must exist in the active workspace.');
  const links=source.linkedFileIds||[];
  if(!Array.isArray(links)||links.some(id=>typeof id!=='string'||!LINK_ID.test(id)))
    throw Error('This file has invalid stored links.');
  const next=enabled?[...new Set([...links,targetId])]:links.filter(id=>id!==targetId);
  if(next.length>50)throw Error('A file may link to at most 50 other files.');
  if(JSON.stringify(next)===JSON.stringify(links))return false;
  source.linkedFileIds=next;
  return true;
}
