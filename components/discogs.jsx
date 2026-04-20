// Discogs import — modal drawer + fetch logic.
// Uses a personal access token (Discogs → Settings → Developers → Generate new token).
// Token + username are stored to localStorage so the user doesn't have to re-enter each time.

function DiscogsImportModal({ open, onClose, onImport }) {
  const [username, setUsername] = React.useState(() => localStorage.getItem('cs-discogs-user') || '');
  const [token, setToken] = React.useState(() => localStorage.getItem('cs-discogs-token') || '');
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState({ page: 0, total: 0, imported: 0, tracksDone: 0, tracksTotal: 0 });
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(null); // { count }

  if (!open) return null;

  const startImport = async () => {
    setError(''); setDone(null);
    if (!username.trim() || !token.trim()) { setError('Username and token are required.'); return; }
    localStorage.setItem('cs-discogs-user', username.trim());
    localStorage.setItem('cs-discogs-token', token.trim());
    setBusy(true);
    try {
      const records = await fetchDiscogsCollection(username.trim(), token.trim(),
        (page, total, imported, tracksDone, tracksTotal) =>
          setProgress({ page, total, imported, tracksDone: tracksDone || 0, tracksTotal: tracksTotal || 0 }));
      onImport(records);
      setDone({ count: records.length });
    } catch (e) {
      setError(e.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.15s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 460, maxWidth: '92vw', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 24,
        color: 'var(--fg)', fontFamily: 'inherit',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>Import</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: -0.6 }}>
              From Discogs<span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5, margin: '0 0 18px' }}>
          Pulls your public collection from Discogs. Generate a personal access token at{' '}
          <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)' }}>discogs.com/settings/developers</a>. Stored only in your browser.
        </p>

        <Field label="Discogs username">
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            disabled={busy} placeholder="your-username"
            style={inputStyle} />
        </Field>
        <Field label="Personal access token">
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            disabled={busy} placeholder="abc123…"
            style={inputStyle} />
        </Field>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 6,
            background: 'color-mix(in oklab, #E74C5C 15%, transparent)',
            border: '1px solid #E74C5C', fontSize: 12, color: '#FFB3B3',
          }}>{error}</div>
        )}

        {busy && (
          <div style={{
            marginTop: 14, padding: 12, border: '1px solid var(--border)', borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
          }}>
            {progress.tracksTotal > 0 && progress.tracksDone < progress.tracksTotal
              ? `Fetching tracklists · ${progress.tracksDone} of ${progress.tracksTotal}… (≈${Math.max(1, Math.ceil((progress.tracksTotal - progress.tracksDone) * 1.1 / 60))} min left)`
              : `Fetching page ${progress.page}${progress.total ? ` of ${progress.total}` : ''} · imported ${progress.imported}…`}
          </div>
        )}

        {done && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 6,
            background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
            border: '1px solid var(--accent)', fontSize: 13, color: 'var(--fg)',
          }}>
            Imported <b>{done.count}</b> records with full tracklists. BPM/key aren't in Discogs — fill them in the detail view, or we'll add Spotify matching later.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>
            {done ? 'Done' : 'Cancel'}
          </button>
          <button onClick={startImport} disabled={busy} style={{
            ...primaryBtnStyle, opacity: busy ? 0.6 : 1, cursor: busy ? 'default' : 'pointer',
          }}>
            {busy ? 'Importing…' : (done ? 'Import again' : 'Start import')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5,
      }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 6,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
  outline: 'none', boxSizing: 'border-box',
};
const primaryBtnStyle = {
  flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--on-accent)',
  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtnStyle = {
  padding: '10px 16px', background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};

// ─────────── API ───────────

async function fetchDiscogsCollection(username, token, onProgress) {
  const headers = {
    'Authorization': `Discogs token=${token}`,
    'User-Agent': 'CollectorStudio/0.4',
  };
  const perPage = 100;
  let page = 1, totalPages = 1;
  const all = [];

  // Step 1: paginate the collection for basic_information
  while (page <= totalPages) {
    const url = `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases?per_page=${perPage}&page=${page}`;
    const res = await fetchWithRetry(url, { headers });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid token.');
      if (res.status === 404) throw new Error('User or collection not found.');
      throw new Error(`Discogs error: ${res.status}`);
    }
    const data = await res.json();
    totalPages = data.pagination?.pages || 1;
    for (const rel of data.releases || []) {
      const mapped = mapDiscogsRelease(rel);
      if (mapped) all.push(mapped);
    }
    onProgress?.(page, totalPages, all.length, 0, all.length);
    page++;
  }

  // Step 2: fetch full tracklist per release (throttled for 60 req/min limit)
  for (let i = 0; i < all.length; i++) {
    const rec = all[i];
    try {
      const res = await fetchWithRetry(`https://api.discogs.com/releases/${rec.discogsId}`, { headers });
      if (res.ok) {
        const full = await res.json();
        const tracks = parseDiscogsTracklist(full, rec);
        if (tracks.length) rec.tracks = tracks;
        if (full.notes) rec.notes = full.notes;
        if (full.styles?.length && rec.genre === 'Unknown') rec.genre = full.styles[0];
      }
    } catch (e) { /* skip failed track fetch, keep basic info */ }
    onProgress?.(totalPages, totalPages, all.length, i + 1, all.length);
    // Throttle: ~1.1s between calls keeps us under 60/min
    if (i < all.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  return all;
}

async function fetchWithRetry(url, opts, attempt = 0) {
  const res = await fetch(url, opts);
  if (res.status === 429 && attempt < 3) {
    await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
    return fetchWithRetry(url, opts, attempt + 1);
  }
  return res;
}

function parseDiscogsTracklist(full, rec) {
  const list = full.tracklist || [];
  return list
    .filter(t => !t.type_ || t.type_ === 'track')
    .map((t, i) => ({
      n: t.position || `A${i + 1}`,
      title: t.title || 'Untitled',
      bpm: null, key: null,
      len: t.duration || '0:00',
      mood: '', energy: 5,
    }));
}

function mapDiscogsRelease(rel) {
  const info = rel.basic_information;
  if (!info) return null;
  const releaseId = info.id || rel.id;
  const artistNames = (info.artists || []).map(a => a.name.replace(/\s*\(\d+\)$/, '')).join(' & ') || 'Unknown';
  const label = info.labels?.[0]?.name || '';
  const catalog = info.labels?.[0]?.catno || '';
  const genre = info.genres?.[0] || info.styles?.[0] || 'Unknown';
  const coverImage = (info.cover_image && !info.cover_image.includes('spacer.gif'))
    ? info.cover_image : null;

  // Hue from release id so procedural fallback looks varied
  const hue = (releaseId * 37) % 360;
  const shapes = ['stripes', 'circles', 'grid', 'halftone', 'waves'];
  const shape = shapes[releaseId % shapes.length];

  return {
    id: `d${releaseId}`,
    source: 'discogs',
    discogsId: releaseId,
    artist: artistNames,
    title: info.title || 'Untitled',
    year: info.year || null,
    label, catalog,
    genre, mood: '', energy: 5,
    bpm: null, key: null,
    cover: { hue, shape, image: coverImage },
    notes: '',
    value: 0,
    tracks: [{
      n: 'A1', title: info.title || 'Untitled',
      bpm: null, key: null, len: '0:00', mood: '', energy: 5,
    }],
  };
}

Object.assign(window, { DiscogsImportModal, fetchDiscogsCollection });
