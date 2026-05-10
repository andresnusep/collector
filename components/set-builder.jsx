// Set Builder — track-based, with rich web-app data

function SetBuilder({ set, records, crates = [], onRemove, onReorder, onClear, onSwipe, swipeIndex, setSwipeIndex, onAddTrack, onSaveSet, activeSetName, setName, onSetNameChange, onLaunchGig, timelineView, onToggleTimeline }) {
  // set = array of track IDs like "r01-2"
  const resolved = set.map(tid => {
    const parsed = window.parseTrackId(tid);
    return parsed ? { tid, ...parsed } : null;
  }).filter(Boolean);

  const totalMin = resolved.reduce((sum, r) => {
    const [m, s] = r.track.len.split(':').map(Number);
    return sum + m + s / 60;
  }, 0);

  // Scope the swipe-deck pool to a single crate when the DJ wants to dig in
  // a curated subset instead of the whole collection. "all" = full library.
  const [filterCrateId, setFilterCrateId] = React.useState('all');
  const filteredRecords = React.useMemo(() => {
    if (filterCrateId === 'all') return records;
    const crate = crates.find(c => c.id === filterCrateId);
    if (!crate || crate.recordIds.length === 0) return records;
    const idSet = new Set(crate.recordIds);
    return records.filter(r => idSet.has(r.id));
  }, [records, crates, filterCrateId]);
  // Reset the swipe cursor whenever the pool shrinks/grows so we never
  // get stuck on an out-of-range index.
  React.useEffect(() => { setSwipeIndex(0); }, [filterCrateId]);
  const deckRecords = filteredRecords.length > 0 ? filteredRecords : records;

  const current = deckRecords[swipeIndex % deckRecords.length];
  const currentInSet = current ? current.tracks.some((_, i) =>
    set.includes(`${current.id}-${i}`)) : false;

  const [drag, setDrag] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startX = React.useRef(0);

  const onDown = (e) => { setDragging(true); startX.current = e.clientX || e.touches?.[0]?.clientX || 0; };
  const onMove = (e) => {
    if (!dragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    setDrag(x - startX.current);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (drag > 100) { onSwipe(current, 'right'); setSwipeIndex(i => (i + 1) % deckRecords.length); }
    else if (drag < -100) setSwipeIndex(i => (i + 1) % deckRecords.length);
    setDrag(0);
  };

  // Analytics (skip tracks with no BPM)
  const bpms = resolved.map(r => r.track.bpm).filter(b => b != null);
  const minBpm = bpms.length ? Math.min(...bpms) : 0;
  const maxBpm = bpms.length ? Math.max(...bpms) : 0;
  const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;
  const genres = [...new Set(resolved.map(r => r.record.genre))];

  // Key compatibility: adjacent Camelot keys are mix-friendly
  const keyTransitions = [];
  for (let i = 1; i < resolved.length; i++) {
    const k1 = resolved[i - 1].track.key;
    const k2 = resolved[i].track.key;
    if (!k1 || !k2) { keyTransitions.push({ from: k1, to: k2, harmonic: false, unknown: true }); continue; }
    const n1 = parseInt(k1), n2 = parseInt(k2);
    const l1 = k1.slice(-1), l2 = k2.slice(-1);
    const diff = Math.min(Math.abs(n1 - n2), 12 - Math.abs(n1 - n2));
    const harmonic = (l1 === l2 && diff <= 1) || (diff === 0);
    keyTransitions.push({ from: k1, to: k2, harmonic });
  }
  const harmonicCount = keyTransitions.filter(t => t.harmonic).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, height: '100%' }}>
      {/* Left: swipe deck */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            Crate discovery
            <span style={{ color: 'var(--fg)' }}>
              · {deckRecords.length} record{deckRecords.length === 1 ? '' : 's'}
            </span>
          </div>
          {crates.length > 0 && (
            <select value={filterCrateId}
              onChange={e => setFilterCrateId(e.target.value)}
              title="Limit the discovery pool to a crate"
              style={{
                padding: '5px 8px', borderRadius: 6,
                background: 'var(--hover)', color: 'var(--fg)',
                border: '1px solid ' + (filterCrateId === 'all' ? 'var(--border)' : 'var(--accent)'),
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700,
                outline: 'none', cursor: 'pointer',
                maxWidth: 180, textOverflow: 'ellipsis',
              }}>
              <option value="all">All records</option>
              {crates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.recordIds.length})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{
          position: 'relative', flex: 1, minHeight: 380,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {[2, 1, 0].map(depth => {
            const rec = deckRecords[(swipeIndex + depth) % deckRecords.length];
            if (!rec) return null;
            const isTop = depth === 0;
            return (
              <div key={depth}
                onMouseDown={isTop ? onDown : undefined}
                onMouseMove={isTop ? onMove : undefined}
                onMouseUp={isTop ? onUp : undefined}
                onMouseLeave={isTop ? onUp : undefined}
                onTouchStart={isTop ? onDown : undefined}
                onTouchMove={isTop ? onMove : undefined}
                onTouchEnd={isTop ? onUp : undefined}
                style={{
                  position: 'absolute', width: 320, maxWidth: '90%',
                  transform: isTop
                    ? `translateX(${drag}px) rotate(${drag * 0.04}deg)`
                    : `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
                  transition: dragging && isTop ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
                  zIndex: 10 - depth,
                  cursor: isTop ? (dragging ? 'grabbing' : 'grab') : 'default',
                  userSelect: 'none',
                }}>
                <SwipeCard record={rec} />
                {isTop && (
                  <>
                    <SwipeHint side="left" opacity={drag < -20 ? Math.min(1, -drag / 100) : 0} />
                    <SwipeHint side="right" opacity={drag > 20 ? Math.min(1, drag / 100) : 0} />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 16 }}>
          <SwipeBtn dir="left" onClick={() => setSwipeIndex(i => (i + 1) % deckRecords.length)}>Skip</SwipeBtn>
          <SwipeBtn dir="right" onClick={() => { onSwipe(current, 'right'); setSwipeIndex(i => (i + 1) % deckRecords.length); }}
            primary>Open & pick</SwipeBtn>
        </div>
        <div style={{
          textAlign: 'center', marginTop: 12,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)',
          letterSpacing: 0.5,
        }}>Right = open record · Left = skip</div>
      </div>

      {/* Right: set with rich data */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {activeSetName ? (
                <><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
                Saved · {activeSetName}</>
              ) : (
                'Name your set'
              )}
            </div>
            <input value={setName}
              onChange={e => onSetNameChange(e.target.value)}
              placeholder="Untitled set"
              style={{
                marginTop: 4, width: '100%',
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 24, fontWeight: 700, letterSpacing: -0.5,
                color: 'var(--fg)', fontFamily: 'inherit', padding: 0,
              }}
              onFocus={e => e.currentTarget.style.background = 'var(--hover)'}
              onBlur={e => e.currentTarget.style.background = 'transparent'} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {Math.floor(totalMin)}<span style={{ fontSize: 14, opacity: 0.5 }}>min</span>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}>{resolved.length} tracks</div>
          </div>
        </div>

        {/* Analytics row */}
        {resolved.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16,
          }}>
            <MiniStat label="BPM range" value={`${minBpm}–${maxBpm}`} sub={`avg ${avgBpm}`} />
            <MiniStat label="Genres" value={genres.length} sub={genres.slice(0, 2).join(', ')} />
            <MiniStat label="Harmonic" value={`${harmonicCount}/${keyTransitions.length}`} sub="mix transitions" accent={harmonicCount === keyTransitions.length && keyTransitions.length > 0} />
            <MiniStat label="Records" value={new Set(resolved.map(r => r.record.id)).size} sub="unique" />
          </div>
        )}

        {resolved.length > 0 && <EnergyTimeline resolved={resolved} />}

        <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, minHeight: 0, marginRight: -8, paddingRight: 8 }}>
          {resolved.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: 'var(--dim)', textAlign: 'center', padding: 24,
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 48, opacity: 0.2, marginBottom: 8,
              }}>∅</div>
              <div style={{ fontSize: 14, maxWidth: 240, lineHeight: 1.5 }}>
                Click a record in Collection or swipe right here to pick tracks into your set.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button onClick={() => onToggleTimeline()} style={{
                  padding: '6px 12px', borderRadius: 4,
                  background: !timelineView ? 'var(--accent)' : 'var(--hover)',
                  color: !timelineView ? 'var(--on-accent)' : 'var(--fg)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                }}>List</button>
                <button onClick={() => onToggleTimeline()} style={{
                  padding: '6px 12px', borderRadius: 4,
                  background: timelineView ? 'var(--accent)' : 'var(--hover)',
                  color: timelineView ? 'var(--on-accent)' : 'var(--fg)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                }}>Timeline</button>
              </div>
              {timelineView && <SetTimeline resolved={resolved} />}
              <TrackList resolved={resolved} keyTransitions={keyTransitions}
                onRemove={onRemove} onReorder={onReorder} />
              <SuggestionsPanel resolved={resolved} records={records} set={set}
                onSelect={(rec, idx) => onAddTrack(rec, idx)} />
            </>
          )}
        </div>

        {resolved.length > 0 && (
          <div style={{
            paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 14,
            display: 'flex', gap: 10,
          }}>
            <button onClick={onClear} style={{
              flex: 1, padding: '10px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6, color: 'var(--fg)',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
              textTransform: 'uppercase', fontFamily: 'inherit',
            }}>Clear</button>
            <ExportMenu resolved={resolved} />
            <button onClick={onLaunchGig} title="Launch fullscreen gig mode" style={{
              flex: 1, padding: '10px',
              background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
              border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--fg)',
              cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              textTransform: 'uppercase', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>▶ Gig mode</button>
            <button onClick={() => {
              if (setName && setName.trim()) { onSaveSet(setName.trim()); return; }
              const defaultName = `Set ${new Date().toLocaleDateString()}`;
              const name = prompt('Name this set:', defaultName);
              if (name && name.trim()) { onSetNameChange(name.trim()); onSaveSet(name.trim()); }
            }} style={{
              flex: 1.2, padding: '10px',
              background: 'var(--accent)', color: 'var(--on-accent)',
              border: '1px solid var(--accent)', borderRadius: 6,
              cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
              textTransform: 'uppercase', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 6px 18px color-mix(in oklab, var(--accent) 40%, transparent)',
            }}>{Icon.Heart} Save set</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, accent }) {
  return (
    <div style={{
      padding: 10, border: '1px solid var(--border)', borderRadius: 6,
      background: accent ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'transparent',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
        textTransform: 'uppercase', color: 'var(--dim)',
      }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
}

function SwipeCard({ record }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    }}>
      <RecordCover hue={record.cover.hue} shape={record.cover.shape} imageUrl={record.cover.image}
        title={record.title} artist={record.artist} size={320}
        style={{ width: '100%', aspectRatio: '1 / 1', height: 'auto' }} />
      <div style={{ padding: 14 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 4,
        }}>{record.genre} · {record.year} · {record.tracks.length} tracks</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>{record.title}</div>
        <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 2 }}>{record.artist}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <BpmBadge bpm={record.bpm} size={13} />
          <KeyBadge k={record.key} size={12} />
          <EnergyDots level={record.energy} size={5} />
        </div>
      </div>
    </div>
  );
}

function SwipeHint({ side, opacity }) {
  return (
    <div style={{
      position: 'absolute', top: 20, [side]: 20,
      padding: '8px 14px', borderRadius: 6,
      background: side === 'right' ? 'var(--accent)' : '#E74C5C',
      color: side === 'right' ? 'var(--on-accent)' : '#fff',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
      letterSpacing: 1.5, textTransform: 'uppercase',
      transform: `rotate(${side === 'right' ? -8 : 8}deg)`,
      opacity, transition: 'opacity 0.1s', pointerEvents: 'none',
    }}>{side === 'right' ? 'Open' : 'Skip'}</div>
  );
}

function SwipeBtn({ children, onClick, dir, primary }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px',
      background: primary ? 'var(--accent)' : 'transparent',
      color: primary ? 'var(--on-accent)' : 'var(--fg)',
      border: primary ? 'none' : '1px solid var(--border)',
      borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{dir === 'left' ? '←' : ''} {children} {dir === 'right' ? '→' : ''}</button>
  );
}

function TrackList({ resolved, keyTransitions, onRemove, onReorder }) {
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const onDragStart = (i) => (e) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setData to fire drag events
    try { e.dataTransfer.setData('text/plain', String(i)); } catch {}
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIdx !== i) setOverIdx(i);
  };
  const onDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIdx != null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null); setOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {resolved.map((r, i) => {
        const prev = i > 0 ? resolved[i - 1] : null;
        const bpmDelta = prev ? r.track.bpm - prev.track.bpm : null;
        const isDragging = dragIdx === i;
        const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
        return (
          <div key={r.tid + i}
            draggable
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDrop={onDrop(i)}
            onDragEnd={onDragEnd}
            style={{
              opacity: isDragging ? 0.35 : 1,
              transition: 'opacity 0.1s',
              borderTop: isOver ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 2,
            }}>
            <TrackRow resolved={r} index={i}
              onRemove={() => onRemove(r.tid)}
              onMoveUp={i > 0 ? () => onReorder(i, i - 1) : null}
              onMoveDown={i < resolved.length - 1 ? () => onReorder(i, i + 1) : null}
              bpmDelta={bpmDelta}
              keyTransition={i > 0 ? keyTransitions[i - 1] : null} />
          </div>
        );
      })}
    </div>
  );
}

function TrackRow({ resolved, index, onRemove, onMoveUp, onMoveDown, bpmDelta, keyTransition }) {
  const { record, track } = resolved;
  return (
    <div>
      {/* Transition indicator between tracks */}
      {index > 0 && keyTransition && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px 4px 48px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)',
          letterSpacing: 0.5, textTransform: 'uppercase',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: keyTransition.unknown ? 'var(--dim)'
              : (keyTransition.harmonic ? 'oklch(0.75 0.18 145)' : 'oklch(0.7 0.18 30)'),
          }} />
          <span>
            {keyTransition.unknown ? 'unknown key' : (keyTransition.harmonic ? 'harmonic' : 'tension')}
            {bpmDelta != null && !isNaN(bpmDelta) && (
              <> · Δ {bpmDelta > 0 ? '+' : ''}{bpmDelta} BPM</>
            )}
          </span>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 8, borderRadius: 8, background: 'var(--hover)',
        cursor: 'grab',
      }}
      onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
      onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          color: 'var(--dim)', flexShrink: 0,
        }} title="Drag to reorder">{Icon.Drag}</div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
          color: 'var(--dim)', width: 28, textAlign: 'center',
        }}>{String(index + 1).padStart(2, '0')}</div>
        <RecordCover hue={record.cover.hue} shape={record.cover.shape} imageUrl={record.cover.image}
          title={record.title} artist={record.artist} size={40}
          style={{ width: 40, height: 40, borderRadius: 3 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.3 }}>
            {track.n} · {record.artist} · {record.title}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <BpmBadge bpm={track.bpm} size={10} />
            <KeyBadge k={track.key} size={9} />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--dim)' }}>
            {track.len}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={onMoveUp} disabled={!onMoveUp} style={reorderBtn}>↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} style={reorderBtn}>↓</button>
        </div>
        <button onClick={onRemove} style={{
          width: 22, height: 22, borderRadius: 11, border: 'none',
          background: 'transparent', color: 'var(--dim)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{Icon.X}</button>
      </div>
    </div>
  );
}

const reorderBtn = {
  width: 18, height: 18, borderRadius: 4, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
  fontSize: 10, padding: 0, lineHeight: 1,
  fontFamily: 'JetBrains Mono, monospace',
};

function EnergyTimeline({ resolved }) {
  const points = resolved.map(r => r.track);
  const w = 100, h = 44;
  const pathData = points.map((t, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - (t.energy / 10) * h;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
        color: 'var(--dim)', textTransform: 'uppercase', marginBottom: 6,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>Energy arc</span>
        <span>track 01 → {String(resolved.length).padStart(2, '0')}</span>
      </div>
      <svg width="100%" height={44} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
        style={{ display: 'block' }}>
        <path d={`${pathData} L ${w} ${h} L 0 ${h} Z`} fill="var(--accent)" opacity="0.15" />
        <path d={pathData} stroke="var(--accent)" strokeWidth="1.5" fill="none"
          vectorEffect="non-scaling-stroke" />
        {points.map((t, i) => {
          const x = (i / Math.max(1, points.length - 1)) * w;
          const y = h - (t.energy / 10) * h;
          return <circle key={i} cx={x} cy={y} r="1.6" fill="var(--accent)" />;
        })}
      </svg>
    </div>
  );
}

Object.assign(window, { SetBuilder });
