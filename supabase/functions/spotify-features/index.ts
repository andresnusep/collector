// Supabase Edge Function: artist+title -> MusicBrainz (MBID) -> AcousticBrainz (BPM + key).
// Returns { bpm, key } where key is Camelot notation.
//
// MusicBrainz:  https://musicbrainz.org/ws/2/recording (1 req/sec, needs User-Agent)
// AcousticBrainz: https://acousticbrainz.org/api/v1/{mbid}/low-level (no auth, archived but data lives)
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
    if (!candidates.length) {
      return jsonResponse({ bpm: null, key: null, matched: false, source: "musicbrainz:miss" });
    }

    // Step 2: walk candidates until one has AcousticBrainz data with at least BPM.
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

    // MBIDs found but none had AcousticBrainz features.
    return jsonResponse({
      bpm: null,
      key: null,
      matched: true,
      source: "acousticbrainz:no-features",
      mbid: candidates[0].id,
      trackName: candidates[0].title,
      trackArtist: candidates[0].artist,
    });
  } catch (e) {
    return jsonResponse({ error: String(e && e.message ? e.message : e) }, 500);
  }
});
