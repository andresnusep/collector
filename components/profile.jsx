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
                         isOwner, onEdit, onShare, onRetryBpmAnalysis,
                         followerCount = 0, followingCount = 0,
                         isFollowing = false, canFollow = false,
                         followBusy = false,
                         onFollow, onShowFollowers, onShowFollowing }) {
  const [tab, setTab] = React.useState('info');
  // Owner sees everything (with private badges); visitors see public-only.
  const visibleSets = isOwner ? sets : sets.filter(s => s.is_public);
  const visibleGigs = isOwner ? gigs : gigs.filter(g => g.is_public);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 0 60px' }}>
      <ProfileHeader profile={profile} isOwner={isOwner}
        setsCount={visibleSets.length}
        gigsCount={visibleGigs.length}
        followerCount={followerCount}
        followingCount={followingCount}
        isFollowing={isFollowing}
        canFollow={canFollow}
        followBusy={followBusy}
        onFollow={onFollow}
        onShowFollowers={onShowFollowers}
        onShowFollowing={onShowFollowing}
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

function ProfileHeader({ profile, isOwner, setsCount, gigsCount,
                         followerCount, followingCount, isFollowing, canFollow,
                         followBusy, onFollow, onShowFollowers, onShowFollowing,
                         onEdit, onShare }) {
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

        {/* Inline counters — IG-style. Followers/Following are clickable to
            open the list modals; Sets/Gigs are static counts. */}
        <div style={{ display: 'flex', gap: 22, marginBottom: 12 }}>
          <HeaderCounter value={setsCount} label="Sets" />
          <HeaderCounter value={gigsCount} label="Gigs" />
          <HeaderCounter value={followerCount} label="Followers"
            onClick={onShowFollowers} />
          <HeaderCounter value={followingCount} label="Following"
            onClick={onShowFollowing} />
        </div>

        {profile.bio && (
          <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5,
            marginBottom: 12, whiteSpace: 'pre-wrap' }}>{profile.bio}</div>
        )}

        <ProfileLinks links={profile.links} />

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {isOwner && onEdit && (
            <button onClick={onEdit} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>Edit profile</button>
          )}
          {isOwner && onShare && (
            <button onClick={onShare} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>{Icon.Share} Share profile</button>
          )}
          {!isOwner && canFollow && onFollow && (
            <button onClick={onFollow} disabled={followBusy} style={{
              padding: '8px 16px', borderRadius: 8,
              border: isFollowing ? '1px solid var(--border)' : 'none',
              background: isFollowing ? 'transparent' : 'var(--accent)',
              color: isFollowing ? 'var(--fg)' : 'var(--on-accent)',
              cursor: followBusy ? 'default' : 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              opacity: followBusy ? 0.6 : 1,
              minWidth: 110,
            }}>{isFollowing ? 'Following' : 'Follow'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderCounter({ value, label, onClick }) {
  const interactive = !!onClick;
  return (
    <button onClick={onClick} disabled={!interactive} style={{
      background: 'transparent', border: 'none', padding: 0,
      color: 'var(--fg)', cursor: interactive ? 'pointer' : 'default',
      textAlign: 'left', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginTop: 4,
      }}>{label}</div>
    </button>
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
          ? 'No gigs yet. Add one from the Calendar tab in the workspace, then toggle "Make this gig public" to surface it on your public profile.'
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
        <ProfileGigSection title="Upcoming" gigs={upcoming} isOwner={isOwner} />
      )}
      {past.length > 0 && (
        <ProfileGigSection title="Past" gigs={past} isOwner={isOwner} />
      )}
    </div>
  );
}

function ProfileGigSection({ title, gigs, isOwner }) {
  return (
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8,
      }}>{title} · {gigs.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gigs.map(g => <ProfileGigRow key={g.id} gig={g} isOwner={isOwner} />)}
      </div>
    </div>
  );
}

