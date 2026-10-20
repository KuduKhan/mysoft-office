// MySoft v0.5.8: IndexedDB is the authoritative, transactional workspace store.
// Legacy localStorage values are read only for one-time migration and never erased here.
export const DATABASE_NAME = 'mysoft-office-workspace-v3';
export const RECOVERY_KEY = 'mysoft-office-pending-v3';
export const LEGACY_KEYS = Object.freeze({
  files: 'mysoft-office-v1',
  trash: 'mysoft-office-trash-v2',
  versions: 'mysoft-office-revisions-v2'
});
const STORES = ['files', 'trash', 'versions', 'meta'];
const TYPES = new Set(['docs', 'sheets', 'slides', 'notes']);

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateWorkspace(workspace) {
  if (!object(workspace) || !Array.isArray(workspace.files) ||
      !Array.isArray(workspace.trash) || !object(workspace.versions)) {
    throw new Error('Invalid workspace structure');
  }
  if (workspace.files.length > 500 || workspace.trash.length > 500 ||
      Object.keys(workspace.versions).length > 1000) {
    throw new Error('Workspace exceeds supported limits');
  }
  const ids = new Set();
  for (const entry of [...workspace.files, ...workspace.trash]) {
    if (!object(entry) || !TYPES.has(entry.type) ||
        typeof entry.id !== 'string' || !entry.id || entry.id.length > 200 ||
        typeof entry.title !== 'string' || entry.title.length > 500 ||
        ids.has(entry.id)) {
      throw new Error('Invalid or duplicate file record');
    }
    ids.add(entry.id);
  }
  return workspace;
}

function parseLegacy(value, key) {
  if (value === null) return null;
  try { return JSON.parse(value); }
  catch { throw new Error('Legacy workspace contains invalid JSON in ' + key); }
}

export function readLegacyWorkspace(storage) {
  const raw = storage.getItem(LEGACY_KEYS.files);
  const trash = storage.getItem(LEGACY_KEYS.trash);
  const versions = storage.getItem(LEGACY_KEYS.versions);
  if (raw === null && trash === null && versions === null) return null;
  if (raw === null) throw new Error('Legacy workspace files missing; recovery required');
  const value = parseLegacy(raw, LEGACY_KEYS.files);
  const data = {
    files: value?.files,
    trash: trash === null ? [] : parseLegacy(trash, LEGACY_KEYS.trash),
    versions: versions === null ? {} : parseLegacy(versions, LEGACY_KEYS.versions)
  };
  return validateWorkspace(data);
}

export function readRecoveryJournal(storage) {
  const raw=storage.getItem(RECOVERY_KEY);
  if(raw===null)return null;
  let entry;
  try{entry=JSON.parse(raw);}
  catch{throw new Error('Recovery journal is invalid JSON');}
  if(!Number.isSafeInteger(entry?.sequence)||entry.sequence<1)
    throw new Error('Recovery journal has an invalid sequence');
  validateWorkspace(entry.workspace);
  return entry;
}

// Queues immutable snapshots in order. A failed write never blocks the next attempt.
export class OrderedWriteQueue {
  constructor(write) {
    this.write = write;
    this.tail = Promise.resolve();
  }
  save(workspace) {
    const snapshot = structuredClone(validateWorkspace(workspace));
    const task = this.tail.catch(() => {}).then(() => this.write(snapshot));
    this.tail = task;
    return task;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || Error('IndexedDB request failed'));
  });
}

function completed(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || Error('IndexedDB transaction aborted'));
  });
}

export class BrowserWorkspaceStore {
  constructor(indexedDBFactory = globalThis.indexedDB) {
    this.indexedDB = indexedDBFactory;
    this.db = null;
    this.committedSequence=0;
    this.nextSequence=0;
    this.legacyStorage=null;
    this.knownRevision=0;
    // Session-scoped identity survives reload in this tab, not a normal new tab.
    let owner=null;
    try{owner=globalThis.sessionStorage?.getItem('mysoft-office-tab-id')||null;}catch{}
    if(!owner||owner.length>120){
      owner=globalThis.crypto?.randomUUID?.()||'tab-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      try{globalThis.sessionStorage?.setItem('mysoft-office-tab-id',owner);}catch{}
    }
    this.ownerToken=owner;
    this.queue = new OrderedWriteQueue(snapshot => this.write(snapshot));
  }

