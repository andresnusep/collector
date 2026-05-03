// Calendar view — list of gigs (upcoming first, then past) with an
// add/edit modal. Backed by the gigs table set up in Phase 1.
//
// Gig shape:
//   { id, playedAt, venue, location, setId?, notes, status, is_public }
// is_public uses snake_case to match the SQL RLS policy path.

function CalendarView({ gigs, savedSets, onAddGig, onUpdateGig, onDeleteGig }) {
  const [editing, setEditing] = React.useState(null); // null | { ...gig } (new or existing)

  const today = new Date().toISOString().slice(0, 10);
  // Normalize status from playedAt — a manual override can still set it,
  // but if absent we infer from the date.
  const inferStatus = (g) => {
    if (g.status) return g.status;
    if (!g.playedAt) return 'upcoming';
    return g.playedAt < today ? 'played' : 'upcoming';
  };

  const upcoming = gigs.filter(g => inferStatus(g) === 'upcoming')
    .sort((a, b) => (a.playedAt || '￿').localeCompare(b.playedAt || '￿'));
  const past = gigs.filter(g => inferStatus(g) === 'played')
    .sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));

  const startNew = () => setEditing({
    id: `g${Date.now()}`,
    playedAt: '',
    venue: '',
    location: '',
    setId: '',
    notes: '',
    status: 'upcoming',
    is_public: false,
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: 22, paddingTop: 8 }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
          }}>{upcoming.length} upcoming · {past.length} past</div>
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>
            Track every gig — share publicly or keep private.
          </div>
        </div>
        <button onClick={startNew} style={{
          padding: '10px 16px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>{Icon.Plus} Add gig</button>
      </div>

      {gigs.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', borderRadius: 12,
          border: '1px dashed var(--border)', color: 'var(--dim)',
        }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No gigs yet.</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            Add upcoming bookings or log past sets.<br/>
            Toggle "Make this gig public" on any entry to surface it on your DJ profile.
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <CalendarSection title="Upcoming" gigs={upcoming}
              savedSets={savedSets}
              onEdit={(g) => setEditing(g)}
              onDelete={(g) => { if (confirm(`Delete "${g.venue || 'this gig'}"?`)) onDeleteGig(g.id); }} />
          )}
          {past.length > 0 && (
            <CalendarSection title="Past" gigs={past}
              savedSets={savedSets}
              onEdit={(g) => setEditing(g)}
              onDelete={(g) => { if (confirm(`Delete "${g.venue || 'this gig'}"?`)) onDeleteGig(g.id); }} />
          )}
        </>
      )}

      {editing && (
        <GigForm gig={editing} savedSets={savedSets}
          onClose={() => setEditing(null)}
          onSave={(g) => {
            const exists = gigs.some(x => x.id === g.id);
            if (exists) onUpdateGig(g); else onAddGig(g);
            setEditing(null);
          }} />
      )}
    </div>
  );
}

function CalendarSection({ title, gigs, savedSets, onEdit, onDelete }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
      }}>{title} · {gigs.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gigs.map(g => (
          <GigRow key={g.id} gig={g} savedSets={savedSets}
            onEdit={() => onEdit(g)}
            onDelete={() => onDelete(g)} />
        ))}
      </div>
    </div>
  );
}

