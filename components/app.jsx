// Main app shell

function CollectorStudio({ tweaks, setTweaks, user, onSignOut }) {
  const [isPhone, setIsPhone] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    const handler = (e) => setIsPhone(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const [view, setView] = React.useState('collection'); // collection | set | sets | dashboard | calendar | profile
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
    return [];
  });
  // Records are persisted too, so Discogs imports and manual edits survive reloads
  const [records, setRecords] = React.useState(() => {
    const saved = localStorage.getItem('cs-records');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
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

  const [profile, setProfile] = React.useState(() => {
    const saved = localStorage.getItem('cs-profile');
    if (saved) { try { return window.migrateProfile(JSON.parse(saved)); } catch {} }
    const seed = window.migrateProfile(null);
    if (user) {
      seed.id = user.id;
      seed.name = user.user_metadata?.full_name || '';
      const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
      if (avatar) seed.photo = avatar;
    }
    return seed;
  });
  React.useEffect(() => { localStorage.setItem('cs-profile', JSON.stringify(profile)); }, [profile]);

  const [savedSets, setSavedSets] = React.useState(() => {
    const saved = localStorage.getItem('cs-saved-sets');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
  });
  // Calendar entity, decoupled from sets. Each gig:
  //   { id, playedAt, venue, location, setId?, notes, status, is_public }
  // is_public uses snake_case to match the SQL RLS policy path.
  const [gigs, setGigs] = React.useState(() => {
    const saved = localStorage.getItem('cs-gigs');
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return [];
  });
  React.useEffect(() => { localStorage.setItem('cs-gigs', JSON.stringify(gigs)); }, [gigs]);
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
  // Flip is_public on a saved set so it does/doesn't surface on the public
  // DJ profile. Snake_case key matches the SQL RLS path data->>'is_public'.
  const toggleSavedSetPublic = (id, isPublic) => {
    setSavedSets(ss => ss.map(s => s.id === id ? { ...s, is_public: !!isPublic } : s));
  };

  // Toggle a single track in a specific saved set. Used by the per-track
  // add menu in the album detail drawer.
  const toggleTrackInSavedSet = (setId, recordId, trackIndex) => {
    const tid = `${recordId}-${trackIndex}`;
    setSavedSets(ss => ss.map(s => {
      if (s.id !== setId) return s;
      const has = (s.trackIds || []).includes(tid);
      return { ...s, trackIds: has
        ? s.trackIds.filter(x => x !== tid)
        : [...(s.trackIds || []), tid] };
    }));
  };

  // Create a new saved set seeded with a single track. Used by "+ New set"
  // in the per-track add menu so DJs can spin up a set without leaving the
  // album view.
  const createSetWithTrack = (name, recordId, trackIndex) => {
    const tid = `${recordId}-${trackIndex}`;
    const finalName = (name || '').trim() || `Set ${new Date().toLocaleDateString()}`;
    const id = `s${Date.now()}`;
    setSavedSets(ss => [...ss, {
      id, name: finalName, trackIds: [tid], createdAt: Date.now(),
    }]);
    return id;
  };

  // Gig CRUD — operate on the new top-level gigs state. Phase 1's migration
  // already lifted nested saved_sets.gigs[] into here; from now on this is
  // the source of truth for the calendar.
  const addGig = (gig) => setGigs(gs => [...gs, gig]);
  const updateGig = (gig) => setGigs(gs => gs.map(g => g.id === gig.id ? gig : g));
  const deleteGig = (id) => setGigs(gs => gs.filter(g => g.id !== id));

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
  // Phone companion panel on the desktop view was removed — the phone version
  // is its own first-class view now (auto-swapped in by the isPhone branch).
  const [importOpen, setImportOpen] = React.useState(false);
  const [analyzeOpen, setAnalyzeOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null); // record being edited or null for new
  const [findDjsOpen, setFindDjsOpen] = React.useState(false);

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
  // Treat a track's `len` as "empty" if it's falsy or the "0:00" placeholder
  // that Discogs leaves when it has no duration data. Used by every place
  // that backfills duration so we don't clobber a Discogs-sourced real value.
  const isEmptyLen = (s) => !s || s === '0:00' || s === '0:0';

  const applyAnalysis = (updates) => {
    setRecords(cur => cur.map(r => {
      const ups = updates[r.id];
      if (!ups?.length) return r;
      const tracks = r.tracks.map((t, i) => {
        const u = ups.find(x => x.trackIndex === i);
        if (!u) return t;
        return {
          ...t,
          bpm: u.bpm ?? t.bpm,
          key: u.key ?? t.key,
          // Only backfill len when we have a fresh value AND the existing slot is empty.
          len: (u.len && isEmptyLen(t.len)) ? u.len : t.len,
        };
      });
      const bpms = tracks.map(t => t.bpm).filter(b => b != null);
      const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : r.bpm;
      const firstKey = tracks.find(t => t.key)?.key || r.key;
      return { ...r, tracks, bpm: r.bpm ?? avgBpm, key: r.key || firstKey };
    }));
  };

  // Per-track BPM/key refresh. Looks up the single track via the edge function
  // and applies the result through the same pipeline as bulk analysis. Also
  // backfills duration when the lookup returns a lengthMs (MB/AB/GSBPM all
  // provide it when available).
  const refreshTrackBpm = async (recordId, trackIndex) => {
    const rec = records.find(r => r.id === recordId);
    if (!rec) return null;
    const t = rec.tracks[trackIndex];
    if (!t) return null;
    const result = await window.lookupGetSongBpm(rec.artist, t.title || rec.title);
    if (!result) return null;
    const hasAny = result.bpm != null || result.key || result.len;
    if (!hasAny) return null;
    applyAnalysis({ [recordId]: [{ trackIndex,
      bpm: result.bpm, key: result.key, len: result.len }] });
    return result;
  };

  // Album-level BPM refresh. Walks every track that's missing BPM and calls
  // the per-track lookup sequentially with a 1.1s throttle to stay under
  // MusicBrainz's 1 req/s limit. Returns { hits, fails } and reports progress
  // through onProgress(done, total).
  const refreshAlbumBpms = async (record, onProgress) => {
    const missingIdx = record.tracks
      .map((t, i) => (t.bpm == null ? i : -1))
      .filter(i => i >= 0);
    if (missingIdx.length === 0) return { hits: 0, fails: 0 };
    let hits = 0, fails = 0;
    for (let k = 0; k < missingIdx.length; k++) {
      const i = missingIdx[k];
      try {
        const r = await refreshTrackBpm(record.id, i);
        if (r && r.bpm != null) hits++; else fails++;
      } catch {
        fails++;
      }
      onProgress && onProgress(k + 1, missingIdx.length);
      // Throttle between requests (last one can skip the wait).
      if (k < missingIdx.length - 1) await new Promise(r => setTimeout(r, 1100));
    }
    return { hits, fails };
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

  // Album-level star rating (1–5). Stored as record.rating; used in the
  // detail header replacing the old per-track stars.
  const rateRecord = (recordId, rating) => {
    setRecords(cur => cur.map(r => r.id === recordId ? { ...r, rating } : r));
    if (selected && selected.id === recordId) {
      setSelected(s => ({ ...s, rating }));
    }
  };

  // Per-track energy rank (1–5). Replaces the old per-track stars: 1–2 chill,
  // 3 mid, 4–5 peak. Color-coded in the row.
  const setTrackEnergy = (recordId, trackIndex, energy) => {
    setRecords(cur => cur.map(r => {
      if (r.id !== recordId) return r;
      const tracks = r.tracks.map((t, i) => i === trackIndex ? { ...t, energy } : t);
      return { ...r, tracks };
    }));
    if (selected && selected.id === recordId) {
      setSelected(s => ({ ...s, tracks: s.tracks.map((t, i) =>
        i === trackIndex ? { ...t, energy } : t) }));
    }
  };

  const deleteRecord = (id) => {
    setRecords(cur => cur.filter(r => r.id !== id));
    setSet(s => s.filter(tid => !tid.startsWith(`${id}-`)));
    if (selected?.id === id) setSelected(null);
  };

  // Refresh a single album from Discogs (authoritative tracklist, cover,
  // label, catalog, RPM, genre). Preserves BPM/key/rating/notes.
  const refreshDiscogsRecord = async (record) => {
    const updated = await window.refreshDiscogsRecord(record);
    setRecords(cur => cur.map(r => r.id === updated.id ? updated : r));
    if (selected?.id === updated.id) setSelected(updated);
    // Invalidate iTunes preview cache for this record so we re-match if
    // the tracklist changed.
    window.iTunesPreview?.clearPreviewCache?.(`${updated.id}-`);
    return updated;
  };

  React.useEffect(() => { setViewStyle(tweaks.viewStyle); }, [tweaks.viewStyle]);
  React.useEffect(() => { localStorage.setItem('cs-set', JSON.stringify(set)); }, [set]);
  React.useEffect(() => {
    localStorage.setItem('cs-records', JSON.stringify(records));
    window.RECORDS = records; // keep global in sync for parseTrackId
  }, [records]);

  // ── Supabase sync ──────────────────────────────────────────────────────
  const [hydrated, setHydrated] = React.useState(false);
  const prevRecordsRef = React.useRef(null);
  const prevSetsRef = React.useRef(null);
  const prevCratesRef = React.useRef(null);
  const prevGigsRef = React.useRef(null);

  // Hydrate from Supabase on mount. If cloud is empty but we have local data,
  // migrate local data up so first-time users don't lose what they already built.
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cloudProfile, cloudRecords, cloudSets, cloudCrates, cloudWorkspace, cloudGigs] = await Promise.all([
        window.Sync.fetchProfile(),
        window.Sync.fetchRecords(),
        window.Sync.fetchSavedSets(),
        window.Sync.fetchCrates(),
        window.Sync.fetchWorkspace(),
        window.Sync.fetchGigs(),
      ]);
      if (cancelled) return;

      // Merge local + cloud by id. Cloud wins on conflicts; local-only items
      // get uploaded so nothing is lost when a device signs in after another
      // device already populated the cloud.
      const mergeById = (local, cloud) => {
        const m = new Map();
        for (const x of local) m.set(x.id, x);
        for (const x of cloud) m.set(x.id, x); // cloud overwrites
        return Array.from(m.values());
      };
      const localOnly = (local, cloud) => {
        const cloudIds = new Set(cloud.map(x => x.id));
        return local.filter(x => !cloudIds.has(x.id));
      };

      const mergedRecords  = mergeById(records,   cloudRecords);
      const mergedSets     = mergeById(savedSets, cloudSets);
      const mergedCrates   = mergeById(crates,    cloudCrates);
      const mergedGigs     = mergeById(gigs,      cloudGigs);

      // One-time cleanup of pre-launch demo records. The fictional collection
      // in data/records.js (Ondalina, Kofi Mensah Quintet, …) used IDs r01–r12;
      // some early accounts have these stored in their cloud tables and they
      // re-merge on every hydration. Real Discogs imports use d{number} IDs
      // and manual records use longer/UUID-shaped ones, so the regex is safe.
      const SEED_ID = /^r\d{2}$/;
      const seedRecords = mergedRecords.filter(r => SEED_ID.test(r.id));
      let cleanedRecords = mergedRecords;
      let cleanedSets = mergedSets;
      let cleanedCrates = mergedCrates;
      let cleanedSet = set;
      if (seedRecords.length) {
        const seedIds = new Set(seedRecords.map(r => r.id));
        const isSeedTrackId = (tid) => seedIds.has(String(tid).split('-')[0]);
        cleanedRecords = mergedRecords.filter(r => !seedIds.has(r.id));
        cleanedSets = mergedSets.map(s => ({
          ...s, trackIds: (s.trackIds || []).filter(tid => !isSeedTrackId(tid)),
        }));
        cleanedCrates = mergedCrates.map(c => ({
          ...c, recordIds: (c.recordIds || []).filter(rid => !seedIds.has(rid)),
        }));
        cleanedSet = (set || []).filter(tid => !isSeedTrackId(tid));
        // Tear them out of the cloud too. Saved sets/crates that lost
        // entries will be re-upserted by the diff effect once state settles.
        await Promise.all(seedRecords.map(r => window.Sync.deleteRecord(r.id)));
      }

      // One-time migration: lift nested saved_sets.gigs[] into the new gigs
      // table as proper rows. Gated by profile.gigsMigratedAt so it runs once
      // per user (across devices). IDs are deterministic so even if it fires
      // twice somehow, upsert is idempotent — no duplicates.
      const baseProfile = window.migrateProfile(cloudProfile || profile);
      let gigsAfterMigration = mergedGigs;
      let profileAfterMigration = baseProfile;
      if (!baseProfile.gigsMigratedAt) {
        const existingGigIds = new Set(mergedGigs.map(g => g.id));
        const today = new Date().toISOString().slice(0, 10);
        const newGigs = [];
        for (const s of cleanedSets) {
          const nested = Array.isArray(s.gigs) ? s.gigs
            : (s.gig ? [s.gig] : []);
          nested.forEach((ng, i) => {
            const nestedId = ng.id || `${i}`;
            const id = `g_${s.id}_${nestedId}`;
            if (existingGigIds.has(id)) return;
            const playedAt = ng.playedAt || null;
            const status = playedAt && playedAt < today ? 'played' : 'upcoming';
            newGigs.push({
              id,
              playedAt,
              venue: ng.venue || '',
              location: '',
              setId: s.id,
              notes: ng.notes || '',
              status,
              is_public: false,
            });
          });
        }
        gigsAfterMigration = [...mergedGigs, ...newGigs];
        profileAfterMigration = { ...baseProfile, gigsMigratedAt: Date.now() };
      }

      // One-time energy reset. Discogs import used to seed every track with
      // energy: 5 which made the new EnergyMeter render as all-red for every
      // album. Wipe all track.energy values once per user so the meter
      // starts blank and lets the DJ rate fresh on the 1–5 scale.
      let recordsAfterEnergyReset = cleanedRecords;
      if (!profileAfterMigration.energyResetAt) {
        recordsAfterEnergyReset = cleanedRecords.map(r => ({
          ...r,
          tracks: (r.tracks || []).map(t => {
            if (t.energy == null) return t;
            const { energy, ...rest } = t;
            return rest;
          }),
        }));
        profileAfterMigration = {
          ...profileAfterMigration, energyResetAt: Date.now(),
        };
      }

      setProfile(profileAfterMigration);
      setRecords(recordsAfterEnergyReset);
      setSavedSets(cleanedSets);
      setCrates(cleanedCrates);
      setGigs(gigsAfterMigration);
      if (seedRecords.length) setSet(cleanedSet);
      if (cloudWorkspace) {
        if (Array.isArray(cloudWorkspace.set)) setSet(cloudWorkspace.set);
        if (typeof cloudWorkspace.currentSetName === 'string') setCurrentSetName(cloudWorkspace.currentSetName);
        if (cloudWorkspace.activeSetId !== undefined) setActiveSetId(cloudWorkspace.activeSetId);
      }

      // Push anything that only exists locally so the cloud catches up.
      // Guard with a short-lived localStorage lock so two tabs opened at the
      // same time don't both fire the same uploads. The first tab to land
      // here grabs the lock; any other tab sees the fresh lock and skips
      // (its writes will reach the cloud through write-through anyway, but
      // the bulk localOnly upload happens once across all open tabs).
      const HYDRATE_LOCK_KEY = `cs-hydrate-lock-${user.id}`;
      const HYDRATE_TTL_MS = 15000;
      const lockRaw = localStorage.getItem(HYDRATE_LOCK_KEY);
      const lockFresh = lockRaw && (Date.now() - Number(lockRaw)) < HYDRATE_TTL_MS;
      if (!lockFresh) {
        localStorage.setItem(HYDRATE_LOCK_KEY, String(Date.now()));
        await Promise.all([
          !cloudProfile && window.Sync.upsertProfile(profile),
          !cloudWorkspace && window.Sync.upsertWorkspace({ set, activeSetId, currentSetName }),
          ...localOnly(records,   cloudRecords).map(r => window.Sync.upsertRecord(r)),
          ...localOnly(savedSets, cloudSets).map(s => window.Sync.upsertSavedSet(s)),
          ...localOnly(crates,    cloudCrates).map(c => window.Sync.upsertCrate(c)),
          ...localOnly(gigs,      cloudGigs).map(g => window.Sync.upsertGig(g)),
        ].filter(Boolean));
      }

      // Prime refs so write-through doesn't re-upsert what we just merged.
      // Use the cleaned versions so the diff effect doesn't double-fire the
      // seed-record deletes we already issued above. For gigs we prime with
      // the pre-migration list so the diff effect upserts the freshly-lifted
      // gigs to the cloud (and the upsert of the profile sets the migration
      // flag, preventing re-runs).
      prevRecordsRef.current = cleanedRecords;
      prevSetsRef.current    = mergedSets;   // still merged: cleanedSets has new
      prevCratesRef.current  = mergedCrates; // object refs that should upsert
      prevGigsRef.current    = mergedGigs;   // before migration, so new ones upload
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Cross-tab sync: when another tab writes, refetch the affected scope so
  // the user sees their edits appear without a manual refresh. Only listens
  // after hydration so we don't double-hydrate on boot.
  React.useEffect(() => {
    if (!hydrated || !user) return;
    let inflight = false;
    const refresh = async (scope) => {
      if (inflight) return;
      inflight = true;
      try {
        if (scope === 'records') {
          const cloud = await window.Sync.fetchRecords();
          setRecords(cloud);
          prevRecordsRef.current = cloud;
        } else if (scope === 'savedSets') {
          const cloud = await window.Sync.fetchSavedSets();
          setSavedSets(cloud);
          prevSetsRef.current = cloud;
        } else if (scope === 'crates') {
          const cloud = await window.Sync.fetchCrates();
          setCrates(cloud);
          prevCratesRef.current = cloud;
        } else if (scope === 'gigs') {
          const cloud = await window.Sync.fetchGigs();
          setGigs(cloud);
          prevGigsRef.current = cloud;
        } else if (scope === 'workspace') {
          const cloud = await window.Sync.fetchWorkspace();
          if (cloud) {
            if (Array.isArray(cloud.set)) setSet(cloud.set);
            if (typeof cloud.currentSetName === 'string') setCurrentSetName(cloud.currentSetName);
            if (cloud.activeSetId !== undefined) setActiveSetId(cloud.activeSetId);
          }
        } else if (scope === 'profile') {
          const cloud = await window.Sync.fetchProfile();
          if (cloud) setProfile(window.migrateProfile(cloud));
        }
        // 'follows' scope is handled inside the per-profile useFollowData
        // hook (it subscribes via window.Sync.onPeerChange separately and
        // refetches its own counts), so no app-level state to refresh here.
      } finally { inflight = false; }
    };
    return window.Sync.onPeerChange(refresh);
  }, [hydrated, user?.id]);

  // Write-through: profile (debounced)
  const upsertProfileDebounced = React.useMemo(
    () => window.debounce(window.Sync.upsertProfile, 600), []);
  React.useEffect(() => {
    if (!hydrated) return;
    upsertProfileDebounced(profile);
  }, [profile, hydrated]);

  // Write-through: records (diff upsert/delete)
  React.useEffect(() => {
    if (!hydrated) return;
    const prev = prevRecordsRef.current || [];
    window.diffArraySync({
      prev, curr: records,
      getId: (r) => r.id,
      onUpsert: (r) => window.Sync.upsertRecord(r),
      onDelete: (id) => window.Sync.deleteRecord(id),
    });
    prevRecordsRef.current = records;
  }, [records, hydrated]);

  // Build a denormalized snapshot of the tracks in a saved set, so public
  // viewers (who don't have window.RECORDS loaded in their browser) can still
  // render the track list with title / artist / BPM / key. Generated at
  // upsert time using the owner's local records — accurate as of the moment
  // they last edited the set.
  const buildSetSnapshot = React.useCallback((trackIds) => {
    return (trackIds || []).map(tid => {
      const p = window.parseTrackId ? window.parseTrackId(tid) : null;
      if (!p) return { tid };
      return {
        tid,
        title: p.track.title || '',
        artist: p.record.artist || '',
        bpm: p.track.bpm ?? null,
        key: p.track.key ?? null,
        len: p.track.len || null,
        n: p.track.n || null,
        recordTitle: p.record.title || '',
        cover: p.record.cover ? {
          hue: p.record.cover.hue,
          shape: p.record.cover.shape,
          image: p.record.cover.image || null,
        } : null,
      };
    });
  }, []);

  // Write-through: saved sets. Each upsert regenerates trackSnapshot so the
  // public-route view stays current with the owner's collection.
  React.useEffect(() => {
    if (!hydrated) return;
    const prev = prevSetsRef.current || [];
    window.diffArraySync({
      prev, curr: savedSets,
      getId: (s) => s.id,
      onUpsert: (s) => {
        const snap = buildSetSnapshot(s.trackIds);
        window.Sync.upsertSavedSet({ ...s, trackSnapshot: snap });
      },
      onDelete: (id) => window.Sync.deleteSavedSet(id),
    });
    prevSetsRef.current = savedSets;
  }, [savedSets, hydrated, buildSetSnapshot]);

  // One-shot snapshot upgrade: any pre-existing set without a trackSnapshot
  // gets one as soon as records are loaded post-hydration. Triggers a single
  // re-upsert per such set; subsequent runs are no-ops.
  const setsSnapshotMigratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || records.length === 0) return;
    if (setsSnapshotMigratedRef.current) return;
    setsSnapshotMigratedRef.current = true;
    setSavedSets(ss => {
      let changed = false;
      const next = ss.map(s => {
        if (Array.isArray(s.trackSnapshot)) return s;
        if (!s.trackIds || s.trackIds.length === 0) return s;
        const snap = buildSetSnapshot(s.trackIds);
        if (snap.length === 0) return s;
        changed = true;
        return { ...s, trackSnapshot: snap };
      });
      return changed ? next : ss;
    });
  }, [hydrated, records.length, buildSetSnapshot]);

  // Write-through: crates
  React.useEffect(() => {
    if (!hydrated) return;
    const prev = prevCratesRef.current || [];
    window.diffArraySync({
      prev, curr: crates,
      getId: (c) => c.id,
      onUpsert: (c) => window.Sync.upsertCrate(c),
      onDelete: (id) => window.Sync.deleteCrate(id),
    });
    prevCratesRef.current = crates;
  }, [crates, hydrated]);

  // Write-through: gigs
  React.useEffect(() => {
    if (!hydrated) return;
    const prev = prevGigsRef.current || [];
    window.diffArraySync({
      prev, curr: gigs,
      getId: (g) => g.id,
      onUpsert: (g) => window.Sync.upsertGig(g),
      onDelete: (id) => window.Sync.deleteGig(id),
    });
    prevGigsRef.current = gigs;
  }, [gigs, hydrated]);

  // Write-through: workspace (current builder + active set + name, debounced)
  const upsertWorkspaceDebounced = React.useMemo(
    () => window.debounce(window.Sync.upsertWorkspace, 600), []);
  React.useEffect(() => {
    if (!hydrated) return;
    upsertWorkspaceDebounced({ set, activeSetId, currentSetName });
  }, [set, activeSetId, currentSetName, hydrated]);

  // Auto-analyze: quietly fill BPM/key for any track that's missing them.
  // Runs in background, throttled, marks tracks as `bpmTried` so we never retry the same miss.
  const autoAnalyzeRunning = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || autoAnalyzeRunning.current) return;
    const targets = [];
    for (const r of records) {
      for (let i = 0; i < r.tracks.length; i++) {
        const t = r.tracks[i];
        const missing = t.bpm == null || t.key == null || t.key === '';
        if (missing && !t.bpmTried) {
          targets.push({ rid: r.id, idx: i, artist: r.artist, title: t.title || r.title });
        }
      }
    }
    if (targets.length === 0) return;

    autoAnalyzeRunning.current = true;
    let cancelled = false;
    (async () => {
      const results = {};
      for (const t of targets) {
        if (cancelled) break;
        try {
          const r = await window.lookupGetSongBpm(t.artist, t.title);
          (results[t.rid] ||= []).push({ trackIndex: t.idx, ...(r || {}) });
        } catch {
          (results[t.rid] ||= []).push({ trackIndex: t.idx });
        }
        // Respect MusicBrainz 1 req/sec limit (edge function's first hop).
        // 1.1s gives us a small safety margin for cold-start latency.
        await new Promise(res => setTimeout(res, 1100));
      }
      if (cancelled) return;
      setRecords(cur => cur.map(rec => {
        const ups = results[rec.id];
        if (!ups?.length) return rec;
        const tracks = rec.tracks.map((t, i) => {
          const u = ups.find(x => x.trackIndex === i);
          if (!u) return t;
          return {
            ...t,
            bpm: u.bpm ?? t.bpm,
            key: u.key ?? t.key,
            // Same backfill rule as applyAnalysis — don't clobber a real len.
            len: (u.len && isEmptyLen(t.len)) ? u.len : t.len,
            bpmTried: true,
          };
        });
        const bpms = tracks.map(t => t.bpm).filter(b => b != null);
        const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : rec.bpm;
        const firstKey = tracks.find(t => t.key)?.key || rec.key;
        return { ...rec, tracks, bpm: rec.bpm ?? avgBpm, key: rec.key || firstKey };
      }));
      autoAnalyzeRunning.current = false;
    })();
    return () => { cancelled = true; autoAnalyzeRunning.current = false; };
  }, [records, hydrated]);

  // Preview-sourced duration backfill. iTunes previews fire a cs-track-duration
  // event with { trackId: "r12-3", durationMs } whenever a fresh match lands.
  // We translate that into a len update, matching applyAnalysis's rule: only
  // fill when the current slot is empty (so user-entered durations win).
  React.useEffect(() => {
    if (!hydrated) return;
    const onDuration = (e) => {
      const detail = e.detail || {};
      const trackId = detail.trackId;
      const durationMs = detail.durationMs;
      if (!trackId || !Number.isFinite(durationMs) || durationMs <= 0) return;
      const parts = String(trackId).split('-');
      const trackIndex = Number(parts.pop());
      const recordId = parts.join('-');
      if (!recordId || !Number.isFinite(trackIndex)) return;
      const len = window.formatLenMs ? window.formatLenMs(durationMs) : null;
      if (!len) return;
      setRecords(cur => cur.map(r => {
        if (r.id !== recordId) return r;
        const t = r.tracks[trackIndex];
        if (!t || !isEmptyLen(t.len)) return r; // don't clobber a real value
        const tracks = r.tracks.map((tr, i) =>
          i === trackIndex ? { ...tr, len } : tr);
        return { ...r, tracks };
      }));
    };
    window.addEventListener('cs-track-duration', onDuration);
    return () => window.removeEventListener('cs-track-duration', onDuration);
  }, [hydrated]);

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
  const [sortBy, setSortBy] = React.useState(() => localStorage.getItem('cs-sort') || 'recent');
  React.useEffect(() => { localStorage.setItem('cs-sort', sortBy); }, [sortBy]);
  const sortedFiltered = sortRecords(filtered, sortBy);

  if (isPhone) {
    return (
      <div className={`app ${tweaks.theme}`} style={{
        height: '100dvh', width: '100vw', overflow: 'hidden',
        background: 'var(--bg)', color: 'var(--fg)',
      }}>
        <MobileApp records={records} set={set} crates={crates} savedSets={savedSets}
          gigs={gigs}
          currentSetName={currentSetName} setCurrentSetName={setCurrentSetName}
          onSaveSet={saveCurrentSet}
          onToggleTrack={toggleTrack}
          onRemoveFromSet={removeFromSet}
          onReorderSet={reorder}
          onClearSet={() => setSet([])}
          onLoadSavedSet={(id) => { const s = savedSets.find(x => x.id === id); if (s) { setSet(s.trackIds); setActiveSetId(id); setCurrentSetName(s.name); } }}
          onAddGig={addGig} onUpdateGig={updateGig} onDeleteGig={deleteGig}
          onToggleTrackInSavedSet={toggleTrackInSavedSet}
          onCreateSetWithTrack={createSetWithTrack}
          profile={profile} setProfile={setProfile}
          user={user} onSignOut={onSignOut}
          darkMode={tweaks.theme === 'dark'} accent={ACCENTS[tweaks.accent] || tweaks.accent} />
      </div>
    );
  }

  return (
    <div className={`app ${tweaks.theme}`} style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--fg)',
      transition: 'grid-template-columns 0.3s cubic-bezier(0.2, 0, 0.2, 1)',
    }}>
      {/* Sidebar */}
      <Sidebar view={view} setView={setView} set={set} records={records} gigs={gigs}
        onOpenImport={() => setImportOpen(true)}
        onFindDjs={() => setFindDjsOpen(true)}
        onAddRecord={openNewRecord}
        onAnalyze={() => setAnalyzeOpen(true)}
        crates={crates} activeCrateId={activeCrateId} setActiveCrateId={setActiveCrateId}
        onNewCrate={newCrate} onDeleteCrate={deleteCrate}
        savedSets={savedSets} activeSetId={activeSetId} viewingSetId={viewingSetId}
        onSaveSet={saveCurrentSet} onOpenSet={openSavedSet} onDeleteSet={deleteSavedSet}
        profile={profile} user={user} onSignOut={onSignOut} />

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
          sortBy={sortBy} setSortBy={setSortBy}
          activeCrateName={view === 'crates' && activeCrateId
            ? crates.find(c => c.id === activeCrateId)?.name : null}
          viewingSetId={viewingSetId} savedSetCount={savedSets.length}
          density={tweaks.density} setDensity={d => setTweaks({ ...tweaks, density: d })} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 80px' }}>
          {view === 'collection' && (
            records.length === 0 ? (
              <EmptyCollection onAddRecord={openNewRecord}
                onOpenImport={() => setImportOpen(true)} />
            ) : (
              <>
                {viewStyle === 'list' ? (
                  <CollectionList records={sortedFiltered} onSelect={setSelected}
                    onAddToSet={toggleAllTracks} inSet={recordInSet} density={tweaks.density}
                    showOverlays={tweaks.showOverlays} />
                ) : (
                  /* grid + legacy 'stack' both render as the grid now. */
                  <CollectionGrid records={sortedFiltered} onSelect={setSelected}
                    onAddToSet={toggleAllTracks} inSet={recordInSet} density={tweaks.density}
                    showOverlays={tweaks.showOverlays} />
                )}
              </>
            )
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
          {view === 'calendar' && (
            <CalendarView gigs={gigs} savedSets={savedSets}
              onAddGig={addGig} onUpdateGig={updateGig} onDeleteGig={deleteGig} />
          )}
          {view === 'profile' && (
            <ProfilePage profile={profile} setProfile={setProfile}
              records={records} savedSets={savedSets} gigs={gigs}
              user={user} onSignOut={onSignOut}
              onRetryBpmAnalysis={() => {
                // Clear the bpmTried flag so the background auto-analyzer
                // will re-run through every track missing BPM or key.
                setRecords(cur => cur.map(r => ({
                  ...r,
                  tracks: r.tracks.map(t => {
                    const missing = t.bpm == null || !t.key;
                    return missing ? { ...t, bpmTried: false } : t;
                  }),
                })));
                autoAnalyzeRunning.current = false;
              }} />
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
              sortBy={sortBy}
              search={search}
              viewStyle={viewStyle} setViewStyle={setViewStyle}
              advFilters={advFilters} set={set}
              onBrowseCollection={() => setView('collection')} />
          )}
          {view === 'sets' && !viewingSetId && (
            <SavedSetsHub savedSets={savedSets} activeSetId={activeSetId}
              onOpen={openSavedSet}
              onDelete={deleteSavedSet}
              onTogglePublic={toggleSavedSetPublic}
              onNewSet={() => setView('set')} />
          )}
          {view === 'sets' && viewingSetId && (
            <SavedSetPage savedSet={savedSets.find(s => s.id === viewingSetId)}
              records={records}
              onBack={() => setViewingSetId(null)}
              onRename={renameSavedSet}
              onUpdateTracks={updateSavedSetTracks}
              onUpdateGigs={updateSavedSetGigs}
              onTogglePublic={toggleSavedSetPublic}
              onDelete={deleteSavedSet}
              onLoadToBuilder={loadIntoBuilder}
              onLaunchGig={(resolved) => { setGigResolved(resolved); setGigMode(true); }} />
          )}
        </div>

        {selected && (() => {
          // Walk the currently-visible (filtered + sorted) list so prev/next
          // mirror what the user sees in the grid. Falls back to records if
          // the selected record isn't in the visible list (e.g. opened
          // straight from a search hit that the current filter excludes).
          const visible = sortedFiltered.some(r => r.id === selected.id)
            ? sortedFiltered : records;
          const idx = visible.findIndex(r => r.id === selected.id);
          const prev = idx > 0 ? visible[idx - 1] : null;
          const next = idx >= 0 && idx < visible.length - 1 ? visible[idx + 1] : null;
          return (
            <RecordDetail record={selected} onClose={() => setSelected(null)}
              onPrev={prev ? () => setSelected(prev) : null}
              onNext={next ? () => setSelected(next) : null}
              positionLabel={idx >= 0 ? `${idx + 1} / ${visible.length}` : null}
              onAddTrack={toggleTrack} isTrackInSet={isTrackInSet}
              onAddAllTracks={toggleAllTracks} allRecords={records}
              onEdit={() => openEditRecord(selected)}
              crates={crates} onAddToCrate={addToCrate} onRemoveFromCrate={removeFromCrate}
              onNewCrate={newCrate}
              savedSets={savedSets}
              onToggleTrackInSavedSet={toggleTrackInSavedSet}
              onCreateSetWithTrack={createSetWithTrack}
              onRateTrack={rateTrack}
              onRateRecord={rateRecord}
              onSetTrackEnergy={setTrackEnergy}
              onRefreshTrackBpm={refreshTrackBpm}
              onRefreshDiscogs={refreshDiscogsRecord}
              onRefreshAlbumBpms={refreshAlbumBpms} />
          );
        })()}
      </div>

      <DiscogsImportModal open={importOpen}
        existingRecords={records}
        onClose={() => setImportOpen(false)}
        onImport={handleDiscogsImport} />

      <RecordFormModal open={formOpen} initial={editing}
        onClose={() => setFormOpen(false)}
        onSave={saveRecord} onDelete={deleteRecord} />

      <AnalyzeModal open={analyzeOpen} records={records}
        onClose={() => setAnalyzeOpen(false)}
        onApply={applyAnalysis} />

      {findDjsOpen && (
        <UserSearchModal viewerId={user?.id}
          onClose={() => setFindDjsOpen(false)} />
      )}

      {gigMode && (() => {
        const resolved = gigResolved || set.map(tid => {
          const p = window.parseTrackId(tid);
          return p ? { tid, ...p } : null;
        }).filter(Boolean);
        return <GigMode resolved={resolved}
          theme={tweaks.theme} accent={ACCENTS[tweaks.accent] || tweaks.accent}
          onClose={() => { setGigMode(false); setGigResolved(null); }} />;
      })()}
    </div>
  );
}

