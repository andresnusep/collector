// Profile — Instagram-style public-facing layout. The same ProfileScreen
// renders both the in-app /profile view (isOwner=true, shows full content)
// and the public /#u/{user_id} route (isOwner=false, public-only content,
// reachable signed-out via the RLS policies set up in Phase 1).

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

// ─────────── Shared profile layout (Instagram-style) ───────────

function ProfileScreen({ profile, sets = [], gigs = [], records = [],
                         isOwner, onEdit, onShare, onRetryBpmAnalysis }) {
  const [tab, setTab] = React.useState('info');
  // Owner sees everything (with private badges); visitors see public-only.
  const visibleSets = isOwner ? sets : sets.filter(s => s.is_public);
  const visibleGigs = isOwner ? gigs : gigs.filter(g => g.is_public);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = visibleGigs.filter(
    g => (g.status || (g.playedAt && g.playedAt >= today ? 'upcoming' : 'played')) === 'upcoming'
  ).length;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 0 60px' }}>
      <ProfileHeader profile={profile} isOwner={isOwner}
        setsCount={visibleSets.length}
        gigsCount={visibleGigs.length}
        upcomingCount={upcomingCount}
        onEdit={onEdit} onShare={onShare} />

      <ProfileTabs tab={tab} setTab={setTab}
        infoCount={null}
        calendarCount={visibleGigs.length}
        setsCount={visibleSets.length} />

      {tab === 'info' && (
        <ProfileInfoTab profile={profile} isOwner={isOwner}
          recordsCount={records.length}
          setsCount={visibleSets.length}
          gigsCount={visibleGigs.length}
          onRetryBpmAnalysis={onRetryBpmAnalysis} />
      )}
      {tab === 'calendar' && (
        <ProfileCalendarPanel gigs={visibleGigs} isOwner={isOwner} />
      )}
      {tab === 'sets' && (
        <ProfileSetsPanel sets={visibleSets} isOwner={isOwner} />
      )}
    </div>
  );
}

// ─────────── Header ───────────

function ProfileHeader({ profile, isOwner, setsCount, gigsCount, upcomingCount, onEdit, onShare }) {
  const displayName = profile.djName || profile.name || 'Unnamed DJ';
  const realName = profile.djName && profile.name && profile.djName !== profile.name
    ? profile.name : null;
  return (
    <div style={{
      display: 'flex', gap: 24, alignItems: 'flex-start',
      padding: '20px 24px 24px', borderRadius: 14,
      background: 'var(--hover)', border: '1px solid var(--border)',
      marginBottom: 14,
    }}>
      <ProfileAvatar profile={profile} size={120} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap',
          gap: 12, alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6,
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
          {isOwner && profile.is_discoverable && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
              padding: '3px 7px', borderRadius: 4, letterSpacing: 1,
              background: 'var(--accent)', color: 'var(--on-accent)', textTransform: 'uppercase',
            }}>Public</span>
          )}
          {isOwner && !profile.is_discoverable && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
              padding: '3px 7px', borderRadius: 4, letterSpacing: 1,
              border: '1px solid var(--border)', color: 'var(--dim)', textTransform: 'uppercase',
            }}>Private</span>
          )}
        </div>
        {realName && (
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 6 }}>{realName}</div>
        )}
        {profile.location && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
          }}>{profile.location}</div>
        )}

        {/* Inline counters — IG-style */}
        <div style={{ display: 'flex', gap: 22, marginBottom: 12 }}>
          <HeaderCounter value={setsCount} label="Sets" />
          <HeaderCounter value={gigsCount} label="Gigs" />
          <HeaderCounter value={upcomingCount} label="Upcoming" />
        </div>

        {profile.bio && (
          <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5,
            marginBottom: 12, whiteSpace: 'pre-wrap' }}>{profile.bio}</div>
        )}

        <ProfileLinks links={profile.links} />

        {isOwner && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {onEdit && (
              <button onClick={onEdit} style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase',
              }}>Edit profile</button>
            )}
            {onShare && (
              <button onClick={onShare} style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>{Icon.Share} Share profile</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderCounter({ value, label }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginTop: 4,
      }}>{label}</div>
    </div>
  );
}

