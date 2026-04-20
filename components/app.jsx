// Main app shell

function CollectorStudio({ tweaks, setTweaks }) {
  const [isPhone, setIsPhone] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const handler = (e) => setIsPhone(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const [view, setView] = React.useState('collection'); // collection | set | sets | dashboard
  const [viewingSetId, setViewingSetId] = React.useState(null);
  const [gigMode, setGigMode] = React.useState(false);
  const [gigResolved, setGigResolved] = React.useState(null); // optional override; null = use current set
  const [timelineView, setTimelineView] = React.useState(false);
  const [viewStyle, setViewStyle] = React.useState(tweaks.viewStyle || 'grid');
  const [selected, setSelected] = React.useState(null);
  // Set is an array of track IDs like "r01-2" — persisted to localStorage
  const [set, setSet] = React.useState(() => {
    const saved = localStorage.getItem('cs-set');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return ['r02-0', 'r02-1', 'r04-0', 'r06-2', 'r12-0', 'r09-3'];
  });
  // Records are persisted too, so Discogs imports and manual edits survive reloads
  const [records, setRecords] = React.useState(() => {
    const saved = localStorage.getItem('cs-records');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return window.RECORDS;
  });
  const [search, setSearch] = React.useState('');
  const [genreFilter, setGenreFilter] = React.useState('All');
  const [advFilters, setAdvFilters] = React.useState({
    key: 'All', bpmMin: null, bpmMax: null, yearMin: null, yearMax: null, onlyInSet: false,
  });
  const [crates, setCrates] = React.useState(() => {
    const saved = localStorage.getItem('cs-crates');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
  });
  const [activeCrateId, setActiveCrateId] = React.useState(null);
  React.useEffect(() => { localStorage.setItem('cs-crates', JSON.stringify(crates)); }, [crates]);

  const [savedSets, setSavedSets] = React.useState(() => {
    const saved = localStorage.getItem('cs-saved-sets');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
  });
  const [activeSetId, setActiveSetId] = React.useState(null);
  const [currentSetName, setCurrentSetName] = React.useState(() => localStorage.getItem('cs-current-name') || '');
  React.useEffect(() => { localStorage.setItem('cs-saved-sets', JSON.stringify(savedSets)); }, [savedSets]);
  React.useEffect(() => { localStorage.setItem('cs-current-name', currentSetName); }, [currentSetName]);

  // Un-highlight active saved set if the current set has diverged
  React.useEffect(() => {
    if (!activeSetId) return;
    const saved = savedSets.find(s => s.id === activeSetId);
    if (!saved) return;
    const same = saved.trackIds.length === set.length &&
      saved.trackIds.every((t, i) => t === set[i]);
    if (!same) setActiveSetId(null);
  }, [set, activeSetId, savedSets]);

  const saveCurrentSet = (name) => {
    const finalName = (name || currentSetName || '').trim() || `Set ${new Date().toLocaleDateString()}`;
    // If the active set id is still current, update in place instead of duplicating
    if (activeSetId && savedSets.some(s => s.id === activeSetId)) {
      setSavedSets(ss => ss.map(s => s.id === activeSetId
        ? { ...s, name: finalName, trackIds: [...set] } : s));
    } else {
      const id = `s${Date.now()}`;
      setSavedSets(ss => [...ss, { id, name: finalName, trackIds: [...set], createdAt: Date.now() }]);
    }
    // Reset the builder for a fresh new set
    setSet([]);
    setActiveSetId(null);
    setCurrentSetName('');
  };
  const openSavedSet = (id) => {
    setViewingSetId(id);
    setView('sets');
  };
  const loadIntoBuilder = (id) => {
    const saved = savedSets.find(s => s.id === id);
    if (!saved) return;
    if (set.length > 0 && !confirm('Replace current builder set with "' + saved.name + '"?')) return;
    setSet(saved.trackIds);
    setActiveSetId(id);
    setCurrentSetName(saved.name);
    setView('set');
  };
  const deleteSavedSet = (id) => {
    setSavedSets(ss => ss.filter(s => s.id !== id));
    if (activeSetId === id) setActiveSetId(null);
    if (viewingSetId === id) { setViewingSetId(null); setView('collection'); }
  };
  const renameSavedSet = (id, name) => {
    setSavedSets(ss => ss.map(s => s.id === id ? { ...s, name } : s));
    if (activeSetId === id) setCurrentSetName(name);
  };
  const updateSavedSetTracks = (id, trackIds) => {
    setSavedSets(ss => ss.map(s => s.id === id ? { ...s, trackIds } : s));
    if (activeSetId === id) setSet(trackIds);
  };
  const updateSavedSetGigs = (id, gigs) => {
    setSavedSets(ss => ss.map(s => s.id === id ? { ...s, gigs } : s));
  };

  const newCrate = (name, firstRecordId) => {
    const id = `c${Date.now()}`;
    setCrates(cs => [...cs, { id, name, recordIds: firstRecordId ? [firstRecordId] : [] }]);
    return id;
  };
  const deleteCrate = (id) => {
    setCrates(cs => cs.filter(c => c.id !== id));
    if (activeCrateId === id) setActiveCrateId(null);
  };
  const addToCrate = (crateId, recordId) => {
    setCrates(cs => cs.map(c => c.id === crateId
      ? { ...c, recordIds: c.recordIds.includes(recordId) ? c.recordIds : [...c.recordIds, recordId] }
      : c));
  };
  const removeFromCrate = (crateId, recordId) => {
    setCrates(cs => cs.map(c => c.id === crateId
      ? { ...c, recordIds: c.recordIds.filter(r => r !== recordId) } : c));
  };
  const [swipeIndex, setSwipeIndex] = React.useState(0);
  const [mobileOpen, setMobileOpen] = React.useState(true);
  const [importOpen, setImportOpen] = React.useState(false);
  const [analyzeOpen, setAnalyzeOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // record being edited or null for new

  const handleDiscogsImport = (imported) => {
    setRecords(cur => {
      const byId = new Map(cur.map(r => [r.id, r]));
      for (const r of imported) byId.set(r.id, { ...byId.get(r.id), ...r });
      return Array.from(byId.values());
    });
  };

  const openNewRecord = () => { setEditing(null); setFormOpen(true); };
  const openEditRecord = (r) => { setEditing(r); setFormOpen(true); };
  const saveRecord = (rec) => {
    setRecords(cur => {
      const i = cur.findIndex(r => r.id === rec.id);
      if (i >= 0) { const next = [...cur]; next[i] = rec; return next; }
      return [rec, ...cur];
    });
    // If we just edited the record currently open in the detail drawer, refresh it
    if (selected && selected.id === rec.id) setSelected(rec);
  };
  const applyAnalysis = (updates) => {
    setRecords(cur => cur.map(r => {
      const ups = updates[r.id];
      if (!ups?.length) return r;
      const tracks = r.tracks.map((t, i) => {
        const u = ups.find(x => x.trackIndex === i);
        if (!u) return t;
        return { ...t, bpm: u.bpm ?? t.bpm, key: u.key ?? t.key };
      });
      const bpms = tracks.map(t => t.bpm).filter(b => b != null);
      const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : r.bpm;
      const firstKey = tracks.find(t => t.key)?.key || r.key;
      return { ...r, tracks, bpm: r.bpm ?? avgBpm, key: r.key || firstKey };
    }));
  };

  const rateTrack = (recordId, trackIndex, rating) => {
    setRecords(cur => cur.map(r => {
      if (r.id !== recordId) return r;
      const tracks = r.tracks.map((t, i) => i === trackIndex ? { ...t, rating } : t);
      return { ...r, tracks };
    }));
    if (selected && selected.id === recordId) {
      setSelected(s => ({ ...s, tracks: s.tracks.map((t, i) =>
        i === trackIndex ? { ...t, rating } : t) }));
    }
  };

  const deleteRecord = (id) => {
    setRecords(cur => cur.filter(r => r.id !== id));
    setSet(s => s.filter(tid => !tid.startsWith(`${id}-`)));
    if (selected?.id === id) setSelected(null);
  };

  React.useEffect(() => { setViewStyle(tweaks.viewStyle); }, [tweaks.viewStyle]);
  React.useEffect(() => { localStorage.setItem('cs-set', JSON.stringify(set)); }, [set]);
  React.useEffect(() => {
    localStorage.setItem('cs-records', JSON.stringify(records));
    window.RECORDS = records; // keep global in sync for parseTrackId
  }, [records]);
  const isTrackInSet = (tid) => set.includes(tid);
  // Record has "some" track in set
  const recordInSet = (rid) => {
    const rec = records.find(r => r.id === rid);
    if (!rec) return false;
    return rec.tracks.some((_, i) => set.includes(`${rid}-${i}`));
  };
  // Toggle single track
  const toggleTrack = (record, trackIdx) => {
    const tid = `${record.id}-${trackIdx}`;
    setSet(s => s.includes(tid) ? s.filter(x => x !== tid) : [...s, tid]);
  };
  // Toggle all tracks of a record (used by grid/list record-level + button, and "add all" in detail)
  const toggleAllTracks = (record) => {
    const allIds = record.tracks.map((_, i) => `${record.id}-${i}`);
    const allIn = allIds.every(tid => set.includes(tid));
    if (allIn) setSet(s => s.filter(x => !allIds.includes(x)));
    else setSet(s => [...s, ...allIds.filter(tid => !s.includes(tid))]);
  };
  // Swipe right from set builder = open record (so user picks tracks)
  const openRecord = (record) => setSelected(record);
  const removeFromSet = (tid) => setSet(s => s.filter(x => x !== tid));
  const reorder = (from, to) => setSet(s => {
    const next = [...s]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next;
  });

  const filtered = applyFilters(records, {
    search, genre: genreFilter,
    key: advFilters.key, bpmMin: advFilters.bpmMin, bpmMax: advFilters.bpmMax,
    yearMin: advFilters.yearMin, yearMax: advFilters.yearMax,
    onlyInSet: advFilters.onlyInSet, set,
  });
  const availableGenres = ['All', ...new Set(records.map(r => r.genre).filter(Boolean))].sort();

  if (isPhone) {
    return (
      <div className={`app ${tweaks.theme}`} style={{
        height: '100dvh', width: '100vw', overflow: 'hidden',
        background: 'var(--bg)', color: 'var(--fg)',
      }}>
        <MobileApp records={records} set={set} crates={crates} savedSets={savedSets}
          currentSetName={currentSetName} setCurrentSetName={setCurrentSetName}
          onSaveSet={saveCurrentSet}
          onToggleTrack={toggleTrack}
          onRemoveFromSet={removeFromSet}
          onClearSet={() => setSet([])}
          onLoadSavedSet={(id) => { const s = savedSets.find(x => x.id === id); if (s) { setSet(s.trackIds); setActiveSetId(id); setCurrentSetName(s.name); } }}
          darkMode={tweaks.theme === 'dark'} accent={ACCENTS[tweaks.accent] || tweaks.accent} />
      </div>
    );
  }

  return (
    <div className={`app ${tweaks.theme}`} style={{
      display: 'grid',
      gridTemplateColumns: mobileOpen ? '220px 1fr 420px' : '220px 1fr',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--fg)',
      transition: 'grid-template-columns 0.3s cubic-bezier(0.2, 0, 0.2, 1)',
    }}>
      {/* Sidebar */}
      <Sidebar view={view} setView={setView} set={set} records={records}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
        onOpenImport={() => setImportOpen(true)}
        onAddRecord={openNewRecord}
        onAnalyze={() => setAnalyzeOpen(true)}
        crates={crates} activeCrateId={activeCrateId} setActiveCrateId={setActiveCrateId}
        onNewCrate={newCrate} onDeleteCrate={deleteCrate}
        savedSets={savedSets} activeSetId={activeSetId} viewingSetId={viewingSetId}
        onSaveSet={saveCurrentSet} onOpenSet={openSavedSet} onDeleteSet={deleteSavedSet} />

      {/* Main */}
      <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TopBar view={view} setView={setView}
          search={search} setSearch={setSearch}
          viewStyle={viewStyle} setViewStyle={setViewStyle}
          genreFilter={genreFilter} setGenreFilter={setGenreFilter}
          availableGenres={availableGenres}
          advFilters={advFilters} setAdvFilters={setAdvFilters}
          records={records}
          count={filtered.length} total={records.length}
          density={tweaks.density} setDensity={d => setTweaks({ ...tweaks, density: d })} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 80px' }}>
          {view === 'collection' && (
            <>
              {viewStyle === 'grid' && <CollectionGrid records={filtered} onSelect={setSelected}
                onAddToSet={toggleAllTracks} inSet={recordInSet} density={tweaks.density}
                showOverlays={tweaks.showOverlays} />}
              {viewStyle === 'list' && <CollectionList records={filtered} onSelect={setSelected}
                onAddToSet={toggleAllTracks} inSet={recordInSet} density={tweaks.density}
                showOverlays={tweaks.showOverlays} />}
              {viewStyle === 'stack' && <CollectionStack records={filtered} onSelect={setSelected}
                onAddToSet={toggleAllTracks} inSet={recordInSet} density={tweaks.density}
                showOverlays={tweaks.showOverlays} />}
            </>
          )}
          {view === 'set' && (
            <SetBuilder set={set} records={records}
              onRemove={removeFromSet} onReorder={reorder}
              onClear={() => setSet([])}
              onSwipe={openRecord}
              onAddTrack={toggleTrack}
              onSaveSet={saveCurrentSet}
              setName={currentSetName} onSetNameChange={setCurrentSetName}
              activeSetName={savedSets.find(s => s.id === activeSetId)?.name}
              onLaunchGig={() => setGigMode(true)}
              timelineView={timelineView} onToggleTimeline={() => setTimelineView(v => !v)}
              swipeIndex={swipeIndex} setSwipeIndex={setSwipeIndex} />
          )}
          {view === 'dashboard' && (
            <Dashboard records={records} set={set} />
          )}
          {view === 'crates' && (
            <CratesPage crates={crates} records={records}
              activeCrateId={activeCrateId} setActiveCrateId={setActiveCrateId}
              onSelect={setSelected}
              onDeleteCrate={deleteCrate}
              onRemoveFromCrate={removeFromCrate}
              onNewCrate={newCrate}
              onAddToSet={toggleAllTracks} inSet={recordInSet}
              density={tweaks.density} showOverlays={tweaks.showOverlays}
              onBrowseCollection={() => setView('collection')} />
          )}
          {view === 'sets' && (
            <SavedSetPage savedSet={savedSets.find(s => s.id === viewingSetId)}
              records={records}
              onRename={renameSavedSet}
              onUpdateTracks={updateSavedSetTracks}
              onUpdateGigs={updateSavedSetGigs}
              onDelete={deleteSavedSet}
              onLoadToBuilder={loadIntoBuilder}
              onLaunchGig={(resolved) => { setGigResolved(resolved); setGigMode(true); }} />
          )}
        </div>

        {selected && (
          <RecordDetail record={selected} onClose={() => setSelected(null)}
            onAddTrack={toggleTrack} isTrackInSet={isTrackInSet}
            onAddAllTracks={toggleAllTracks} allRecords={records}
            onEdit={() => openEditRecord(selected)}
            crates={crates} onAddToCrate={addToCrate} onRemoveFromCrate={removeFromCrate}
            onNewCrate={newCrate}
            onRateTrack={rateTrack} />
        )}
      </div>

      {/* Mobile companion */}
      {mobileOpen && (
        <div style={{
          background: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)',
          padding: '20px 20px 28px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            width: '100%', marginBottom: 14,
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
              textTransform: 'uppercase', color: 'var(--dim)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
              Gig companion · Live
            </div>
            <button onClick={() => setMobileOpen(false)} style={{
              width: 22, height: 22, borderRadius: 11, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--dim)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>{Icon.X}</button>
          </div>
          <IOSDevice width={340} height={720} dark={tweaks.theme === 'dark'}>
            <MobileApp records={records} set={set} crates={crates} savedSets={savedSets}
              currentSetName={currentSetName} setCurrentSetName={setCurrentSetName}
              onSaveSet={saveCurrentSet}
              onToggleTrack={toggleTrack}
              onRemoveFromSet={removeFromSet}
              onClearSet={() => setSet([])}
              onLoadSavedSet={(id) => { const s = savedSets.find(x => x.id === id); if (s) { setSet(s.trackIds); setActiveSetId(id); setCurrentSetName(s.name); } }}
              darkMode={tweaks.theme === 'dark'} accent={ACCENTS[tweaks.accent] || tweaks.accent} />
          </IOSDevice>
        </div>
      )}

      {!mobileOpen && (
        <button onClick={() => setMobileOpen(true)} style={{
          position: 'absolute', right: 20, bottom: 20,
          padding: '10px 16px', borderRadius: 999,
          background: 'var(--accent)', color: 'var(--on-accent)',
          border: 'none', fontSize: 11, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 30,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>{Icon.Mobile} Phone preview</button>
      )}

      <DiscogsImportModal open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleDiscogsImport} />

      <RecordFormModal open={formOpen} initial={editing}
        onClose={() => setFormOpen(false)}
        onSave={saveRecord} onDelete={deleteRecord} />

      <AnalyzeModal open={analyzeOpen} records={records}
        onClose={() => setAnalyzeOpen(false)}
        onApply={applyAnalysis} />

      {gigMode && (() => {
        const resolved = gigResolved || set.map(tid => {
          const p = window.parseTrackId(tid);
          return p ? { tid, ...p } : null;
        }).filter(Boolean);
        return <GigMode resolved={resolved}
          onClose={() => { setGigMode(false); setGigResolved(null); }} />;
      })()}
    </div>
  );
}

function Sidebar({ view, setView, set, records, mobileOpen, setMobileOpen, onOpenImport, onAddRecord, onAnalyze, crates, activeCrateId, setActiveCrateId, onNewCrate, onDeleteCrate, savedSets, activeSetId, viewingSetId, onSaveSet, onOpenSet, onDeleteSet }) {
  const stats = {
    total: records.length,
    genres: new Set(records.map(r => r.genre)).size,
    value: records.reduce((s, r) => s + r.value, 0),
  };

  return (
    <aside style={{
      background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Wordmark */}
      <div style={{ marginBottom: 26 }}>
        <div style={{
          fontSize: 22, fontWeight: 800, letterSpacing: -0.8, lineHeight: 0.95,
        }}>
          Collector<br /><span style={{ color: 'var(--accent)' }}>Studio</span><span style={{ color: 'var(--accent)' }}>.</span>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)', marginTop: 6,
        }}>For vinyl DJs · v0.4</div>
      </div>

      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
        textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8, padding: '0 6px',
      }}>Workspace</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
        <NavItem icon={Icon.Dig} label="Collection"
          active={view === 'collection'} onClick={() => setView('collection')}
          badge={records.length} />
        <NavItem icon={Icon.Heart} label="Crates"
          active={view === 'crates'} onClick={() => { setActiveCrateId(null); setView('crates'); }}
          badge={crates.length > 0 ? crates.length : null} />
        <NavItem icon={Icon.Deck} label="Set Builder"
          active={view === 'set'} onClick={() => setView('set')}
          badge={set.length > 0 ? set.length : null} accent={set.length > 0} />
        <NavItem icon={Icon.Grid} label="Dashboard"
          active={view === 'dashboard'} onClick={() => setView('dashboard')} />
      </nav>

      <SavedSetsList savedSets={savedSets} currentSet={set}
        activeSetId={activeSetId} viewingSetId={view === 'sets' ? viewingSetId : null}
        onSave={onSaveSet} onOpen={onOpenSet} onDelete={onDeleteSet} />

      <div style={{ flex: 1 }} />

      {/* Add / Import buttons */}
      <button onClick={onAddRecord} style={{
        marginBottom: 6, padding: '10px 12px',
        background: 'var(--accent)', color: 'var(--on-accent)',
        border: 'none', borderRadius: 8,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        letterSpacing: 0.3,
      }}>
        {Icon.Plus}
        <span style={{ flex: 1 }}>Add record</span>
      </button>
      <button onClick={onOpenImport} style={{
        marginBottom: 10, padding: '10px 12px',
        background: 'transparent', color: 'var(--fg)',
        border: '1px dashed var(--border)', borderRadius: 8,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg)'; }}>
        {Icon.Discogs}
        <span style={{ flex: 1 }}>Import from Discogs</span>
      </button>
      <button onClick={onAnalyze} style={{
        marginBottom: 10, padding: '10px 12px',
        background: 'transparent', color: 'var(--fg)',
        border: '1px dashed var(--border)', borderRadius: 8,
        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg)'; }}>
        <span style={{ fontSize: 14 }}>♫</span>
        <span style={{ flex: 1 }}>Match BPM &amp; key</span>
      </button>

      {/* Collection stats */}
      <div style={{
        padding: 12, borderRadius: 8, background: 'var(--hover)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 8,
        }}>Collection</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{stats.total}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)' }}>Records</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{stats.genres}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)' }}>Genres</div>
          </div>
        </div>
      </div>

      {/* API status */}
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <ApiStatus label="Discogs" ok />
        <ApiStatus label="Match BPM" ok />
      </div>

      {/* Attribution — required by GetSongBPM terms */}
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 0.5,
        color: 'var(--dim)', lineHeight: 1.5,
      }}>
        Tempo &amp; key via{' '}
        <a href="https://getsongbpm.com" target="_blank" rel="noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>GetSongBPM.com</a>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick, badge, muted, accent }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 6, border: 'none',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--on-accent)' : (muted ? 'var(--dim)' : 'var(--fg)'),
      cursor: 'pointer', width: '100%',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      textAlign: 'left', transition: 'all 0.1s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {icon}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge != null && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          background: active ? 'rgba(0,0,0,0.15)' : (accent ? 'var(--accent)' : 'var(--border)'),
          color: active ? 'var(--on-accent)' : (accent ? 'var(--on-accent)' : 'var(--fg)'),
        }}>{badge}</span>
      )}
    </button>
  );
}

