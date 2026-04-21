// iTunes 30-second preview lookup. Free, no key. Cached per track.

const CACHE_KEY = 'cs-itunes-cache';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

async function fetchPreviewUrl(artist, title) {
  if (!artist || !title) return null;
  const cleanTitle = String(title).replace(/\s*\([^)]*\)/g, '').trim();
  const term = `${artist} ${cleanTitle}`.trim();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.results && data.results[0];
    return hit?.previewUrl || null;
  } catch { return null; }
}

async function getPreview(trackKey, artist, title) {
  const cache = loadCache();
  if (trackKey in cache) return cache[trackKey]; // may be null (confirmed miss)
  const url = await fetchPreviewUrl(artist, title);
  cache[trackKey] = url || null;
  saveCache(cache);
  return url;
}

window.iTunesPreview = { getPreview };