function ProfileGigRow({ gig, isOwner }) {
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--panel)', border: '1px solid var(--border)',
      // Faded look for owner-visible private gigs so they can see at a glance
      // which entries are not on their public profile.
      opacity: isOwner && !gig.is_public ? 0.6 : 1,
    }}>
      <div style={{
        width: 80, flexShrink: 0,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'var(--accent)', fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>{gig.playedAt ? formatDate(gig.playedAt) : '—'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>
            {gig.venue || 'Untitled venue'}
          </div>
          {isOwner && !gig.is_public && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fontWeight: 700,
              padding: '2px 6px', borderRadius: 3, letterSpacing: 1,
              border: '1px solid var(--border)', color: 'var(--dim)', textTransform: 'uppercase',
            }}>Private</span>
          )}
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
  // Shared audio element + state across every card so only one preview plays
  // at a time. Lives at the panel level rather than per-card so toggling a
  // different track stops whatever was playing without each card needing to
  // know about its siblings.
  const audioRef = React.useRef(null);
  const [playingTid, setPlayingTid] = React.useState(null);
  const [loadingTid, setLoadingTid] = React.useState(null);
  const [missTid, setMissTid] = React.useState(null);

  const stop = React.useCallback(() => {
    const a = audioRef.current;
    if (a) { try { a.pause(); a.currentTime = 0; } catch {} }
    setPlayingTid(null);
  }, []);

  const togglePreview = React.useCallback(async (tid, artist, title) => {
    if (playingTid === tid) { stop(); return; }
    if (!window.iTunesPreview) return;
    stop();
    setLoadingTid(tid);
    try {
      const url = await window.iTunesPreview.getPreview(tid, artist, title);
      if (!url) {
        setMissTid(tid);
        setTimeout(() => setMissTid(m => (m === tid ? null : m)), 1500);
        return;
      }
      const a = audioRef.current;
      if (!a) return;
      a.src = url;
      try { await a.play(); setPlayingTid(tid); }
      catch { setPlayingTid(null); }
    } finally {
      setLoadingTid(null);
    }
  }, [playingTid, stop]);

  React.useEffect(() => () => stop(), [stop]);

  if (sets.length === 0) {
    return (
      <EmptyPanel>
        {isOwner
          ? 'No sets yet. Save one from the Set Builder, then toggle "Public" on its detail page to feature it here.'
          : 'No public sets yet.'}
      </EmptyPanel>
    );
  }

  return (
    <>
      <audio ref={audioRef} preload="none" style={{ display: 'none' }}
        onEnded={() => setPlayingTid(null)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sets.map(s => (
          <ProfileSetCard key={s.id} set={s} isOwner={isOwner}
            playingTid={playingTid} loadingTid={loadingTid} missTid={missTid}
            onTogglePreview={togglePreview} />
        ))}
      </div>
    </>
  );
}

