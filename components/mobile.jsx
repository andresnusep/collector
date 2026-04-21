// Mobile companion — gig-ready quick reference

function MobileApp({ records, set, crates, savedSets, currentSetName, setCurrentSetName,
                     onSaveSet, onToggleTrack, onRemoveFromSet, onClearSet, onLoadSavedSet,
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
        }}>Collector Studio</div>
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
              records={records} savedSets={savedSets || []} />
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
          onSaveSet={onSaveSet} onRemoveFromSet={onRemoveFromSet} onClearSet={onClearSet}
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

      {/* Tab bar */}
      <div style={{
        flexShrink: 0, display: 'flex',
        padding: '6px 6px calc(8px + env(safe-area-inset-bottom))',
        borderTop: `1px solid ${border}`, background: bg,
      }}>
        {[
          { id: 'lib', label: 'Library', icon: Icon.Dig },
          { id: 'crates', label: 'Crates', icon: Icon.Heart },
          { id: 'set', label: 'Sets', icon: Icon.Deck },
          { id: 'now', label: 'Gig', icon: Icon.Disc },
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

// ─────────── Now (gig mode) ───────────

function MobileNow({ current, nextUp, queueLen, position, onNext, onPrev,
                    savedSets, selectedSetId, setSelectedSetId, activeSetLabel,
                    accent, fg, bg, soft, border }) {
  if (!current) return null;
  const r = current.record, t = current.track;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 18px', overflowY: 'auto' }}>
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

      {/* Current track — medium cover, huge BPM/Key */}
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14,
      }}>
        <RecordCover hue={r.cover.hue} shape={r.cover.shape} imageUrl={r.cover.image}
          title={r.title} artist={r.artist} size={120}
          style={{ width: 120, height: 120, borderRadius: 6,
            boxShadow: '0 12px 28px rgba(0,0,0,0.35)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.15,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{t.title}</div>
          <div style={{
            fontSize: 11, opacity: 0.6, marginTop: 3,
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{r.artist}</div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18,
      }}>
        <BigStat label="BPM" value={t.bpm ?? '—'} accent={accent} />
        <BigStat label="Key" value={t.key ?? '—'} accent={accent} small />
      </div>

      {/* Up next — prominent */}
      {nextUp && nextUp !== current && (
        <>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
            textTransform: 'uppercase', opacity: 0.55, marginBottom: 8,
          }}>Up next</div>
          <div style={{
            display: 'flex', gap: 12, alignItems: 'center', padding: 12,
            borderRadius: 10, background: soft, border: `1px solid ${border}`,
            marginBottom: 14,
          }}>
            <RecordCover hue={nextUp.record.cover.hue} shape={nextUp.record.cover.shape}
              imageUrl={nextUp.record.cover.image}
              title={nextUp.record.title} artist={nextUp.record.artist} size={56}
              style={{ width: 56, height: 56, borderRadius: 4, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextUp.track.title}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextUp.record.artist}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace',
                fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1 }}>
                {nextUp.track.bpm ?? '—'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {nextUp.track.key ?? '—'}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
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
    </div>
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

function SetTrackRow({ item, i, accent, soft, fg, border, onRemove }) {
  const r = item.record, t = item.track;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: 10,
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
                             onSaveSet, onRemoveFromSet, onClearSet, onGoBrowse,
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
              onRemove={() => onRemoveFromSet(item.tid)} />
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
  const open = crates.find(c => c.id === openCrateId);

  if (open) {
    const openRecs = open.recordIds
      .map(id => records.find(r => r.id === id)).filter(Boolean);
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
          textTransform: 'uppercase', opacity: 0.55, marginBottom: 14,
        }}>{openRecs.length} records</div>
        <MobileRecordGrid records={openRecs} accent={accent} fg={fg} border={border}
          setTrackIds={setTrackIds} onToggleTrack={onToggleTrack} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginBottom: 4 }}>Crates</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 14,
      }}>{crates.length} groups</div>

      {crates.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center', borderRadius: 10,
          border: `1px dashed ${border}`, opacity: 0.7, fontSize: 12,
        }}>
          No crates yet. Create one from the desktop.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
          {crates.map(c => {
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
  const q = search.trim().toLowerCase();
  const filtered = q ? records.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.artist.toLowerCase().includes(q) ||
    (r.label || '').toLowerCase().includes(q)
  ) : records;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, marginBottom: 4 }}>Library</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1,
        textTransform: 'uppercase', opacity: 0.55, marginBottom: 10,
      }}>{filtered.length} / {records.length} records</div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8, background: soft,
        border: `1px solid ${border}`, marginBottom: 12,
      }}>
        <span style={{ opacity: 0.5, fontSize: 12 }}>⌕</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search title, artist, label…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: fg, fontSize: 12, fontFamily: 'inherit',
          }} />
      </div>

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

Object.assign(window, { MobileApp });
