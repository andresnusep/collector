// Supabase Edge Function: artist+title -> { bpm, key } (Camelot).
//
// Two-stage lookup:
//   1. MusicBrainz (MBID) -> AcousticBrainz (BPM + key). Free, no attribution.
//   2. Fallback to GetSongBPM when AcousticBrainz has no data for any MBID.
//      GetSongBPM requires attribution — client shows a backlink in the Analyze modal.
//
// MusicBrainz:    https://musicbrainz.org/ws/2/recording (1 req/sec, needs User-Agent)
// AcousticBrainz: https://acousticbrainz.org/api/v1/{mbid}/low-level (archived, coverage spotty)
// GetSongBPM:     https://api.getsongbpm.com/search (requires GETSONGBPM_KEY secret)
//
// Name says "spotify-features" for legacy reasons — the client still calls this URL.

const USER_AGENT = "KollectorStudio/0.4 (https://kollector.studio)";

// Per-request upstream timeouts. Without these, a slow/stalled upstream
// (MusicBrainz under rate pressure, AcousticBrainz on archived infra) will
// hang the whole edge function until Supabase's own timeout kills it — which
// surfaces as a 503 with no CORS headers.
const TIMEOUT_MS = {
  musicBrainz: 6000,
  acousticBrainz: 5000,
  getSongBpm: 6000,
};

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, init, { signal: ctrl.signal }));
  } finally {
    clearTimeout(tid);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Note name + scale -> Camelot.
const CAMELOT_MAJOR = {
  "C":  "8B",  "C#": "3B",  "Db": "3B",  "D": "10B", "D#": "5B",  "Eb": "5B",
  "E":  "12B", "F":  "7B",  "F#": "2B",  "Gb":"2B",  "G":  "9B",  "G#": "4B",
  "Ab": "4B",  "A":  "11B", "A#": "6B",  "Bb": "6B", "B":  "1B",  "Cb": "1B",
};
const CAMELOT_MINOR = {
  "C":  "5A",  "C#": "12A", "Db": "12A", "D":  "7A",  "D#": "2A",  "Eb": "2A",
  "E":  "9A",  "F":  "4A",  "F#": "11A", "Gb": "11A", "G":  "6A",  "G#": "1A",
  "Ab": "1A",  "A":  "8A",  "A#": "3A",  "Bb": "3A",  "B":  "10A",
};

function toCamelot(keyRoot, keyScale) {
  if (!keyRoot) return null;
  const root = String(keyRoot).trim();
  const scale = String(keyScale || "").toLowerCase();
  const table = scale === "minor" ? CAMELOT_MINOR : CAMELOT_MAJOR;
  return table[root] || null;
}

function cleanTitle(s) {
  return String(s)
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s*\[[^\]]*\]/g, " ")
    .replace(/\bfeat\.?\b.*$/i, " ")
    .replace(/\bft\.?\b.*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(s) {
  return String(s).split(/\s*(?:&|,|feat\.?|ft\.?|and)\s+/i)[0].trim();
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({}, CORS, { "content-type": "application/json" }),
  });
}

async function musicBrainzSearch(artist, title) {
  // Quote-escape both fields.
  const qArtist = artist.replace(/"/g, "");
  const qTitle = title.replace(/"/g, "");
  const q = `artist:"${qArtist}" AND recording:"${qTitle}"`;
  const url = "https://musicbrainz.org/ws/2/recording?query=" +
    encodeURIComponent(q) + "&fmt=json&limit=5";
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, TIMEOUT_MS.musicBrainz);
  } catch {
    return []; // timeout or network error
  }
  if (!res.ok) return [];
  const data = await res.json();
  const recordings = data.recordings || [];
  return recordings.map((r) => ({
    id: r.id,
    score: r.score || 0,
    title: r.title,
    artist: ((r["artist-credit"] || [])[0] || {}).name,
    // MusicBrainz returns recording length in ms. Used as a duration fallback
    // when the AcousticBrainz payload for this MBID lacks audio_properties.
    lengthMs: typeof r.length === "number" && r.length > 0 ? r.length : null,
  }));
}

async function acousticBrainzLookup(mbid) {
  const url = "https://acousticbrainz.org/api/v1/" + mbid + "/low-level";
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT } }, TIMEOUT_MS.acousticBrainz);
  } catch {
    return null; // timeout = treat as "not in archive"
  }
  if (!res.ok) return null;
  const data = await res.json();
  const bpmRaw = data.rhythm && data.rhythm.bpm;
  const bpm = typeof bpmRaw === "number" && bpmRaw > 0 ? Math.round(bpmRaw) : null;
  const keyRoot = data.tonal && data.tonal.key_key;
  const keyScale = data.tonal && data.tonal.key_scale;
  const key = toCamelot(keyRoot, keyScale);
  // AcousticBrainz stores length in seconds (float) under audio_properties.
  const lenSec = data.metadata && data.metadata.audio_properties &&
    data.metadata.audio_properties.length;
  const lengthMs = typeof lenSec === "number" && lenSec > 0
    ? Math.round(lenSec * 1000) : null;
  return { bpm: bpm, key: key, lengthMs: lengthMs };
}