function Sidebar({ view, setView, set, records, gigs, onOpenImport, onAddRecord, onAnalyze, onFindDjs, crates, activeCrateId, setActiveCrateId, onNewCrate, onDeleteCrate, savedSets, activeSetId, viewingSetId, onSaveSet, onOpenSet, onDeleteSet, profile, user, onSignOut }) {
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
      {/* Wordmark — the brand-logo class flips luminance in dark/warm themes
          while keeping STUDIO yellow (see index.html). <picture> serves WebP
          where supported (60% smaller) and falls back to PNG elsewhere. */}
      <div style={{ marginBottom: 18 }}>
        <picture>
          <source srcSet="kollectorlogo.webp" type="image/webp" />
          <img src="kollectorlogo.png" alt="Kollector Studio"
            className="brand-logo"
            style={{ maxWidth: 120, width: '70%', height: 'auto', display: 'block' }} />
        </picture>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: 'var(--dim)', marginTop: 8,
        }}>For vinyl DJs · v1.0 BETA</div>
      </div>
      {/* end wordmark */}

      {/* Profile chip — click to open profile page (includes sign out) */}
      <button onClick={() => setView('profile')} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 10, marginBottom: 20,
        background: view === 'profile' ? 'var(--hover)' : 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--fg)', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        minWidth: 0,
      }}>
        <ProfileAvatar profile={profile} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.djName || profile.name || 'Set up profile'}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 0.5,
            color: 'var(--dim)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{user?.email || 'Edit your profile'}</div>
        </div>
      </button>

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
        <NavItem icon={Icon.Stack} label="Sets"
          active={view === 'sets'} onClick={() => { onOpenSet && onOpenSet(null); setView('sets'); }}
          badge={savedSets.length > 0 ? savedSets.length : null} />
        <NavItem icon={Icon.Deck} label="Set Builder"
          active={view === 'set'} onClick={() => setView('set')}
          badge={set.length > 0 ? set.length : null} accent={set.length > 0} />
        <NavItem icon={Icon.Calendar} label="Calendar"
          active={view === 'calendar'} onClick={() => setView('calendar')}
          badge={gigs.length > 0 ? gigs.length : null} />
        <NavItem icon={Icon.Grid} label="Dashboard"
          active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        {onFindDjs && (
          <NavItem icon={Icon.User} label="Find DJs"
            active={false} onClick={onFindDjs} />
        )}
      </nav>

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

      {/* Attribution — AcousticBrainz / GetSongBPM for BPM/key, iTunes for previews */}
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: 0.5,
        color: 'var(--dim)', lineHeight: 1.5,
      }}>
        Tempo &amp; key via{' '}
        <a href="https://acousticbrainz.org" target="_blank" rel="noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>AcousticBrainz</a>
        {' '}&amp;{' '}
        <a href="https://getsongbpm.com" target="_blank" rel="noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}>GetSongBPM</a>
        {' '}· previews via iTunes
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

