// Collection views: Grid, List, Stack

function CollectionGrid({ records, onSelect, onAddToSet, inSet, density, showOverlays }) {
  const gap = density === 'compact' ? 16 : 24;
  const size = density === 'compact' ? 170 : 210;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, 1fr))`,
      gap,
    }}>
      {records.map(r => (
        <GridCard key={r.id} record={r} onSelect={onSelect}
          onAddToSet={onAddToSet} inSet={inSet(r.id)}
          density={density} showOverlays={showOverlays} />
      ))}
    </div>
  );
}

function GridCard({ record, onSelect, onAddToSet, inSet, density, showOverlays }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={() => onSelect(record)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer', position: 'relative',
        transition: 'transform 0.2s ease',
        transform: hover ? 'translateY(-4px)' : 'none',
      }}>
      {/* Peek vinyl behind sleeve */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: hover ? 'translateX(18%)' : 'translateX(4%)',
          transition: 'transform 0.3s cubic-bezier(0.3, 0, 0.2, 1)',
        }}>
          <VinylDisc hue={record.cover.hue} size="100%" style={{ width: '100%', height: '100%' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0 }}>
          <RecordCover hue={record.cover.hue} shape={record.cover.shape} imageUrl={record.cover.image}
            title={record.title} artist={record.artist}
            size={240} style={{ width: '100%', height: '100%' }} />
        </div>
        {/* overlays */}
        {showOverlays && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            display: 'flex', gap: 4, zIndex: 2,
          }}>
            <KeyBadge k={record.key} size={11} />
            <BpmBadge bpm={record.bpm} size={11} />
          </div>
        )}
        {/* add button on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onAddToSet(record); }}
          style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 2,
            width: 32, height: 32, borderRadius: 16,
            border: 'none', cursor: 'pointer',
            background: inSet ? 'var(--accent)' : 'var(--bg)',
            color: inSet ? 'var(--on-accent)' : 'var(--fg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hover || inSet ? 1 : 0,
            transform: hover || inSet ? 'scale(1)' : 'scale(0.7)',
            transition: 'all 0.15s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
          {inSet ? Icon.Check : Icon.Plus}
        </button>
      </div>
      <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
          color: 'var(--dim)', textTransform: 'uppercase',
        }}>{record.genre} · {record.year}</div>
        <div style={{
          fontSize: density === 'compact' ? 14 : 16, fontWeight: 600,
          lineHeight: 1.2, color: 'var(--fg)',
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

function CollectionList({ records, onSelect, onAddToSet, inSet, density, showOverlays }) {
  const rowH = density === 'compact' ? 48 : 60;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '40px 3fr 2fr 1fr 80px 80px 60px 40px',
        alignItems: 'center', gap: 12, padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        letterSpacing: 1, textTransform: 'uppercase', color: 'var(--dim)',
      }}>
        <div></div>
        <div>Title / Artist</div>
        <div>Genre / Mood</div>
        <div>Year</div>
        <div>BPM</div>
        <div>Key</div>
        <div>Energy</div>
        <div></div>
      </div>
      {records.map((r, i) => {
        const added = inSet(r.id);
        return (
          <div key={r.id} onClick={() => onSelect(r)}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 3fr 2fr 1fr 80px 80px 60px 40px',
              alignItems: 'center', gap: 12, padding: '0 14px', height: rowH,
              borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', background: 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image} title={r.title} artist={r.artist}
              size={density === 'compact' ? 32 : 44}
              style={{ width: density === 'compact' ? 32 : 44, height: density === 'compact' ? 32 : 44 }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'var(--dim)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag size="sm">{r.genre}</Tag>
              <Tag size="sm">{r.mood}</Tag>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--dim)' }}>{r.year}</div>
            <div>{showOverlays ? <BpmBadge bpm={r.bpm} size={13} /> : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--dim)' }}>—</span>}</div>
            <div>{showOverlays ? <KeyBadge k={r.key} size={12} /> : <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--dim)' }}>—</span>}</div>
            <div><EnergyDots level={r.energy} size={4} /></div>
            <div>
              <button
                onClick={(e) => { e.stopPropagation(); onAddToSet(r); }}
                style={{
                  width: 28, height: 28, borderRadius: 14, border: 'none',
                  background: added ? 'var(--accent)' : 'var(--border)',
                  color: added ? 'var(--on-accent)' : 'var(--fg)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {added ? Icon.Check : Icon.Plus}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollectionStack({ records, onSelect, onAddToSet, inSet, density, showOverlays }) {
  // Vertical crates: records grouped by genre, stacked like flipping through crates
  const byGenre = React.useMemo(() => {
    const g = {};
    records.forEach(r => {
      g[r.genre] = g[r.genre] || [];
      g[r.genre].push(r);
    });
    return g;
  }, [records]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {Object.entries(byGenre).map(([genre, recs]) => (
        <CrateRow key={genre} genre={genre} records={recs}
          onSelect={onSelect} onAddToSet={onAddToSet} inSet={inSet}
          showOverlays={showOverlays} />
      ))}
    </div>
  );
}

function CrateRow({ genre, records, onSelect, onAddToSet, inSet, showOverlays }) {
  const scrollRef = React.useRef(null);
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>{genre}</h3>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
          }}>{String(records.length).padStart(2, '0')} records</span>
        </div>
        <button onClick={() => scrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
          style={{
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)',
            padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5, textTransform: 'uppercase',
          }}>flip →</button>
      </div>
      <div ref={scrollRef} style={{
        display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12,
        scrollSnapType: 'x mandatory',
      }}>
        {records.map((r, i) => (
          <div key={r.id} onClick={() => onSelect(r)}
            style={{
              flexShrink: 0, width: 200, cursor: 'pointer',
              transform: `rotate(${(i % 2 === 0 ? -0.4 : 0.6)}deg)`,
              scrollSnapAlign: 'start',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'rotate(0deg) translateY(-6px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = `rotate(${(i % 2 === 0 ? -0.4 : 0.6)}deg)`}
          >
            <div style={{ position: 'relative' }}>
              <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image} title={r.title} artist={r.artist} size={200}
                style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.15)' }} />
              {showOverlays && (
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                  <KeyBadge k={r.key} size={11} />
                  <BpmBadge bpm={r.bpm} size={11} />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onAddToSet(r); }}
                style={{
                  position: 'absolute', bottom: 8, right: 8,
                  width: 30, height: 30, borderRadius: 15,
                  border: 'none', cursor: 'pointer',
                  background: inSet(r.id) ? 'var(--accent)' : 'var(--bg)',
                  color: inSet(r.id) ? 'var(--on-accent)' : 'var(--fg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                {inSet(r.id) ? Icon.Check : Icon.Plus}
              </button>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1,
              color: 'var(--dim)', textTransform: 'uppercase', marginTop: 8,
            }}>{r.label} · {r.catalog}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--dim)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CollectionGrid, CollectionList, CollectionStack });
