// Record detail drawer — track-level add to set

function RecordDetail({ record, onClose, onAddTrack, isTrackInSet, onAddAllTracks, allRecords, onEdit, crates, onAddToCrate, onRemoveFromCrate, onNewCrate, onRateTrack, onRefreshTrackBpm, onRefreshDiscogs }) {
  const [playing, setPlaying] = React.useState(null);
  const [progress, setProgress] = React.useState({});
  const [audioMap, setAudioMap] = React.useState({}); // trackId -> object URL
  const [previewMap, setPreviewMap] = React.useState({}); // trackId -> iTunes preview URL
  const [bpmRefreshing, setBpmRefreshing] = React.useState({}); // trackIndex -> bool
  const [bpmMissed, setBpmMissed] = React.useState({}); // trackIndex -> bool (one-shot flash)
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

  if (!record) return null;

  const similar = allRecords.filter(r =>
    r.id !== record.id &&
    (r.genre === record.genre || Math.abs(r.bpm - record.bpm) < 6)
  ).slice(0, 4);

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
        <div style={{ display: 'flex', gap: 6 }}>
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

      {record.source === 'discogs' && (
        <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <ApiPill icon={Icon.Discogs} label="Discogs"
            status={record.discogsRefreshedAt
              ? `Refreshed · ${formatAgo(record.discogsRefreshedAt)}`
              : 'Synced from import'}
            color="oklch(0.7 0.04 80)" />
          <DiscogsRefreshButton record={record} onRefresh={onRefreshDiscogs} />
        </div>
      )}

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
                    {onRateTrack && (
                      <TrackRating value={t.rating || 0}
                        onChange={(n) => onRateTrack(record.id, i, n)} />
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
                  flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <BpmBadge bpm={t.bpm} size={10} />
                    <KeyBadge k={t.key} size={9} />
                    {onRefreshTrackBpm && (
                      <button
                        onClick={() => handleRefreshBpm(i)}
                        disabled={bpmRefreshing[i]}
                        title={bpmMissed[i] ? 'No data found' : 'Refresh BPM & key'}
                        style={{
                          width: 18, height: 18, borderRadius: 9, border: 'none',
                          background: bpmMissed[i] ? 'color-mix(in oklab, #E74C5C 25%, transparent)' : 'transparent',
                          color: bpmMissed[i] ? '#E74C5C' : 'var(--dim)',
                          cursor: bpmRefreshing[i] ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { if (!bpmRefreshing[i] && !bpmMissed[i]) e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={e => { if (!bpmRefreshing[i] && !bpmMissed[i]) e.currentTarget.style.color = 'var(--dim)'; }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{
                            animation: bpmRefreshing[i] ? 'cs-spin 0.8s linear infinite' : 'none',
                          }}>
                          <path d="M21 12a9 9 0 1 1-3-6.7" />
                          <polyline points="21 3 21 9 15 9" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)',
                  }}>{t.len}</div>
                </div>
                <AudioUploadBtn trackId={tid} hasAudio={!!audioMap[tid]}
                  onUpload={onUpload} onClear={onClearAudio} />
                <button onClick={() => onAddTrack(record, i)} style={{
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {similar.map(r => (
              <div key={r.id} style={{ cursor: 'pointer' }}>
                <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image} title={r.title} artist={r.artist}
                  size={120} style={{ width: '100%', aspectRatio: '1 / 1', height: 'auto' }} />
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

function ApiPill({ icon, label, status, color }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14, background: color, color: '#0E0C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)',
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}>{status}</div>
      </div>
    </div>
  );
}

function DiscogsRefreshButton({ record, onRefresh }) {
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
      // Missing-token case → prompt for it, save, retry once.
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
            setBusy(false);
            return;
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
  return (
    <button onClick={doRefresh} disabled={busy}
      title={msg || 'Re-fetch this album from Discogs (preserves BPM/key/rating/notes)'}
      style={{
        padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)',
        background: 'transparent', color: 'var(--fg)', cursor: busy ? 'default' : 'pointer',
        fontFamily: 'inherit', fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: busy ? 0.6 : 1, flexShrink: 0,
      }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: busy ? 'cs-spin 0.8s linear infinite' : 'none' }}>
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
      <style>{`@keyframes cs-spin { to { transform: rotate(360deg); } }`}</style>
      {busy ? 'Refreshing…' : (msg || 'Refresh')}
    </button>
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

function AudioUploadBtn({ trackId, hasAudio, onUpload, onClear }) {
  const inputRef = React.useRef(null);
  const onClick = () => {
    if (hasAudio) onClear(trackId);
    else inputRef.current?.click();
  };
  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(trackId, file);
    e.target.value = '';
  };
  return (
    <>
      <input ref={inputRef} type="file" accept="audio/*" onChange={onChange} style={{ display: 'none' }} />
      <button onClick={onClick}
        title={hasAudio ? 'Remove audio' : 'Upload audio file'}
        style={{
          width: 28, height: 28, borderRadius: 14,
          border: `1px solid ${hasAudio ? 'var(--accent)' : 'var(--border)'}`,
          background: 'transparent',
          color: hasAudio ? 'var(--accent)' : 'var(--dim)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
        }}>
        {hasAudio ? Icon.X : '↑'}
      </button>
    </>
  );
}

Object.assign(window, { RecordDetail });