function ProfileSetCard({ set, isOwner, playingTid, loadingTid, missTid, onTogglePreview }) {
  const [expanded, setExpanded] = React.useState(false);

  // Resolve trackIds via the global parseTrackId. Works on the in-app /profile
  // (records are loaded) and on the public route only when the visitor
  // happens to be the owner — a non-owner viewing the public URL won't have
  // the records populated, so resolved is empty and we fall back to a
  // placeholder count + a friendly note.
  const resolved = React.useMemo(() => {
    if (!window.parseTrackId) return [];
    return (set.trackIds || []).map(tid => {
      const p = window.parseTrackId(tid);
      return p ? { tid, ...p } : null;
    }).filter(Boolean);
  }, [set]);

  const trackCount = (set.trackIds || []).length;
  const hasResolved = resolved.length > 0;

  // Average BPM across resolved tracks. Skip nulls so we don't drag the
  // average down with un-analyzed tracks.
  const avgBpm = React.useMemo(() => {
    const bs = resolved.map(r => r.track.bpm).filter(b => b != null);
    return bs.length ? Math.round(bs.reduce((a, b) => a + b, 0) / bs.length) : null;
  }, [resolved]);

  const totalMin = React.useMemo(() => {
    if (!hasResolved) return null;
    const m = resolved.reduce((sum, r) => {
      const [mm, ss] = (r.track.len || '0:00').split(':').map(Number);
      return sum + (mm || 0) + (ss || 0) / 60;
    }, 0);
    return Math.floor(m);
  }, [resolved, hasResolved]);

  const dim = isOwner && !set.is_public;

  return (
    <div style={{
      borderRadius: 10, background: 'var(--panel)',
      border: `1px solid ${expanded ? 'var(--accent)' : 'var(--border)'}`,
      overflow: 'hidden', opacity: dim ? 0.65 : 1,
      transition: 'border-color 0.15s, opacity 0.15s',
    }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', background: 'transparent', border: 'none',
        color: 'var(--fg)', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {set.name || 'Untitled set'}
            </div>
            {isOwner && !set.is_public && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5, fontWeight: 700,
                padding: '2px 6px', borderRadius: 3, letterSpacing: 1,
                border: '1px solid var(--border)', color: 'var(--dim)', textTransform: 'uppercase',
              }}>Private</span>
            )}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--dim)',
          }}>
            {trackCount} track{trackCount === 1 ? '' : 's'}
            {totalMin != null && ` · ${totalMin} min`}
          </div>
        </div>

        {avgBpm != null && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 4,
            padding: '5px 10px', borderRadius: 999,
            background: 'var(--hover)', border: '1px solid var(--border)',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--fg)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{avgBpm}</span>
            <span style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: 1,
              textTransform: 'uppercase' }}>avg BPM</span>
          </div>
        )}
        <span style={{
          opacity: 0.4, fontSize: 12, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
        }}>▾</span>
      </button>

      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '6px 10px 10px',
        }}>
          {hasResolved ? (
            resolved.map((r, i) => (
              <ProfileTrackRow key={r.tid} item={r} idx={i}
                isPlaying={playingTid === r.tid}
                isLoading={loadingTid === r.tid}
                isMiss={missTid === r.tid}
                onTogglePreview={onTogglePreview} />
            ))
          ) : (
            <div style={{
              padding: 14, textAlign: 'center', fontSize: 11,
              color: 'var(--dim)', fontStyle: 'italic',
            }}>
              {trackCount} track{trackCount === 1 ? '' : 's'}. Sign in to see the
              full track list and previews.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileTrackRow({ item, idx, isPlaying, isLoading, isMiss, onTogglePreview }) {
  const r = item.record, t = item.track;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 6px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)',
        width: 22, textAlign: 'right', flexShrink: 0,
      }}>{String(idx + 1).padStart(2, '0')}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{t.title}</div>
        <div style={{
          fontSize: 11, color: 'var(--dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{r.artist}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0,
        fontFamily: 'JetBrains Mono, monospace' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
          {t.bpm ?? '—'}
        </div>
        <div style={{ fontSize: 9, color: 'var(--dim)' }}>
          {t.key ?? '—'}
        </div>
      </div>
      <ProfilePreviewBtn
        state={isLoading ? 'loading' : isPlaying ? 'playing' : isMiss ? 'miss' : 'idle'}
        onClick={() => onTogglePreview(item.tid, r.artist, t.title || r.title)} />
    </div>
  );
}

