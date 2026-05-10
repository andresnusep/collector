// Advanced features: filters, export, next-track suggestions, crates.

// ─────────── Filter logic ───────────

function applyFilters(records, { search, genre, key, bpmMin, bpmMax, yearMin, yearMax, crateIds, onlyInSet, set }) {
  const q = (search || '').toLowerCase().trim();
  return records.filter(r => {
    if (q) {
      const hay = `${r.title} ${r.artist} ${r.label} ${r.catalog} ${r.genre} ${r.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (genre && genre !== 'All' && r.genre !== genre) return false;
    if (key && key !== 'All') {
      const trackKeys = r.tracks.map(t => t.key).filter(Boolean);
      const keys = [r.key, ...trackKeys].filter(Boolean);
      if (!keys.some(k => isKeyCompatible(k, key))) return false;
    }
    if (bpmMin != null && r.bpm != null && r.bpm < bpmMin) return false;
    if (bpmMax != null && r.bpm != null && r.bpm > bpmMax) return false;
    if (yearMin != null && r.year != null && r.year < yearMin) return false;
    if (yearMax != null && r.year != null && r.year > yearMax) return false;
    if (crateIds && crateIds.length) {
      if (!crateIds.includes(r.id)) return false;
    }
    if (onlyInSet && set) {
      if (!r.tracks.some((_, i) => set.includes(`${r.id}-${i}`))) return false;
    }
    return true;
  });
}

// Camelot compatibility: exact, ±1 on wheel, or relative minor/major (same number, opposite letter)
function isKeyCompatible(k1, k2) {
  if (!k1 || !k2) return false;
  if (k1 === k2) return true;
  const m1 = k1.match(/^(\d+)([AB])$/i); const m2 = k2.match(/^(\d+)([AB])$/i);
  if (!m1 || !m2) return false;
  const n1 = parseInt(m1[1]), n2 = parseInt(m2[1]);
  const l1 = m1[2].toUpperCase(), l2 = m2[2].toUpperCase();
  const diff = Math.min(Math.abs(n1 - n2), 12 - Math.abs(n1 - n2));
  if (l1 === l2 && diff <= 1) return true;
  if (l1 !== l2 && n1 === n2) return true; // relative major/minor
  return false;
}

// ─────────── Filter popover ───────────

function FilterPopover({ filters, setFilters, records }) {
  const [open, setOpen] = React.useState(false);
  const active = filters.key !== 'All' || filters.bpmMin != null || filters.bpmMax != null
    || filters.yearMin != null || filters.yearMax != null || filters.onlyInSet;

  const CAMELOT = [];
  for (let i = 1; i <= 12; i++) CAMELOT.push(`${i}A`, `${i}B`);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: '8px 12px', borderRadius: 6,
        background: active ? 'var(--accent)' : 'var(--hover)',
        color: active ? 'var(--on-accent)' : 'var(--fg)',
        border: '1px solid var(--border)', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
        fontFamily: 'JetBrains Mono, monospace',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        ⚙ Filters{active ? ' •' : ''}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            width: 320, zIndex: 41,
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}>
            <FRow label="Key (Camelot)">
              <select value={filters.key} onChange={e => setFilters({ ...filters, key: e.target.value })}
                style={fselect}>
                <option value="All">Any</option>
                {CAMELOT.map(k => <option key={k} value={k}>{k} + compatible</option>)}
              </select>
            </FRow>
            <FRow label="BPM range">
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" placeholder="min" value={filters.bpmMin ?? ''}
                  onChange={e => setFilters({ ...filters, bpmMin: e.target.value ? Number(e.target.value) : null })}
                  style={finput} />
                <input type="number" placeholder="max" value={filters.bpmMax ?? ''}
                  onChange={e => setFilters({ ...filters, bpmMax: e.target.value ? Number(e.target.value) : null })}
                  style={finput} />
              </div>
            </FRow>
            <FRow label="Year range">
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="number" placeholder="min" value={filters.yearMin ?? ''}
                  onChange={e => setFilters({ ...filters, yearMin: e.target.value ? Number(e.target.value) : null })}
                  style={finput} />
                <input type="number" placeholder="max" value={filters.yearMax ?? ''}
                  onChange={e => setFilters({ ...filters, yearMax: e.target.value ? Number(e.target.value) : null })}
                  style={finput} />
              </div>
            </FRow>
            <FRow label="In current set">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" checked={!!filters.onlyInSet}
                  onChange={e => setFilters({ ...filters, onlyInSet: e.target.checked })} />
                Show only records in the set
              </label>
            </FRow>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setFilters({ ...filters, key: 'All', bpmMin: null, bpmMax: null, yearMin: null, yearMax: null, onlyInSet: false })}
                style={fbtnSecondary}>Reset</button>
              <button onClick={() => setOpen(false)} style={fbtnPrimary}>Done</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FRow({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
      }}>{label}</div>
      {children}
    </div>
  );
}

const finput = {
  flex: 1, width: '100%', padding: '6px 8px', borderRadius: 4,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', outline: 'none',
};
const fselect = { ...finput, flex: 'none' };
const fbtnPrimary = {
  flex: 1, padding: '8px', background: 'var(--accent)', color: 'var(--on-accent)',
  border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700,
  letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};
const fbtnSecondary = {
  padding: '8px 12px', background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, fontWeight: 600,
  letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};

// ─────────── Export ───────────

function ExportMenu({ resolved, setName }) {
  const [open, setOpen] = React.useState(false);
  const name = setName || `set-${new Date().toISOString().slice(0, 10)}`;

  const download = (filename, text, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportM3U = () => {
    let txt = '#EXTM3U\n';
    for (const r of resolved) {
      const [m, s] = (r.track.len || '0:00').split(':').map(Number);
      const secs = (m || 0) * 60 + (s || 0);
      txt += `#EXTINF:${secs},${r.record.artist} - ${r.track.title}\n`;
      txt += `${r.record.artist} - ${r.track.title}.mp3\n`;
    }
    download(`${name}.m3u`, txt, 'audio/x-mpegurl');
  };

  const exportCSV = () => {
    const rows = [['#', 'Position', 'Artist', 'Title', 'BPM', 'Key', 'Length', 'Label', 'Year']];
    resolved.forEach((r, i) => rows.push([
      i + 1, r.track.n, r.record.artist, r.track.title,
      r.track.bpm ?? '', r.track.key ?? '', r.track.len ?? '',
      r.record.label ?? '', r.record.year ?? '',
    ]));
    const csv = rows.map(row => row.map(c => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    download(`${name}.csv`, csv, 'text/csv');
  };

  const exportJSON = () => {
    const data = {
      name, exportedAt: new Date().toISOString(),
      tracks: resolved.map((r, i) => ({
        position: i + 1, tid: r.tid, artist: r.record.artist, title: r.track.title,
        bpm: r.track.bpm, key: r.track.key, length: r.track.len,
        label: r.record.label, year: r.record.year, catalog: r.record.catalog,
      })),
    };
    download(`${name}.json`, JSON.stringify(data, null, 2), 'application/json');
  };

  const exportImage = async () => {
    const canvas = document.createElement('canvas');
    const W = 900, H = 180 + resolved.length * 48;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    // background
    ctx.fillStyle = '#0E0C0A'; ctx.fillRect(0, 0, W, H);
    // accent bar
    ctx.fillStyle = '#E8FF4A'; ctx.fillRect(0, 0, 6, H);
    // title
    ctx.fillStyle = '#F4EFE6';
    ctx.font = 'bold 36px "Space Grotesk", sans-serif';
    ctx.fillText(name, 40, 60);
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(244,239,230,0.55)';
    ctx.fillText(`${resolved.length} tracks · ${new Date().toLocaleDateString()}`, 40, 90);
    // header
    ctx.fillStyle = 'rgba(244,239,230,0.12)';
    ctx.fillRect(40, 120, W - 80, 1);
    // rows
    resolved.forEach((r, i) => {
      const y = 160 + i * 48;
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E8FF4A';
      ctx.fillText(String(i + 1).padStart(2, '0'), 40, y);
      ctx.font = 'bold 16px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#F4EFE6';
      ctx.fillText(`${r.record.artist} — ${r.track.title}`.slice(0, 60), 90, y);
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(244,239,230,0.55)';
      const meta = [r.track.bpm ? `${r.track.bpm} BPM` : null, r.track.key, r.track.len]
        .filter(Boolean).join(' · ');
      ctx.fillText(meta, 90, y + 20);
      ctx.fillStyle = 'rgba(244,239,230,0.08)';
      ctx.fillRect(40, y + 32, W - 80, 1);
    });
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const copyLink = async () => {
    const data = resolved.map((r, i) =>
      `${i + 1}. ${r.record.artist} — ${r.track.title}${r.track.bpm ? ` (${r.track.bpm})` : ''}${r.track.key ? ` [${r.track.key}]` : ''}`
    ).join('\n');
    try {
      await navigator.clipboard.writeText(`${name}\n\n${data}`);
    } catch {}
  };

  return (
    <div style={{ position: 'relative', flex: 2 }}>
      {/* Ghosted accent style — matches the "Gig mode" launcher next to it so
          "Save set" stays the only solid-accent primary action in the bottom bar. */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px',
        background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
        border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--fg)',
        cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>{Icon.Share} Export · Share set</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{
            position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
            width: 240, zIndex: 41,
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 8, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          }}>
            <ExportOption label="M3U playlist" hint="Rekordbox, Serato, VLC" onClick={() => { exportM3U(); setOpen(false); }} />
            <ExportOption label="CSV spreadsheet" hint="Excel, Numbers, Sheets" onClick={() => { exportCSV(); setOpen(false); }} />
            <ExportOption label="JSON backup" hint="Full data, re-importable" onClick={() => { exportJSON(); setOpen(false); }} />
            <ExportOption label="Setlist PNG" hint="Share on social / print" onClick={() => { exportImage(); setOpen(false); }} />
            <ExportOption label="Copy as text" hint="Clipboard, for chat/email" onClick={() => { copyLink(); setOpen(false); }} />
          </div>
        </>
      )}
    </div>
  );
}

function ExportOption({ label, hint, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '8px 10px', borderRadius: 4, border: 'none',
      background: 'transparent', color: 'var(--fg)', textAlign: 'left', cursor: 'pointer',
      fontFamily: 'inherit', display: 'block',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace' }}>{hint}</div>
    </button>
  );
}

// ─────────── Suggestions ───────────

function SuggestionsPanel({ resolved, records, set, onSelect }) {
  if (resolved.length === 0) return null;
  const last = resolved[resolved.length - 1];
  const lastBpm = last.track.bpm;
  const lastKey = last.track.key;

  const candidates = [];
  for (const rec of records) {
    for (let i = 0; i < rec.tracks.length; i++) {
      const t = rec.tracks[i];
      const tid = `${rec.id}-${i}`;
      if (set.includes(tid)) continue;
      let score = 0;
      if (lastBpm && t.bpm) {
        const delta = Math.abs(lastBpm - t.bpm);
        if (delta <= 2) score += 40;
        else if (delta <= 6) score += 25;
        else if (delta <= 10) score += 10;
        else continue;
      }
      if (lastKey && t.key) {
        if (t.key === lastKey) score += 50;
        else if (isKeyCompatible(lastKey, t.key)) score += 35;
      }
      if (score > 0) candidates.push({ record: rec, track: t, tid, trackIndex: i, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 6);
  if (top.length === 0) return null;

  return (
    <div style={{
      marginTop: 16, padding: 14, border: '1px solid var(--border)', borderRadius: 8,
      background: 'color-mix(in oklab, var(--accent) 4%, transparent)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
        Next up · smart picks
        <span style={{ color: 'var(--fg)' }}>
          after {last.record.artist} — {last.track.title}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {top.map(c => (
          <button key={c.tid} onClick={() => onSelect(c.record, c.trackIndex)} style={{
            padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--panel)', color: 'var(--fg)', cursor: 'pointer',
            textAlign: 'left', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.track.title}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)',
                fontFamily: 'JetBrains Mono, monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.record.artist} · {c.track.bpm ?? '—'} · {c.track.key ?? '—'}
              </div>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
              padding: '3px 6px', borderRadius: 3,
              background: 'var(--accent)', color: 'var(--on-accent)',
            }}>{c.score}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────── Crate UI ───────────

function CrateList({ crates, activeCrateId, setActiveCrateId, onNewCrate, onDeleteCrate }) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');

  const submit = () => {
    if (name.trim()) onNewCrate(name.trim());
    setName(''); setCreating(false);
  };

  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, padding: '0 6px',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)',
        }}>Crates</span>
        <button onClick={() => setCreating(true)} style={{
          background: 'transparent', border: 'none', color: 'var(--accent)',
          cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1,
        }} title="New crate">+</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
        {creating && (
          <input autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setCreating(false); }}
            onBlur={submit}
            placeholder="Crate name…"
            style={{
              margin: '0 6px', padding: '6px 10px', borderRadius: 4,
              background: 'var(--hover)', border: '1px solid var(--accent)',
              color: 'var(--fg)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }} />
        )}
        {crates.length === 0 && !creating && (
          <div style={{
            fontSize: 11, color: 'var(--dim)', padding: '4px 8px', fontStyle: 'italic',
          }}>No crates yet.</div>
        )}
        {crates.map(c => (
          <div key={c.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => setActiveCrateId(activeCrateId === c.id ? null : c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6, border: 'none',
                background: activeCrateId === c.id ? 'var(--accent)' : 'transparent',
                color: activeCrateId === c.id ? 'var(--on-accent)' : 'var(--fg)',
                cursor: 'pointer', width: '100%',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (activeCrateId !== c.id) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (activeCrateId !== c.id) e.currentTarget.style.background = 'transparent'; }}>
              {Icon.Heart}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 4,
                background: activeCrateId === c.id ? 'rgba(0,0,0,0.15)' : 'var(--border)',
              }}>{c.recordIds.length}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation();
              if (confirm(`Delete crate "${c.name}"?`)) onDeleteCrate(c.id);
            }} title="Delete crate" style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              width: 18, height: 18, border: 'none', background: 'transparent',
              color: 'var(--dim)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}>×</button>
          </div>
        ))}
      </div>
    </>
  );
}

