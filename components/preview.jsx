// iTunes 30-second preview lookup. Free, no key. Cached per track.
// Uses a scored top-N match (not just the first result) so that the
// original version wins over remixes, live versions, karaoke, etc.

const CACHE_KEY = 'cs-itunes-cache';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
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

async function fetchPreviewUrl(artist, title) {
  if (!artist || !title) return null;
  const cleanTitle = String(title).replace(/\s*\([^)]*\)/g, '').trim();
  const term = `${artist} ${cleanTitle}`.trim();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return null;
    const scored = results
      .map(r => ({ r, s: scoreResult(r, artist, cleanTitle) }))
      .sort((a, b) => b.s - a.s);
    // Reject if the best match is still weak — better to show no preview
    // than a confidently-wrong one.
    if (scored[0].s < 35) return null;
    return scored[0].r.previewUrl || null;
  } catch { return null; }
}

async function getPreview(trackKey, artist, title, opts = {}) {
  const cache = loadCache();
  if (!opts.force && trackKey in cache) return cache[trackKey];
  const url = await fetchPreviewUrl(artist, title);
  cache[trackKey] = url || null;
  saveCache(cache);
  return url;
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

window.iTunesPreview = { getPreview, clearPreviewCache };