function ProfilePreviewBtn({ state, onClick }) {
  let bg = 'transparent', color = 'var(--fg)', bd = 'var(--border)', content;
  if (state === 'playing') {
    bg = 'var(--accent)'; color = 'var(--on-accent)'; bd = 'var(--accent)';
    content = <span style={{ fontSize: 11, lineHeight: 1 }}>❚❚</span>;
  } else if (state === 'loading') {
    content = <span style={{ fontSize: 11, opacity: 0.6 }}>…</span>;
  } else if (state === 'miss') {
    bd = 'rgba(220,60,60,0.55)'; color = 'rgba(220,60,60,0.9)';
    content = <span style={{ fontSize: 11, lineHeight: 1 }}>✕</span>;
  } else {
    content = <span style={{ fontSize: 12, lineHeight: 1, marginLeft: 1 }}>▶</span>;
  }
  return (
    <button onClick={onClick} title="Preview" style={{
      width: 28, height: 28, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, color: color,
      border: '1px solid ' + bd, cursor: 'pointer',
      padding: 0, fontFamily: 'inherit',
      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    }}>{content}</button>
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

// ─────────── Custom hook: follow state for a viewed profile ───────────

// Encapsulates "show me follower/following counts for `userId`, plus whether
// `viewerId` follows them, and give me a toggle". Refetches whenever a
// 'follows' event lands on the BroadcastChannel so cross-tab actions stay
// in sync.
function useFollowData(userId, viewerId) {
  const [followerCount, setFollowerCount] = React.useState(0);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!userId || !window.Sync) return;
    const [followers, following, viewerFollowing] = await Promise.all([
      window.Sync.fetchFollowers(userId),
      window.Sync.fetchFollowing(userId),
      viewerId && viewerId !== userId
        ? window.Sync.fetchFollowing(viewerId)
        : Promise.resolve([]),
    ]);
    setFollowerCount((followers || []).length);
    setFollowingCount((following || []).length);
    if (viewerId && viewerId !== userId) {
      setIsFollowing((viewerFollowing || []).includes(userId));
    } else {
      setIsFollowing(false);
    }
  }, [userId, viewerId]);

  React.useEffect(() => { reload(); }, [reload]);
  React.useEffect(() => {
    if (!window.Sync || !window.Sync.onPeerChange) return;
    return window.Sync.onPeerChange((scope) => {
      if (scope === 'follows') reload();
    });
  }, [reload]);

  const toggleFollow = React.useCallback(async () => {
    if (!viewerId || viewerId === userId || busy || !window.Sync) return;
    setBusy(true);
    try {
      if (isFollowing) {
        await window.Sync.unfollow(userId);
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await window.Sync.follow(userId);
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } finally {
      setBusy(false);
    }
  }, [userId, viewerId, isFollowing, busy]);

  return {
    followerCount, followingCount, isFollowing, busy,
    canFollow: !!viewerId && viewerId !== userId,
    toggleFollow, reload,
  };
}

// ─────────── In-app wrapper (the /profile view) ───────────