  async open() {
    if (!this.indexedDB) throw new Error('IndexedDB is unavailable');
    const request = this.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
      }
    };
    request.onblocked = () => {};
    this.db = await requestResult(request);
    this.db.onversionchange = () => this.db.close();
    return this;
  }

  async read() {
    const tx = this.db.transaction(STORES, 'readonly');
    const done = completed(tx);
    const [files, trash, versions, metadata] = await Promise.all([
      requestResult(tx.objectStore('files').getAll()),
      requestResult(tx.objectStore('trash').getAll()),
      requestResult(tx.objectStore('versions').getAll()),
      requestResult(tx.objectStore('meta').get('workspace'))
    ]);
    await done;
    if (!metadata) {
      if (files.length || trash.length || versions.length) throw new Error('Incomplete workspace database');
      return null;
    }
    if (!Number.isSafeInteger(metadata.sequence ?? 0) || (metadata.sequence ?? 0) < 0)
      throw new Error('Invalid persisted workspace sequence');
    this.committedSequence=metadata.sequence ?? 0;
    this.knownRevision=Number.isSafeInteger(metadata.revision)?metadata.revision:0;
    this.nextSequence=Math.max(this.nextSequence,this.committedSequence);
    if (metadata.version !== 3 || files.length !== metadata.fileCount ||
        trash.length !== metadata.trashCount || versions.length !== metadata.versionCount) {
      throw new Error('Workspace integrity validation failed');
    }
    const state = {
      files: files.map(({ id, value }) => value),
      trash: trash.map(({ id, value }) => value),
      versions: Object.fromEntries(versions.map(({ id, value }) => [id, value]))
    };
    return validateWorkspace(state);
  }

  async initialize(legacyStorage, createStarter) {
    if (!this.db) await this.open();
    this.legacyStorage=legacyStorage;
    const existing = await this.read();
    // A synchronous journal protects the last edits if a tab reload interrupts
    // a debounced IndexedDB transaction. Never replay an older journal.
    let recovery=null,invalidJournal=false;
    try{recovery=readRecoveryJournal(legacyStorage);}
    catch{invalidJournal=true;} // Keep malformed optional journal for manual export.
    // Only replay edits that started from the exact committed version.
    // An old unversioned journal must never replace healthy IndexedDB content.
    if(recovery && recovery.owner===this.ownerToken &&
       recovery.sequence>this.committedSequence &&
       recovery.baseRevision===this.knownRevision){
      await this.queue.save({...recovery.workspace,_sequence:recovery.sequence});
      this.nextSequence=Math.max(this.nextSequence,recovery.sequence);
      return {workspace:recovery.workspace,source:'journal-recovered'};
    }
    if (existing) return {workspace:existing,source:
      invalidJournal||recovery?.sequence>this.committedSequence?'journal-preserved':'indexeddb'};
    let legacy=null;
    try{legacy=readLegacyWorkspace(legacyStorage);}
    catch(error){if(error?.name!=='SecurityError')throw error;}
    const workspace = legacy || (recovery?.owner===this.ownerToken?recovery.workspace:null) ||
      validateWorkspace({ files: createStarter(), trash: [], versions: {} });
    await this.queue.save({...workspace,_sequence:0});
    return { workspace, source: legacy ? 'legacy-migrated' : 'new' };
  }

  // Stage edits synchronously before navigation/reload; this is a recovery
  // journal only. IndexedDB is authoritative after transaction commit.
  stage(workspace) {
    const snapshot=structuredClone(validateWorkspace(workspace));
    const sequence=++this.nextSequence;
    let journaled=false;
    try{
      const old=readRecoveryJournal(this.legacyStorage);
      // Do not replace another tab's or pre-upgrade recovery record.
      if(!old||old.owner===this.ownerToken){
        this.legacyStorage?.setItem(RECOVERY_KEY,JSON.stringify({
          owner:this.ownerToken,baseRevision:this.knownRevision,sequence,workspace:snapshot
        }));
        journaled=!!this.legacyStorage;
      }
    }catch{/* Keep invalid or inaccessible journals for manual recovery. */}
    return {workspace:snapshot,sequence,journaled};
  }

  removeCompletedJournal(){
    try{
      const journal=readRecoveryJournal(this.legacyStorage);
      if(journal && journal.owner===this.ownerToken && journal.sequence<=this.committedSequence)
        this.legacyStorage.removeItem(RECOVERY_KEY);
    }catch{/* Preserve invalid recovery journal for manual repair. */}
  }

  save(workspace,{journal=true}={}) {
    if (!this.db) return Promise.reject(Error('Workspace database not ready'));
    // Rejected backup/cloud replacements must not become crash-replay journals.
    const staged=journal?this.stage(workspace):{
      workspace:structuredClone(validateWorkspace(workspace)),sequence:++this.nextSequence
    };
    return this.queue.save({...staged.workspace,_sequence:staged.sequence});
  }

  async write(workspace) {
    const tx=this.db.transaction(STORES,'readwrite');
    const done=completed(tx);
    let conflict=null,committedRevision=null;
    const check=tx.objectStore('meta').get('workspace');
    check.onsuccess=()=>{
      try{
        const meta=check.result;
        const current=Number.isSafeInteger(meta?.revision)?meta.revision:0;
        if(current!==this.knownRevision){
          conflict=new Error('Workspace changed in another tab. Export your unsaved backup, then reload.');
          conflict.name='WorkspaceConflictError';
          tx.abort();return;
        }
        for(const name of ['files','trash','versions'])tx.objectStore(name).clear();
        for(const value of workspace.files)tx.objectStore('files').put({id:value.id,value});
        for(const value of workspace.trash)tx.objectStore('trash').put({id:value.id,value});
        for(const [id,value] of Object.entries(workspace.versions))
          tx.objectStore('versions').put({id,value});
        committedRevision=current+1;
        tx.objectStore('meta').put({
          id:'workspace',version:3,revision:committedRevision,
          sequence:workspace._sequence??0,
          fileCount:workspace.files.length,trashCount:workspace.trash.length,
          versionCount:Object.keys(workspace.versions).length,savedAt:Date.now()
        });
      }catch(error){conflict=error;try{tx.abort();}catch{}}
    };
    try{await done;}catch(error){throw conflict||error;}
    this.knownRevision=committedRevision;
    this.committedSequence=Math.max(this.committedSequence,workspace._sequence??0);
    this.removeCompletedJournal();
  }
}