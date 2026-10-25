// MySoft Cloud v0.12: read-only comparison and optimistic snapshot writes.
// A remote snapshot is NEVER merged automatically into local IndexedDB.
import {validateWorkspace} from './workspace-storage.js';

function mapRecords(workspace){
  const entries=new Map();
  for(const name of ['files','trash']){
    for(const item of workspace[name]||[])entries.set(item.id,{place:name,record:item});
  }
  return entries;
}
export function workspaceSignature(workspace){
  validateWorkspace(workspace);
  // exportedAt and JSON formatting do not represent content edits.
  return JSON.stringify({
    files:workspace.files,
    trash:workspace.trash,
    versions:workspace.versions
  });
}
export function cloudSnapshotSummary(local,remote){
  validateWorkspace(local);
  if(remote!==null)validateWorkspace(remote);
  const left=mapRecords(local),right=remote?mapRecords(remote):new Map();
  const summary={localOnly:[],remoteOnly:[],different:[],same:0,versionsDiffer:false,remoteMissing:remote===null};
  for(const [id,entry] of left){
    const other=right.get(id);
    if(!other)summary.localOnly.push({id,title:entry.record.title});
    else if(entry.place!==other.place||JSON.stringify(entry.record)!==JSON.stringify(other.record))
      summary.different.push({id,title:entry.record.title,remoteTitle:other.record.title});
    else summary.same++;
  }
  for(const [id,entry] of right)
    if(!left.has(id))summary.remoteOnly.push({id,title:entry.record.title});
  summary.versionsDiffer=remote!==null&&JSON.stringify(local.versions)!==JSON.stringify(remote.versions);
  summary.identical=remote!==null&&workspaceSignature(local)===workspaceSignature(remote);
  summary.hasDifferences=!summary.identical;
  return summary;
}
export class CloudSnapshotConflictError extends Error {
  constructor(message='Cloud snapshot has changed. Review the newest cloud copy before uploading again.'){
    super(message);this.name='CloudSnapshotConflictError';
  }
}
// Single-row compare-and-swap: PostgREST enforces the updated_at predicate
// inside the UPDATE, so a second device cannot overwrite a newer snapshot.
// The initial INSERT is create-only (no upsert), preventing first-write races.
export async function writeSnapshotIfCurrent(supabase,userId,payload,expectedUpdatedAt){
  validateWorkspace(payload);
  if(typeof userId!=='string'||!userId)throw Error('Signed-in identity missing');
  if(expectedUpdatedAt!==null&&(typeof expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(expectedUpdatedAt))))
    throw Error('Cloud revision is invalid; review the snapshot again.');
  if(expectedUpdatedAt===null){
    const {data,error}=await supabase.from('mysoft_workspaces')
      .insert({user_id:userId,payload}).select('updated_at').single();
    if(error?.code==='23505')throw new CloudSnapshotConflictError();
    if(error)throw error;
    if(!data?.updated_at)throw Error('Cloud insert did not confirm a revision.');
    return data.updated_at;
  }
  const nextTime=new Date(Math.max(Date.now(),Date.parse(expectedUpdatedAt)+1)).toISOString();
  const {data,error}=await supabase.from('mysoft_workspaces')
    .update({payload,updated_at:nextTime})
    .eq('user_id',userId).eq('updated_at',expectedUpdatedAt)
    .select('updated_at').maybeSingle();
  if(error)throw error;
  if(!data?.updated_at)throw new CloudSnapshotConflictError();
  return data.updated_at;
}