function ProfilePage({ profile, setProfile, records, savedSets, gigs, user, onSignOut, onRetryBpmAnalysis }) {
  const [editing, setEditing] = React.useState(false);
  const [shareMsg, setShareMsg] = React.useState('');
  const [followsModal, setFollowsModal] = React.useState(null); // 'followers' | 'following' | null

  const ownerId = user?.id || profile?.id;
  const follow = useFollowData(ownerId, ownerId);

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
        followerCount={follow.followerCount}
        followingCount={follow.followingCount}
        onShowFollowers={() => setFollowsModal('followers')}
        onShowFollowing={() => setFollowsModal('following')}
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
      {followsModal && (
        <FollowListModal kind={followsModal} userId={ownerId}
          onClose={() => setFollowsModal(null)} />
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
  const [followsModal, setFollowsModal] = React.useState(null);

  const viewerId = viewerSession?.user?.id || null;
  const follow = useFollowData(userId, viewerId);

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
            isOwner={false}
            followerCount={follow.followerCount}
            followingCount={follow.followingCount}
            isFollowing={follow.isFollowing}
            canFollow={follow.canFollow}
            followBusy={follow.busy}
            onFollow={follow.toggleFollow}
            onShowFollowers={() => setFollowsModal('followers')}
            onShowFollowing={() => setFollowsModal('following')} />
        )}
      </div>
      {followsModal && (
        <FollowListModal kind={followsModal} userId={userId}
          onClose={() => setFollowsModal(null)} />
      )}
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

// ─────────── Follow list modal ───────────

// Renders the "people I follow" / "people who follow me" list. Each row links
// to the target's public profile via the hash route — clicking closes this
// modal and triggers Root's hashchange handler to swap PublicProfilePage in.
function FollowListModal({ kind, userId, onClose }) {
  const [people, setPeople] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = kind === 'followers'
        ? await window.Sync.fetchFollowers(userId)
        : await window.Sync.fetchFollowing(userId);
      if (cancelled) return;
      if (!ids || ids.length === 0) { setPeople([]); return; }
      // Fetch profile data for the discoverable members. Non-discoverable
      // profiles are filtered out by RLS so they simply don't come back.
      const profs = await window.Sync.fetchProfilesByIds(ids);
      if (cancelled) return;
      // Preserve the input order so most-recent follows stay near the top.
      const byId = new Map(profs.map(p => [p.user_id, p]));
      setPeople(ids.map(id => byId.get(id)).filter(Boolean));
    })();
    return () => { cancelled = true; };
  }, [kind, userId]);

  const goTo = (uid) => {
    window.location.hash = '#u/' + uid;
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '48px 16px', overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 460, maxWidth: '100%', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 22,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.4,
            textTransform: 'capitalize' }}>{kind}</h3>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>
        {people === null && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 1,
            textTransform: 'uppercase' }}>Loading…</div>
        )}
        {people && people.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12,
            border: '1px dashed var(--border)', borderRadius: 10,
          }}>{kind === 'followers' ? 'No public followers yet.' : 'Not following anyone yet.'}</div>
        )}
        {people && people.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {people.map(p => (
              <button key={p.user_id} onClick={() => goTo(p.user_id)}
                style={followRowStyle}>
                <ProfileAvatar profile={p} size={42} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.djName || p.name || 'Unnamed DJ'}
                  </div>
                  {p.location && (
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                      color: 'var(--dim)', letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>{p.location}</div>
                  )}
                </div>
                <span style={{ opacity: 0.4 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── Discover DJs (user search) ───────────

function UserSearchModal({ onClose, viewerId }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState(null);
  const [debounced, setDebounced] = React.useState('');

  // Debounce input so we don't fire a query per keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await window.Sync.searchProfiles(debounced);
      if (cancelled) return;
      // Hide the viewer's own profile from search results so it doesn't
      // suggest "follow yourself".
      setResults((r || []).filter(p => p.user_id !== viewerId));
    })();
    return () => { cancelled = true; };
  }, [debounced, viewerId]);

  const goTo = (uid) => {
    window.location.hash = '#u/' + uid;
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '48px 16px', overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 480, maxWidth: '100%', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12, padding: 22,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
            }}>Discover</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
              Find DJs<span style={{ color: 'var(--accent)' }}>.</span>
            </h3>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search public DJs by name or city…"
          style={{ ...fieldStyle, marginBottom: 12 }} />

        {results === null && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 1,
            textTransform: 'uppercase' }}>Loading…</div>
        )}
        {results && results.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12,
            border: '1px dashed var(--border)', borderRadius: 10, lineHeight: 1.5,
          }}>
            {debounced
              ? `No public DJs match "${debounced}".`
              : 'No public DJs yet. Be one of the first — flip your profile to public in Edit profile.'}
          </div>
        )}
        {results && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6,
            maxHeight: 460, overflowY: 'auto' }}>
            {results.map(p => (
              <button key={p.user_id} onClick={() => goTo(p.user_id)}
                style={followRowStyle}>
                <ProfileAvatar profile={p} size={42} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.djName || p.name || 'Unnamed DJ'}
                  </div>
                  {p.location && (
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                      color: 'var(--dim)', letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>{p.location}</div>
                  )}
                  {p.bio && (
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '100%' }}>{p.bio}</div>
                  )}
                </div>
                <span style={{ opacity: 0.4 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const followRowStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 12px', borderRadius: 10,
  background: 'var(--hover)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontFamily: 'inherit', cursor: 'pointer',
  textAlign: 'left', width: '100%',
};

Object.assign(window, {
  ProfilePage, ProfileAvatar, PublicProfilePage,
  DEFAULT_PROFILE, migrateProfile,
  UserSearchModal, FollowListModal,
});