function ProfileLinks({ links }) {
  const items = [
    { key: 'instagram',       label: 'Instagram',
      prefix: 'https://instagram.com/', strip: '@' },
    { key: 'soundcloud',      label: 'SoundCloud',
      prefix: 'https://soundcloud.com/', strip: '' },
    { key: 'residentadvisor', label: 'Resident Advisor',
      prefix: 'https://ra.co/dj/',       strip: '' },
    { key: 'website',         label: 'Website',
      prefix: '',                        strip: '' },
  ];
  const visible = items.filter(i => links?.[i.key]);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {visible.map(item => {
        const raw = String(links[item.key] || '').trim();
        // If user pasted a full URL, link to it directly. Otherwise prepend prefix.
        const url = /^https?:\/\//i.test(raw)
          ? raw
          : item.prefix + raw.replace(/^@/, '').replace(/^\/+/, '');
        return (
          <a key={item.key} href={url} target="_blank" rel="noreferrer noopener"
            style={{
              padding: '5px 10px', borderRadius: 999,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--fg)', fontSize: 11, fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
            }}>{item.label}</a>
        );
      })}
    </div>
  );
}

// ─────────── Tabs ───────────

function ProfileTabs({ tab, setTab, calendarCount, setsCount }) {
  const items = [
    { id: 'info', label: 'DJ info', badge: null },
    { id: 'calendar', label: 'Calendar', badge: calendarCount },
    { id: 'sets', label: 'Sets', badge: setsCount },
  ];
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 18,
      borderBottom: '1px solid var(--border)', padding: '0 4px',
    }}>
      {items.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding: '10px 14px', background: 'transparent', border: 'none',
          color: tab === t.id ? 'var(--fg)' : 'var(--dim)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
          borderBottom: '2px solid ' + (tab === t.id ? 'var(--accent)' : 'transparent'),
          marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span style={{ fontSize: 9, opacity: 0.7 }}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────── Tab panels ───────────

function ProfileInfoTab({ profile, isOwner, recordsCount, setsCount, gigsCount, onRetryBpmAnalysis }) {
  const hasGenres = profile.genres && profile.genres.length > 0;
  const hasBio = !!profile.bio;
  const hasInfo = hasGenres || hasBio || profile.location;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {!hasInfo && !isOwner && (
        <EmptyPanel>This DJ hasn't filled out their profile yet.</EmptyPanel>
      )}
      {hasGenres && (
        <Panel label="Genres">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.genres.map(g => (
              <span key={g} style={{
                padding: '5px 10px', borderRadius: 999,
                background: 'var(--bg)', border: '1px solid var(--border)',
                fontSize: 12, fontWeight: 500,
              }}>{g}</span>
            ))}
          </div>
        </Panel>
      )}
      {isOwner && (
        <Panel label="Stats">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 8,
          }}>
            <MiniStat label="Records" value={recordsCount} />
            <MiniStat label="Saved sets" value={setsCount} />
            <MiniStat label="Gigs" value={gigsCount} />
          </div>
        </Panel>
      )}
      {!hasInfo && isOwner && (
        <EmptyPanel>
          Your bio is empty. Click <b>Edit profile</b> in the header to add a bio,
          genres, and links so your public profile feels alive.
        </EmptyPanel>
      )}
    </div>
  );
}

function ProfileCalendarPanel({ gigs, isOwner }) {
  if (gigs.length === 0) {
    return (
      <EmptyPanel>
        {isOwner
          ? 'No public gigs yet. Open the Calendar tab in the workspace and toggle "Make this gig public" on a gig to surface it here.'
          : 'No public gigs yet.'}
      </EmptyPanel>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const status = (g) => g.status
    || (g.playedAt && g.playedAt < today ? 'played' : 'upcoming');
  const upcoming = gigs.filter(g => status(g) === 'upcoming')
    .sort((a, b) => (a.playedAt || '￿').localeCompare(b.playedAt || '￿'));
  const past = gigs.filter(g => status(g) === 'played')
    .sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {upcoming.length > 0 && (
        <ProfileGigSection title="Upcoming" gigs={upcoming} />
      )}
      {past.length > 0 && (
        <ProfileGigSection title="Past" gigs={past} />
      )}
    </div>
  );
}

function ProfileGigSection({ title, gigs }) {
  return (
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8,
      }}>{title} · {gigs.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gigs.map(g => <ProfileGigRow key={g.id} gig={g} />)}
      </div>
    </div>
  );
}