function GigRow({ gig, savedSets, onEdit, onDelete }) {
  const linkedSet = gig.setId ? savedSets.find(s => s.id === gig.setId) : null;
  const dateLabel = gig.playedAt ? formatGigDate(gig.playedAt) : 'No date';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 16px', borderRadius: 10,
      background: 'var(--panel)', border: '1px solid var(--border)',
    }}>
      <div style={{ flexShrink: 0 }}>
        <span style={{
          display: 'inline-block',
          padding: '5px 10px', borderRadius: 999,
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>{dateLabel}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline',
          gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
            {gig.venue || 'Untitled venue'}
          </div>
          {gig.location && (
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>· {gig.location}</div>
          )}
          {gig.is_public ? (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, letterSpacing: 1,
              background: 'var(--accent)', color: 'var(--on-accent)', textTransform: 'uppercase',
            }}>Public</span>
          ) : (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fontWeight: 700,
              padding: '2px 6px', borderRadius: 4, letterSpacing: 1,
              border: '1px solid var(--border)', color: 'var(--dim)', textTransform: 'uppercase',
            }}>Private</span>
          )}
        </div>
        {linkedSet && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--dim)', marginTop: 4,
          }}>Set: {linkedSet.name}</div>
        )}
        {gig.notes && (
          <div style={{ fontSize: 12, color: 'var(--dim)',
            marginTop: 6, lineHeight: 1.5 }}>{gig.notes}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} title="Edit" style={iconBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button onClick={onDelete} title="Delete" style={iconBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 30, height: 30, borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--fg)', cursor: 'pointer', padding: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function GigForm({ gig, savedSets, onSave, onClose }) {
  const [draft, setDraft] = React.useState(gig);
  const update = (patch) => setDraft(d => ({ ...d, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    // Recompute status from playedAt at save time so users don't have to
    // think about it. They can still flip it manually via the toggle below.
    const today = new Date().toISOString().slice(0, 10);
    const status = draft.status === 'played' || draft.status === 'upcoming'
      ? draft.status
      : (draft.playedAt && draft.playedAt < today ? 'played' : 'upcoming');
    onSave({ ...draft, status });
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{
        width: 480, maxWidth: '92vw', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 24,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 18,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>Gig</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>
              {savedSets.some(s => s.id === gig.id) || gig.venue ? 'Edit gig' : 'New gig'}
              <span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <FieldRow label="Date">
          <input type="date" value={draft.playedAt || ''}
            onChange={e => update({ playedAt: e.target.value })}
            style={fieldStyle} />
        </FieldRow>

        <FieldRow label="Venue">
          <input value={draft.venue} onChange={e => update({ venue: e.target.value })}
            placeholder="Berghain, Panorama Bar…"
            style={fieldStyle} required />
        </FieldRow>

        <FieldRow label="Location">
          <input value={draft.location} onChange={e => update({ location: e.target.value })}
            placeholder="Berlin, Germany"
            style={fieldStyle} />
        </FieldRow>

        <FieldRow label="Linked set">
          <select value={draft.setId || ''}
            onChange={e => update({ setId: e.target.value })}
            style={{ ...fieldStyle, appearance: 'auto' }}>
            <option value="">— None —</option>
            {savedSets.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Notes">
          <textarea value={draft.notes} onChange={e => update({ notes: e.target.value })}
            rows={3} placeholder="Lineup, vibe, set notes…"
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </FieldRow>

        <FieldRow label="Status">
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'played',   label: 'Played' },
            ].map(s => (
              <button type="button" key={s.id}
                onClick={() => update({ status: s.id })}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6,
                  background: draft.status === s.id ? 'var(--accent)' : 'transparent',
                  color: draft.status === s.id ? 'var(--on-accent)' : 'var(--fg)',
                  border: '1px solid ' + (draft.status === s.id ? 'var(--accent)' : 'var(--border)'),
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
                }}>{s.label}</button>
            ))}
          </div>
        </FieldRow>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: 12, marginTop: 8, marginBottom: 18,
          borderRadius: 8, background: 'var(--hover)',
          border: '1px solid var(--border)', cursor: 'pointer',
        }}>
          <input type="checkbox" checked={!!draft.is_public}
            onChange={e => update({ is_public: e.target.checked })}
            style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Make this gig public
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, lineHeight: 1.4 }}>
              Visible on your DJ profile and to anyone with your profile link.
              Off by default — flip it on per gig.
            </div>
          </div>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button type="submit" style={primaryBtn}>Save gig</button>
        </div>
      </form>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
      }}>{label}</div>
      {children}
    </label>
  );
}

const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};

const primaryBtn = {
  flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--on-accent)',
  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtn = {
  padding: '10px 16px', background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
};

// "Sat, Nov 8" / "Mar 21, 2024" — drops the year if it's the current year.
function formatGigDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

Object.assign(window, { CalendarView, GigForm });
