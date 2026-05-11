// Record detail drawer — track-level add to set

function RecordDetail({ record, onClose, onPrev, onNext, positionLabel, onAddTrack, isTrackInSet, onAddAllTracks, allRecords, onEdit, crates, onAddToCrate, onRemoveFromCrate, onNewCrate, savedSets, onToggleTrackInSavedSet, onCreateSetWithTrack, onRateTrack, onRateRecord, onSetTrackEnergy, onRefreshTrackBpm, onRefreshDiscogs, onRefreshAlbumBpms }) {
  const [playing, setPlaying] = React.useState(null);
  const [progress, setProgress] = React.useState({});
  const [audioMap, setAudioMap] = React.useState({}); // trackId -> object URL
  const [previewMap, setPreviewMap] = React.useState({}); // trackId -> iTunes preview URL
  const [bpmRefreshing, setBpmRefreshing] = React.useState({}); // trackIndex -> bool
  const [bpmMissed, setBpmMissed] = React.useState({}); // trackIndex -> bool (one-shot flash)
  // Per-track add menu — open by trackIndex; null = closed.
  const [addMenuFor, setAddMenuFor] = React.useState(null);
  const audioRef = React.useRef(null);

  const handleRefreshBpm = async (trackIndex) => {
    if (!onRefreshTrackBpm || bpmRefreshing[trackIndex]) return;
    setBpmRefreshing(m => ({ ...m, [trackIndex]: true }));
    setBpmMissed(m => ({ ...m, [trackIndex]: false }));
    try {
      const result = await onRefreshTrackBpm(record.id, trackIndex);
      if (!result || (result.bpm == null && !result.key)) {
        setBpmMissed(m => ({ ...m, [trackIndex]: true }));
        setTimeout(() => setBpmMissed(m => ({ ...m, [trackIndex]: false })), 2000);
      }
    } finally {
      setBpmRefreshing(m => ({ ...m, [trackIndex]: false }));
    }
  };

  // Load which tracks have uploaded audio for this record
  const refreshAudio = React.useCallback(async () => {
    if (!record) return;
    const next = {};
    await Promise.all(record.tracks.map(async (_, i) => {
      const tid = `${record.id}-${i}`;
      const url = await window.AudioStore.getUrl(tid);
      if (url) next[tid] = url;
    }));
    setAudioMap(next);
  }, [record]);

  React.useEffect(() => { refreshAudio(); }, [refreshAudio]);
  React.useEffect(() => {
    const h = () => refreshAudio();
    window.addEventListener('cs-audio-change', h);
    return () => window.removeEventListener('cs-audio-change', h);
  }, [refreshAudio]);

  // When a track starts playing without uploaded audio, look up its iTunes preview.
  React.useEffect(() => {
    if (!playing || audioMap[playing] || previewMap[playing] !== undefined) return;
    const idx = Number(playing.split('-').pop());
    const t = record?.tracks?.[idx];
    if (!t) return;
    let cancelled = false;
    (async () => {
      const url = await window.iTunesPreview.getPreview(playing, record.artist, t.title || record.title);
      if (!cancelled) setPreviewMap(m => ({ ...m, [playing]: url || null }));
    })();
    return () => { cancelled = true; };
  }, [playing, audioMap, previewMap, record]);

  // Real <audio> playback: uploaded audio wins, else iTunes preview, else simulated progress.
  React.useEffect(() => {
    if (!playing) return;
    const src = audioMap[playing] || previewMap[playing];
    if (!src) {
      // No real audio available yet (either still looking up, or confirmed miss) → simulate.
      const id = setInterval(() => {
        setProgress(p => {
          const next = (p[playing] || 0) + 0.01;
          if (next >= 1) { setPlaying(null); return { ...p, [playing]: 0 }; }
          return { ...p, [playing]: next };
        });
      }, 80);
      return () => clearInterval(id);
    }
    const a = audioRef.current;
    if (!a) return;
    a.src = src;
    a.play().catch(() => setPlaying(null));
    const tick = () => {
      if (a.duration) setProgress(p => ({ ...p, [playing]: a.currentTime / a.duration }));
    };
    const end = () => { setPlaying(null); setProgress(p => ({ ...p, [playing]: 0 })); };
    a.addEventListener('timeupdate', tick);
    a.addEventListener('ended', end);
    return () => {
      a.removeEventListener('timeupdate', tick);
      a.removeEventListener('ended', end);
      a.pause();
    };
  }, [playing, audioMap, previewMap]);

  const onUpload = async (tid, file) => {
    if (!file) return;
    await window.AudioStore.save(tid, file);
  };
  const onClearAudio = async (tid) => {
    if (playing === tid) setPlaying(null);
    await window.AudioStore.remove(tid);
  };

  // Left/right arrow keys navigate between records — but only when the user
  // isn't typing in an input (form fields, the rating notes, etc.). Stays
  // out of the way of native cursor movement in text.
  React.useEffect(() => {
    if (!record) return;
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' && onPrev) { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowRight' && onNext) { e.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, onPrev, onNext]);

  if (!record) return null;

  const similar = findSimilarRecords(record, allRecords);

  const tracksInSet = record.tracks.filter((_, i) => isTrackInSet(`${record.id}-${i}`)).length;
  const allIn = tracksInSet === record.tracks.length;

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 560,
      background: 'var(--panel)', borderLeft: '1px solid var(--border)',
      overflowY: 'auto', zIndex: 10,
      animation: 'slideIn 0.28s cubic-bezier(0.2, 0, 0.2, 1)',
    }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes cs-spin { to { transform: rotate(360deg); } }
      `}</style>
      <audio ref={audioRef} style={{ display: 'none' }} preload="none" />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)',
        }}>Record · {record.catalog}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(onPrev || onNext) && (
            <>
              <NavArrowBtn onClick={onPrev} disabled={!onPrev}
                title="Previous record (←)" direction="left" />
              <NavArrowBtn onClick={onNext} disabled={!onNext}
                title="Next record (→)" direction="right" />
              {positionLabel && (
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  letterSpacing: 1, color: 'var(--dim)', padding: '0 6px',
                }}>{positionLabel}</span>
              )}
            </>
          )}
          {onEdit && (
            <button onClick={onEdit} title="Edit record" style={{
              padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>Edit</button>
          )}
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>
      </div>

      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <RecordCover hue={record.cover.hue} shape={record.cover.shape} imageUrl={record.cover.image}
            title={record.title} artist={record.artist}
            size={520} style={{ width: '100%', aspectRatio: '1 / 1', height: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} />
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6,
        }}>{record.label} · {record.year}</div>
        <h2 style={{
          margin: 0, fontSize: 42, fontWeight: 700, lineHeight: 1.05,
          letterSpacing: -1.2, textWrap: 'balance',
        }}>{record.title}</h2>
        <div style={{ fontSize: 18, color: 'var(--dim)', marginTop: 6 }}>{record.artist}</div>

        {onRateRecord && (
          <div style={{ marginTop: 10 }}>
            <TrackRating value={record.rating || 0}
              onChange={(n) => onRateRecord(record.id, n)} size={18} />
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0,
          marginTop: 22, padding: '16px 0',
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        }}>
          <Stat label="BPM" value={record.bpm ?? '—'} />
          <Stat label="Key" value={<KeyBadge k={record.key} size={15} />} />
          <Stat label="RPM" value={record.rpm ? `${record.rpm}` : '33'} />
          <Stat label="Tracks" value={record.tracks.length} />
          <Stat label="Value" value={`$${record.value || 0}`} />
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
          <Tag color="oklch(0.72 0.16 55)">{record.genre}</Tag>
          <Tag color="oklch(0.72 0.18 330)">{record.mood}</Tag>
        </div>

        {crates && (
          <CrateBadges crates={crates} recordId={record.id}
            onAddToCrate={onAddToCrate} onRemoveFromCrate={onRemoveFromCrate}
            onNewCrate={onNewCrate} />
        )}
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
        {record.source === 'discogs' && (
          <DiscogsPill record={record} onRefresh={onRefreshDiscogs} />
        )}
        <AlbumBpmPill record={record} onRefresh={onRefreshAlbumBpms} />
      </div>

      {/* Tracklist — track-level add to set */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            Tracklist · pick what you want
            {tracksInSet > 0 && (
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {tracksInSet}/{record.tracks.length} added
              </span>
            )}
          </div>
          <button onClick={() => onAddAllTracks(record)} style={{
            padding: '5px 10px', borderRadius: 999,
            background: allIn ? 'transparent' : 'var(--accent)',
            color: allIn ? 'var(--fg)' : 'var(--on-accent)',
            border: allIn ? '1px solid var(--border)' : 'none',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            cursor: 'pointer',
          }}>{allIn ? 'Remove all' : '+ Add all'}</button>
        </div>

        <div>
          {record.tracks.map((t, i) => {
            const tid = `${record.id}-${i}`;
            const isPlaying = playing === tid;
            const added = isTrackInSet(tid);
            const p = progress[tid] || 0;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 8px', borderRadius: 6,
                background: added ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : 'transparent',
                border: `1px solid ${added ? 'color-mix(in oklab, var(--accent) 40%, transparent)' : 'transparent'}`,
                marginBottom: 4, transition: 'all 0.12s',
              }}>
                <button
                  onClick={() => setPlaying(isPlaying ? null : tid)}
                  style={{
                    width: 30, height: 30, borderRadius: 15, border: 'none',
                    background: isPlaying ? 'var(--accent)' : 'var(--border)',
                    color: isPlaying ? 'var(--on-accent)' : 'var(--fg)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  {isPlaying ? Icon.Pause : Icon.Play}
                </button>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                  color: 'var(--dim)', width: 26, textAlign: 'center', flexShrink: 0,
                }}>{t.n}</div>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.title}
                    {audioMap[tid] && (
                      <span title="Audio uploaded" style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700,
                        letterSpacing: 0.5, padding: '1px 4px', borderRadius: 3,
                        background: 'var(--accent)', color: 'var(--on-accent)',
                      }}>MP3</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Waveform seed={i * 37 + record.cover.hue} height={16} width={200}
                      progress={isPlaying ? p : 0} color="var(--dim)" />
                    {onSetTrackEnergy && (
                      <EnergyMeter value={t.energy || 0}
                        onChange={(n) => onSetTrackEnergy(record.id, i, n)} />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
                  flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <BpmBadge bpm={t.bpm} size={10} />
                    <KeyBadge k={t.key} size={9} />
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)',
                  }}>{t.len}</div>
                </div>
                {onRefreshTrackBpm && (
                  <button
                    onClick={() => handleRefreshBpm(i)}
                    disabled={bpmRefreshing[i]}
                    title={bpmMissed[i] ? 'No data found' : 'Refresh BPM & key'}
                    style={{
                      width: 28, height: 28, borderRadius: 14, border: 'none',
                      background: bpmMissed[i]
                        ? 'color-mix(in oklab, #E74C5C 22%, transparent)'
                        : 'var(--border)',
                      color: bpmMissed[i] ? '#E74C5C' : 'var(--fg)',
                      cursor: bpmRefreshing[i] ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0, flexShrink: 0, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (bpmRefreshing[i] || bpmMissed[i]) return;
                      e.currentTarget.style.background = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--on-accent)';
                    }}
                    onMouseLeave={e => {
                      if (bpmRefreshing[i] || bpmMissed[i]) return;
                      e.currentTarget.style.background = 'var(--border)';
                      e.currentTarget.style.color = 'var(--fg)';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: bpmRefreshing[i] ? 'cs-spin 0.8s linear infinite' : 'none' }}>
                      <path d="M21 12a9 9 0 1 1-3-6.7" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                  </button>
                )}
                <button onClick={() => setAddMenuFor(i)}
                  title="Add to a set"
                  style={{
                    width: 28, height: 28, borderRadius: 14, border: 'none',
                    background: added ? 'var(--accent)' : 'var(--border)',
                    color: added ? 'var(--on-accent)' : 'var(--fg)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{added ? Icon.Check : Icon.Plus}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <SectionHead>Personal notes</SectionHead>
        <div style={{
          padding: 14, borderRadius: 6, background: 'var(--hover)',
          fontSize: 14, lineHeight: 1.55, color: 'var(--fg)',
          fontStyle: 'italic', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: -4, top: -8, fontSize: 44, color: 'var(--accent)',
            fontFamily: 'Georgia, serif', lineHeight: 1,
          }}>"</div>
          <div style={{ paddingLeft: 14 }}>{record.notes}</div>
        </div>
      </div>

      {similar.length > 0 && (
        <div style={{ padding: '0 20px 40px' }}>
          <SectionHead>Similar in your collection</SectionHead>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {similar.map(r => (
              <div key={r.id} style={{ cursor: 'pointer', minWidth: 0 }}>
                {/* Square frame forces every cover to the same footprint
                    regardless of the underlying image aspect ratio. */}
                <div style={{
                  width: '100%', aspectRatio: '1 / 1',
                  borderRadius: 4, overflow: 'hidden',
                  background: 'var(--panel)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RecordCover hue={r.cover.hue} shape={r.cover.shape}
                    imageUrl={r.cover.image} title={r.title} artist={r.artist}
                    size={120}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {addMenuFor !== null && (
        <TrackAddMenu
          record={record} trackIndex={addMenuFor}
          isInBuilder={isTrackInSet(`${record.id}-${addMenuFor}`)}
          savedSets={savedSets || []}
          onToggleBuilder={() => onAddTrack(record, addMenuFor)}
          onToggleInSavedSet={(setId) =>
            onToggleTrackInSavedSet && onToggleTrackInSavedSet(setId, record.id, addMenuFor)}
          onCreateSetWithTrack={(name) =>
            onCreateSetWithTrack && onCreateSetWithTrack(name, record.id, addMenuFor)}
          onClose={() => setAddMenuFor(null)} />
      )}
    </div>
  );
}

// Modal that lets the user route a track to either the live builder or any
// saved set, plus spin up a brand-new set from this single track. Replaces
// the old direct-toggle on the per-track + button so DJs never have to
// detour through the builder when they know exactly where a song belongs.
function TrackAddMenu({ record, trackIndex, isInBuilder, savedSets,
                       onToggleBuilder, onToggleInSavedSet,
                       onCreateSetWithTrack, onClose }) {
  const track = record.tracks[trackIndex];
  if (!track) return null;
  const tid = `${record.id}-${trackIndex}`;
  const [creatingNew, setCreatingNew] = React.useState(false);
  const [newSetName, setNewSetName] = React.useState('');

  const handleCreate = (e) => {
    if (e) e.preventDefault();
    onCreateSetWithTrack(newSetName);
    onClose();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 220,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 380, maxWidth: '100%', background: 'var(--panel)',
        border: '1px solid var(--border)', borderRadius: 12,
        color: 'var(--fg)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 2,
            }}>Add to</div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {track.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.artist}
            </div>
          </div>
          <IconButton onClick={onClose} title="Close">{Icon.X}</IconButton>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {/* Builder — always visible at top as the quick option */}
          <button onClick={() => { onToggleBuilder(); onClose(); }}
            style={trackAddRowStyle(isInBuilder)}>
            <span style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>
                Set Builder
              </span>
              <span style={{
                display: 'block', fontSize: 10, color: 'var(--dim)',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
                textTransform: 'uppercase', marginTop: 2,
              }}>{isInBuilder ? 'In current builder' : 'Live drag-and-drop set'}</span>
            </span>
            <span style={trackAddCheckStyle(isInBuilder)}>
              {isInBuilder ? Icon.Check : Icon.Plus}
            </span>
          </button>

          {savedSets.length > 0 && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
              padding: '14px 8px 6px',
            }}>Saved sets</div>
          )}

          {savedSets.map(s => {
            const has = (s.trackIds || []).includes(tid);
            return (
              <button key={s.id}
                onClick={() => { onToggleInSavedSet(s.id); onClose(); }}
                style={trackAddRowStyle(has)}>
                <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontWeight: 600, fontSize: 13,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{s.name || 'Untitled set'}</span>
                  <span style={{
                    display: 'block', fontSize: 10, color: 'var(--dim)',
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
                    marginTop: 2,
                  }}>{(s.trackIds || []).length} tracks
                    {s.is_public && <> · <span style={{ color: 'var(--accent)' }}>public</span></>}
                  </span>
                </span>
                <span style={trackAddCheckStyle(has)}>
                  {has ? Icon.Check : Icon.Plus}
                </span>
              </button>
            );
          })}

          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)',
            padding: '14px 8px 6px',
          }}>Or create</div>

          {creatingNew ? (
            <form onSubmit={handleCreate} style={{
              display: 'flex', gap: 6, padding: 6,
              border: '1px solid var(--accent)', borderRadius: 8,
              background: 'var(--hover)',
            }}>
              <input autoFocus value={newSetName}
                onChange={e => setNewSetName(e.target.value)}
                placeholder="Set name (optional)"
                style={{
                  flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 6,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit',
                }} />
              <button type="submit" style={{
                padding: '8px 14px', borderRadius: 6, border: 'none',
                background: 'var(--accent)', color: 'var(--on-accent)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
              }}>Create</button>
            </form>
          ) : (
            <button onClick={() => setCreatingNew(true)}
              style={{
                ...trackAddRowStyle(false),
                borderStyle: 'dashed',
              }}>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 13 }}>
                + New set with this track
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function trackAddRowStyle(active) {
  return {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', marginBottom: 4,
    borderRadius: 8,
    background: active ? 'color-mix(in oklab, var(--accent) 14%, transparent)' : 'var(--hover)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    color: 'var(--fg)', fontFamily: 'inherit',
    cursor: 'pointer', textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
  };
}

function trackAddCheckStyle(active) {
  return {
    width: 26, height: 26, borderRadius: 13, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--on-accent)' : 'var(--dim)',
    border: active ? 'none' : '1px solid var(--border)',
  };
}

function Stat({ label, value }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px',
      borderRight: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)',
      }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 12,
      paddingBottom: 8, borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
      {children}
    </div>
  );
}

// Clickable pill — label + status line + hover-highlight + spinning refresh glyph
// when busy. Replaces the old passive ApiPill + standalone DiscogsRefreshButton
// that used to sit next to each other. See `DiscogsPill` and `AlbumBpmPill`
// below for the actual wiring; this is just the shell.
function ActionPill({ icon, label, status, busy, color, onClick, title }) {
  return (
    <button onClick={onClick} disabled={busy} title={title}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8,
        background: 'transparent', color: 'var(--fg)', fontFamily: 'inherit',
        cursor: busy ? 'default' : (onClick ? 'pointer' : 'default'),
        textAlign: 'left', opacity: busy ? 0.65 : 1,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (onClick && !busy) {
        e.currentTarget.style.background = 'var(--hover)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      } }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14, background: color, color: '#0E0C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, display: 'flex',
          alignItems: 'center', gap: 6 }}>
          {label}
          {onClick && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0.55,
                animation: busy ? 'cs-spin 0.8s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          )}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)',
          letterSpacing: 0.5, textTransform: 'uppercase',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{status}</div>
      </div>
    </button>
  );
}

// Discogs pill — click to re-fetch the whole album (metadata/tracklist/cover).
// Token is prompted for once on first use, stored in localStorage.
function DiscogsPill({ record, onRefresh }) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const doRefresh = async () => {
    if (busy || !onRefresh) return;
    setBusy(true); setMsg('');
    try {
      await onRefresh(record);
      setMsg('Updated');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      if (/token not found/i.test(e.message || '')) {
        const token = prompt(
          'Paste your Discogs personal access token to enable per-album refresh.\n\n' +
          'Generate one at discogs.com/settings/developers — it\'s stored only in your browser.'
        );
        if (token && token.trim()) {
          localStorage.setItem('cs-discogs-token', token.trim());
          try {
            await onRefresh(record);
            setMsg('Updated');
            setTimeout(() => setMsg(''), 2000);
          } catch (retryErr) {
            setMsg(retryErr.message || 'Failed');
            setTimeout(() => setMsg(''), 4000);
          }
        }
      } else {
        setMsg(e.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
      }
    } finally {
      setBusy(false);
    }
  };
  const status = busy ? 'Refreshing…'
    : msg ? msg
    : record.discogsRefreshedAt ? `Refreshed · ${formatAgo(record.discogsRefreshedAt)}`
    : 'Click to refresh';
  return (
    <ActionPill icon={Icon.Discogs} label="Discogs"
      status={status} busy={busy}
      color="oklch(0.7 0.04 80)"
      onClick={doRefresh}
      title="Re-fetch this album from Discogs (preserves BPM/key/rating/notes)" />
  );
}

// Album BPM pill — loops over every track missing BPM and refreshes them
// one by one (throttled to respect MusicBrainz's 1 req/s limit).
function AlbumBpmPill({ record, onRefresh }) {
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(null); // { done, total } | null
  const [msg, setMsg] = React.useState('');
  const missing = record.tracks.filter(t => t.bpm == null).length;
  const doRefresh = async () => {
    if (busy || !onRefresh) return;
    if (missing === 0) {
      setMsg('All tracks have BPM');
      setTimeout(() => setMsg(''), 2000);
      return;
    }
    setBusy(true); setMsg('');
    try {
      const result = await onRefresh(record, (done, total) =>
        setProgress({ done, total }));
      const hits = (result && result.hits) || 0;
      setMsg(hits === 0 ? 'No matches' : `${hits} filled`);
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg(e.message || 'Failed');
      setTimeout(() => setMsg(''), 4000);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const status = busy && progress
      ? `Refreshing ${progress.done}/${progress.total}…`
    : busy ? 'Refreshing…'
    : msg ? msg
    : missing > 0 ? `${missing} missing BPM · click to fetch`
    : 'All tracks analyzed';
  // Accent-colored dot so it reads as the "active" action when there's work to do.
  const color = missing > 0 ? 'var(--accent)' : 'oklch(0.7 0.04 80)';
  return (
    <ActionPill
      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>}
      label="Track BPM & key"
      status={status} busy={busy}
      color={color}
      onClick={missing > 0 || !busy ? doRefresh : null}
      title="Fetch missing BPMs for this album" />
  );
}

function formatAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Pick the best 4 "similar" records from the user's collection. Weighted score
// across genre/label/artist/year/BPM/key so exact-BPM-but-different-genre doesn't
// beat same-artist-different-BPM. Records that score below SCORE_FLOOR are
// dropped entirely — better to show 2 relevant picks than 4 with padding.
function findSimilarRecords(record, allRecords) {
  const SCORE_FLOOR = 20;
  const candidates = (allRecords || []).filter(r => r && r.id !== record.id);
  const refBpm = albumBpm(record);
  const refKey = albumKey(record);
  const scored = candidates.map(r => {
    let score = 0;
    if (r.genre && record.genre && r.genre === record.genre) score += 40;
    if (r.label && record.label && r.label === record.label) score += 25;
    if (r.artist && record.artist && r.artist === record.artist) score += 35;
    if (r.year && record.year && Math.abs(r.year - record.year) <= 1) score += 10;
    const cBpm = albumBpm(r);
    if (refBpm != null && cBpm != null) {
      const d = Math.abs(cBpm - refBpm);
      if (d <= 3) score += 25;
      else if (d <= 6) score += 12;
      else if (d <= 10) score += 5;
    }
    const cKey = albumKey(r);
    if (refKey && cKey && window.camelotDistance) {
      const kd = window.camelotDistance(refKey, cKey);
      if (kd <= 1) score += 20;
      else if (kd === 2) score += 8;
    }
    return { r, score };
  });
  return scored
    .filter(x => x.score >= SCORE_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.r);
}

// Album-level BPM: prefer explicit album bpm, else average of track BPMs.
function albumBpm(r) {
  if (!r) return null;
  if (r.bpm != null) return r.bpm;
  const bs = (r.tracks || []).map(t => t.bpm).filter(b => b != null);
  if (!bs.length) return null;
  return Math.round(bs.reduce((s, x) => s + x, 0) / bs.length);
}

// Album-level key: prefer explicit album key, else the most-common track key.
function albumKey(r) {
  if (!r) return null;
  if (r.key) return r.key;
  const ks = (r.tracks || []).map(t => t.key).filter(Boolean);
  if (!ks.length) return null;
  const counts = {};
  for (const k of ks) counts[k] = (counts[k] || 0) + 1;
  let best = null, bestN = 0;
  for (const k of Object.keys(counts)) {
    if (counts[k] > bestN) { best = k; bestN = counts[k]; }
  }
  return best;
}

// (AudioUploadBtn was replaced by the per-track BPM refresh button — no users left.)

// Compact circular arrow button used in the detail header for prev/next
// record navigation. Disabled state stays in the layout but fades out so
// the header geometry doesn't jump when you reach the ends of the list.
function NavArrowBtn({ onClick, disabled, title, direction }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: 28, height: 28, borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'transparent',
      color: 'var(--fg)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.3 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 0, fontFamily: 'inherit',
      transition: 'background 0.15s, border-color 0.15s',
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--hover)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left'
          ? <polyline points="15 18 9 12 15 6" />
          : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}

// Per-track energy rank (1–5). Five same-size circles with a traffic-light
// color tied to the current rank: 1–2 chill (green), 3 mid (amber),
// 4–5 peak (red). Click a circle to set; click the active one to clear.
// Treats any value outside 1–5 as "not set" so legacy data from the older
// 1–10 energy scale shows up as an empty meter instead of a wrong reading.
// When onChange is omitted, renders read-only (no buttons, smaller dots, no
// hollow placeholders when energy is unset — keeps lists clean).
function EnergyMeter({ value, onChange, size = 10 }) {
  const v = (value >= 1 && value <= 5) ? Math.round(value) : 0;
  const interactive = !!onChange;
  // Read-only mode with no energy → don't render at all so list rows
  // without a value don't get 5 empty placeholder dots.
  if (!interactive && v === 0) return null;
  const colorFor = (n) => n <= 2 ? '#54C964'  // green (chill)
    : n === 3 ? '#F2C744'                       // amber (mid)
    : '#E74C5C';                                // red (peak)
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}
      title={v ? `Energy ${v}/5` : 'Set energy'}>
      {[1, 2, 3, 4, 5].map(n => {
        const active = n <= v;
        const common = {
          width: size, height: size, borderRadius: '50%',
          padding: 0,
          background: active ? colorFor(v) : 'transparent',
          border: active ? 'none' : '1px solid var(--border)',
          transition: 'background 0.12s, border-color 0.12s',
        };
        if (!interactive) {
          return <span key={n} style={common} />;
        }
        return (
          <button key={n}
            onClick={(e) => { e.stopPropagation(); onChange(v === n ? 0 : n); }}
            title={`Energy ${n}`}
            style={{ ...common, cursor: 'pointer' }} />
        );
      })}
    </div>
  );
}

Object.assign(window, { RecordDetail, TrackAddMenu, EnergyMeter });
