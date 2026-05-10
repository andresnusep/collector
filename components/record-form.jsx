// Add / edit a record. Used for both new records and editing existing ones
// (including filling in BPM/key on Discogs imports).

function RecordFormModal({ open, initial, onClose, onSave, onDelete }) {
  const isEdit = !!initial;
  const blank = () => ({
    id: `m${Date.now()}`, source: 'manual',
    artist: '', title: '', year: new Date().getFullYear(),
    label: '', catalog: '',
    genre: '', mood: '', energy: null,
    bpm: null, key: '', value: 0, notes: '',
    cover: { hue: Math.floor(Math.random() * 360), shape: 'stripes', image: null },
    tracks: [{ n: 'A1', title: '', bpm: null, key: '', len: '0:00', mood: '', energy: null }],
  });
  const [draft, setDraft] = React.useState(blank);

  React.useEffect(() => {
    if (open) setDraft(initial ? JSON.parse(JSON.stringify(initial)) : blank());
  }, [open, initial]);

  if (!open) return null;

  const patch = (p) => setDraft(d => ({ ...d, ...p }));
  const patchCover = (p) => setDraft(d => ({ ...d, cover: { ...d.cover, ...p } }));
  const patchTrack = (i, p) => setDraft(d => {
    const tracks = [...d.tracks];
    tracks[i] = { ...tracks[i], ...p };
    return { ...d, tracks };
  });
  const addTrack = () => setDraft(d => {
    const side = d.tracks.length < 6 ? 'A' : 'B';
    const pos = d.tracks.filter(t => t.n?.startsWith(side)).length + 1;
    return { ...d, tracks: [...d.tracks, {
      n: `${side}${pos}`, title: '', bpm: null, key: '', len: '0:00', mood: '', energy: null,
    }] };
  });
  const removeTrack = (i) => setDraft(d => ({ ...d, tracks: d.tracks.filter((_, j) => j !== i) }));

  const save = () => {
    if (!draft.artist.trim() || !draft.title.trim()) return;
    const clean = {
      ...draft,
      // Preserve the original addedAt when editing; stamp a fresh one on
      // brand-new records so they bubble to the top of "Recently added".
      addedAt: draft.addedAt || Date.now(),
      bpm: draft.bpm === '' || draft.bpm == null ? null : Number(draft.bpm),
      year: draft.year ? Number(draft.year) : null,
      value: Number(draft.value) || 0,
      energy: draft.energy === '' || draft.energy == null ? null : Number(draft.energy),
      rpm: Number(draft.rpm) || 33,
      tracks: draft.tracks.map(t => ({
        ...t,
        bpm: t.bpm === '' || t.bpm == null ? null : Number(t.bpm),
        energy: t.energy === '' || t.energy == null ? null : Number(t.energy),
      })),
    };
    onSave(clean);
    onClose();
  };

  const del = () => {
    if (!isEdit) return;
    if (confirm(`Delete "${draft.title}" from your collection?`)) {
      onDelete(draft.id);
      onClose();
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 24, color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>{isEdit ? 'Edit record' : 'New record'}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
              {isEdit ? `${draft.title || 'Untitled'}` : 'Add to your collection'}
              <span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FField label="Artist *">
            <input value={draft.artist} onChange={e => patch({ artist: e.target.value })} style={inp} /></FField>
          <FField label="Title *">
            <input value={draft.title} onChange={e => patch({ title: e.target.value })} style={inp} /></FField>
          <FField label="Year">
            <input type="number" value={draft.year || ''} onChange={e => patch({ year: e.target.value })} style={inp} /></FField>
          <FField label="Value ($)">
            <input type="number" value={draft.value} onChange={e => patch({ value: e.target.value })} style={inp} /></FField>
          <FField label="Label">
            <input value={draft.label} onChange={e => patch({ label: e.target.value })} style={inp} /></FField>
          <FField label="Catalog #">
            <input value={draft.catalog} onChange={e => patch({ catalog: e.target.value })} style={inp} /></FField>
          <FField label="Genre">
            <input value={draft.genre} onChange={e => patch({ genre: e.target.value })} style={inp} /></FField>
          <FField label="Mood">
            <input value={draft.mood} onChange={e => patch({ mood: e.target.value })} style={inp} /></FField>
          <FField label="BPM (record avg)">
            <input type="number" value={draft.bpm ?? ''} onChange={e => patch({ bpm: e.target.value })} style={inp} /></FField>
          <FField label="Key (Camelot, e.g. 8A)">
            <input value={draft.key || ''} onChange={e => patch({ key: e.target.value.toUpperCase() })} style={inp} /></FField>
          <FField label="Speed (RPM)">
            <select value={draft.rpm || 33} onChange={e => patch({ rpm: Number(e.target.value) })}
              style={inp}>
              <option value={33}>33⅓</option>
              <option value={45}>45</option>
              <option value={78}>78</option>
            </select></FField>
          <FField label="Energy (1–10)">
            <input type="number" min="1" max="10" value={draft.energy}
              onChange={e => patch({ energy: e.target.value })} style={inp} /></FField>
          <FField label="Cover hue (0–359)">
            <input type="number" min="0" max="359" value={draft.cover.hue}
              onChange={e => patchCover({ hue: Number(e.target.value) || 0 })} style={inp} /></FField>
          <FField label="Cover image URL (optional)" span={2}>
            <input value={draft.cover.image || ''}
              onChange={e => patchCover({ image: e.target.value || null })}
              placeholder="https://…" style={inp} /></FField>
          <FField label="Notes" span={2}>
            <textarea value={draft.notes} onChange={e => patch({ notes: e.target.value })}
              rows={3} style={{ ...inp, fontFamily: 'inherit', resize: 'vertical' }} /></FField>
        </div>

        <div style={{
          marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            Tracklist · {draft.tracks.length} tracks
          </div>
          <button onClick={addTrack} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--accent)', color: 'var(--on-accent)',
            border: 'none', borderRadius: 999, cursor: 'pointer',
          }}>+ Track</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {draft.tracks.map((t, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '50px 1fr 80px 70px 70px 28px',
              gap: 6, alignItems: 'center',
            }}>
              <input value={t.n} onChange={e => patchTrack(i, { n: e.target.value })}
                placeholder="A1" style={{ ...inp, padding: '8px' }} />
              <input value={t.title} onChange={e => patchTrack(i, { title: e.target.value })}
                placeholder="Track title" style={{ ...inp, padding: '8px' }} />
              <input type="number" value={t.bpm ?? ''}
                onChange={e => patchTrack(i, { bpm: e.target.value })}
                placeholder="BPM" style={{ ...inp, padding: '8px' }} />
              <input value={t.key || ''}
                onChange={e => patchTrack(i, { key: e.target.value.toUpperCase() })}
                placeholder="8A" style={{ ...inp, padding: '8px' }} />
              <input value={t.len}
                onChange={e => patchTrack(i, { len: e.target.value })}
                placeholder="0:00" style={{ ...inp, padding: '8px' }} />
              <button onClick={() => removeTrack(i)} disabled={draft.tracks.length <= 1}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--dim)',
                  cursor: draft.tracks.length <= 1 ? 'default' : 'pointer',
                  opacity: draft.tracks.length <= 1 ? 0.3 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{Icon.X}</button>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10,
        }}>
          {isEdit && (
            <button onClick={del} style={{
              padding: '10px 14px', background: 'transparent', color: '#E74C5C',
              border: '1px solid #E74C5C', borderRadius: 6, fontSize: 11, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
            }}>Delete</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: '10px 16px', background: 'transparent', color: 'var(--fg)',
            border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600,
            letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={save} disabled={!draft.artist.trim() || !draft.title.trim()} style={{
            padding: '10px 20px', background: 'var(--accent)', color: 'var(--on-accent)',
            border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: 'inherit',
            opacity: (!draft.artist.trim() || !draft.title.trim()) ? 0.5 : 1,
          }}>{isEdit ? 'Save changes' : 'Add record'}</button>
        </div>
      </div>
    </div>
  );
}

function FField({ label, children, span = 1 }) {
  return (
    <label style={{ gridColumn: `span ${span}`, display: 'block' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
      }}>{label}</div>
      {children}
    </label>
  );
}

const inp = {
  width: '100%', padding: '9px 10px', borderRadius: 6,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
  outline: 'none', boxSizing: 'border-box',
};

Object.assign(window, { RecordFormModal });