function ProfileGigRow({ gig }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--panel)', border: '1px solid var(--border)',
    }}>
      <div style={{
        width: 80, flexShrink: 0,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'var(--accent)', fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>{gig.playedAt ? formatDate(gig.playedAt) : '—'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>
          {gig.venue || 'Untitled venue'}
        </div>
        {gig.location && (
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{gig.location}</div>
        )}
        {gig.notes && (
          <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 6, lineHeight: 1.5 }}>
            {gig.notes}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSetsPanel({ sets, isOwner }) {
  if (sets.length === 0) {
    return (
      <EmptyPanel>
        {isOwner
          ? 'No public sets yet. Open one of your saved sets and toggle "Make this set public" to feature it here.'
          : 'No public sets yet.'}
      </EmptyPanel>
    );
  }
  return (
    <div style={{ display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
      {sets.map(s => (
        <div key={s.id} style={{
          padding: 14, borderRadius: 10,
          background: 'var(--panel)', border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3,
            marginBottom: 6 }}>{s.name || 'Untitled set'}</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--dim)',
          }}>{(s.trackIds || []).length} tracks</div>
        </div>
      ))}
    </div>
  );
}

function Panel({ label, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
      }}>{label}</div>
      <div style={{
        padding: 16, borderRadius: 10,
        background: 'var(--hover)', border: '1px solid var(--border)',
      }}>{children}</div>
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div style={{
      padding: 24, borderRadius: 10, textAlign: 'center',
      border: '1px dashed var(--border)', color: 'var(--dim)',
      fontSize: 12, lineHeight: 1.6,
    }}>{children}</div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--bg)', border: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700,
        letterSpacing: -0.3,
      }}>{value}</div>
    </div>
  );
}

// ─────────── In-app wrapper (the /profile view) ───────────

