// Pure and deterministic per-record patch calculation for workspace snapshots.
// The committed IndexedDB revision remains the authoritative concurrency gate.
const collection = (workspace, name) => name === 'versions'
  ? Object.entries(workspace?.versions || {}).map(([id, value]) => ({id, value}))
  : (workspace?.[name] || []).map(value => ({id:value.id, value}));

export function workspaceRecordChanges(previous, next) {
  const changes = {};
  for (const name of ['files','trash','versions']) {
    const before = new Map(collection(previous, name).map(item => [item.id, item.value]));
    const after = new Map(collection(next, name).map(item => [item.id, item.value]));
    const remove = [...before.keys()].filter(id => !after.has(id));
    const put = [];
    for (const [id, value] of after)
      if (!before.has(id) || JSON.stringify(before.get(id)) !== JSON.stringify(value))
        put.push({id,value});
    changes[name] = {put,remove};
  }
  return changes;
}
