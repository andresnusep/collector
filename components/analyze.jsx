// GetSongBPM integration — fills in missing BPM/key per track.
// Free API, requires attribution (shown in modal). Get a key at https://getsongbpm.com/api

const GSBPM_DEFAULT_KEY = '92947fe415c8cddf9b400174476de981';

function AnalyzeModal({ open, records, onClose, onApply }) {
  const [apiKey, setApiKey] = React.useState(() =>
    localStorage.getItem('cs-gsbpm-key') || GSBPM_DEFAULT_KEY);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0, hits: 0 });
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(null);
  const cancelRef = React.useRef(false);

  if (!open) return null;

  // Find tracks missing BPM (we look up per-track since records may have many tracks)
  const targets = [];
  for (const r of records) {
    for (let i = 0; i < r.tracks.length; i++) {
      const t = r.tracks[i];
      if (t.bpm == null || t.key == null || t.key === '') {
        targets.push({ recordId: r.id, trackIndex: i, artist: r.artist, title: t.title || r.title });
      }
    }
  }

  const start = async () => {
    setError(''); setDone(null); cancelRef.current = false;
    if (!apiKey.trim()) { setError('API key required.'); return; }
    localStorage.setItem('cs-gsbpm-key', apiKey.trim());
    setBusy(true);
    setProgress({ done: 0, total: targets.length, hits: 0 });

    const updates = {}; // recordId -> [{trackIndex, bpm, key}]
    let hits = 0;
    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      const t = targets[i];
      try {
        const result = await lookupGetSongBpm(t.artist, t.title, apiKey.trim());
        if (result) {
          (updates[t.recordId] ||= []).push({ trackIndex: t.trackIndex, ...result });
          hits++;
        }
      } catch (e) { /* skip track on error */ }
      setProgress({ done: i + 1, total: targets.length, hits });
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    onApply(updates);
    setDone({ tracks: hits, scanned: Object.keys(updates).length });
    setBusy(false);
  };

  const cancel = () => { cancelRef.current = true; };

  return (
    <div onClick={busy ? null : onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 460, maxWidth: '92vw', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 24,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>Analyze</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, letterSpacing: -0.6 }}>
              Match BPM & Key<span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5, margin: '0 0 14px' }}>
          Looks up BPM and key per track via{' '}
          <a href="https://getsongbpm.com/api" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)' }}>GetSongBPM</a>. Free, requires a backlink attribution.
          Get a key at the link. Stored in your browser only.
        </p>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
            textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5,
          }}>API key</div>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            disabled={busy} placeholder="your-api-key"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 6,
              background: 'var(--hover)', border: '1px solid var(--border)',
              color: 'var(--fg)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
              outline: 'none', boxSizing: 'border-box',
            }} />
        </label>

        <div style={{
          padding: '10px 12px', borderRadius: 6, background: 'var(--hover)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
          marginBottom: 14,
        }}>
          {targets.length} track{targets.length === 1 ? '' : 's'} missing BPM or key
          {targets.length > 0 && ` · ~${Math.ceil(targets.length * 0.6 / 60)} min`}
        </div>

        {error && (
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 6,
            background: 'color-mix(in oklab, #E74C5C 15%, transparent)',
            border: '1px solid #E74C5C', fontSize: 12, color: '#FFB3B3',
          }}>{error}</div>
        )}

        {busy && (
          <div style={{
            padding: 12, border: '1px solid var(--border)', borderRadius: 6,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
            marginBottom: 14,
          }}>
            <div style={{ marginBottom: 6 }}>
              {progress.done} of {progress.total} · {progress.hits} matched
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'var(--accent)',
                width: `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        )}

        {done && (
          <div style={{
            marginBottom: 14, padding: 12, borderRadius: 6,
            background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
            border: '1px solid var(--accent)', fontSize: 13,
          }}>
            Matched <b>{done.tracks}</b> tracks across <b>{done.scanned}</b> records.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {busy ? (
            <button onClick={cancel} style={secondaryBtnStyle2}>Stop</button>
          ) : (
            <button onClick={onClose} style={secondaryBtnStyle2}>{done ? 'Done' : 'Cancel'}</button>
          )}
          {!busy && (
            <button onClick={start} disabled={targets.length === 0} style={{
              ...primaryBtnStyle2, opacity: targets.length === 0 ? 0.5 : 1,
              cursor: targets.length === 0 ? 'default' : 'pointer',
            }}>
              {done ? 'Scan again' : targets.length === 0 ? 'Nothing to match' : 'Start matching'}
            </button>
          )}
        </div>

        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 0.5,
          color: 'var(--dim)', textAlign: 'center',
        }}>
          Tempo &amp; key data courtesy of{' '}
          <a href="https://getsongbpm.com" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)' }}>GetSongBPM.com</a>
        </div>
      </div>
    </div>
  );
}

const primaryBtnStyle2 = {
  flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--on-accent)',
  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtnStyle2 = {
  padding: '10px 16px', background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};

// ─────────── API ───────────

// Calls our Supabase edge function `spotify-features` which resolves
// artist+title → Spotify track → audio features (tempo + Camelot key).
// CORS + auth are handled server-side; we just need the anon key header.
async function lookupGetSongBpm(artist, title, _ignoredKey) {
  if (!artist || !title) return null;
  const base = 'https://iqnqwweukbcjgyspqbyg.supabase.co/functions/v1/spotify-features';
  const url = `${base}?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`;
  const anon = window.SUPABASE_ANON_KEY;
  try {
    const res = await fetch(url, anon
      ? { headers: { apikey: anon, authorization: `Bearer ${anon}` } }
      : {});
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bpm: Number.isFinite(data.bpm) && data.bpm > 0 ? Math.round(data.bpm) : null,
      key: data.key || null,
    };
  } catch { return null; }
}

// Convert "C", "Am", "F#m", "Bb" etc. into Camelot notation like "8B", "8A".
// Also passes through if already Camelot ("5A").
function keyToCamelot(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^([1-9]|1[0-2])[AB]$/i.test(s)) return s.toUpperCase();

  const MAJOR = { C: '8B', 'C#': '3B', Db: '3B', D: '10B', 'D#': '5B', Eb: '5B', E: '12B',
    F: '7B', 'F#': '2B', Gb: '2B', G: '9B', 'G#': '4B', Ab: '4B', A: '11B',
    'A#': '6B', Bb: '6B', B: '1B', Cb: '1B' };
  const MINOR = { C: '5A', 'C#': '12A', Db: '12A', D: '7A', 'D#': '2A', Eb: '2A', E: '9A',
    F: '4A', 'F#': '11A', Gb: '11A', G: '6A', 'G#': '1A', Ab: '1A', A: '8A',
    'A#': '3A', Bb: '3A', B: '10A' };

  const m = s.match(/^([A-Ga-g][#b]?)\s*(m|min|minor)?$/);
  if (!m) return null;
  const note = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase().replace('b', 'b').replace('#', '#');
  const isMinor = !!m[2];
  return (isMinor ? MINOR : MAJOR)[note] || null;
}

Object.assign(window, { AnalyzeModal, lookupGetSongBpm, keyToCamelot });
