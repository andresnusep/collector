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

// Cross-tab broadcast channel. Whenever this tab writes to a domain table,
// it announces which collection changed so peer tabs can re-fetch and stay
// in sync without having to poll. Falls back to a no-op stub on browsers
// that lack BroadcastChannel (older Safari).
const tabChannel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('cs-data')
  : { postMessage: () => {}, addEventListener: () => {}, close: () => {} };

function announce(scope) {
  try { tabChannel.postMessage({ scope, t: Date.now() }); } catch {}
}

// Domain-specific helpers (just thin wrappers so callers read cleanly).
// Each write announces its scope so other tabs of the same user can
// re-fetch the affected collection.
const Sync = {
  fetchProfile:     () => fetchSingleton('profiles'),
  upsertProfile:    async (p)  => { await upsertSingleton('profiles', p); announce('profile'); },
  fetchRecords:     () => fetchAll('records'),
  upsertRecord:     async (r)  => { await upsertRow('records', r.id, r); announce('records'); },
  deleteRecord:     async (id) => { await deleteRow('records', id); announce('records'); },
  fetchSavedSets:   () => fetchAll('saved_sets'),
  upsertSavedSet:   async (s)  => { await upsertRow('saved_sets', s.id, s); announce('savedSets'); },
  deleteSavedSet:   async (id) => { await deleteRow('saved_sets', id); announce('savedSets'); },
  fetchCrates:      () => fetchAll('crates'),
  upsertCrate:      async (c)  => { await upsertRow('crates', c.id, c); announce('crates'); },
  deleteCrate:      async (id) => { await deleteRow('crates', id); announce('crates'); },
  fetchWorkspace:   () => fetchSingleton('workspace'),
  upsertWorkspace:  async (w)  => { await upsertSingleton('workspace', w); announce('workspace'); },
  // Subscribe to peer-tab writes. Returns an unsubscribe fn.
  onPeerChange: (handler) => {
    const fn = (e) => { if (e && e.data && e.data.scope) handler(e.data.scope); };
    tabChannel.addEventListener('message', fn);
    return () => tabChannel.removeEventListener('message', fn);
  },
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
