import {workspaceLinks} from './workspace-links.js';
import {validateWorkspace} from './workspace-storage.js';
// Shared, read-only integrity report: never repair, delete or mutate source data.
export function auditWorkspace(workspace){
  const {files=[],trash=[],versions={}}=workspace||{};
  validateWorkspace({files,trash,versions});
  const active=new Map(files.map(f=>[f.id,f]));
  const recycled=new Map(trash.map(f=>[f.id,f]));
  const edges=[],broken=[],recycledEdges=[],unlinked=[],history=[];
  for(const file of files){
    const links=workspaceLinks(files,file.id);
    const missingIds=links.missing;
    if(links.incoming.length===0&&links.outgoing.length===0)unlinked.push(file);
    for(const target of links.outgoing)edges.push({source:file,target});
    for(const id of missingIds){
      const issue={source:file,targetId:id,target:recycled.get(id)||null};
      (issue.target?recycledEdges:broken).push(issue);
    }
    const entries=Array.isArray(versions[file.id])?versions[file.id]:[];
    if(entries.length)history.push({file,count:entries.length,latest:Math.max(...entries.map(v=>Number(v.at)||0))});
  }
  history.sort((a,b)=>b.latest-a.latest);
  return {files:files.length,trashed:trash.length,notes:files.filter(f=>f.type==='notes').length,
    linkedFiles:files.length-unlinked.length,edges,broken,recycledEdges,unlinked,history};
}