function ProfilePage({ profile, setProfile, records, savedSets, gigs, user, onSignOut, onRetryBpmAnalysis }) {
  const [editing, setEditing] = React.useState(false);
  const [shareMsg, setShareMsg] = React.useState('');
  const handleShare = () => {
    if (!user || !user.id) return;
    const url = `${window.location.origin}/#u/${user.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => { setShareMsg('Profile URL copied to clipboard.'); setTimeout(() => setShareMsg(''), 3500); },
        () => { window.prompt('Copy your profile URL:', url); }
      );
    } else {
      window.prompt('Copy your profile URL:', url);
    }
  };
  return (
    <>
      {shareMsg && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 250, padding: '10px 16px', borderRadius: 8,
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}>{shareMsg}</div>
      )}
      <ProfileScreen profile={profile}
        sets={savedSets || []} gigs={gigs || []} records={records || []}
        isOwner={true}
        onEdit={() => setEditing(true)}
        onShare={handleShare}
        onRetryBpmAnalysis={onRetryBpmAnalysis} />
      {editing && (
        <EditProfileModal profile={profile}
          user={user} onSignOut={onSignOut}
          onRetryBpmAnalysis={onRetryBpmAnalysis}
          onSave={(p) => { setProfile(p); setEditing(false); }}
          onClose={() => setEditing(false)} />
      )}
    </>
  );
}

// ─────────── Public profile route (/#u/{user_id}) ───────────

function PublicProfilePage({ userId, viewerSession, onExit }) {
  const [profile, setProfileState] = React.useState(null);
  const [sets, setSets] = React.useState([]);
  const [gigs, setGigs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setNotFound(false);
    (async () => {
      const [p, s, g] = await Promise.all([
        window.Sync.fetchPublicProfile(userId),
        window.Sync.fetchPublicSets(userId),
        window.Sync.fetchPublicGigs(userId),
      ]);
      if (cancelled) return;
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfileState(migrateProfile(p));
      setSets(s || []);
      setGigs(g || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)',
      fontFamily: 'Space Grotesk, -apple-system, system-ui, sans-serif',
    }}>
      <PublicTopBar viewerSession={viewerSession} onExit={onExit} />
      <div style={{ padding: '24px 20px' }}>
        {loading && (
          <div style={{
            padding: 60, textAlign: 'center', color: 'var(--dim)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}>Loading…</div>
        )}
        {!loading && notFound && (
          <ProfileNotFound onExit={onExit} />
        )}
        {!loading && !notFound && profile && (
          <ProfileScreen profile={profile} sets={sets} gigs={gigs} records={[]}
            isOwner={false} />
        )}
      </div>
    </div>
  );
}

function PublicTopBar({ viewerSession, onExit }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderBottom: '1px solid var(--border)',
      background: 'var(--panel)',
    }}>
      <button onClick={onExit} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--fg)', padding: 0, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <picture>
          <source srcSet="kollectorlogo.webp" type="image/webp" />
          <img src="kollectorlogo.png" alt="Kollector Studio"
            className="brand-logo"
            style={{ height: 26, width: 'auto', display: 'block' }} />
        </picture>
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        {viewerSession ? (
          <button onClick={onExit} style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>Open my workspace</button>
        ) : (
          <button onClick={onExit} style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>Sign in</button>
        )}
      </div>
    </div>
  );
}

function ProfileNotFound({ onExit }) {
  return (
    <div style={{
      maxWidth: 460, margin: '60px auto', padding: 40, textAlign: 'center',
      borderRadius: 14, background: 'var(--hover)', border: '1px dashed var(--border)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 14,
      }}>Profile not found</div>
      <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
        This DJ doesn't exist or hasn't gone public yet.
      </h2>
      <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.6, margin: '0 0 24px' }}>
        Profiles are private by default. The owner has to flip
        "Discoverable" on in their profile settings before this link works.
      </p>
      <button onClick={onExit} style={{
        padding: '10px 18px', borderRadius: 8, border: 'none',
        background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>Back to Kollector Studio</button>
    </div>
  );
}

// ─────────── Edit profile modal ───────────

function EditProfileModal({ profile, user, onSignOut, onSave, onClose, onRetryBpmAnalysis }) {
  const [draft, setDraft] = React.useState(profile);
  const [genreDraft, setGenreDraft] = React.useState('');
  const update = (patch) => setDraft(d => ({ ...d, ...patch }));
  const updateLink = (key, value) => setDraft(d => ({
    ...d, links: { ...d.links, [key]: value },
  }));
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { alert('Please choose an image under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => update({ photo: reader.result });
    reader.readAsDataURL(file);
  };
  const addGenre = () => {
    const g = genreDraft.trim();
    if (!g) return;
    if (draft.genres.includes(g)) { setGenreDraft(''); return; }
    update({ genres: [...draft.genres, g] });
    setGenreDraft('');
  };
  const removeGenre = (g) => update({ genres: draft.genres.filter(x => x !== g) });

  const submit = (e) => {
    e.preventDefault();
    onSave(draft);
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto',
    }}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{
        width: 540, maxWidth: '100%', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 24,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>Profile</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>
              Edit profile<span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        {/* Discoverable toggle — pinned to the top because it's the most consequential setting */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: 14, marginBottom: 18,
          borderRadius: 8, background: 'var(--hover)',
          border: `1px solid ${draft.is_discoverable ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer',
        }}>
          <input type="checkbox" checked={!!draft.is_discoverable}
            onChange={e => update({ is_discoverable: e.target.checked })}
            style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              Make my profile public
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.5 }}>
              When on, anyone with your profile link
              {user?.id && (
                <> (<code style={{ fontSize: 10 }}>kollector.studio/#u/{user.id.slice(0, 8)}…</code>)</>
              )}
              {' '}can view your DJ info, public gigs, and public sets.
              When off, your profile is invisible to everyone but you.
            </div>
          </div>
        </label>

        {/* Photo */}
        <EditField label="Photo">
          <PhotoField profile={draft} onChange={onPhotoChange}
            onRemove={() => update({ photo: '' })} />
        </EditField>

        <EditField label="DJ name">
          <input value={draft.djName || ''}
            onChange={e => update({ djName: e.target.value })}
            placeholder="Stage name (shown in public)" style={fieldStyle} />
        </EditField>

        <EditField label="Real name">
          <input value={draft.name || ''}
            onChange={e => update({ name: e.target.value })}
            placeholder="Optional, only shown on your own view"
            style={fieldStyle} />
        </EditField>

        <EditField label="Location">
          <input value={draft.location || ''}
            onChange={e => update({ location: e.target.value })}
            placeholder="Berlin, Germany" style={fieldStyle} />
        </EditField>

        <EditField label="Bio">
          <textarea value={draft.bio || ''}
            onChange={e => update({ bio: e.target.value })}
            rows={3} placeholder="A few lines about your sound"
            style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} />
        </EditField>

        <EditField label="Genres">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(draft.genres || []).map(g => (
              <span key={g} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 999,
                background: 'var(--hover)', border: '1px solid var(--border)',
                fontSize: 12, fontWeight: 500,
              }}>
                {g}
                <button type="button" onClick={() => removeGenre(g)} style={{
                  background: 'transparent', border: 'none', color: 'var(--dim)',
                  cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1,
                }}>×</button>
              </span>
            ))}
            {(draft.genres || []).length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>
                No genres yet.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={genreDraft}
              onChange={e => setGenreDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGenre(); } }}
              placeholder="House, Techno, …"
              style={{ ...fieldStyle, flex: 1 }} />
            <button type="button" onClick={addGenre} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: 'var(--on-accent)',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>Add</button>
          </div>
        </EditField>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)', marginTop: 18, marginBottom: 6,
        }}>Links</div>
        <EditField label="Instagram">
          <input value={draft.links?.instagram || ''}
            onChange={e => updateLink('instagram', e.target.value)}
            placeholder="@handle or full URL" style={fieldStyle} />
        </EditField>
        <EditField label="SoundCloud">
          <input value={draft.links?.soundcloud || ''}
            onChange={e => updateLink('soundcloud', e.target.value)}
            placeholder="soundcloud.com/yourname" style={fieldStyle} />
        </EditField>
        <EditField label="Resident Advisor">
          <input value={draft.links?.residentadvisor || ''}
            onChange={e => updateLink('residentadvisor', e.target.value)}
            placeholder="ra.co/dj/yourname" style={fieldStyle} />
        </EditField>
        <EditField label="Website">
          <input value={draft.links?.website || ''}
            onChange={e => updateLink('website', e.target.value)}
            placeholder="https://…" style={fieldStyle} />
        </EditField>

        {(onRetryBpmAnalysis || onSignOut || user?.email) && (
          <>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)', marginTop: 22, marginBottom: 6,
            }}>Account</div>
            {user?.email && (
              <div style={{
                fontSize: 12, color: 'var(--dim)', marginBottom: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}>{user.email}</div>
            )}
            {onRetryBpmAnalysis && (
              <button type="button" onClick={() => {
                onRetryBpmAnalysis();
                alert('Re-analysis started. BPM and key will fill in over the next few minutes.');
              }} style={accountBtn}>
                Retry BPM &amp; key analysis
              </button>
            )}
            {onSignOut && (
              <button type="button" onClick={() => { if (confirm('Sign out?')) onSignOut(); }}
                style={{ ...accountBtn, color: 'var(--dim)' }}>
                Sign out
              </button>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button type="submit" style={primaryBtn}>Save</button>
        </div>
      </form>
    </div>
  );
}

function EditField({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
      }}>{label}</div>
      {children}
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
          <button type="button" onClick={() => inputRef.current?.click()} style={{
            padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--fg)', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
          }}>{profile.photo ? 'Change photo' : 'Upload photo'}</button>
          {profile.photo && (
            <button type="button" onClick={onRemove} style={{
              padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--dim)', fontFamily: 'inherit',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Remove</button>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)' }}>
          Max 2 MB.
        </div>
      </div>
    </div>
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
const accountBtn = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--fg)', fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
  letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
  marginBottom: 8, textAlign: 'left',
};

// "Sat, Nov 8" / "Mar 21, 2024" — drops the year if it's the current year.
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

Object.assign(window, {
  ProfilePage, ProfileAvatar, PublicProfilePage,
  DEFAULT_PROFILE, migrateProfile,
});
