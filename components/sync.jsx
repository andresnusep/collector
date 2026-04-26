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

// Follows is a junction table — no JSONB data, just (follower_id,
// followed_id, created_at). Read/write helpers are bespoke since they
// don't fit the generic upsertRow/fetchAll pattern.
async function fetchFollowing(userId) {
  const { data, error } = await sb().from('follows')
    .select('followed_id').eq('follower_id', userId);
  if (error) { console.warn('[follows] fetch following', error); return []; }
  return (data || []).map(r => r.followed_id);
}
async function fetchFollowers(userId) {
  const { data, error } = await sb().from('follows')
    .select('follower_id').eq('followed_id', userId);
  if (error) { console.warn('[follows] fetch followers', error); return []; }
  return (data || []).map(r => r.follower_id);
}
async function follow(followedId) {
  const { data: auth } = await sb().auth.getUser();
  const followerId = auth?.user?.id;
  if (!followerId || followerId === followedId) return;
  const { error } = await sb().from('follows')
    .insert({ follower_id: followerId, followed_id: followedId });
  if (error) console.warn('[follows] insert', error);
}
async function unfollow(followedId) {
  const { data: auth } = await sb().auth.getUser();
  const followerId = auth?.user?.id;
  if (!followerId) return;
  const { error } = await sb().from('follows').delete()
    .eq('follower_id', followerId).eq('followed_id', followedId);
  if (error) console.warn('[follows] delete', error);
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
  fetchGigs:        () => fetchAll('gigs'),
  upsertGig:        async (g)  => { await upsertRow('gigs', g.id, g); announce('gigs'); },
  deleteGig:        async (id) => { await deleteRow('gigs', id); announce('gigs'); },
  fetchWorkspace:   () => fetchSingleton('workspace'),
  upsertWorkspace:  async (w)  => { await upsertSingleton('workspace', w); announce('workspace'); },
  // Follow graph (junction table, different shape from the rest)
  fetchFollowing,
  fetchFollowers,
  follow:           async (id) => { await follow(id); announce('follows'); },
  unfollow:         async (id) => { await unfollow(id); announce('follows'); },
  // Public reads — used by /u/{user_id} routes. No auth required because
  // RLS policies allow anon to read rows flagged public/discoverable.
  fetchPublicProfile: async (userId) => {
    const { data, error } = await sb().from('profiles')
      .select('data').eq('user_id', userId).maybeSingle();
    if (error) { console.warn('[profiles] fetch public', error); return null; }
    return data?.data ?? null;
  },
  fetchPublicSets: async (userId) => {
    const { data, error } = await sb().from('saved_sets')
      .select('id, data').eq('user_id', userId);
    if (error) { console.warn('[saved_sets] fetch public', error); return []; }
    return (data || []).map(r => r.data);
  },
  fetchPublicGigs: async (userId) => {
    const { data, error } = await sb().from('gigs')
      .select('id, data').eq('user_id', userId);
    if (error) { console.warn('[gigs] fetch public', error); return []; }
    return (data || []).map(r => r.data);
  },
  // Resolve a vanity slug → profile. Anon-readable through the same RLS
  // policy that gates is_discoverable, so signed-out visitors hitting
  // kollector.studio/{slug} can land on the public profile.
  fetchProfileBySlug: async (slug) => {
    if (!slug) return null;
    const { data, error } = await sb().from('profiles')
      .select('user_id, data')
      .eq('data->>slug', slug.toLowerCase())
      .maybeSingle();
    if (error) { console.warn('[profiles] fetchBySlug', error); return null; }
    return data ? { user_id: data.user_id, ...(data.data || {}) } : null;
  },
  // Pre-flight uniqueness check used by the EditProfileModal before save
  // so we surface "already taken" inline instead of as a write error.
  // Returns true if the slug is free OR already belongs to viewerUserId.
  isSlugAvailable: async (slug, viewerUserId) => {
    if (!slug) return true;
    const { data, error } = await sb().from('profiles')
      .select('user_id')
      .eq('data->>slug', slug.toLowerCase())
      .limit(1);
    if (error) { console.warn('[profiles] isSlugAvailable', error); return false; }
    if (!data || data.length === 0) return true;
    return data[0].user_id === viewerUserId;
  },
  // Discover DJs — used by the user-search UI. Returns minimal display rows
  // for any profile flagged is_discoverable. RLS already restricts what anon
  // can read, so this is safe even when called from a signed-out viewer.
  // Filtering by query happens client-side because the JSON shape doesn't
  // support a server-side full-text search without a tsvector column, which
  // is over-engineered for the early discoverable user count we'll have.
  searchProfiles: async (query) => {
    const { data, error } = await sb().from('profiles')
      .select('user_id, data').limit(200);
    if (error) { console.warn('[profiles] search', error); return []; }
    const q = (query || '').trim().toLowerCase();
    return (data || [])
      .filter(r => r.data && r.data.is_discoverable === true)
      .map(r => ({
        user_id: r.user_id,
        djName: r.data.djName || '',
        name: r.data.name || '',
        photo: r.data.photo || '',
        location: r.data.location || '',
        bio: r.data.bio || '',
        slug: r.data.slug || '',
      }))
      .filter(p => {
        if (!q) return true;
        const hay = `${p.djName} ${p.name} ${p.location}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.djName || a.name || '').localeCompare(b.djName || b.name || ''));
  },
  // Fetch a batch of profiles by id — used to render lists like "people I
  // follow" without N+1 queries.
  fetchProfilesByIds: async (ids) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await sb().from('profiles')
      .select('user_id, data').in('user_id', ids);
    if (error) { console.warn('[profiles] fetchByIds', error); return []; }
    return (data || []).map(r => ({ user_id: r.user_id, ...(r.data || {}) }));
  },
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