// GetSongBPM fallback. Returns { result, debug } — debug carries diagnostics
// when the lookup fails so the caller can surface them.
async function getSongBpmLookup(artist, title) {
  const apiKey = Deno.env.get("GETSONGBPM_KEY");
  if (!apiKey) return { result: null, debug: { gs: "no-key" } };
  const lookup = "song:" + title + "+artist:" + artist;
  const url = "https://api.getsongbpm.com/search/?api_key=" +
    encodeURIComponent(apiKey) + "&type=both&lookup=" + encodeURIComponent(lookup);
  // Browser-like headers so Cloudflare doesn't bot-challenge us.
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://kollector.studio/",
  };
  let res;
  try {
    res = await fetchWithTimeout(url, { headers: headers }, TIMEOUT_MS.getSongBpm);
  } catch (e) {
    return { result: null, debug: { gs: "fetch-threw", err: String(e) } };
  }
  const ct = res.headers.get("content-type") || "";
  const body = await res.text();
  if (!res.ok) {
    return {
      result: null,
      debug: { gs: "http-" + res.status, ct: ct, snippet: body.slice(0, 200) },
    };
  }
  if (!ct.includes("application/json")) {
    return {
      result: null,
      debug: { gs: "non-json", ct: ct, snippet: body.slice(0, 200) },
    };
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    return { result: null, debug: { gs: "bad-json", snippet: body.slice(0, 200) } };
  }
  const hit = Array.isArray(data.search) ? data.search[0] : null;
  if (!hit) {
    const searchType = typeof data.search;
    const msg = (data.search && data.search.error) || data.error || null;
    return {
      result: null,
      debug: { gs: "no-hit", searchType: searchType, msg: msg },
    };
  }
  const bpmRaw = Number(hit.tempo);
  const bpm = Number.isFinite(bpmRaw) && bpmRaw > 0 ? Math.round(bpmRaw) : null;
  const key = noteToCamelot(hit.key_of);
  // GetSongBPM returns `duration` as either a "m:ss" string or a number of
  // seconds depending on the endpoint. Handle both defensively.
  const lengthMs = parseGsDuration(hit.duration);
  return { result: { bpm: bpm, key: key, lengthMs: lengthMs }, debug: { gs: "ok" } };
}

// Parse GetSongBPM's loosely-typed duration field into ms.
function parseGsDuration(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return raw > 0 ? Math.round(raw * 1000) : null;
  }
  const s = String(raw).trim();
  if (!s) return null;
  // "3:45" / "3:45.2" / "1:02:33"
  const parts = s.split(":").map((p) => Number(p));
  if (parts.every((n) => Number.isFinite(n))) {
    let sec = 0;
    for (const n of parts) sec = sec * 60 + n;
    return sec > 0 ? Math.round(sec * 1000) : null;
  }
  // Plain number-as-string ("223")
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null;
}

// Parse "C", "Am", "F#m", "Bb" -> Camelot. Also passes through existing Camelot ("5A").
function noteToCamelot(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^([1-9]|1[0-2])[AB]$/i.test(s)) return s.toUpperCase();
  const m = s.match(/^([A-Ga-g][#b]?)\s*(m|min|minor)?$/);
  if (!m) return null;
  const note = m[1][0].toUpperCase() + m[1].slice(1);
  return toCamelot(note, m[2] ? "minor" : "major");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const url = new URL(req.url);
  const artistRaw = url.searchParams.get("artist") || "";
  const titleRaw = url.searchParams.get("title") || "";
  if (!artistRaw || !titleRaw) {
    return jsonResponse({ error: "missing artist or title" }, 400);
  }

  const artist = cleanArtist(artistRaw);
  const title = cleanTitle(titleRaw);

  try {
    // Step 1: find MBIDs on MusicBrainz.
    const candidates = await musicBrainzSearch(artist, title);

    // Step 2: walk candidates until one has AcousticBrainz data with at least BPM.
    // Even when AB misses, we still carry the MusicBrainz-reported length through
    // so callers can backfill duration from MB alone.
    if (candidates.length) {
      for (let i = 0; i < Math.min(candidates.length, 5); i++) {
        const c = candidates[i];
        const ab = await acousticBrainzLookup(c.id);
        if (ab && ab.bpm != null) {
          return jsonResponse({
            bpm: ab.bpm,
            key: ab.key,
            // Prefer AB length (matches the specific recording); fall back to
            // the MusicBrainz-reported length for the same MBID.
            lengthMs: ab.lengthMs != null ? ab.lengthMs : c.lengthMs,
            matched: true,
            source: "acousticbrainz",
            mbid: c.id,
            trackName: c.title,
            trackArtist: c.artist,
            mbScore: c.score,
          });
        }
      }
    }

    // Step 3: fallback to GetSongBPM.
    const gs = await getSongBpmLookup(artist, title);
    if (gs.result && gs.result.bpm != null) {
      return jsonResponse({
        bpm: gs.result.bpm,
        key: gs.result.key,
        // GS duration first, MB duration next (in case GS has no duration but
        // we did match an MBID earlier in step 1).
        lengthMs: gs.result.lengthMs != null
          ? gs.result.lengthMs
          : (candidates.length ? candidates[0].lengthMs : null),
        matched: true,
        source: "getsongbpm",
      });
    }

    // Nothing worked for BPM/key — but we might still have a duration from
    // MusicBrainz alone (common when AB has no data for the recording).
    // Debug-only: set DEBUG_BPM_LOOKUP=1 to echo the GetSongBPM failure reason.
    const source = candidates.length ? "all:no-features" : "all:miss";
    const debugOn = Deno.env.get("DEBUG_BPM_LOOKUP") === "1";
    return jsonResponse({
      bpm: null,
      key: null,
      lengthMs: candidates.length ? candidates[0].lengthMs : null,
      matched: candidates.length > 0,
      source: source,
      mbid: candidates.length ? candidates[0].id : undefined,
      trackName: candidates.length ? candidates[0].title : undefined,
      trackArtist: candidates.length ? candidates[0].artist : undefined,
      gsDebug: debugOn ? gs.debug : undefined,
    });
  } catch (e) {
    return jsonResponse({ error: String(e && e.message ? e.message : e) }, 500);
  }
});
