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
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const data = await res.json();
  const recordings = data.recordings || [];
  // Return MBIDs sorted by MB's score (already sorted descending).
  return recordings.map((r) => ({
    id: r.id,
    score: r.score || 0,
    title: r.title,
    artist: ((r["artist-credit"] || [])[0] || {}).name,
  }));
}

async function acousticBrainzLookup(mbid) {
  const url = "https://acousticbrainz.org/api/v1/" + mbid + "/low-level";
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null; // 404 = not in archive
  const data = await res.json();
  const bpmRaw = data.rhythm && data.rhythm.bpm;
  const bpm = typeof bpmRaw === "number" && bpmRaw > 0 ? Math.round(bpmRaw) : null;
  const keyRoot = data.tonal && data.tonal.key_key;
  const keyScale = data.tonal && data.tonal.key_scale;
  const key = toCamelot(keyRoot, keyScale);
  return { bpm: bpm, key: key };
}

// GetSongBPM fallback. Returns { result, debug } — debug carries diagnostics
// when the lookup fails so the caller can surface them.
async function getSongBpmLookup(artist, title) {
  const apiKey = Deno.env.get("GETSONGBPM_KEY");
  if (!apiKey) return { result: null, debug: { gs: "no-key" } };
  const lookup = "song:" + title + "+artist:" + artist;
  const url = "https://api.getsongbpm.com/search/?api_key=" +
    encodeURIComponent(apiKey) + "&type=both&lookup=" + encodeURIComponent(lookup);
  let res;
  try {
    res = await fetch(url);
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
  return { result: { bpm: bpm, key: key }, debug: { gs: "ok" } };
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
    if (candidates.length) {
      for (let i = 0; i < Math.min(candidates.length, 5); i++) {
        const c = candidates[i];
        const ab = await acousticBrainzLookup(c.id);
        if (ab && ab.bpm != null) {
          return jsonResponse({
            bpm: ab.bpm,
            key: ab.key,
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
        matched: true,
        source: "getsongbpm",
      });
    }

    // Nothing worked.
    const source = candidates.length ? "all:no-features" : "all:miss";
    return jsonResponse({
      bpm: null,
      key: null,
      matched: candidates.length > 0,
      source: source,
      mbid: candidates.length ? candidates[0].id : undefined,
      trackName: candidates.length ? candidates[0].title : undefined,
      trackArtist: candidates.length ? candidates[0].artist : undefined,
      gsDebug: gs.debug,
    });
  } catch (e) {
    return jsonResponse({ error: String(e && e.message ? e.message : e) }, 500);
  }
});
