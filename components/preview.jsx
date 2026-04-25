// iTunes 30-second preview lookup. Free, no key. Cached per track.
// Uses a scored top-N match (not just the first result) so that the
// original version wins over remixes, live versions, karaoke, etc.
//
// Cache entry shape: { u: previewUrl | null, d: durationMs | null }.
// Old cache entries are plain strings (just the preview URL); we unwrap
// those on read so the cache stays backward-compatible across upgrades.

const CACHE_KEY = 'cs-itunes-cache';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}

// Normalize a cache value to the new shape. Accepts legacy string entries.
function normalizeEntry(v) {
  if (v == null) return { u: null, d: null };
  if (typeof v === 'string') return { u: v, d: null };
  if (typeof v === 'object') return { u: v.u ?? null, d: v.d ?? null };
  return { u: null, d: null };
}

// Normalize for fuzzy comparison: strip "the ", punctuation, lowercase.
function normalize(s) {
  return String(s || '').toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/\([^)]*\)/g, ' ')     // drop "(remastered)", "(2015 version)" etc.
    .replace(/\bfeat\.?\b.*$/i, ' ')  // drop "feat. …"
    .replace(/\bft\.?\b.*$/i, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Jaccard-ish word overlap, with exact-match + substring bonuses.
function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const wa = new Set(na.split(' ').filter(Boolean));
  const wb = new Set(nb.split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  const inter = [...wa].filter(x => wb.has(x)).length;
  const union = new Set([...wa, ...wb]).size;
  return inter / union;
}

// Words that signal a non-original version. Penalize if the user's title
// doesn't already contain one of them.
const ALT_VERSION_WORDS = [
  'remix', 'live', 'karaoke', 'tribute', 'cover', 'instrumental',
  'acoustic', 'demo', 'edit', 'rework', 'reprise', 'radio edit',
  'extended', 'bootleg', 'vip mix', 'dub', 'a cappella',
];

function scoreResult(r, wantArtist, wantTitle) {
  if (!r.previewUrl) return -Infinity; // no preview → useless
  const artistSim = similarity(r.artistName || '', wantArtist);
  const titleSim = similarity(r.trackName || '', wantTitle);
  // Artist match matters more than title match (wrong artist = wrong song).
  let score = artistSim * 65 + titleSim * 35;
  const foundName = (r.trackName || '').toLowerCase();
  const wantName = String(wantTitle).toLowerCase();
  const wantsAlt = ALT_VERSION_WORDS.some(w => wantName.includes(w));
  if (!wantsAlt) {
    for (const w of ALT_VERSION_WORDS) {
      if (foundName.includes(w)) { score -= 18; break; }
    }
  }
  return score;
}

// Returns { url, durationMs } — null url when no confident match.
// durationMs comes from iTunes's trackTimeMillis on the winning hit, so we
// get a real duration for free every time a preview is looked up.
async function fetchPreviewMeta(artist, title) {
  if (!artist || !title) return { url: null, durationMs: null };
  const cleanTitle = String(title).replace(/\s*\([^)]*\)/g, '').trim();
  const term = `${artist} ${cleanTitle}`.trim();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { url: null, durationMs: null };
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return { url: null, durationMs: null };
    const scored = results
      .map(r => ({ r, s: scoreResult(r, artist, cleanTitle) }))
      .sort((a, b) => b.s - a.s);
    // Reject if the best match is still weak — better to show no preview
    // than a confidently-wrong one.
    if (scored[0].s < 35) return { url: null, durationMs: null };
    const hit = scored[0].r;
    const durationMs = typeof hit.trackTimeMillis === 'number' && hit.trackTimeMillis > 0
      ? hit.trackTimeMillis : null;
    return { url: hit.previewUrl || null, durationMs };
  } catch { return { url: null, durationMs: null }; }
}

// Dispatch a global event so any listener (app.jsx) can backfill track.len
// without the preview code needing to know about React state.
function announceDuration(trackKey, durationMs) {
  if (!durationMs) return;
  try {
    window.dispatchEvent(new CustomEvent('cs-track-duration', {
      detail: { trackId: trackKey, durationMs, source: 'itunes' },
    }));
  } catch {}
}

async function getPreview(trackKey, artist, title, opts = {}) {
  const cache = loadCache();
  if (!opts.force && trackKey in cache) {
    const entry = normalizeEntry(cache[trackKey]);
    // Announce cached duration too — the app may have started after the
    // entry was first written, so the original event would have been missed.
    announceDuration(trackKey, entry.d);
    return entry.u;
  }
  const meta = await fetchPreviewMeta(artist, title);
  cache[trackKey] = { u: meta.url, d: meta.durationMs };
  saveCache(cache);
  announceDuration(trackKey, meta.durationMs);
  return meta.url;
}

// Read cached duration without triggering a network lookup. Returns null
// when the preview hasn't been fetched yet or the match had no duration.
function getPreviewDuration(trackKey) {
  const cache = loadCache();
  if (!(trackKey in cache)) return null;
  return normalizeEntry(cache[trackKey]).d;
}

// Clear cached preview entries. Pass a prefix like `r01-` to drop a
// whole record's entries (used by the Discogs refresh flow).
function clearPreviewCache(prefix) {
  const cache = loadCache();
  let changed = false;
  if (prefix) {
    for (const k of Object.keys(cache)) {
      if (k.startsWith(prefix)) { delete cache[k]; changed = true; }
    }
  } else {
    for (const k of Object.keys(cache)) delete cache[k];
    changed = true;
  }
  if (changed) saveCache(cache);
}

window.iTunesPreview = { getPreview, getPreviewDuration, clearPreviewCache };