function ApiStatus({ label, ok }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 8px', borderRadius: 4,
      border: '1px solid var(--border)',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      letterSpacing: 0.8, textTransform: 'uppercase',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? 'oklch(0.75 0.18 145)' : 'oklch(0.65 0.2 20)',
        boxShadow: ok ? '0 0 6px oklch(0.75 0.18 145)' : 'none',
      }} />
      {label}
    </div>
  );
}

function TopBar({ view, search, setSearch, viewStyle, setViewStyle, genreFilter, setGenreFilter, availableGenres, advFilters, setAdvFilters, records, count, total, density, setDensity }) {
  return (
    <div style={{
      padding: '20px 32px 14px', borderBottom: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
        <div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: 1.5,
            textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 4,
          }}>{
            view === 'collection' ? 'Your shelves' :
            view === 'crates' ? 'Curated groups' :
            view === 'set' ? 'Build a set' :
            view === 'sets' ? 'Saved sets' :
            view === 'dashboard' ? 'Collection health' : ''
          }</div>
          <h1 style={{
            margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1,
          }}>
            {view === 'collection' && <>Collection<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'crates' && <>Crates<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'set' && <>Set builder<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'sets' && <>Your sets<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'dashboard' && <>Dashboard<span style={{ color: 'var(--accent)' }}>.</span></>}
          </h1>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--dim)',
          letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'right',
        }}>
          {view === 'collection' && <>Showing <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{count}</span> / {total}</>}
          {view === 'crates' && <>Organize records into named groups</>}
          {view === 'set' && <>Swipe right to add · swipe left to skip</>}
          {view === 'sets' && <>Pick a set from the sidebar</>}
          {view === 'dashboard' && <>Everything at a glance</>}
        </div>
      </div>

      {view === 'collection' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--hover)', border: '1px solid var(--border)',
            maxWidth: 320,
          }}>
            <span style={{ color: 'var(--dim)' }}>{Icon.Search}</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, artist, label…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit',
              }} />
          </div>

          {/* Genre filter chips (dynamic from data) */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
            {availableGenres.map(g => (
              <Tag key={g} onClick={() => setGenreFilter(g)} active={genreFilter === g} size="sm">{g}</Tag>
            ))}
          </div>

          {/* Advanced filter popover */}
          <FilterPopover filters={advFilters} setFilters={setAdvFilters} records={records} />

          {/* View style */}
          <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border)', borderRadius: 6, padding: 3 }}>
            {[
              { id: 'grid', icon: Icon.Grid },
              { id: 'list', icon: Icon.List },
              { id: 'stack', icon: Icon.Stack },
            ].map(v => (
              <button key={v.id} onClick={() => setViewStyle(v.id)} style={{
                width: 28, height: 24, border: 'none', borderRadius: 4,
                background: viewStyle === v.id ? 'var(--accent)' : 'transparent',
                color: viewStyle === v.id ? 'var(--on-accent)' : 'var(--fg)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{v.icon}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { CollectorStudio });
