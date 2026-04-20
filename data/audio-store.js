// Tiny IndexedDB wrapper for per-track audio blobs.
// Keyed by track ID like "r01-2". Exposed on window.AudioStore.

(function () {
  const DB_NAME = 'collector-studio';
  const STORE = 'track-audio';
  const VERSION = 1;

  let dbPromise = null;
  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let result;
      Promise.resolve(fn(store)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  // Cache of Object URLs by trackId so we don't leak / re-create
  const urlCache = new Map();

  async function save(trackId, file) {
    await tx('readwrite', store => store.put(file, trackId));
    if (urlCache.has(trackId)) {
      URL.revokeObjectURL(urlCache.get(trackId));
      urlCache.delete(trackId);
    }
    // notify listeners
    window.dispatchEvent(new CustomEvent('cs-audio-change', { detail: { trackId } }));
  }

  async function remove(trackId) {
    await tx('readwrite', store => store.delete(trackId));
    if (urlCache.has(trackId)) {
      URL.revokeObjectURL(urlCache.get(trackId));
      urlCache.delete(trackId);
    }
    window.dispatchEvent(new CustomEvent('cs-audio-change', { detail: { trackId } }));
  }

  async function getUrl(trackId) {
    if (urlCache.has(trackId)) return urlCache.get(trackId);
    const blob = await new Promise(async (resolve, reject) => {
      const db = await getDB();
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(trackId, url);
    return url;
  }

  async function listKeys() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  window.AudioStore = { save, remove, getUrl, listKeys };
})();
