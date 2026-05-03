// Mobile companion — gig-ready quick reference

function MobileApp({ records, set, crates, savedSets, gigs, currentSetName, setCurrentSetName,
                     onSaveSet, onToggleTrack, onRemoveFromSet, onReorderSet, onClearSet, onLoadSavedSet,
                     onAddGig, onUpdateGig, onDeleteGig,
                     profile, setProfile, user, onSignOut,
                     darkMode, accent }) {
  const [tab, setTab] = React.useState('now');
  const [nowIdx, setNowIdx] = React.useState(0);
  const [openCrateId, setOpenCrateId] = React.useState(null);
  const [libSearch, setLibSearch] = React.useState('');
  const [profileOpen, setProfileOpen] = React.useState(false);
  // Now tab set selection: null = builder, else saved set id
  const [selectedSetId, setSelectedSetId] = React.useState(null);
  // Set tab sub-page: 'hub' (list), 'builder', or a saved set id (detail)
  const [setPage, setSetPage] = React.useState('hub');

  const activeSet = selectedSetId
    ? (savedSets || []).find(s => s.id === selectedSetId)
    : null;
  const activeTrackIds = activeSet ? activeSet.trackIds : (set || []);
  const activeSetLabel = activeSet
    ? activeSet.name
    : (currentSetName || 'Current builder');

  const resolved = activeTrackIds.map(tid => {
    const p = window.parseTrackId ? window.parseTrackId(tid) : null;
    return p ? { tid, ...p } : null;
  }).filter(Boolean);
  const fallback = records.slice(0, 4).map((r) => ({
    tid: `${r.id}-0`, record: r, track: r.tracks[0], idx: 0,
  }));
  const queue = resolved.length > 0 ? resolved : fallback;
  React.useEffect(() => { setNowIdx(0); }, [selectedSetId]);
  const current = queue[nowIdx % queue.length];
  const nextUp = queue[(nowIdx + 1) % queue.length];

  const bg = darkMode ? '#0E0C0A' : '#F4EFE6';
  const fg = darkMode ? '#F4EFE6' : '#0E0C0A';
  const soft = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const border = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg, color: fg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'Space Grotesk, -apple-system, system-ui, sans-serif',
      position: 'relative',
    }}>
      <div style={{
        flexShrink: 0, height: 56, padding: '10px 18px 6px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
          textTransform: 'uppercase', opacity: 0.55,
        }}>Kollector Studio</div>
        {profile && (
          <ProfileAvatar profile={profile} size={32}
            onClick={() => setProfileOpen(true)} />
        )}
      </div>

      {profileOpen && profile && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50, background: bg,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            flexShrink: 0, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: `1px solid ${border}`,
          }}>
            <button onClick={() => setProfileOpen(false)} style={{
              width: 30, height: 30, borderRadius: 15,
              border: `1px solid ${border}`, background: 'transparent',
              color: fg, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, lineHeight: 1, padding: 0,
            }}>‹</button>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.2,
              textTransform: 'uppercase', opacity: 0.55,
            }}>Profile</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 20px' }}>
            <ProfilePage profile={profile} setProfile={setProfile}
              records={records} savedSets={savedSets || []} gigs={gigs || []}
              user={user} onSignOut={onSignOut} />
            {onSignOut && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
                <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 6 }}>
                  {user?.email}
                </div>
                <button onClick={() => { if (confirm('Sign out?')) onSignOut(); }} style={{
                  width: '100%', padding: 10, borderRadius: 8,
                  background: 'transparent', border: `1px solid ${border}`,
                  color: fg, fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
                }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'now' && (
        <MobileNow current={current} nextUp={nextUp} queueLen={queue.length}
          position={nowIdx % queue.length}
          queue={queue}
          onJumpTo={(i) => setNowIdx(i)}
          onNext={() => setNowIdx(i => (i + 1) % queue.length)}
          onPrev={() => setNowIdx(i => (i - 1 + queue.length) % queue.length)}
          savedSets={savedSets || []} selectedSetId={selectedSetId}
          setSelectedSetId={setSelectedSetId} activeSetLabel={activeSetLabel}
          accent={accent} fg={fg} bg={bg} soft={soft} border={border} />
      )}
      {tab === 'set' && setPage === 'hub' && (
        <MobileSetsHub savedSets={savedSets || []} records={records}
          builderCount={(set || []).length} currentSetName={currentSetName}
          onOpenBuilder={() => setSetPage('builder')}
          onOpenSet={(id) => setSetPage(id)}
          accent={accent} fg={fg} soft={soft} border={border} />
      )}
      {tab === 'set' && setPage === 'builder' && (
        <MobileSetBuilder queue={(set || []).map(tid => {
          const p = window.parseTrackId ? window.parseTrackId(tid) : null;
          return p ? { tid, ...p } : null;
        }).filter(Boolean)}
          currentSetName={currentSetName} setCurrentSetName={setCurrentSetName}
          onBack={() => setSetPage('hub')}
          onSaveSet={onSaveSet} onRemoveFromSet={onRemoveFromSet}
          onReorderSet={onReorderSet} onClearSet={onClearSet}
          onGoBrowse={() => setTab('lib')}
          accent={accent} fg={fg} soft={soft} border={border} />
      )}
      {tab === 'set' && setPage !== 'hub' && setPage !== 'builder' && (
        <MobileSetDetail savedSet={(savedSets || []).find(s => s.id === setPage)}
          records={records}
          onBack={() => setSetPage('hub')}
          onLoadSavedSet={(id) => { onLoadSavedSet(id); setSetPage('builder'); }}
          accent={accent} fg={fg} soft={soft} border={border} />
      )}
      {tab === 'crates' && (
        <MobileCrates crates={crates || []} records={records}
          openCrateId={openCrateId} setOpenCrateId={setOpenCrateId}
          accent={accent} fg={fg} soft={soft} border={border}
          setTrackIds={new Set(set)} onToggleTrack={onToggleTrack} />
      )}
      {tab === 'lib' && (
        <MobileLibrary records={records} search={libSearch} setSearch={setLibSearch}
          accent={accent} fg={fg} soft={soft} border={border}
          setTrackIds={new Set(set)} onToggleTrack={onToggleTrack} />
      )}
      {tab === 'calendar' && (
        <MobileCalendar gigs={gigs || []} savedSets={savedSets || []}
          onAddGig={onAddGig} onUpdateGig={onUpdateGig} onDeleteGig={onDeleteGig}
          accent={accent} fg={fg} soft={soft} border={border} />
      )}

      {/* Tab bar */}
      <div style={{
        flexShrink: 0, display: 'flex',
        padding: '6px 6px calc(8px + env(safe-area-inset-bottom))',
        borderTop: `1px solid ${border}`, background: bg,
      }}>
        {[
          { id: 'now', label: 'Gig', icon: Icon.Disc },
          { id: 'calendar', label: 'Cal', icon: Icon.Calendar },
          { id: 'lib', label: 'Library', icon: Icon.Dig },
          { id: 'crates', label: 'Crates', icon: Icon.Heart },
          { id: 'set', label: 'Sets', icon: Icon.Deck },
        ].map(t => (
          <button key={t.id} onClick={() => {
            if (t.id === 'set') setSetPage('hub');
            setTab(t.id);
          }} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 0', background: 'transparent', border: 'none',
            color: tab === t.id ? accent : (darkMode ? 'rgba(244,239,230,0.5)' : 'rgba(14,12,10,0.5)'),
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: tab === t.id ? accent : 'transparent',
              color: tab === t.id ? '#0E0C0A' : 'inherit',
            }}>{t.icon}</div>
            <span style={{
              fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
            }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────── Shared: saved-set picker ───────────

function SetPicker({ savedSets, selectedSetId, setSelectedSetId, activeSetLabel,
                    fg, soft, border, accent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: soft, border: `1px solid ${border}`,
        color: fg, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
          textTransform: 'uppercase', opacity: 0.55,
        }}>Set</span>
        <span style={{
          flex: 1, fontSize: 12, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{activeSetLabel}</span>
        <span style={{ opacity: 0.5, fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: soft, border: `1px solid ${border}`, borderRadius: 8,
          zIndex: 20, maxHeight: 220, overflowY: 'auto',
          backdropFilter: 'blur(8px)',
        }}>
          <PickerRow label="Current builder"
            selected={selectedSetId === null} accent={accent}
            onClick={() => { setSelectedSetId(null); setOpen(false); }} />
          {savedSets.length === 0 ? (
            <div style={{
              padding: '10px 12px', fontSize: 11, opacity: 0.55, fontStyle: 'italic',
            }}>No saved sets yet.</div>
          ) : savedSets.map(s => (
            <PickerRow key={s.id} label={s.name} sublabel={`${s.trackIds.length} tracks`}
              selected={selectedSetId === s.id} accent={accent}
              onClick={() => { setSelectedSetId(s.id); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PickerRow({ label, sublabel, selected, accent, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 12px', background: 'transparent', border: 'none',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: selected ? accent : 'transparent',
        border: selected ? 'none' : '1px solid currentColor',
        opacity: selected ? 1 : 0.3, flexShrink: 0,
      }} />
      <span style={{ flex: 1, fontSize: 12, fontWeight: selected ? 700 : 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {sublabel && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, opacity: 0.55,
        }}>{sublabel}</span>
      )}
    </button>
  );
}

// Camelot harmonic distance lives in atoms.jsx → window.camelotDistance.

// ─────────── Now (gig mode) ───────────

function MobileNow({ current, nextUp, queueLen, position, queue, onJumpTo, onNext, onPrev,
                    savedSets, selectedSetId, setSelectedSetId, activeSetLabel,
                    accent, fg, bg, soft, border }) {
  // iTunes preview playback — shared <audio> element, one-track-at-a-time.
  const audioRef = React.useRef(null);
  const [playingTid, setPlayingTid] = React.useState(null);
  const [loadingTid, setLoadingTid] = React.useState(null);
  const [missTid, setMissTid] = React.useState(null); // one-shot "no preview" flash

  const stop = React.useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); a.currentTime = 0; }
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

  // Stop playback when the current track changes or the component unmounts.
  React.useEffect(() => { stop(); }, [current && current.tid, stop]);
  React.useEffect(() => () => stop(), [stop]);

  // ── Mix suggestions: pick the best next tracks FROM THIS SET only ──
  // Primary weight: BPM closeness (user preference). Tiebreaker: Camelot key.
  // Kept above the `if (!current) return null` guard so hook order stays stable
  // across renders (Rules of Hooks) — the memo body tolerates a null current.
  const curBpm = current && current.track ? current.track.bpm : null;
  const curKey = current && current.track ? current.track.key : null;
  const suggestions = React.useMemo(() => {
    if (!current || !queue || queue.length < 2 || curBpm == null) return [];
    const pool = queue
      .map((q, i) => ({ ...q, qIdx: i }))
      .filter((q, i) => i !== position && q.track.bpm != null);
    const scored = pool.map(q => {
      const bpmDiff = Math.abs(q.track.bpm - curBpm);
      const keyPenalty = window.camelotDistance(curKey, q.track.key);
      // BPM-first: score = bpmDiff * 2 + keyPenalty (key still matters but doesn't dominate)
      return { ...q, bpmDiff, keyPenalty, score: bpmDiff * 2 + keyPenalty };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 3);
  }, [current, queue, position, curBpm, curKey]);

  // Next 3 tracks in queue order (wraps around).
  const upNext = React.useMemo(() => {
    if (!queue || queue.length < 2) return [];
    const out = [];
    for (let k = 1; k <= 3 && k < queue.length; k++) {
      const idx = (position + k) % queue.length;
      out.push({ ...queue[idx], qIdx: idx });
    }
    return out;
  }, [queue, position]);

  if (!current) return null;
  const r = current.record, t = current.track;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 18px', overflowY: 'auto' }}>
      {/* Preload=none keeps mobile from buffering before the user hits play */}
      <audio ref={audioRef} style={{ display: 'none' }} preload="none"
        onEnded={() => setPlayingTid(null)} />

      <SetPicker savedSets={savedSets} selectedSetId={selectedSetId}
        setSelectedSetId={setSelectedSetId} activeSetLabel={activeSetLabel}
        fg={fg} soft={soft} border={border} accent={accent} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
        textTransform: 'uppercase', opacity: 0.55,
      }}>
        <span>Gig · now playing</span>
        <span>{String(position + 1).padStart(2, '0')} / {String(queueLen).padStart(2, '0')}</span>
      </div>

      {/* Current track — medium cover, side+number chip above title */}
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14,
      }}>
        <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image}
          title={r.title} artist={r.artist} size={120}
          style={{ width: 120, height: 120, borderRadius: 6,
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {t.n && (
            <div style={{
              display: 'inline-block',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.2, padding: '2px 7px', borderRadius: 4,
              background: accent, color: '#0E0C0A', marginBottom: 5,
            }}>{t.n}</div>
          )}
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.15,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{t.title}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 5,
          }}>
            <div style={{
              flex: 1, minWidth: 0,
              fontSize: 11, opacity: 0.6,
              fontFamily: 'JetBrains Mono, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{r.artist}</div>
            <PreviewBtn
              state={loadingTid === current.tid ? 'loading'
                : playingTid === current.tid ? 'playing'
                : missTid === current.tid ? 'miss' : 'idle'}
              size={34}
              onClick={() => togglePreview(current.tid, r.artist, t.title || r.title)}
              accent={accent} fg={fg} border={border} />
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12,
      }}>
        <BigStat label="BPM" value={t.bpm ?? '—'} accent={accent} />
        <BigStat label="Key" value={t.key ?? '—'} accent={accent} small />
        <BigStat label="RPM" value={r.rpm ? (r.rpm === 33 ? '33⅓' : r.rpm) : '33⅓'}
          accent={accent} small />
      </div>

      {/* Transport — moved up so it sits right under the big stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button onClick={onPrev} style={{
          width: 52, padding: '12px 0', background: 'transparent',
          color: fg, border: `1px solid ${border}`, borderRadius: 10,
          fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
        }}>←</button>
        <button onClick={onNext} style={{
          flex: 1, padding: '12px',
          background: accent, color: '#0E0C0A', border: 'none', borderRadius: 10,
          fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          fontFamily: 'inherit', cursor: 'pointer',
        }}>Cue next →</button>
      </div>

      {upNext.length > 0 && (
        <>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
            textTransform: 'uppercase', opacity: 0.55, marginBottom: 8,
          }}>Up next</div>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18,
          }}>
            {upNext.map((u, k) => (
              <div key={u.tid} onClick={() => onJumpTo && onJumpTo(u.qIdx)} style={{
                display: 'flex', gap: 12, alignItems: 'center', padding: 10,
                borderRadius: 10, background: soft, border: `1px solid ${border}`,
                cursor: onJumpTo ? 'pointer' : 'default',
                // Subtle hierarchy: the immediate next track gets slightly more visual weight.
                opacity: k === 0 ? 1 : 0.88,
              }}>
                <RecordCover hue={u.record.cover.hue} shape={u.record.cover.shape}
                  imageUrl={u.record.cover.image}
                  title={u.record.title} artist={u.record.artist} size={k === 0 ? 48 : 40}
                  style={{ width: k === 0 ? 48 : 40, height: k === 0 ? 48 : 40,
                    borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {u.track.n && (
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                      fontWeight: 700, letterSpacing: 1,
                      color: accent, marginBottom: 1,
                    }}>{u.track.n}</div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.track.title}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.record.artist}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace',
                    fontSize: k === 0 ? 16 : 13, fontWeight: 700,
                    color: accent, lineHeight: 1 }}>
                    {u.track.bpm ?? '—'}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                    {u.track.key ?? '—'}
                  </div>
                </div>
                <PreviewBtn
                  state={loadingTid === u.tid ? 'loading'
                    : playingTid === u.tid ? 'playing'
                    : missTid === u.tid ? 'miss' : 'idle'}
                  size={28}
                  onClick={(e) => { e.stopPropagation();
                    togglePreview(u.tid, u.record.artist, u.track.title || u.record.title); }}
                  accent={accent} fg={fg} border={border} />
              </div>
            ))}
          </div>
        </>
      )}

      {suggestions.length > 0 && (
        <>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
            textTransform: 'uppercase', opacity: 0.55, marginBottom: 8,
          }}>Mix suggestions · from this set</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
            {suggestions.map(s => {
              const harm = s.keyPenalty === 0 ? 'same key'
                : s.keyPenalty === 1 ? 'harmonic'
                : s.keyPenalty <= 2 ? 'close' : 'clash';
              const tag = s.bpmDiff === 0 ? 'exact BPM'
                : `±${s.bpmDiff} BPM`;
              const good = s.bpmDiff <= 4 && s.keyPenalty <= 1;
              return (
                <button key={s.tid} onClick={() => onJumpTo && onJumpTo(s.qIdx)} style={{
                  display: 'flex', gap: 10, alignItems: 'center', padding: 10,
                  borderRadius: 10, background: soft,
                  border: `1px solid ${good ? accent : border}`,
                  color: fg, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                  width: '100%',
                }}>
                  <RecordCover hue={s.record.cover.hue} shape={s.record.cover.shape}
                    imageUrl={s.record.cover.image}
                    title={s.record.title} artist={s.record.artist} size={42}
                    style={{ width: 42, height: 42, borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {s.track.n && (
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 8.5,
                        fontWeight: 700, letterSpacing: 1,
                        color: accent, marginBottom: 1,
                      }}>{s.track.n}</div>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.track.title}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6,
                      fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.3 }}>
                      {tag} · {harm}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 14, fontWeight: 700, color: good ? accent : fg }}>
                      {s.track.bpm}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, opacity: 0.65 }}>{s.track.key ?? '—'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Compact play/pause circle for iTunes previews.
// States: 'idle' | 'loading' | 'playing' | 'miss'
function PreviewBtn({ state, size, onClick, accent, fg, border }) {
  const s = size || 30;
  let bg = 'transparent', color = fg, bd = border, content;
  if (state === 'playing') { bg = accent; color = '#0E0C0A'; bd = accent;
    content = <span style={{ fontSize: Math.round(s * 0.38), lineHeight: 1 }}>❚❚</span>; }
  else if (state === 'loading') { content = <span style={{
    fontFamily: 'JetBrains Mono, monospace', fontSize: Math.round(s * 0.32),
    opacity: 0.65,
  }}>…</span>; }
  else if (state === 'miss') { bd = 'rgba(220,60,60,0.55)'; color = 'rgba(220,60,60,0.9)';
    content = <span style={{ fontSize: Math.round(s * 0.38), lineHeight: 1 }}>✕</span>; }
  else { content = <span style={{ fontSize: Math.round(s * 0.42), lineHeight: 1,
    marginLeft: Math.round(s * 0.06) }}>▶</span>; }
  return (
    <button onClick={onClick} title="Preview 30s"
      style={{
        width: s, height: s, borderRadius: s / 2, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color: color,
        border: `1px solid ${bd}`, cursor: 'pointer',
        padding: 0, fontFamily: 'inherit', fontWeight: 700,
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}>{content}</button>
  );
}

function BigStat({ label, value, accent, small }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: accent, color: '#0E0C0A' }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', opacity: 0.7,
      }}>{label}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: small ? 34 : 44, fontWeight: 700, lineHeight: 1, marginTop: 4,
      }}>{value}</div>
    </div>
  );
}

// ─────────── Set screens: hub → builder/detail ───────────

function SetTrackRow({ item, i, accent, soft, fg, border, onRemove, onMoveUp, onMoveDown }) {
  const r = item.record, t = item.track;
  const reorderBtnStyle = (disabled) => ({
    width: 24, height: 20, borderRadius: 5,
    border: `1px solid ${border}`, background: 'transparent',
    color: fg, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.25 : 0.75,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, fontSize: 10, lineHeight: 1, flexShrink: 0,
  });
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: 10,
      borderRadius: 8, background: soft,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
        color: accent, width: 22, textAlign: 'center',
      }}>{String(i + 1).padStart(2, '0')}</div>
      <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image}
        title={r.title} artist={r.artist} size={42}
        style={{ width: 42, height: 42, borderRadius: 3, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
        <div style={{ fontSize: 10, opacity: 0.6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, fontWeight: 700 }}>{t.bpm ?? '—'}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, opacity: 0.6 }}>{t.key ?? '—'}</div>
      </div>
      {(onMoveUp || onMoveDown) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          <button disabled={!onMoveUp}
            onClick={onMoveUp ? () => onMoveUp() : undefined}
            title="Move up" style={reorderBtnStyle(!onMoveUp)}>▲</button>
          <button disabled={!onMoveDown}
            onClick={onMoveDown ? () => onMoveDown() : undefined}
            title="Move down" style={reorderBtnStyle(!onMoveDown)}>▼</button>
        </div>
      )}
      {onRemove && (
        <button onClick={onRemove} title="Remove from set" style={{
          width: 24, height: 24, borderRadius: 12,
          border: `1px solid ${border}`, background: 'transparent',
          color: fg, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
}

function BackHeader({ onBack, title, fg, border }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '4px 0 14px',
    }}>
      <button onClick={onBack} style={{
        width: 30, height: 30, borderRadius: 15,
        border: `1px solid ${border}`, background: 'transparent',
        color: fg, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 0,
      }}>‹</button>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.2,
        textTransform: 'uppercase', opacity: 0.55,
      }}>{title}</div>
    </div>
  );
}

function MobileSetsHub({ savedSets, records, builderCount, currentSetName,
                         onOpenBuilder, onOpenSet, accent, fg, soft, border }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginBottom: 4 }}>Sets</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 14,
      }}>{savedSets.length} saved</div>

      <button onClick={onOpenBuilder} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: 12, borderRadius: 10, marginBottom: 10,
        background: 'transparent', border: `1.5px dashed ${accent}`,
        color: fg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 6, background: accent,
          color: '#0E0C0A', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0,
        }}>+</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Builder</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            {builderCount > 0
              ? `${currentSetName || 'Unsaved set'} · ${builderCount} track${builderCount === 1 ? '' : 's'}`
              : 'Start a new set'}
          </div>
        </div>
        <span style={{ opacity: 0.5, fontSize: 14 }}>›</span>
      </button>

      {savedSets.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center', borderRadius: 10,
          border: `1px dashed ${border}`, opacity: 0.7, fontSize: 12, marginTop: 8,
        }}>No saved sets yet. Build one and hit Save.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {savedSets.map(s => {
            const firstRec = s.trackIds.length > 0
              ? records.find(r => r.id === s.trackIds[0].split('-')[0])
              : null;
            const gigCount = Array.isArray(s.gigs) ? s.gigs.length : (s.gig ? 1 : 0);
            return (
              <button key={s.id} onClick={() => onOpenSet(s.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: 10, borderRadius: 10, background: soft, border: 'none',
                color: fg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                {firstRec ? (
                  <RecordCover hue={firstRec.cover.hue} shape={firstRec.cover.shape}
                    imageUrl={firstRec.cover.image}
                    title={firstRec.title} artist={firstRec.artist} size={42}
                    style={{ width: 42, height: 42, borderRadius: 4, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 4,
                    background: border, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.6,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
                    {s.trackIds.length} tracks{gigCount > 0 ? ` · ${gigCount} gig${gigCount === 1 ? '' : 's'}` : ''}
                  </div>
                </div>
                <span style={{ opacity: 0.4, fontSize: 14 }}>›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileSetBuilder({ queue, currentSetName, setCurrentSetName, onBack,
                             onSaveSet, onRemoveFromSet, onReorderSet, onClearSet, onGoBrowse,
                             accent, fg, soft, border }) {
  const totalMin = queue.reduce((sum, item) => {
    const [m, s] = (item.track.len || '0:0').split(':').map(Number);
    return sum + m + s / 60;
  }, 0);
  const save = () => {
    const name = prompt('Name this set:', currentSetName || `Set ${new Date().toLocaleDateString()}`);
    if (name && name.trim()) onSaveSet(name.trim());
  };
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
      <BackHeader onBack={onBack} title="Sets · Builder" fg={fg} border={border} />

      <input value={currentSetName || ''}
        onChange={e => setCurrentSetName(e.target.value)}
        placeholder="Name this set…"
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 8,
          background: 'transparent', border: `1px solid ${border}`,
          color: fg, fontSize: 13, fontFamily: 'inherit', outline: 'none',
          marginBottom: 10,
        }} />

      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6 }}>Set list</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700 }}>
          {Math.floor(totalMin)}<span style={{ opacity: 0.5, fontSize: 10 }}>min</span>
        </div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 14,
      }}>{queue.length} tracks</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={save} disabled={queue.length === 0} style={{
          flex: 1, padding: '10px', borderRadius: 8,
          background: accent, color: '#0E0C0A', border: 'none',
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          fontFamily: 'inherit', cursor: queue.length === 0 ? 'default' : 'pointer',
          opacity: queue.length === 0 ? 0.4 : 1,
        }}>Save set</button>
        <button onClick={() => { if (queue.length && confirm('Clear the builder set?')) onClearSet(); }}
          style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'transparent', color: fg, border: `1px solid ${border}`,
            fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>Clear</button>
      </div>

      {queue.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center', borderRadius: 10,
          border: `1px dashed ${border}`, opacity: 0.7, fontSize: 12,
        }}>
          <div style={{ marginBottom: 12 }}>
            Your set is empty. Add tracks from the Library or a Crate.
          </div>
          <button onClick={onGoBrowse} style={{
            padding: '8px 14px', borderRadius: 6, border: 'none',
            background: accent, color: '#0E0C0A',
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            fontFamily: 'inherit', cursor: 'pointer',
          }}>Browse library</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.map((item, i) => (
            <SetTrackRow key={item.tid} item={item} i={i}
              accent={accent} soft={soft} fg={fg} border={border}
              onRemove={() => onRemoveFromSet(item.tid)}
              onMoveUp={onReorderSet && i > 0 ? () => onReorderSet(i, i - 1) : null}
              onMoveDown={onReorderSet && i < queue.length - 1 ? () => onReorderSet(i, i + 1) : null} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileSetDetail({ savedSet, records, onBack, onLoadSavedSet,
                            accent, fg, soft, border }) {
  if (!savedSet) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
        <BackHeader onBack={onBack} title="Sets" fg={fg} border={border} />
        <div style={{ padding: 20, opacity: 0.6, fontSize: 12 }}>Set not found.</div>
      </div>
    );
  }
  const queue = (savedSet.trackIds || []).map(tid => {
    const p = window.parseTrackId ? window.parseTrackId(tid) : null;
    return p ? { tid, ...p } : null;
  }).filter(Boolean);
  const totalMin = queue.reduce((sum, item) => {
    const [m, s] = (item.track.len || '0:0').split(':').map(Number);
    return sum + m + s / 60;
  }, 0);
  const gigs = Array.isArray(savedSet.gigs) ? savedSet.gigs
    : (savedSet.gig ? [savedSet.gig] : []);
  const sortedGigs = [...gigs].sort((a, b) =>
    (b.playedAt || '').localeCompare(a.playedAt || ''));
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
      <BackHeader onBack={onBack} title="Sets" fg={fg} border={border} />

      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginBottom: 2 }}>
        {savedSet.name}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 14,
      }}>{queue.length} tracks · {Math.floor(totalMin)} min</div>

      <button onClick={() => {
        if (confirm(`Load "${savedSet.name}" into the builder? This replaces the current builder set.`))
          onLoadSavedSet(savedSet.id);
      }} style={{
        width: '100%', padding: '10px', borderRadius: 8, marginBottom: 14,
        background: accent, color: '#0E0C0A', border: 'none',
        fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        fontFamily: 'inherit', cursor: 'pointer',
      }}>Load into builder to edit</button>

      {sortedGigs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
            textTransform: 'uppercase', opacity: 0.55, marginBottom: 6,
          }}>Gigs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedGigs.map(g => (
              <div key={g.id} style={{
                padding: 10, borderRadius: 8, background: soft, fontSize: 12,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {g.venue || 'Untitled venue'}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6,
                  fontFamily: 'JetBrains Mono, monospace' }}>{g.playedAt || '—'}</div>
                {g.notes && (
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>{g.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {queue.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center', borderRadius: 10,
          border: `1px dashed ${border}`, opacity: 0.7, fontSize: 12,
        }}>This saved set is empty.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.map((item, i) => (
            <SetTrackRow key={item.tid} item={item} i={i}
              accent={accent} soft={soft} fg={fg} border={border} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────── Crates explorer ───────────

function MobileCrates({ crates, records, openCrateId, setOpenCrateId, accent, fg, soft, border,
                        setTrackIds, onToggleTrack }) {
  const [crateSearch, setCrateSearch] = React.useState('');
  const [crateSort, setCrateSort] = React.useState('recent');
  const [insideSearch, setInsideSearch] = React.useState('');
  const [insideSort, setInsideSort] = React.useState('recent');
  const [insideGenre, setInsideGenre] = React.useState('All');
  const open = crates.find(c => c.id === openCrateId);

  // Reset inside-crate filters whenever we open a different crate
  React.useEffect(() => {
    setInsideSearch('');
    setInsideSort('recent');
    setInsideGenre('All');
  }, [openCrateId]);

  if (open) {
    const openRecs = open.recordIds
      .map(id => records.find(r => r.id === id)).filter(Boolean);
    const filtered = filterAndSort(openRecs,
      { search: insideSearch, genre: insideGenre, sortBy: insideSort });
    const insideGenres = ['All',
      ...[...new Set(openRecs.map(r => r.genre).filter(Boolean))].sort()];
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
        <button onClick={() => setOpenCrateId(null)} style={{
          background: 'transparent', border: 'none', color: accent,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
          textTransform: 'uppercase', fontWeight: 700, padding: '6px 0',
          cursor: 'pointer', marginBottom: 6,
        }}>← All crates</button>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>
          {open.name}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
          textTransform: 'uppercase', opacity: 0.55, marginBottom: 10,
        }}>{filtered.length} / {openRecs.length} records</div>

        <MobileSearchRow search={insideSearch} setSearch={setInsideSearch}
          placeholder="Search in this crate…"
          fg={fg} soft={soft} border={border} />
        <MobileFilterBar
          sortBy={insideSort} setSortBy={setInsideSort}
          genre={insideGenre} setGenre={setInsideGenre}
          genres={insideGenres}
          fg={fg} soft={soft} border={border} />

        <MobileRecordGrid records={filtered} accent={accent} fg={fg} border={border}
          setTrackIds={setTrackIds} onToggleTrack={onToggleTrack} />
      </div>
    );
  }

  const q = crateSearch.trim().toLowerCase();
  let visibleCrates = q
    ? crates.filter(c => c.name.toLowerCase().includes(q))
    : crates;
  visibleCrates = [...visibleCrates];
  if (crateSort === 'name') {
    visibleCrates.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  } else if (crateSort === 'size') {
    visibleCrates.sort((a, b) => b.recordIds.length - a.recordIds.length);
  }
  // 'recent' = keep original order (list is already in created order)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginBottom: 4 }}>Crates</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 10,
      }}>{visibleCrates.length} / {crates.length} groups</div>

      {crates.length > 0 && (
        <>
          <MobileSearchRow search={crateSearch} setSearch={setCrateSearch}
            placeholder="Search crates…"
            fg={fg} soft={soft} border={border} />
          <CrateSortBar sortBy={crateSort} setSortBy={setCrateSort}
            fg={fg} soft={soft} border={border} />
        </>
      )}

      {crates.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center', borderRadius: 10,
          border: `1px dashed ${border}`, opacity: 0.7, fontSize: 12,
        }}>
          No crates yet. Create one from the desktop.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
          {visibleCrates.map(c => {
            const covers = c.recordIds.slice(0, 3)
              .map(id => records.find(r => r.id === id)).filter(Boolean);
            return (
              <button key={c.id} onClick={() => setOpenCrateId(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 10,
                borderRadius: 10, background: soft, border: 'none',
                cursor: 'pointer', color: fg, fontFamily: 'inherit', textAlign: 'left',
              }}>
                <div style={{
                  position: 'relative', width: 60, height: 48, flexShrink: 0,
                }}>
                  {covers.length === 0 ? (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 4,
                      border: `1px dashed ${border}`, opacity: 0.5,
                    }} />
                  ) : covers.map((r, i) => (
                    <div key={r.id} style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: i * 10, width: 48, borderRadius: 3, overflow: 'hidden',
                      boxShadow: i > 0 ? '-4px 0 8px rgba(0,0,0,0.2)' : 'none',
                    }}>
                      <RecordCover hue={r.cover.hue} shape={r.cover.shape}
                        imageUrl={r.cover.image}
                        title={r.title} artist={r.artist} size={48}
                        style={{ width: '100%', height: '100%' }} />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.55,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5 }}>
                    {c.recordIds.length} records
                  </div>
                </div>
                <div style={{ opacity: 0.4, fontSize: 16 }}>›</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────── Library (all records) ───────────

function MobileLibrary({ records, search, setSearch, accent, fg, soft, border,
                         setTrackIds, onToggleTrack }) {
  const [sortBy, setSortBy] = React.useState('recent');
  const [genre, setGenre] = React.useState('All');
  const availableGenres = React.useMemo(
    () => ['All', ...[...new Set(records.map(r => r.genre).filter(Boolean))].sort()],
    [records]
  );
  const filtered = filterAndSort(records, { search, genre, sortBy });
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginBottom: 4 }}>Library</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 10,
      }}>{filtered.length} / {records.length} records</div>

      <MobileSearchRow search={search} setSearch={setSearch}
        placeholder="Search title, artist, label…"
        fg={fg} soft={soft} border={border} />

      <MobileFilterBar
        sortBy={sortBy} setSortBy={setSortBy}
        genre={genre} setGenre={setGenre}
        genres={availableGenres}
        fg={fg} soft={soft} border={border} />

      <MobileRecordGrid records={filtered} accent={accent} fg={fg} border={border}
        setTrackIds={setTrackIds} onToggleTrack={onToggleTrack} />
    </div>
  );
}

function MobileRecordGrid({ records, accent, fg, border, setTrackIds, onToggleTrack }) {
  const [expanded, setExpanded] = React.useState(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 20 }}>
      {records.map(r => {
        const inCount = setTrackIds
          ? r.tracks.filter((_, i) => setTrackIds.has(`${r.id}-${i}`)).length : 0;
        const isOpen = expanded === r.id;
        return (
          <div key={r.id} style={{
            borderRadius: 8, background: 'rgba(0,0,0,0.03)',
            border: isOpen ? `1px solid ${border}` : '1px solid transparent',
            overflow: 'hidden', transition: 'border-color 0.15s',
          }}>
            <button onClick={() => setExpanded(e => e === r.id ? null : r.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: 8, background: 'transparent', border: 'none',
                color: fg, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
              }}>
              <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image}
                title={r.title} artist={r.artist} size={42}
                style={{ width: 42, height: 42, borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: 10, opacity: 0.6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.artist} · {r.tracks.length} tracks
                </div>
              </div>
              {inCount > 0 && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 4,
                  background: accent, color: '#0E0C0A', flexShrink: 0,
                }}>{inCount} in set</span>
              )}
              <span style={{ opacity: 0.4, fontSize: 11, flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
            </button>
            {isOpen && (
              <div style={{
                display: 'flex', flexDirection: 'column',
                borderTop: `1px solid ${border}`, padding: '4px 8px 8px',
              }}>
                {r.tracks.map((t, i) => {
                  const tid = `${r.id}-${i}`;
                  const inSet = setTrackIds && setTrackIds.has(tid);
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 4px',
                      borderBottom: i < r.tracks.length - 1
                        ? `1px solid ${border}` : 'none',
                    }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10, opacity: 0.55, width: 22, flexShrink: 0,
                      }}>{t.n || String(i + 1).padStart(2, '0')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </div>
                        {t.len && (
                          <div style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 9, opacity: 0.5,
                          }}>{t.len}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11, fontWeight: 700, color: accent }}>{t.bpm ?? '—'}</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 9, opacity: 0.6 }}>{t.key ?? '—'}</div>
                      </div>
                      {onToggleTrack && (
                        <button onClick={() => onToggleTrack(r, i)}
                          style={{
                            width: 26, height: 26, borderRadius: 13,
                            border: inSet ? 'none' : `1px solid ${border}`,
                            background: inSet ? accent : 'transparent',
                            color: inSet ? '#0E0C0A' : fg,
                            cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, lineHeight: 1, fontWeight: 700,
                          }}>{inSet ? '✓' : '+'}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────── Calendar (mobile gig list) ───────────

function MobileCalendar({ gigs, savedSets, onAddGig, onUpdateGig, onDeleteGig,
                         accent, fg, soft, border }) {
  const [editing, setEditing] = React.useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const inferStatus = (g) => g.status
    || (g.playedAt && g.playedAt < today ? 'played' : 'upcoming');

  const upcoming = gigs.filter(g => inferStatus(g) === 'upcoming')
    .sort((a, b) => (a.playedAt || '￿').localeCompare(b.playedAt || '￿'));
  const past = gigs.filter(g => inferStatus(g) === 'played')
    .sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));

  const startNew = () => setEditing({
    id: `g${Date.now()}`,
    playedAt: '', venue: '', location: '',
    setId: '', notes: '', status: 'upcoming', is_public: false,
  });

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6 }}>Calendar</div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', opacity: 0.55,
          }}>{upcoming.length} upcoming · {past.length} past</div>
        </div>
        <button onClick={startNew} style={{
          width: 36, height: 36, borderRadius: 18, border: 'none',
          background: accent, color: '#0E0C0A',
          fontSize: 20, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0, lineHeight: 1,
        }}>+</button>
      </div>

      {gigs.length === 0 ? (
        <div style={{
          padding: 28, textAlign: 'center', borderRadius: 12,
          border: `1px dashed ${border}`, opacity: 0.7,
        }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>No gigs yet.</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.8 }}>
            Tap + to add an upcoming booking or log a past set.
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <MobileCalendarSection title="Upcoming" gigs={upcoming}
              savedSets={savedSets}
              onEdit={(g) => setEditing(g)}
              onDelete={(g) => { if (confirm(`Delete "${g.venue || 'this gig'}"?`)) onDeleteGig(g.id); }}
              accent={accent} fg={fg} soft={soft} border={border} />
          )}
          {past.length > 0 && (
            <MobileCalendarSection title="Past" gigs={past}
              savedSets={savedSets}
              onEdit={(g) => setEditing(g)}
              onDelete={(g) => { if (confirm(`Delete "${g.venue || 'this gig'}"?`)) onDeleteGig(g.id); }}
              accent={accent} fg={fg} soft={soft} border={border} />
          )}
        </>
      )}

      {editing && window.GigForm && (
        <window.GigForm gig={editing} savedSets={savedSets}
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

function MobileCalendarSection({ title, gigs, savedSets, onEdit, onDelete,
                                  accent, fg, soft, border }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 8,
      }}>{title} · {gigs.length}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gigs.map(g => (
          <MobileGigRow key={g.id} gig={g} savedSets={savedSets}
            onEdit={() => onEdit(g)} onDelete={() => onDelete(g)}
            accent={accent} fg={fg} soft={soft} border={border} />
        ))}
      </div>
    </div>
  );
}

function MobileGigRow({ gig, savedSets, onEdit, onDelete, accent, fg, soft, border }) {
  const linkedSet = gig.setId ? savedSets.find(s => s.id === gig.setId) : null;
  const dateLabel = gig.playedAt ? formatMobileGigDate(gig.playedAt) : '—';
  return (
    <button onClick={onEdit} style={{
      width: '100%', display: 'flex', gap: 10, padding: 12,
      borderRadius: 10, background: soft, border: `1px solid ${border}`,
      color: fg, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 8px', borderRadius: 999,
          background: accent, color: '#0E0C0A',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
          fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>{dateLabel}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '100%' }}>{gig.venue || 'Untitled venue'}</div>
          {gig.is_public && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700,
              padding: '1px 5px', borderRadius: 3, letterSpacing: 0.8,
              background: accent, color: '#0E0C0A', textTransform: 'uppercase',
            }}>Public</span>
          )}
        </div>
        {gig.location && (
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{gig.location}</div>
        )}
        {linkedSet && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, opacity: 0.55,
            marginTop: 2,
          }}>Set: {linkedSet.name}</div>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete" style={{
          width: 26, height: 26, borderRadius: 13, padding: 0,
          background: 'transparent', border: `1px solid ${border}`,
          color: fg, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, lineHeight: 1,
        }}>×</button>
    </button>
  );
}

function formatMobileGigDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─────────── Small reusable filter/sort helpers ───────────

function MobileSearchRow({ search, setSearch, placeholder, fg, soft, border }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 8, background: soft,
      border: `1px solid ${border}`, marginBottom: 8,
    }}>
      <span style={{ opacity: 0.5, fontSize: 12 }}>⌕</span>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder={placeholder || 'Search…'}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: fg, fontSize: 16, fontFamily: 'inherit',
        }} />
    </div>
  );
}

// Compact native selects so iOS/Android pops the system picker.
// 16px font keeps iOS from auto-zooming on focus.
function MobileFilterBar({ sortBy, setSortBy, genre, setGenre, genres, fg, soft, border }) {
  const sortOptions = [
    { id: 'recent', label: 'Recent' },
    { id: 'title',  label: 'Title A–Z' },
    { id: 'artist', label: 'Artist A–Z' },
    { id: 'year',   label: 'Year' },
    { id: 'bpm',    label: 'BPM' },
    { id: 'rating', label: 'Rating' },
  ];
  const pillStyle = {
    flex: 1, minWidth: 0,
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 8, background: soft,
    border: `1px solid ${border}`,
  };
  const labelStyle = {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
    textTransform: 'uppercase', opacity: 0.55, flexShrink: 0,
  };
  const selectStyle = {
    flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
    color: fg, fontSize: 16, fontFamily: 'inherit', fontWeight: 600,
    appearance: 'none', WebkitAppearance: 'none',
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      <label style={pillStyle}>
        <span style={labelStyle}>Sort</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          {sortOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
      {genres && genres.length > 1 && (
        <label style={pillStyle}>
          <span style={labelStyle}>Genre</span>
          <select value={genre} onChange={e => setGenre(e.target.value)} style={selectStyle}>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

// Sort bar for the crate-list view (not records — just by crate metadata).
function CrateSortBar({ sortBy, setSortBy, fg, soft, border }) {
  const options = [
    { id: 'recent', label: 'Recent' },
    { id: 'name',   label: 'Name A–Z' },
    { id: 'size',   label: 'Record count' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      <label style={{
        flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 8, background: soft,
        border: `1px solid ${border}`,
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
          textTransform: 'uppercase', opacity: 0.55, flexShrink: 0,
        }}>Sort</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
          color: fg, fontSize: 16, fontFamily: 'inherit', fontWeight: 600,
          appearance: 'none', WebkitAppearance: 'none',
        }}>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function filterAndSort(records, { search, genre, sortBy }) {
  const q = (search || '').trim().toLowerCase();
  let out = q ? records.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.artist.toLowerCase().includes(q) ||
    (r.label || '').toLowerCase().includes(q)
  ) : records;
  if (genre && genre !== 'All') out = out.filter(r => r.genre === genre);
  if (window.sortRecords && sortBy) out = window.sortRecords(out, sortBy);
  return out;
}

Object.assign(window, { MobileApp });
