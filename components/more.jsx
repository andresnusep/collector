// Gig mode, Dashboard, Timeline view, Track ratings.

// ─────────── Track rating (stars) ───────────

function TrackRating({ value, onChange, size = 12 }) {
  const [hover, setHover] = React.useState(0);
  const active = hover || value || 0;
  return (
    <div style={{ display: 'inline-flex', gap: 1 }}
      onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n}
          onClick={(e) => { e.stopPropagation(); onChange(value === n ? 0 : n); }}
          onMouseEnter={() => setHover(n)}
          title={`${n} star${n === 1 ? '' : 's'}`}
          style={{
            width: size + 4, height: size + 4, padding: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: n <= active ? 'var(--accent)' : 'var(--dim)',
            fontSize: size, lineHeight: 1, opacity: n <= active ? 1 : 0.35,
          }}>★</button>
      ))}
    </div>
  );
}

// ─────────── Set timeline view ───────────

function SetTimeline({ resolved }) {
  if (resolved.length === 0) return null;
  const durations = resolved.map(r => {
    const [m, s] = (r.track.len || '0:00').split(':').map(Number);
    return Math.max(0.1, (m || 0) + (s || 0) / 60);
  });
  const totalMin = durations.reduce((a, b) => a + b, 0);
  const bpms = resolved.map(r => r.track.bpm).filter(b => b != null);
  const bpmMin = bpms.length ? Math.min(...bpms) : 100;
  const bpmMax = bpms.length ? Math.max(...bpms) : 140;
  const bpmRange = Math.max(1, bpmMax - bpmMin);

  const W = 800, H = 180, PAD = 20;
  const innerW = W - PAD * 2;
  let cursor = 0;
  const blocks = resolved.map((r, i) => {
    const x = PAD + (cursor / totalMin) * innerW;
    const w = (durations[i] / totalMin) * innerW;
    cursor += durations[i];
    return { x, w, r, i };
  });

  // BPM line points (center of each block)
  const points = blocks.map(b => {
    const bpm = b.r.track.bpm;
    const y = bpm != null
      ? PAD + (1 - (bpm - bpmMin) / bpmRange) * (H - PAD * 2)
      : H / 2;
    return { x: b.x + b.w / 2, y, bpm };
  });

  const keyColor = (k) => {
    if (!k) return 'var(--dim)';
    const m = k.match(/^(\d+)([AB])$/i);
    if (!m) return 'var(--dim)';
    const n = parseInt(m[1]);
    const hue = ((n - 1) * 30) % 360;
    const sat = m[2].toUpperCase() === 'A' ? 50 : 75;
    return `oklch(0.72 0.${sat < 60 ? '10' : '16'} ${hue})`;
  };

  return (
    <div style={{
      padding: 16, border: '1px solid var(--border)', borderRadius: 8,
      background: 'var(--hover)', marginBottom: 16,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
        Timeline · {Math.floor(totalMin)} min · BPM {bpmMin}–{bpmMax}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {blocks.map(b => (
          <g key={b.i}>
            <rect x={b.x} y={PAD} width={Math.max(1, b.w - 2)} height={H - PAD * 2}
              fill={keyColor(b.r.track.key)} opacity={0.25} rx={3} />
            <text x={b.x + 4} y={PAD + 12} fontSize="9" fontFamily="JetBrains Mono, monospace"
              fill="var(--fg)" opacity={0.85}>{b.i + 1}</text>
            {b.w > 40 && (
              <text x={b.x + 4} y={H - PAD - 6} fontSize="9" fontFamily="JetBrains Mono, monospace"
                fill="var(--fg)" opacity={0.55}>
                {b.r.track.key || '—'}
              </text>
            )}
          </g>
        ))}
        {/* BPM line */}
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="var(--accent)" strokeWidth="2" />
        {points.map((p, i) => p.bpm != null && (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
            <text x={p.x} y={p.y - 8} fontSize="9" fontFamily="JetBrains Mono, monospace"
              fill="var(--fg)" textAnchor="middle">{p.bpm}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─────────── Collection health dashboard ───────────

function Dashboard({ records, set }) {
  const total = records.length;
  const allTracks = records.flatMap(r => r.tracks);
  const totalTracks = allTracks.length;
  const withBpm = allTracks.filter(t => t.bpm != null).length;
  const withKey = allTracks.filter(t => t.key).length;
  const withAudio = records.filter(r => {
    // we can't await here, so check via window.AudioStore cache — best-effort
    return false;
  }).length;
  const neverInSet = records.filter(r => !r.tracks.some((_, i) => set.includes(`${r.id}-${i}`))).length;

  const genreCounts = {};
  for (const r of records) genreCounts[r.genre || 'Unknown'] = (genreCounts[r.genre || 'Unknown'] || 0) + 1;
  const genres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const maxGenre = genres[0]?.[1] || 1;

  const yearCounts = {};
  for (const r of records) if (r.year) yearCounts[r.year] = (yearCounts[r.year] || 0) + 1;
  const years = Object.entries(yearCounts).map(([y, c]) => [Number(y), c]).sort((a, b) => a[0] - b[0]);
  const maxYear = years.length ? Math.max(...years.map(([, c]) => c)) : 1;

  const totalValue = records.reduce((s, r) => s + (r.value || 0), 0);
  const bpms = allTracks.map(t => t.bpm).filter(b => b != null);
  const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 0;

  const rated = allTracks.filter(t => t.rating && t.rating > 0).length;
  const avgRating = rated ? (allTracks.reduce((s, t) => s + (t.rating || 0), 0) / rated).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        <StatCard label="Records" value={total} />
        <StatCard label="Tracks" value={totalTracks} />
        <StatCard label="Collection value" value={`$${totalValue.toLocaleString()}`} />
        <StatCard label="Avg BPM" value={avgBpm || '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <CoverageBar label="BPM data" done={withBpm} total={totalTracks} />
        <CoverageBar label="Key data" done={withKey} total={totalTracks} />
        <CoverageBar label="Never in a set" done={neverInSet} total={total} invert />
      </div>

      <div style={{
        padding: 20, border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--panel)',
      }}>
        <SectionHeader>Genre breakdown</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {genres.slice(0, 10).map(([g, c]) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 120, fontSize: 12, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</div>
              <div style={{ flex: 1, height: 8, background: 'var(--hover)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${(c / maxGenre) * 100}%`, height: '100%',
                  background: 'var(--accent)',
                }} />
              </div>
              <div style={{
                width: 40, textAlign: 'right', fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace', color: 'var(--dim)',
              }}>{c}</div>
            </div>
          ))}
        </div>
      </div>

      {years.length > 0 && (
        <div style={{
          padding: 20, border: '1px solid var(--border)', borderRadius: 10,
          background: 'var(--panel)',
        }}>
          <SectionHeader>Records by year</SectionHeader>
          <svg viewBox="0 0 800 160" style={{ width: '100%', height: 'auto' }}>
            {years.map(([y, c], i) => {
              const x = (i / Math.max(1, years.length - 1)) * 760 + 20;
              const h = (c / maxYear) * 120;
              return (
                <g key={y}>
                  <rect x={x - 4} y={140 - h} width="8" height={h}
                    fill="var(--accent)" opacity={0.8} rx="1" />
                  {(i === 0 || i === years.length - 1 || i % Math.max(1, Math.floor(years.length / 6)) === 0) && (
                    <text x={x} y={155} fontSize="9" fontFamily="JetBrains Mono, monospace"
                      fill="var(--dim)" textAnchor="middle">{y}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div style={{
        padding: 20, border: '1px solid var(--border)', borderRadius: 10,
        background: 'var(--panel)',
      }}>
        <SectionHeader>Ratings</SectionHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {rated}<span style={{ fontSize: 16, color: 'var(--dim)' }}> / {totalTracks}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Tracks rated</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--accent)' }}>
              {avgRating || '—'}<span style={{ fontSize: 16, color: 'var(--dim)' }}> / 5</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Average</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      padding: 16, border: '1px solid var(--border)', borderRadius: 10,
      background: 'var(--panel)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 6,
      }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
        {value}
      </div>
    </div>
  );
}

function CoverageBar({ label, done, total, invert }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const color = invert
    ? (pct > 30 ? '#E74C5C' : 'var(--accent)')
    : (pct > 70 ? 'var(--accent)' : pct > 40 ? 'oklch(0.75 0.16 55)' : '#E74C5C');
  return (
    <div style={{
      padding: 16, border: '1px solid var(--border)', borderRadius: 10,
      background: 'var(--panel)',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
          {pct}%
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim)',
          fontFamily: 'JetBrains Mono, monospace' }}>{done}/{total}</div>
      </div>
      <div style={{ height: 6, background: 'var(--hover)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
      {children}
    </div>
  );
}

// ─────────── Gig mode ───────────

function GigMode({ resolved, theme, accent, onClose }) {
  const [index, setIndex] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);
  const [running, setRunning] = React.useState(false);

  const accentColor = accent || '#E8FF4A';

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setRunning(r => !r); }
      if (e.key === 'ArrowRight') setIndex(i => Math.min(resolved.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'n') setIndex(i => Math.min(resolved.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resolved.length, onClose]);

  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  React.useEffect(() => { setElapsed(0); }, [index]);

  // Wake lock
  React.useEffect(() => {
    let lock = null;
    (async () => {
      try { lock = await navigator.wakeLock?.request('screen'); } catch {}
    })();
    return () => { try { lock?.release?.(); } catch {} };
  }, []);

  const next = () => setIndex(i => Math.min(resolved.length - 1, i + 1));
  const prev = () => setIndex(i => Math.max(0, i - 1));

  // Mix suggestions: best BPM/key matches from the rest of the set.
  // Score = bpmDiff * 2 + keyPenalty — same weighting as the phone Gig view.
  const suggestions = React.useMemo(() => {
    if (resolved.length < 2) return [];
    const cur = resolved[index];
    if (!cur || cur.track.bpm == null) return [];
    const pool = resolved
      .map((q, i) => ({ ...q, qIdx: i }))
      .filter((q, i) => i !== index && i !== index + 1 && q.track.bpm != null);
    const cd = window.camelotDistance || (() => 3);
    const scored = pool.map(q => {
      const bpmDiff = Math.abs(q.track.bpm - cur.track.bpm);
      const keyPenalty = cd(cur.track.key, q.track.key);
      return { ...q, bpmDiff, keyPenalty, score: bpmDiff * 2 + keyPenalty };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 3);
  }, [resolved, index]);

  if (resolved.length === 0) return null;
  const cur = resolved[index];
  const nxt = resolved[index + 1];
  // Up to 3 upcoming tracks (like the phone view), including the immediate next.
  const upcoming = resolved.slice(index + 1, index + 4);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const [mm, ss] = (cur.track.len || '0:00').split(':').map(Number);
  const totalSec = (mm || 0) * 60 + (ss || 0);
  const pct = totalSec ? Math.min(100, (elapsed / totalSec) * 100) : 0;

  return (
    <div className={`app ${theme || 'dark'}`} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'var(--bg)', color: 'var(--fg)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Space Grotesk, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 2,
          textTransform: 'uppercase', color: 'var(--dim)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: accentColor,
            animation: 'gigPulse 1.5s infinite' }} />
          <style>{`@keyframes gigPulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
          Gig mode · Track {index + 1} of {resolved.length}
        </div>
        <button onClick={onClose} style={{
          padding: '8px 16px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 6,
          color: 'var(--fg)', cursor: 'pointer',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>Exit · ESC</button>
      </div>

      {/* Main area */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 440px',
        overflow: 'hidden',
      }}>
        {/* Current track */}
        <div style={{
          padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          minWidth: 0,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 2,
            textTransform: 'uppercase', color: accentColor, marginBottom: 12,
          }}>Now playing</div>

          {cur.track.n && (
            <div style={{
              display: 'inline-block', alignSelf: 'flex-start',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700,
              letterSpacing: 2, padding: '5px 12px', borderRadius: 5,
              background: accentColor, color: 'var(--on-accent)', marginBottom: 14,
            }}>{cur.track.n}</div>
          )}
          <div style={{
            fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1,
            marginBottom: 14, textWrap: 'balance',
          }}>
            {cur.track.title}
          </div>
          <div style={{ fontSize: 28, color: 'var(--dim)', marginBottom: 32 }}>
            {cur.record.artist}
          </div>
          <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
            <GigStat label="BPM" value={cur.track.bpm ?? '—'} accentColor={accentColor} />
            <GigStat label="Key" value={cur.track.key ?? '—'} accentColor={accentColor} />
            <GigStat label="Length" value={cur.track.len} accentColor={accentColor} />
            <GigStat label="Elapsed" value={fmtTime(elapsed)} accentColor={accentColor} highlighted={running} />
          </div>
          {/* Progress bar */}
          <div style={{
            height: 6, background: 'var(--hover)', borderRadius: 3, overflow: 'hidden',
            marginBottom: 24,
          }}>
            <div style={{
              height: '100%', width: `${pct}%`, background: accentColor,
              transition: 'width 0.3s',
            }} />
          </div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 10 }}>
            <GigBtn onClick={prev} disabled={index === 0} accentColor={accentColor}>← Prev</GigBtn>
            <GigBtn onClick={() => setRunning(r => !r)} primary accentColor={accentColor}>
              {running ? 'Pause' : 'Start'} · SPACE
            </GigBtn>
            <GigBtn onClick={next} disabled={index >= resolved.length - 1} accentColor={accentColor}>Next →</GigBtn>
          </div>
        </div>

        {/* Right pane — coming up + mix suggestions */}
        <div style={{
          padding: 32, borderLeft: '1px solid var(--border)',
          background: 'var(--panel)',
          display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto',
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 16,
          }}>Coming up</div>

          {nxt ? (
            <>
              {/* Rich immediate-next card */}
              <GigNextCard item={nxt} accentColor={accentColor} prominent />
              <TransitionHint
                fromBpm={cur.track.bpm} toBpm={nxt.track.bpm}
                fromKey={cur.track.key} toKey={nxt.track.key}
                accentColor={accentColor} />

              {/* Next 2 more (to match phone's 3-up list) */}
              {upcoming.slice(1).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
                  {upcoming.slice(1).map(u => (
                    <GigNextCard key={u.tid} item={u} accentColor={accentColor} />
                  ))}
                </div>
              )}

              {/* Mix suggestions — BPM/key scored picks from anywhere in the set */}
              {suggestions.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 2,
                    textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 10,
                  }}>Mix suggestions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
                    {suggestions.map(s => {
                      const harm = s.keyPenalty === 0 ? 'same key'
                        : s.keyPenalty === 1 ? 'harmonic'
                        : s.keyPenalty <= 2 ? 'close' : 'clash';
                      const tag = s.bpmDiff === 0 ? 'exact BPM' : `±${s.bpmDiff} BPM`;
                      const good = s.bpmDiff <= 4 && s.keyPenalty <= 1;
                      return (
                        <button key={s.tid} onClick={() => setIndex(s.qIdx)}
                          title={`Jump to track ${s.qIdx + 1}`}
                          style={{
                            display: 'flex', gap: 10, alignItems: 'center', padding: 10,
                            borderRadius: 8, background: 'var(--hover)',
                            border: `1px solid ${good ? accentColor : 'var(--border)'}`,
                            color: 'var(--fg)', fontFamily: 'inherit',
                            cursor: 'pointer', textAlign: 'left', width: '100%',
                          }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {s.track.n && (
                              <div style={{
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                                fontWeight: 700, letterSpacing: 1,
                                color: accentColor, marginBottom: 1,
                              }}>{s.track.n}</div>
                            )}
                            <div style={{ fontSize: 13, fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.track.title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--dim)',
                              fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.3 }}>
                              {tag} · {harm}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 16, fontWeight: 700,
                              color: good ? accentColor : 'var(--fg)' }}>
                              {s.track.bpm}
                            </div>
                            <div style={{ fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 10, color: 'var(--dim)' }}>{s.track.key ?? '—'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{ flex: 1 }} />
              {resolved.length > index + upcoming.length && (
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
                  color: 'var(--dim)', textTransform: 'uppercase',
                  paddingTop: 10, borderTop: '1px solid var(--border)',
                }}>{resolved.length - (index + upcoming.length)} more in the set</div>
              )}
            </>
          ) : (
            <div style={{
              fontSize: 18, color: 'var(--dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', textAlign: 'center',
            }}>
              Last track.<br/>Finish strong.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GigStat({ label, value, small, highlighted, accentColor }) {
  return (
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: small ? 9 : 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)',
      }}>{label}</div>
      <div style={{
        fontSize: small ? 22 : 36, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
        color: highlighted ? accentColor : 'var(--fg)',
      }}>{value}</div>
    </div>
  );
}

function GigBtn({ onClick, children, primary, disabled, accentColor }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 20px', borderRadius: 6,
      background: primary ? accentColor : 'transparent',
      color: primary ? 'var(--on-accent)' : 'var(--fg)',
      border: primary ? 'none' : '1px solid var(--border)',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700,
      letterSpacing: 1, textTransform: 'uppercase',
    }}>{children}</button>
  );
}

// Rich card for an upcoming track in gig mode — cover + side/number + title + BPM/key.
function GigNextCard({ item, accentColor, prominent }) {
  const r = item.record, t = item.track;
  const size = prominent ? 64 : 48;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: prominent ? 14 : 10, borderRadius: 8,
      background: prominent ? 'var(--hover)' : 'transparent',
      border: prominent ? '1px solid var(--border)' : '1px solid transparent',
      marginBottom: prominent ? 14 : 0,
    }}>
      <div style={{ flexShrink: 0 }}>
        <RecordCover hue={r.cover?.hue} shape={r.cover?.shape}
          imageUrl={r.cover?.image}
          title={r.title} artist={r.artist} size={size}
          style={{ width: size, height: size, borderRadius: 4 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {t.n && (
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: prominent ? 11 : 9, fontWeight: 700, letterSpacing: 1,
            color: accentColor, marginBottom: 2,
          }}>{t.n}</div>
        )}
        <div style={{
          fontSize: prominent ? 20 : 14, fontWeight: 700,
          letterSpacing: prominent ? -0.4 : 0, lineHeight: 1.15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{t.title}</div>
        <div style={{
          fontSize: prominent ? 13 : 11, color: 'var(--dim)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{r.artist}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace',
          fontSize: prominent ? 22 : 16, fontWeight: 700,
          color: accentColor, lineHeight: 1 }}>
          {t.bpm ?? '—'}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace',
          fontSize: prominent ? 12 : 10, color: 'var(--dim)', marginTop: 3 }}>
          {t.key ?? '—'}
        </div>
      </div>
    </div>
  );
}

function TransitionHint({ fromBpm, toBpm, fromKey, toKey, accentColor }) {
  const bpmDelta = (fromBpm != null && toBpm != null) ? toBpm - fromBpm : null;
  const keyCompat = fromKey && toKey && window.isKeyCompatible?.(fromKey, toKey);
  const unknown = !fromKey || !toKey || fromBpm == null || toBpm == null;
  const good = keyCompat && bpmDelta != null && Math.abs(bpmDelta) <= 6;

  return (
    <div style={{
      padding: 12, borderRadius: 6,
      background: good
        ? `color-mix(in oklab, ${accentColor} 12%, transparent)`
        : 'var(--hover)',
      border: `1px solid ${good ? accentColor : 'var(--border)'}`,
      marginBottom: 20,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
        textTransform: 'uppercase', color: good ? accentColor : 'var(--dim)',
        marginBottom: 6,
      }}>Transition</div>
      <div style={{ fontSize: 14 }}>
        {unknown ? 'Missing data — trust your ears.' :
         good ? 'Harmonic · smooth BPM shift.' :
         keyCompat ? `Harmonic, but BPM jumps ${bpmDelta > 0 ? '+' : ''}${bpmDelta}.` :
         `Key clash${bpmDelta != null ? ` · ${bpmDelta > 0 ? '+' : ''}${bpmDelta} BPM` : ''}.`}
      </div>
    </div>
  );
}

// ─────────── Saved set page ───────────

function SavedSetPage({ savedSet, records, onRename, onUpdateTracks, onUpdateGigs, onDelete, onLoadToBuilder, onLaunchGig }) {
  const [showTimeline, setShowTimeline] = React.useState(false);
  if (!savedSet) {
    return (
      <div style={{
        padding: 40, textAlign: 'center', color: 'var(--dim)',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 48, opacity: 0.2, marginBottom: 12,
        }}>∅</div>
        <div style={{ fontSize: 14 }}>Pick a saved set from the sidebar.</div>
      </div>
    );
  }

  const resolved = savedSet.trackIds.map(tid => {
    const p = window.parseTrackId(tid);
    return p ? { tid, ...p } : null;
  }).filter(Boolean);

  const removeTrack = (tid) => {
    onUpdateTracks(savedSet.id, savedSet.trackIds.filter(x => x !== tid));
  };
  const reorderTrack = (from, to) => {
    const next = [...savedSet.trackIds];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onUpdateTracks(savedSet.id, next);
  };

  const totalMin = resolved.reduce((sum, r) => {
    const [m, s] = (r.track.len || '0:00').split(':').map(Number);
    return sum + (m || 0) + (s || 0) / 60;
  }, 0);
  const bpms = resolved.map(r => r.track.bpm).filter(b => b != null);
  const keyTransitions = [];
  for (let i = 1; i < resolved.length; i++) {
    const k1 = resolved[i - 1].track.key, k2 = resolved[i].track.key;
    if (!k1 || !k2) { keyTransitions.push({ from: k1, to: k2, harmonic: false, unknown: true }); continue; }
    const n1 = parseInt(k1), n2 = parseInt(k2);
    const l1 = k1.slice(-1), l2 = k2.slice(-1);
    const diff = Math.min(Math.abs(n1 - n2), 12 - Math.abs(n1 - n2));
    const harmonic = (l1 === l2 && diff <= 1) || (diff === 0);
    keyTransitions.push({ from: k1, to: k2, harmonic });
  }

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 24,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 18, gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            Saved set · {new Date(savedSet.createdAt || Date.now()).toLocaleDateString()}
          </div>
          <input value={savedSet.name}
            onChange={e => onRename(savedSet.id, e.target.value)}
            placeholder="Untitled"
            style={{
              marginTop: 4, width: '100%',
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 28, fontWeight: 700, letterSpacing: -0.6,
              color: 'var(--fg)', fontFamily: 'inherit', padding: 0,
            }}
            onFocus={e => e.currentTarget.style.background = 'var(--hover)'}
            onBlur={e => e.currentTarget.style.background = 'transparent'} />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            {Math.floor(totalMin)}<span style={{ fontSize: 14, opacity: 0.5 }}>min</span>
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)',
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{resolved.length} tracks</div>
        </div>
      </div>

      {/* Meta stats */}
      {resolved.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18,
        }}>
          <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>BPM range</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {bpms.length ? `${Math.min(...bpms)}–${Math.max(...bpms)}` : '—'}
            </div>
          </div>
          <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>Harmonic</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {keyTransitions.filter(t => t.harmonic).length}/{keyTransitions.length || 0}
            </div>
          </div>
          <div style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
              textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4 }}>Records</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
              {new Set(resolved.map(r => r.record.id)).size}
            </div>
          </div>
        </div>
      )}


      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={() => onLoadToBuilder(savedSet.id)} style={actBtnPrimary}>
          ▸ Open in Builder
        </button>
        <button onClick={() => onLaunchGig(resolved)} style={actBtn} disabled={resolved.length === 0}>
          ▶ Gig mode
        </button>
        <ExportMenuInline resolved={resolved} setName={savedSet.name} />
        <button onClick={() => setShowTimeline(v => !v)} style={actBtn}>
          {showTimeline ? 'Hide timeline' : 'Show timeline'}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => {
          if (confirm(`Delete saved set "${savedSet.name}"?`)) onDelete(savedSet.id);
        }} style={{ ...actBtn, borderColor: '#E74C5C', color: '#E74C5C' }}>
          Delete set
        </button>
      </div>

      {showTimeline && resolved.length > 0 && <SetTimeline resolved={resolved} />}

      {/* Tracks */}
      {resolved.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--dim)',
          border: '1px dashed var(--border)', borderRadius: 6,
        }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>∅</div>
          <div style={{ fontSize: 13 }}>This set is empty. Add some tracks below.</div>
        </div>
      ) : (
        <TrackList resolved={resolved} keyTransitions={keyTransitions}
          onRemove={removeTrack} onReorder={reorderTrack} />
      )}

      {/* Add tracks picker */}
      <TrackPicker records={records} trackIds={savedSet.trackIds}
        onAdd={(tid) => onUpdateTracks(savedSet.id,
          savedSet.trackIds.includes(tid)
            ? savedSet.trackIds.filter(x => x !== tid)
            : [...savedSet.trackIds, tid])} />

      {/* Gig history (always at the bottom) */}
      <GigRecord savedSet={savedSet} onUpdateGigs={onUpdateGigs} />
    </div>
  );
}

function TrackPicker({ records, trackIds, onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState(null); // record id

  const q = search.toLowerCase().trim();
  const filtered = q
    ? records.filter(r => {
        const hay = `${r.title} ${r.artist} ${r.label} ${r.genre}`.toLowerCase();
        if (hay.includes(q)) return true;
        return r.tracks.some(t => t.title?.toLowerCase().includes(q));
      })
    : records;

  return (
    <div style={{
      marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', padding: '12px 14px', borderRadius: 6,
        background: open ? 'var(--hover)' : 'color-mix(in oklab, var(--accent) 10%, transparent)',
        border: `1px ${open ? 'solid' : 'dashed'} var(--accent)`,
        color: 'var(--fg)', cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        letterSpacing: 1, textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {open ? '− Hide picker' : '+ Add tracks to this set'}
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--hover)', border: '1px solid var(--border)',
            marginBottom: 12,
          }}>
            <span style={{ color: 'var(--dim)' }}>{Icon.Search}</span>
            <input autoFocus value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search records or tracks…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit',
              }} />
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)',
            }}>{filtered.length} record{filtered.length === 1 ? '' : 's'}</div>
          </div>

          <div style={{
            maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)',
            borderRadius: 6, padding: 6,
          }}>
            {filtered.slice(0, 60).map(r => {
              const isOpen = expanded === r.id;
              const inSetCount = r.tracks.filter((_, i) =>
                trackIds.includes(`${r.id}-${i}`)).length;
              return (
                <div key={r.id} style={{ marginBottom: 4 }}>
                  <button onClick={() => setExpanded(isOpen ? null : r.id)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: 5,
                    background: isOpen ? 'var(--hover)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ flexShrink: 0 }}>
                      <RecordCover hue={r.cover.hue} shape={r.cover.shape}
                        imageUrl={r.cover.image} title={r.title} artist={r.artist}
                        size={36} style={{ width: 36, height: 36 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.artist} · {r.tracks.length} track{r.tracks.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    {inSetCount > 0 && (
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 3,
                        background: 'var(--accent)', color: 'var(--on-accent)',
                      }}>{inSetCount}/{r.tracks.length}</span>
                    )}
                    <span style={{ color: 'var(--dim)', fontSize: 11, width: 12, textAlign: 'center' }}>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '6px 10px 10px 54px' }}>
                      {r.tracks.map((t, i) => {
                        const tid = `${r.id}-${i}`;
                        const added = trackIds.includes(tid);
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '4px 0', fontSize: 12,
                          }}>
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                              color: 'var(--dim)', width: 24,
                            }}>{t.n}</span>
                            <span style={{ flex: 1, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.title || '(untitled)'}
                            </span>
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                              color: 'var(--dim)',
                            }}>{t.bpm ?? '—'} · {t.key ?? '—'}</span>
                            <button onClick={() => onAdd(tid)} style={{
                              width: 24, height: 24, borderRadius: 12, border: 'none',
                              background: added ? 'var(--accent)' : 'var(--border)',
                              color: added ? 'var(--on-accent)' : 'var(--fg)',
                              cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }} title={added ? 'Remove from set' : 'Add to set'}>
                              {added ? Icon.Check : Icon.Plus}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length > 60 && (
              <div style={{
                padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--dim)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>Showing first 60. Refine search to see more.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportMenuInline({ resolved, setName }) {
  return <ExportMenu resolved={resolved} setName={setName} />;
}

const actBtn = {
  padding: '8px 14px', background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', borderRadius: 6,
  fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
  fontFamily: 'inherit', cursor: 'pointer',
};
const actBtnPrimary = {
  ...actBtn,
  background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', fontWeight: 700,
};

// ─────────── Gig history (where & when played — one or many) ───────────

function GigRecord({ savedSet, onUpdateGigs }) {
  // Migrate legacy single-gig shape (venue/playedAt/notes at root) into gigs array on first render.
  const legacy = (savedSet.venue || savedSet.playedAt || savedSet.notes)
    ? [{ id: 'legacy', venue: savedSet.venue || '', playedAt: savedSet.playedAt || '',
         notes: savedSet.notes || '' }]
    : [];
  const gigs = Array.isArray(savedSet.gigs) && savedSet.gigs.length
    ? savedSet.gigs : legacy;
  const [editingId, setEditingId] = React.useState(null);

  const sorted = [...gigs].sort((a, b) => (b.playedAt || '').localeCompare(a.playedAt || ''));

  const addGig = () => {
    const id = `g${Date.now()}`;
    const next = [...gigs, { id, venue: '', playedAt: '', notes: '' }];
    onUpdateGigs(savedSet.id, next);
    setEditingId(id);
  };
  const patchGig = (id, patch) => {
    const next = gigs.map(g => g.id === id ? { ...g, ...patch } : g);
    onUpdateGigs(savedSet.id, next);
  };
  const deleteGig = (id) => {
    if (!confirm('Remove this gig entry?')) return;
    onUpdateGigs(savedSet.id, gigs.filter(g => g.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>
            Gig history
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--dim)', marginTop: 2,
          }}>
            {gigs.length === 0 ? 'Not played yet' :
              `${gigs.length} ${gigs.length === 1 ? 'time' : 'times'} played`}
          </div>
        </div>
        <button onClick={addGig} style={{
          padding: '8px 14px', borderRadius: 6,
          background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        }}>+ Add gig</button>
      </div>

      {gigs.length === 0 ? (
        <div style={{
          padding: 20, borderRadius: 8,
          border: '1px dashed var(--border)', textAlign: 'center',
          color: 'var(--dim)', fontSize: 12,
        }}>
          Log the first time you play this set — venue, date, how it went.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(g => (
            <GigEntry key={g.id} gig={g}
              editing={editingId === g.id}
              onEdit={() => setEditingId(g.id)}
              onDone={() => setEditingId(null)}
              onPatch={(patch) => patchGig(g.id, patch)}
              onDelete={() => deleteGig(g.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function GigEntry({ gig, editing, onEdit, onDone, onPatch, onDelete }) {
  const { venue, playedAt, notes } = gig;
  const hasAny = venue || playedAt || notes;

  return (
    <div style={{
      padding: 14, borderRadius: 8,
      border: '1px solid var(--border)',
      background: editing ? 'var(--hover)' : 'transparent',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: editing ? 10 : (hasAny ? 6 : 0),
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700,
          letterSpacing: 0.3,
        }}>
          {playedAt
            ? new Date(playedAt).toLocaleDateString(undefined, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })
            : (editing ? 'New gig' : 'Undated gig')}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={editing ? onDone : onEdit} style={gigMicroBtn}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button onClick={onDelete} style={{ ...gigMicroBtn, color: 'oklch(0.65 0.2 20)' }}>
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={gigLbl}>
            <span style={gigLblText}>Venue</span>
            <input value={venue} onChange={e => onPatch({ venue: e.target.value })}
              placeholder="e.g. Warehouse, Berlin" style={gigInput} />
          </label>
          <label style={gigLbl}>
            <span style={gigLblText}>Date</span>
            <input type="date" value={playedAt}
              onChange={e => onPatch({ playedAt: e.target.value })} style={gigInput} />
          </label>
          <label style={{ ...gigLbl, gridColumn: '1 / -1' }}>
            <span style={gigLblText}>Notes</span>
            <textarea value={notes} onChange={e => onPatch({ notes: e.target.value })}
              placeholder="How did it go? Favorite transitions, crowd reactions…"
              rows={3} style={{ ...gigInput, resize: 'vertical', minHeight: 60 }} />
          </label>
        </div>
      ) : hasAny ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline' }}>
          {venue && (
            <div>
              <div style={gigLblText}>Venue</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{venue}</div>
            </div>
          )}
          {notes && (
            <div style={{ flexBasis: '100%' }}>
              <div style={gigLblText}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {notes}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>
          No details yet — tap Edit to fill in.
        </div>
      )}
    </div>
  );
}

const gigMicroBtn = {
  padding: '4px 8px', borderRadius: 4,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--fg)', cursor: 'pointer',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
};

const gigLbl = { display: 'flex', flexDirection: 'column', gap: 4 };
const gigLblText = {
  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.2,
  textTransform: 'uppercase', color: 'var(--dim)',
};
const gigInput = {
  padding: '8px 10px', borderRadius: 6,
  background: 'var(--bg)', border: '1px solid var(--border)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};

Object.assign(window, { TrackRating, SetTimeline, Dashboard, GigMode, SavedSetPage, GigRecord });