// ─── Sort helper — shared by collection + crates ──────────────────────
function sortRecords(records, sortBy) {
  if (!sortBy || sortBy === 'recent') return records;
  const clone = [...records];
  const cmpStr = (a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
  const avgBpm = (r) => {
    const bs = (r.tracks || []).map(t => t.bpm).filter(b => b != null);
    return bs.length ? bs.reduce((s, x) => s + x, 0) / bs.length : (r.bpm ?? 0);
  };
  const avgRating = (r) => {
    const rs = (r.tracks || []).map(t => t.rating || 0);
    return rs.length ? rs.reduce((s, x) => s + x, 0) / rs.length : 0;
  };
  switch (sortBy) {
    case 'title':  clone.sort((a, b) => cmpStr(a.title, b.title)); break;
    case 'artist': clone.sort((a, b) => cmpStr(a.artist, b.artist) || cmpStr(a.title, b.title)); break;
    case 'album':  clone.sort((a, b) => cmpStr(a.title, b.title)); break; // record title == album
    case 'bpm':    clone.sort((a, b) => avgBpm(a) - avgBpm(b)); break;
    case 'rating': clone.sort((a, b) => avgRating(b) - avgRating(a)); break;
    case 'year':   clone.sort((a, b) => (a.year || 0) - (b.year || 0)); break;
    default: break;
  }
  return clone;
}
Object.assign(window, { sortRecords });

// Small dropdown control
function SortDropdown({ sortBy, setSortBy }) {
  const [open, setOpen] = React.useState(false);
  const options = [
    { id: 'recent', label: 'Recently added' },
    { id: 'title',  label: 'Title (A–Z)' },
    { id: 'artist', label: 'Artist (A–Z)' },
    { id: 'album',  label: 'Album (A–Z)' },
    { id: 'bpm',    label: 'BPM (low → high)' },
    { id: 'rating', label: 'Rating (high → low)' },
    { id: 'year',   label: 'Year (old → new)' },
  ];
  const current = options.find(o => o.id === sortBy) || options[0];
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
        borderRadius: 6, background: 'var(--hover)', border: '1px solid var(--border)',
        color: 'var(--fg)', fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          letterSpacing: 1, color: 'var(--dim)', textTransform: 'uppercase' }}>Sort</span>
        <span>{current.label}</span>
        <span style={{ color: 'var(--dim)', fontSize: 9 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 10,
          }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
            zIndex: 11, minWidth: 200, overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
          }}>
            {options.map(o => (
              <button key={o.id} onClick={() => { setSortBy(o.id); setOpen(false); }} style={{
                width: '100%', padding: '9px 12px', textAlign: 'left',
                background: sortBy === o.id ? 'var(--hover)' : 'transparent',
                border: 'none', color: 'var(--fg)', fontFamily: 'inherit',
                fontSize: 12, fontWeight: sortBy === o.id ? 700 : 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3,
                  background: sortBy === o.id ? 'var(--accent)' : 'transparent',
                  border: sortBy === o.id ? 'none' : '1px solid var(--border)' }} />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ view, search, setSearch, viewStyle, setViewStyle, genreFilter, setGenreFilter, availableGenres, advFilters, setAdvFilters, records, count, total, sortBy, setSortBy, activeCrateName, viewingSetId, savedSetCount, density, setDensity }) {
  const showToolbar = view === 'collection' || (view === 'crates' && activeCrateName);
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
            view === 'calendar' ? 'Gigs & events' :
            view === 'dashboard' ? 'Collection health' : ''
          }</div>
          <h1 style={{
            margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1,
          }}>
            {view === 'collection' && <>Collection<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'crates' && (activeCrateName
              ? <>{activeCrateName}<span style={{ color: 'var(--accent)' }}>.</span></>
              : <>Crates<span style={{ color: 'var(--accent)' }}>.</span></>)}
            {view === 'set' && <>Set builder<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'sets' && <>Your sets<span style={{ color: 'var(--accent)' }}>.</span></>}
            {view === 'calendar' && <>Calendar<span style={{ color: 'var(--accent)' }}>.</span></>}
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
          {view === 'sets' && (viewingSetId ? <>Tap the back arrow to see all sets</> : <>{savedSetCount} saved · click to open</>)}
          {view === 'calendar' && <>Upcoming gigs and past sets</>}
          {view === 'dashboard' && <>Everything at a glance</>}
        </div>
      </div>

      {showToolbar && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 6,
              background: 'var(--hover)', border: '1px solid var(--border)',
            }}>
              <span style={{ color: 'var(--dim)' }}>{Icon.Search}</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search title, artist, label…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--fg)', fontSize: 13, fontFamily: 'inherit',
                }} />
            </div>

            {/* Advanced filter popover */}
            <FilterPopover filters={advFilters} setFilters={setAdvFilters} records={records} />

            {/* Sort */}
            <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />

            {/* View style — stack-by-genre dropped; Crates covers manual
                grouping better and the genre auto-grouping was rarely used. */}
            <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border)', borderRadius: 6, padding: 3 }}>
              {[
                { id: 'grid', icon: Icon.Grid },
                { id: 'list', icon: Icon.List },
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

          {/* Genre filter chips — dedicated row for breathing room */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {availableGenres.map(g => (
              <Tag key={g} onClick={() => setGenreFilter(g)} active={genreFilter === g} size="sm">{g}</Tag>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyCollection({ onAddRecord, onOpenImport }) {
  return (
    <div style={{
      maxWidth: 520, margin: '60px auto 0', padding: 36, textAlign: 'center',
      borderRadius: 16, border: '1px dashed var(--border)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 32, margin: '0 auto 18px',
        background: 'var(--accent)', color: 'var(--on-accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>
        Your shelves are empty
      </h2>
      <p style={{ margin: '0 0 22px', color: 'var(--dim)', fontSize: 13, lineHeight: 1.5 }}>
        Add your first record manually, or pull your collection straight from Discogs.
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onAddRecord} style={{
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: 'var(--on-accent)',
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          fontFamily: 'inherit', cursor: 'pointer',
        }}>Add your first record</button>
        <button onClick={onOpenImport} style={{
          padding: '10px 18px', borderRadius: 8,
          background: 'transparent', color: 'var(--fg)',
          border: '1px solid var(--border)',
          fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          fontFamily: 'inherit', cursor: 'pointer',
        }}>Import from Discogs</button>
      </div>
    </div>
  );
}

Object.assign(window, { CollectorStudio });
