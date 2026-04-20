// Record cover — uses `imageUrl` (e.g. Discogs) when provided, else procedural SVG
function RecordCover({ hue = 30, shape = 'stripes', title = '', artist = '', size = 220, style = {}, imageUrl = null }) {
  if (imageUrl) {
    return (
      <div style={{
        width: size, height: size, position: 'relative', overflow: 'hidden',
        flexShrink: 0, background: '#0E0C0A', ...style,
      }}>
        <img src={imageUrl} alt={`${artist} — ${title}`} referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)',
          pointerEvents: 'none',
        }} />
      </div>
    );
  }
  const bg = `oklch(0.62 0.18 ${hue})`;
  const fg = `oklch(0.18 0.04 ${hue})`;
  const accent = `oklch(0.92 0.12 ${(hue + 180) % 360})`;

  const patternId = `pat-${hue}-${shape}-${Math.floor(Math.random() * 100000)}`;

  let pattern = null;
  if (shape === 'stripes') {
    pattern = (
      <g>
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={i * 22} y={0} width={10} height={size} fill={fg} opacity={0.15 + (i % 3) * 0.1} />
        ))}
      </g>
    );
  } else if (shape === 'circles') {
    pattern = (
      <g>
        <circle cx={size * 0.35} cy={size * 0.4} r={size * 0.3} fill="none" stroke={fg} strokeWidth={3} />
        <circle cx={size * 0.35} cy={size * 0.4} r={size * 0.2} fill="none" stroke={fg} strokeWidth={3} />
        <circle cx={size * 0.35} cy={size * 0.4} r={size * 0.1} fill={accent} />
        <circle cx={size * 0.75} cy={size * 0.75} r={size * 0.15} fill={fg} />
      </g>
    );
  } else if (shape === 'grid') {
    pattern = (
      <g>
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 8 }).map((_, j) => (
            <rect key={`${i}-${j}`} x={i * (size / 8)} y={j * (size / 8)} width={size / 8 - 2} height={size / 8 - 2}
              fill={(i + j) % 3 === 0 ? accent : fg} opacity={(i + j) % 2 === 0 ? 0.6 : 0.2} />
          ))
        )}
      </g>
    );
  } else if (shape === 'halftone') {
    pattern = (
      <g>
        {Array.from({ length: 12 }).map((_, i) =>
          Array.from({ length: 12 }).map((_, j) => {
            const d = Math.sqrt((i - 6) ** 2 + (j - 6) ** 2);
            const r = Math.max(0.5, 6 - d * 0.7);
            return <circle key={`${i}-${j}`} cx={i * (size / 12) + size / 24} cy={j * (size / 12) + size / 24} r={r} fill={fg} />;
          })
        )}
      </g>
    );
  } else if (shape === 'waves') {
    pattern = (
      <g>
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={i}
            d={`M0 ${30 + i * 35} Q ${size * 0.25} ${10 + i * 35}, ${size * 0.5} ${30 + i * 35} T ${size} ${30 + i * 35}`}
            fill="none" stroke={fg} strokeWidth={4} opacity={0.4 + i * 0.08} />
        ))}
      </g>
    );
  }

  return (
    <div style={{
      width: size, height: size, background: bg, position: 'relative', overflow: 'hidden',
      flexShrink: 0, ...style,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        {pattern}
      </svg>
      {/* tiny type overlay */}
      <div style={{
        position: 'absolute', left: 8, right: 8, bottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 4, pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 7, color: fg, letterSpacing: 0.5, textTransform: 'uppercase',
          lineHeight: 1.1, maxWidth: '70%',
        }}>
          <div style={{ opacity: 0.8 }}>{artist}</div>
          <div style={{ fontWeight: 700 }}>{title}</div>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: fg,
          opacity: 0.7, whiteSpace: 'nowrap',
        }}>LP/{String(hue).padStart(3, '0')}</div>
      </div>
      {/* subtle sheen */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// Vinyl disc visual
function VinylDisc({ hue = 30, size = 220, peek = 0.3, style = {} }) {
  const label = `oklch(0.62 0.18 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#0A0907',
      position: 'relative', flexShrink: 0,
      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), 0 4px 20px rgba(0,0,0,0.5)',
      ...style,
    }}>
      {/* grooves */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 12 + i * 8, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.04)',
        }} />
      ))}
      {/* center label */}
      <div style={{
        position: 'absolute', inset: '35%', borderRadius: '50%', background: label,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%', background: '#0A0907',
        }} />
      </div>
      {/* reflection */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(130deg, rgba(255,255,255,0.08) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.04) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

Object.assign(window, { RecordCover, VinylDisc });