function CrateBadges({ crates, recordId, onAddToCrate, onRemoveFromCrate, onNewCrate }) {
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const inCrates = crates.filter(c => c.recordIds.includes(recordId));

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6,
      }}>In crates</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {inCrates.map(c => (
          <button key={c.id} onClick={() => onRemoveFromCrate(c.id, recordId)} style={{
            padding: '4px 10px', borderRadius: 999, border: 'none',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: 0.5, cursor: 'pointer',
          }} title="Remove from crate">{c.name} ✕</button>
        ))}
        {crates.filter(c => !c.recordIds.includes(recordId)).map(c => (
          <button key={c.id} onClick={() => onAddToCrate(c.id, recordId)} style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'transparent', color: 'var(--fg)',
            border: '1px dashed var(--border)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
            letterSpacing: 0.5, cursor: 'pointer',
          }}>+ {c.name}</button>
        ))}
        {adding ? (
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newName.trim()) {
                onNewCrate(newName.trim(), recordId); setNewName(''); setAdding(false);
              } else if (e.key === 'Escape') { setNewName(''); setAdding(false); }
            }}
            onBlur={() => { setAdding(false); setNewName(''); }}
            placeholder="New crate…"
            style={{
              padding: '4px 10px', borderRadius: 999,
              background: 'var(--hover)', border: '1px solid var(--accent)',
              color: 'var(--fg)', fontSize: 11, fontFamily: 'inherit', outline: 'none',
              width: 120,
            }} />
        ) : (
          <button onClick={() => setAdding(true)} style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'transparent', color: 'var(--dim)',
            border: '1px dashed var(--border)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
            letterSpacing: 0.5, cursor: 'pointer',
          }}>+ New crate</button>
        )}
      </div>
    </div>
  );
}

