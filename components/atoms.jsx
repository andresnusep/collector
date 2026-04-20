// Shared atoms & helpers for Collector Studio

function Tag({ children, color, onClick, active = false, size = 'md' }) {
  const pad = size === 'sm' ? '3px 8px' : '5px 12px';
  const fs = size === 'sm' ? 10 : 11;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 999,
      fontFamily: 'JetBrains Mono, monospace', fontSize: fs, fontWeight: 500,
      letterSpacing: 0.5, textTransform: 'uppercase',
      background: active ? (color || 'var(--accent)') : 'transparent',
      color: active ? 'var(--on-accent)' : (color || 'var(--fg)'),
      border: `1px solid ${active ? (color || 'var(--accent)') : 'var(--border)'}`,
      cursor: onClick ? 'pointer' : 'default',
      whiteSpace: 'nowrap',
      transition: 'all 0.15s ease',
    }}>{children}</span>
  );
}

function KeyBadge({ k, size = 14 }) {
  const isMinor = k && k.endsWith('A');
  const empty = !k;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: size * 2, height: size * 1.6,
      padding: '0 6px',
      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
      fontSize: size * 0.8, letterSpacing: 0.5,
      borderRadius: 4,
      background: empty ? 'var(--border)' : (isMinor ? 'oklch(0.72 0.16 55)' : 'oklch(0.72 0.14 210)'),
      color: empty ? 'var(--dim)' : '#0E0C0A',
    }}>{k || '—'}</span>
  );
}

function BpmBadge({ bpm, size = 14 }) {
  const empty = bpm == null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 2,
      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
      fontSize: size, color: empty ? 'var(--dim)' : 'var(--fg)',
    }}>
      {empty ? '—' : bpm}<span style={{ fontSize: size * 0.5, opacity: 0.5, fontWeight: 400 }}>BPM</span>
    </span>
  );
}

function EnergyDots({ level, size = 6 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: i < level ? 'var(--accent)' : 'var(--border)',
        }} />
      ))}
    </span>
  );
}

function Waveform({ seed = 1, height = 40, width = 200, progress = 0, color }) {
  // Deterministic pseudo-random waveform
  const bars = 80;
  const data = React.useMemo(() => {
    let s = seed * 9301 + 49297;
    return Array.from({ length: bars }).map((_, i) => {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const envelope = Math.sin((i / bars) * Math.PI) * 0.6 + 0.4;
      return 0.3 + r * 0.7 * envelope;
    });
  }, [seed]);
  const c = color || 'var(--fg)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const x = (i / bars) * width;
        const h = v * height * 0.9;
        const played = i / bars < progress;
        return (
          <rect key={i} x={x} y={(height - h) / 2} width={width / bars - 1} height={h}
            fill={played ? 'var(--accent)' : c} opacity={played ? 1 : 0.35} />
        );
      })}
    </svg>
  );
}

function IconButton({ children, onClick, active = false, title, size = 32 }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: size, height: size, border: '1px solid var(--border)',
      borderRadius: size / 2, background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--on-accent)' : 'var(--fg)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0, flexShrink: 0,
      transition: 'all 0.15s ease',
    }}>{children}</button>
  );
}

// Lucide-style icons
const Icon = {
  Search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Play: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  Pause: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>,
  Plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  Check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  Grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  List: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>,
  Stack: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  X: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Drag: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>,
  Disc: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>,
  Deck: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="12" r="3"/><path d="M15 8h3M15 12h3M15 16h3"/></svg>,
  Dig: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 18l2-9h10l2 9M8 9V5a4 4 0 018 0v4"/></svg>,
  Share: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>,
  Heart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Spotify: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M7 10c3-1 7-1 10 1M7.5 13c2.5-0.8 5.5-0.8 8 0.7M8 15.8c2-0.6 4.5-0.6 6.5 0.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>,
  Discogs: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  Arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  Mobile: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>,
  User: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

Object.assign(window, { Tag, KeyBadge, BpmBadge, EnergyDots, Waveform, IconButton, Icon });
