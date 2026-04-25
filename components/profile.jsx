// Profile page — local user profile (single user for now; shape supports multi-user later)

const DEFAULT_PROFILE = {
  id: 'me',
  name: '',
  djName: '',
  photo: '',          // base64 data URL or remote URL
  bio: '',
  location: '',
  genres: [],         // array of strings
  links: {
    instagram: '',
    soundcloud: '',
    residentadvisor: '',
    website: '',
  },
  // Social/calendar fields. is_discoverable is snake_case because the SQL
  // RLS policy reads `data->>'is_discoverable'` directly — keep the JS key
  // matching the policy path. gigsMigratedAt stays camelCase since it's
  // never referenced from SQL.
  is_discoverable: false,
  gigsMigratedAt: null,
};

function migrateProfile(p) {
  if (!p) return { ...DEFAULT_PROFILE };
  return {
    ...DEFAULT_PROFILE,
    ...p,
    links: { ...DEFAULT_PROFILE.links, ...(p.links || {}) },
    genres: Array.isArray(p.genres) ? p.genres : [],
  };
}

function ProfileAvatar({ profile, size = 40, onClick }) {
  const initials = (profile.djName || profile.name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const content = profile.photo ? (
    <img src={profile.photo} alt=""
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <span style={{
      fontSize: size * 0.38, fontWeight: 700, color: 'var(--on-accent)',
      fontFamily: 'JetBrains Mono, monospace', letterSpacing: -0.5,
    }}>{initials}</span>
  );
  const wrapperStyle = {
    width: size, height: size, borderRadius: '50%', overflow: 'hidden',
    background: profile.photo ? 'var(--hover)' : 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
  if (onClick) {
    return (
      <button onClick={onClick} style={{ ...wrapperStyle, border: 'none', padding: 0, cursor: 'pointer' }}>
        {content}
      </button>
    );
  }
  return <div style={wrapperStyle}>{content}</div>;
}

function ProfilePage({ profile, setProfile, records, savedSets, user, onSignOut, onRetryBpmAnalysis }) {
  const stats = React.useMemo(() => {
    const totalRecords = records.length;
    const gigCount = savedSets.reduce((sum, s) => {
      if (Array.isArray(s.gigs)) return sum + s.gigs.length;
      if (s.gig) return sum + 1;
      return sum;
    }, 0);
    const setCount = savedSets.length;
    const genreCount = new Set(records.map(r => r.genre).filter(Boolean)).size;
    // Favorite key: most common
    const keyCounts = {};
    for (const r of records) {
      for (const t of (r.tracks || [])) {
        if (t.key) keyCounts[t.key] = (keyCounts[t.key] || 0) + 1;
      }
    }
    const favKey = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const bpms = records.flatMap(r => (r.tracks || []).map(t => t.bpm).filter(b => b != null));
    const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
    return { totalRecords, gigCount, setCount, genreCount, favKey, avgBpm };
  }, [records, savedSets]);

  const update = (patch) => setProfile(p => ({ ...p, ...patch }));
  const updateLink = (key, value) => setProfile(p => ({
    ...p, links: { ...p.links, [key]: value },
  }));

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      alert('Please choose an image under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ photo: reader.result });
    reader.readAsDataURL(file);
  };

  const [genreDraft, setGenreDraft] = React.useState('');
  const addGenre = () => {
    const g = genreDraft.trim();
    if (!g) return;
    if (profile.genres.includes(g)) { setGenreDraft(''); return; }
    update({ genres: [...profile.genres, g] });
    setGenreDraft('');
  };
  const removeGenre = (g) => update({ genres: profile.genres.filter(x => x !== g) });

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28,
        padding: 20, borderRadius: 14,
        background: 'var(--hover)', border: '1px solid var(--border)',
      }}>
        <ProfileAvatar profile={profile} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.djName || profile.name || 'Unnamed DJ'}
          </div>
          {profile.djName && profile.name && (
            <div style={{ fontSize: 13, color: 'var(--dim)' }}>{profile.name}</div>
          )}
          {profile.location && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 1,
              textTransform: 'uppercase', color: 'var(--dim)', marginTop: 4,
            }}>{profile.location}</div>
          )}
          {user?.email && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 0.5,
              color: 'var(--dim)', marginTop: 6,
            }}>{user.email}</div>
          )}
        </div>
        {onSignOut && (
          <button onClick={() => { if (confirm('Sign out?')) onSignOut(); }}
            title="Sign out" style={{
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--dim)', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        )}
      </div>

      {/* Stats */}
      <SectionLabel>Stats</SectionLabel>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 10, marginBottom: 28,
      }}>
        <StatCard label="Records" value={stats.totalRecords} />
        <StatCard label="Saved sets" value={stats.setCount} />
        <StatCard label="Gigs" value={stats.gigCount} />
        <StatCard label="Genres" value={stats.genreCount} />
        <StatCard label="Favorite key" value={stats.favKey} />
        <StatCard label="Avg BPM" value={stats.avgBpm ?? '—'} />
      </div>

      {/* Profile form */}
      <SectionLabel>Profile</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        <PhotoField profile={profile} onChange={onPhotoChange}
          onRemove={() => update({ photo: '' })} />
        <ProfileField label="Name"
          value={profile.name} onChange={v => update({ name: v })}
          placeholder="Your legal name" />
        <ProfileField label="DJ name"
          value={profile.djName} onChange={v => update({ djName: v })}
          placeholder="Stage name" />
        <ProfileField label="Location"
          value={profile.location} onChange={v => update({ location: v })}
          placeholder="City, Country" />
        <ProfileField label="Bio" multiline
          value={profile.bio} onChange={v => update({ bio: v })}
          placeholder="A few lines about your sound" />
      </div>

      {/* Genres */}
      <SectionLabel>Genres</SectionLabel>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {profile.genres.length === 0 && (
            <div style={{ color: 'var(--dim)', fontSize: 12, fontStyle: 'italic' }}>
              No genres yet.
            </div>
          )}
          {profile.genres.map(g => (
            <span key={g} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 999,
              background: 'var(--hover)', border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 500,
            }}>
              {g}
              <button onClick={() => removeGenre(g)} style={{
                background: 'transparent', border: 'none', color: 'var(--dim)',
                cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
              }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={genreDraft}
            onChange={e => setGenreDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGenre(); } }}
            placeholder="Add a genre (e.g. House, Techno)"
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 8,
              background: 'var(--hover)', border: '1px solid var(--border)',
              color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }} />
          <button onClick={addGenre} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Add</button>
        </div>
      </div>

      {/* Links */}
      <SectionLabel>Links</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProfileField label="Instagram"
          value={profile.links.instagram} onChange={v => updateLink('instagram', v)}
          placeholder="@handle or full URL" />
        <ProfileField label="SoundCloud"
          value={profile.links.soundcloud} onChange={v => updateLink('soundcloud', v)}
          placeholder="soundcloud.com/yourname" />
        <ProfileField label="Resident Advisor"
          value={profile.links.residentadvisor} onChange={v => updateLink('residentadvisor', v)}
          placeholder="ra.co/dj/yourname" />
        <ProfileField label="Website"
          value={profile.links.website} onChange={v => updateLink('website', v)}
          placeholder="https://…" />
      </div>

      {/* Data tools */}
      {onRetryBpmAnalysis && (() => {
        const missing = records.reduce((n, r) => n + (r.tracks || []).filter(
          t => t.bpm == null || !t.key).length, 0);
        return (
          <>
            <div style={{ height: 28 }} />
            <SectionLabel>Data tools</SectionLabel>
            <div style={{
              padding: 16, borderRadius: 10,
              background: 'var(--hover)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  Retry BPM &amp; key analysis
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.4 }}>
                  {missing > 0
                    ? `${missing} track${missing === 1 ? '' : 's'} still missing BPM or key. Click to re-run the background analyzer via Spotify.`
                    : 'All tracks have BPM and key. Click to re-check anyway.'}
                </div>
              </div>
              <button onClick={() => {
                onRetryBpmAnalysis();
                alert('Re-analysis started. BPM and key will fill in gradually over the next few minutes — keep the tab open.');
              }} style={{
                padding: '10px 18px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: 'var(--on-accent)',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0,
              }}>Retry</button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
    }}>{children}</div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: 'var(--hover)', border: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700,
        letterSpacing: -0.5,
      }}>{value}</div>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, multiline }) {
  const common = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: 'var(--hover)', border: '1px solid var(--border)',
    color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
    resize: 'vertical',
  };
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)',
      }}>{label}</span>
      {multiline ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3} style={common} />
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} style={common} />
      )}
    </label>
  );
}

function PhotoField({ profile, onChange, onRemove }) {
  const inputRef = React.useRef(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <ProfileAvatar profile={profile} size={64} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input ref={inputRef} type="file" accept="image/*"
          onChange={onChange} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => inputRef.current?.click()} style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--fg)', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
          }}>{profile.photo ? 'Change photo' : 'Upload photo'}</button>
          {profile.photo && (
            <button onClick={onRemove} style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--dim)', fontFamily: 'inherit',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Remove</button>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)' }}>
          Max 2 MB. Stored locally on this device.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfilePage, ProfileAvatar, DEFAULT_PROFILE, migrateProfile });