// ─────────── Saved sets UI ───────────

function SavedSetsList({ savedSets, currentSet, activeSetId, viewingSetId, onSave, onOpen, onDelete }) {
  const [naming, setNaming] = React.useState(false);
  const [name, setName] = React.useState('');

  const submit = () => {
    if (name.trim()) onSave(name.trim());
    setName(''); setNaming(false);
  };

  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, padding: '0 6px',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)',
        }}>Saved sets</span>
        <button onClick={() => setNaming(true)} disabled={currentSet.length === 0}
          title={currentSet.length === 0 ? 'Add tracks to your set first' : 'Save current set'}
          style={{
            background: 'transparent', border: 'none',
            color: currentSet.length === 0 ? 'var(--dim)' : 'var(--accent)',
            cursor: currentSet.length === 0 ? 'default' : 'pointer',
            fontSize: 14, padding: 0, lineHeight: 1,
            opacity: currentSet.length === 0 ? 0.4 : 1,
          }}>+</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
        {naming && (
          <input autoFocus value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setNaming(false); }}
            onBlur={submit}
            placeholder="Set name…"
            style={{
              margin: '0 6px', padding: '6px 10px', borderRadius: 4,
              background: 'var(--hover)', border: '1px solid var(--accent)',
              color: 'var(--fg)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }} />
        )}
        {savedSets.length === 0 && !naming && (
          <div style={{
            fontSize: 11, color: 'var(--dim)', padding: '4px 8px', fontStyle: 'italic',
          }}>No saved sets yet.</div>
        )}
        {savedSets.map(s => {
          const viewing = viewingSetId === s.id;
          const isCurrent = activeSetId === s.id;
          const highlight = viewing || isCurrent;
          return (
          <div key={s.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button onClick={() => onOpen(s.id)}
              title={`Open "${s.name}"`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 6, border: 'none',
                background: viewing ? 'var(--accent)' : 'transparent',
                color: viewing ? 'var(--on-accent)' : 'var(--fg)',
                cursor: 'pointer', width: '100%',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500, textAlign: 'left',
              }}
              onMouseEnter={e => { if (!viewing) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={e => { if (!viewing) e.currentTarget.style.background = 'transparent'; }}>
              {Icon.Deck}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.name}
                {isCurrent && !viewing && (
                  <span title="Currently in builder" style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                    flexShrink: 0,
                  }} />
                )}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 4,
                background: viewing ? 'rgba(0,0,0,0.15)' : 'var(--border)',
              }}>{s.trackIds.length}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation();
              if (confirm(`Delete saved set "${s.name}"?`)) onDelete(s.id);
            }} title="Delete" style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              width: 18, height: 18, border: 'none', background: 'transparent',
              color: 'var(--dim)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}>×</button>
          </div>
          );
        })}
      </div>
    </>
  );
}

