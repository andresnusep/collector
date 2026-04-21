// Supabase sync layer — thin data-access helpers.
// Row shape per table: { id?, user_id, data: jsonb, updated_at }.
// We store each domain object's JS shape in `data` for flexibility.

const sb = () => window.supabaseClient;

async function fetchAll(table) {
  const { data, error } = await sb().from(table).select('id, data');
  if (error) { console.warn(`[${table}] fetch`, error); return []; }
  return (data || []).map(row => row.data);
}

async function upsertRow(table, id, data) {
  const { data: auth } = await sb().auth.getUser();
  const user_id = auth?.user?.id;
  if (!user_id) return;
  const row = { id, user_id, data, updated_at: new Date().toISOString() };
  const { error } = await sb().from(table).upsert(row, { onConflict: 'user_id,id' });
  if (error) console.warn(`[${table}] upsert ${id}`, error);
}

async function deleteRow(table, id) {
  const { error } = await sb().from(table).delete().eq('id', id);
  if (error) console.warn(`[${table}] delete ${id}`, error);
}

async function upsertSingleton(table, data) {
  const { data: auth } = await sb().auth.getUser();
  const user_id = auth?.user?.id;
  if (!user_id) return;
  const row = { user_id, data, updated_at: new Date().toISOString() };
  const { error } = await sb().from(table).upsert(row, { onConflict: 'user_id' });
  if (error) console.warn(`[${table}] upsert singleton`, error);
}

async function fetchSingleton(table) {
  const { data, error } = await sb().from(table).select('data').maybeSingle();
  if (error) { console.warn(`[${table}] fetch singleton`, error); return null; }
  return data?.data ?? null;
}

// Domain-specific helpers (just thin wrappers so callers read cleanly)
const Sync = {
  fetchProfile:     () => fetchSingleton('profiles'),
  upsertProfile:    (p) => upsertSingleton('profiles', p),
  fetchRecords:     () => fetchAll('records'),
  upsertRecord:     (r) => upsertRow('records', r.id, r),
  deleteRecord:     (id) => deleteRow('records', id),
  fetchSavedSets:   () => fetchAll('saved_sets'),
  upsertSavedSet:   (s) => upsertRow('saved_sets', s.id, s),
  deleteSavedSet:   (id) => deleteRow('saved_sets', id),
  fetchCrates:      () => fetchAll('crates'),
  upsertCrate:      (c) => upsertRow('crates', c.id, c),
  deleteCrate:      (id) => deleteRow('crates', id),
  fetchWorkspace:   () => fetchSingleton('workspace'),
  upsertWorkspace:  (w) => upsertSingleton('workspace', w),
};

// Diff helper: for array state, sync only changed/added/removed items.
function diffArraySync({ prev, curr, getId, onUpsert, onDelete }) {
  const prevMap = new Map(prev.map(x => [getId(x), x]));
  const currMap = new Map(curr.map(x => [getId(x), x]));
  for (const x of curr) {
    const before = prevMap.get(getId(x));
    if (before !== x) onUpsert(x);
  }
  for (const id of prevMap.keys()) {
    if (!currMap.has(id)) onDelete(id);
  }
}

// Debounce wrapper for singleton upserts.
function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(...args); }, ms);
  };
}

Object.assign(window, { Sync, diffArraySync, debounce });
