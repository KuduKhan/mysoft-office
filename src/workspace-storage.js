// MySoft v0.5.8: IndexedDB is the authoritative, transactional workspace store.
// Legacy localStorage values are read only for one-time migration and never erased here.
export const DATABASE_NAME = 'mysoft-office-workspace-v3';
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
    const existing = await this.read();
    if (existing) return { workspace: existing, source: 'indexeddb' };
    const legacy = readLegacyWorkspace(legacyStorage);
    const workspace = legacy || validateWorkspace({ files: createStarter(), trash: [], versions: {} });
    await this.queue.save(workspace);
    return { workspace, source: legacy ? 'legacy-migrated' : 'new' };
  }

  save(workspace) {
    if (!this.db) return Promise.reject(Error('Workspace database not ready'));
    return this.queue.save(workspace);
  }

  async write(workspace) {
    const tx = this.db.transaction(STORES, 'readwrite');
    const done = completed(tx);
    try {
      for (const store of ['files', 'trash', 'versions']) tx.objectStore(store).clear();
      for (const value of workspace.files) tx.objectStore('files').put({ id: value.id, value });
      for (const value of workspace.trash) tx.objectStore('trash').put({ id: value.id, value });
      for (const [id, value] of Object.entries(workspace.versions)) {
        tx.objectStore('versions').put({ id, value });
      }
      tx.objectStore('meta').put({
        id: 'workspace', version: 3,
        fileCount: workspace.files.length, trashCount: workspace.trash.length,
        versionCount: Object.keys(workspace.versions).length,
        savedAt: Date.now()
      });
    } catch (error) {
      try { tx.abort(); } catch {}
      await done.catch(() => {});
      throw error;
    }
    await done;
  }
}