// ─────────── Crates page (top-level view) ───────────

function CratesPage({ crates, records, activeCrateId, setActiveCrateId, onSelect,
                     onDeleteCrate, onRemoveFromCrate, onNewCrate,
                     onAddToSet, inSet, density, showOverlays,
                     sortBy, search, viewStyle, setViewStyle, advFilters, set,
                     onBrowseCollection }) {
  const activeCrate = crates.find(c => c.id === activeCrateId);

  if (activeCrate) {
    const rawCrateRecords = activeCrate.recordIds
      .map(id => records.find(r => r.id === id))
      .filter(Boolean);
    // Apply the global search + advanced filters inside the crate
    const filtered = window.applyFilters
      ? window.applyFilters(rawCrateRecords, {
          search: search || '',
          genre: 'All',
          key: advFilters?.key || 'All',
          bpmMin: advFilters?.bpmMin ?? null,
          bpmMax: advFilters?.bpmMax ?? null,
          yearMin: advFilters?.yearMin ?? null,
          yearMax: advFilters?.yearMax ?? null,
          onlyInSet: advFilters?.onlyInSet ?? false,
          set: set || [],
        })
      : rawCrateRecords;
    const crateRecords = window.sortRecords(filtered, sortBy);
    return (
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22,
          paddingBottom: 14, borderBottom: '1px solid var(--border)',
        }}>
          <button onClick={() => setActiveCrateId(null)} style={{
            padding: '6px 12px', borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--fg)', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
          }}>← All crates</button>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            {activeCrate.name}
          </h2>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{crateRecords.length} records</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => {
            if (confirm(`Delete crate "${activeCrate.name}"?`)) onDeleteCrate(activeCrate.id);
          }} style={{
            padding: '6px 12px', borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--dim)', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'oklch(0.65 0.2 20)';
                               e.currentTarget.style.color = 'oklch(0.65 0.2 20)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';
                               e.currentTarget.style.color = 'var(--dim)'; }}>
            Delete crate
          </button>
        </div>

        {crateRecords.length === 0 ? (
          <div style={{
            padding: 50, textAlign: 'center', border: '1px dashed var(--border)',
            borderRadius: 10, color: 'var(--dim)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
              This crate is empty
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Browse your collection and tap a record to add it here.
            </div>
            <button onClick={onBrowseCollection} style={{
              padding: '8px 16px', borderRadius: 6,
              background: 'var(--accent)', color: 'var(--on-accent)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>Browse collection</button>
          </div>
        ) : (
          <>
            {(!viewStyle || viewStyle === 'grid') && (
              <CollectionGrid records={crateRecords} onSelect={onSelect}
                onAddToSet={onAddToSet} inSet={inSet} density={density}
                showOverlays={showOverlays} />
            )}
            {viewStyle === 'list' && (
              <CollectionList records={crateRecords} onSelect={onSelect}
                onAddToSet={onAddToSet} inSet={inSet} density={density}
                showOverlays={showOverlays} />
            )}
            {viewStyle === 'stack' && (
              <CollectionStack records={crateRecords} onSelect={onSelect}
                onAddToSet={onAddToSet} inSet={inSet} density={density}
                showOverlays={showOverlays} />
            )}
          </>
        )}
      </div>
    );
  }

  // Gallery — supports grid (cards with cover preview), list (compact rows),
  // or stack (falls through to grid for now since crates already are a
  // gallery layout). Switch with the toggle in the header.
  const galleryView = viewStyle === 'list' ? 'list' : 'grid';
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--dim)',
        }}>{crates.length} crate{crates.length === 1 ? '' : 's'}</div>
        <CrateViewToggle value={galleryView} onChange={setViewStyle} />
      </div>

      {galleryView === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 18,
        }}>
          {crates.map(c => (
            <CrateTile key={c.id} crate={c} records={records}
              onOpen={() => setActiveCrateId(c.id)}
              onDelete={() => { if (confirm(`Delete crate "${c.name}"?`)) onDeleteCrate(c.id); }} />
          ))}
          <NewCrateTile onNewCrate={(name) => {
            const id = onNewCrate(name);
            if (id) setActiveCrateId(id);
          }} />
          {crates.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center',
              color: 'var(--dim)', fontSize: 13,
            }}>
              No crates yet — create one above to start organizing records.
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {crates.map(c => (
            <CrateRow key={c.id} crate={c} records={records}
              onOpen={() => setActiveCrateId(c.id)}
              onDelete={() => { if (confirm(`Delete crate "${c.name}"?`)) onDeleteCrate(c.id); }} />
          ))}
          <NewCrateRow onNewCrate={(name) => {
            const id = onNewCrate(name);
            if (id) setActiveCrateId(id);
          }} />
          {crates.length === 0 && (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--dim)', fontSize: 13,
              border: '1px dashed var(--border)', borderRadius: 10,
            }}>
              No crates yet — create one above to start organizing records.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CrateTile({ crate, records, onOpen, onDelete }) {
  const [hover, setHover] = React.useState(false);
  const covers = crate.recordIds.slice(0, 4)
    .map(id => records.find(r => r.id === id)).filter(Boolean);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onOpen}
      style={{
        position: 'relative', cursor: 'pointer',
        background: 'var(--hover)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 14, transition: 'all 0.15s',
        transform: hover ? 'translateY(-2px)' : 'none',
        borderColor: hover ? 'var(--accent)' : 'var(--border)',
      }}>
      <div style={{
        position: 'relative', aspectRatio: '5 / 4', marginBottom: 12,
      }}>
        {covers.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 6,
            background: 'var(--bg)', border: '1px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--dim)', fontSize: 11, letterSpacing: 1,
            fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase',
          }}>Empty</div>
        ) : (() => {
          const fan = covers.slice(0, 3);
          // Front cover is a full square flush left; behind sleeves peek from the right edge
          const offsets = hover ? [0, 12, 20] : [0, 8, 14];
          return fan.slice().reverse().map((r, revIdx) => {
            const i = fan.length - 1 - revIdx;
            return (
              <div key={r.id} style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${offsets[i]}%`, aspectRatio: '1 / 1',
                transition: 'left 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
                boxShadow: i === 0 ? 'none' : '-6px 0 12px rgba(0,0,0,0.25)',
                borderRadius: 4, overflow: 'hidden',
              }}>
                <RecordCover hue={r.cover.hue} shape={r.cover.shape}
                  imageUrl={r.cover.image}
                  title={r.title} artist={r.artist} size={200}
                  style={{ width: '100%', height: '100%' }} />
              </div>
            );
          });
        })()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, letterSpacing: -0.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>{crate.name}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'var(--dim)', letterSpacing: 0.5,
        }}>{crate.recordIds.length}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
        position: 'absolute', top: 8, right: 8,
        width: 22, height: 22, borderRadius: 11,
        border: 'none', background: 'var(--bg)', color: 'var(--dim)',
        cursor: 'pointer', opacity: hover ? 1 : 0, transition: 'opacity 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, lineHeight: 1,
      }} title="Delete crate">×</button>
    </div>
  );
}

// Small grid/list switcher anchored in the Crates gallery header. Uses the
// global viewStyle so the user's choice persists with their other view
// preferences. Stack maps to grid here since crates already are a gallery
// layout — a "stack" of stacks doesn't add information.
function CrateViewToggle({ value, onChange }) {
  const items = [
    { id: 'grid', icon: Icon.Grid, title: 'Grid view' },
    { id: 'list', icon: Icon.List, title: 'List view' },
  ];
  if (!onChange) return null;
  return (
    <div style={{ display: 'flex', gap: 4,
      border: '1px solid var(--border)', borderRadius: 6, padding: 3 }}>
      {items.map(v => {
        const active = (value === 'list' ? 'list' : 'grid') === v.id;
        return (
          <button key={v.id}
            onClick={() => onChange(v.id)}
            title={v.title}
            style={{
              width: 28, height: 24, border: 'none', borderRadius: 4,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--fg)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{v.icon}</button>
        );
      })}
    </div>
  );
}

function CrateRow({ crate, records, onOpen, onDelete }) {
  const items = crate.recordIds.map(id => records.find(r => r.id === id)).filter(Boolean);
  // Cap at 3 previews so the stacked thumbs fit a fixed-width slot without
  // bleeding into the title column (overlap offset 14, cover 44 → 72 max).
  const previews = items.slice(0, 3);
  return (
    <div onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 22,
      padding: '10px 16px', borderRadius: 10,
      background: 'var(--panel)', border: '1px solid var(--border)',
      cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{
        position: 'relative', width: 72, height: 44, flexShrink: 0,
      }}>
        {previews.length === 0 ? (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 4,
            border: '1px dashed var(--border)', opacity: 0.5,
          }} />
        ) : previews.map((r, i) => (
          <div key={r.id} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: i * 14, width: 44, borderRadius: 4, overflow: 'hidden',
            boxShadow: i > 0 ? '-4px 0 8px rgba(0,0,0,0.18)' : 'none',
            border: '1px solid var(--border)',
          }}>
            <RecordCover hue={r.cover.hue} shape={r.cover.shape}
              imageUrl={r.cover.image}
              title={r.title} artist={r.artist} size={44}
              style={{ width: '100%', height: '100%' }} />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {crate.name}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
          textTransform: 'uppercase', color: 'var(--dim)', marginTop: 3,
        }}>{items.length} record{items.length === 1 ? '' : 's'}</div>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete crate" style={{
          width: 26, height: 26, borderRadius: 13, padding: 0,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--dim)', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, lineHeight: 1, opacity: 0.5,
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.currentTarget.style.opacity = 1;
          e.currentTarget.style.color = '#E74C5C';
          e.currentTarget.style.borderColor = '#E74C5C';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = 0.5;
          e.currentTarget.style.color = 'var(--dim)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}>×</button>

      <span style={{ opacity: 0.4, fontSize: 14, flexShrink: 0 }}>›</span>
    </div>
  );
}

function NewCrateRow({ onNewCrate }) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const submit = () => {
    if (name.trim()) onNewCrate(name.trim());
    setName(''); setCreating(false);
  };
  if (creating) {
    return (
      <div style={{
        padding: '10px 14px', borderRadius: 10,
        background: 'var(--hover)', border: '1px dashed var(--accent)',
      }}>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') { setName(''); setCreating(false); }
          }}
          onBlur={submit}
          placeholder="Crate name…"
          style={{
            width: '100%', padding: '6px 8px', borderRadius: 6,
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--fg)', fontSize: 14, fontFamily: 'inherit',
          }} />
      </div>
    );
  }
  return (
    <button onClick={() => setCreating(true)} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 14px', borderRadius: 10,
      border: '1px dashed var(--border)', background: 'transparent',
      color: 'var(--dim)', cursor: 'pointer', fontFamily: 'inherit',
      textAlign: 'left',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent)';
      e.currentTarget.style.color = 'var(--accent)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.color = 'var(--dim)';
    }}>
      <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', fontWeight: 700,
      }}>New crate</span>
    </button>
  );
}

function NewCrateTile({ onNewCrate }) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const submit = () => {
    if (name.trim()) onNewCrate(name.trim());
    setName(''); setCreating(false);
  };
  return (
    <div onClick={() => !creating && setCreating(true)} style={{
      cursor: creating ? 'default' : 'pointer',
      border: '1px dashed var(--border)', borderRadius: 10, padding: 14,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 240, color: 'var(--dim)', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!creating) { e.currentTarget.style.borderColor = 'var(--accent)';
                                          e.currentTarget.style.color = 'var(--accent)'; } }}
    onMouseLeave={e => { if (!creating) { e.currentTarget.style.borderColor = 'var(--border)';
                                          e.currentTarget.style.color = 'var(--dim)'; } }}>
      {creating ? (
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setName(''); setCreating(false); } }}
          onBlur={submit}
          placeholder="Crate name…"
          style={{
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--hover)', border: '1px solid var(--accent)',
            color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            width: '85%', textAlign: 'center',
          }} />
      ) : (
        <>
          <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 6 }}>+</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', fontWeight: 700,
          }}>New crate</div>
        </>
      )}
    </div>
  );
}

function CrateRecordCard({ record, onSelect, onRemove, onAddToSet, inSet, density, showOverlays }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={() => onSelect(record)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer', position: 'relative', transition: 'transform 0.2s',
        transform: hover ? 'translateY(-4px)' : 'none',
      }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
        <RecordCover hue={record.cover.hue} shape={record.cover.shape} imageUrl={record.cover.image}
          title={record.title} artist={record.artist}
          size={240} style={{ width: '100%', height: '100%' }} />
        {showOverlays && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, zIndex: 2 }}>
            <KeyBadge k={record.key} size={11} />
            <BpmBadge bpm={record.bpm} size={11} />
          </div>
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 2,
          opacity: hover ? 1 : 0, transition: 'opacity 0.15s',
        }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove from crate"
            style={{
              width: 28, height: 28, borderRadius: 14, border: 'none',
              background: 'var(--bg)', color: 'var(--fg)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)', fontSize: 14,
            }}>×</button>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onAddToSet(record); }}
          style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 2,
            width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
            background: inSet ? 'var(--accent)' : 'var(--bg)',
            color: inSet ? 'var(--on-accent)' : 'var(--fg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hover || inSet ? 1 : 0, transition: 'all 0.15s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>{inSet ? Icon.Check : Icon.Plus}</button>
      </div>
      <div style={{ paddingTop: 10 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
          color: 'var(--dim)', textTransform: 'uppercase',
        }}>{record.genre} · {record.year}</div>
        <div style={{
          fontSize: density === 'compact' ? 14 : 16, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{record.title}</div>
        <div style={{
          fontSize: density === 'compact' ? 12 : 13, color: 'var(--dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{record.artist}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  applyFilters, isKeyCompatible, FilterPopover, ExportMenu, SuggestionsPanel,
  CrateList, CrateBadges, SavedSetsList, CratesPage,
});
