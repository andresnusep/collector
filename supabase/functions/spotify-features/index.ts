// Supabase Edge Function: artist+title -> Spotify track -> audio features.
// Returns { bpm, key } where key is Camelot notation.
//
// Deploy:  supabase functions deploy spotify-features
// Secrets: supabase secrets set SPOTIFY_CLIENT_SECRET=your_secret
//
// Client ID is public so hardcoded below.

const SPOTIFY_CLIENT_ID = "cc00d64070b54dd5875b94a7500116f5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30000) {
    return cachedToken.token;
  }
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!secret) throw new Error("server missing SPOTIFY_CLIENT_SECRET");

  const basic = btoa(SPOTIFY_CLIENT_ID + ":" + secret);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("spotify auth failed: " + res.status + " " + body.slice(0, 200));
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

const MAJOR = ["8B","3B","10B","5B","12B","7B","2B","9B","4B","11B","6B","1B"];
const MINOR = ["5A","12A","7A","2A","9A","4A","11A","6A","1A","8A","3A","10A"];

function toCamelot(key, mode) {
  if (typeof key !== "number" || key < 0 || key > 11) return null;
  return mode === 1 ? MAJOR[key] : MINOR[key];
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
    const token = await getAccessToken();

    const q = "track:" + title + " artist:" + artist;
    const searchUrl = "https://api.spotify.com/v1/search?q=" +
      encodeURIComponent(q) + "&type=track&limit=5";
    const sr = await fetch(searchUrl, {
      headers: { "Authorization": "Bearer " + token },
    });
    if (!sr.ok) {
      return jsonResponse({ error: "spotify search failed", status: sr.status }, 502);
    }
    const sdata = await sr.json();
    const items = (sdata.tracks && sdata.tracks.items) || [];
    if (!items.length) {
      return jsonResponse({ bpm: null, key: null, matched: false });
    }

    const lowArtist = artist.toLowerCase();
    const lowTitle = title.toLowerCase();
    const altWords = ["remix","live","karaoke","cover","instrumental","acoustic","demo","edit"];
    let wantsAlt = false;
    for (let i = 0; i < altWords.length; i++) {
      if (lowTitle.indexOf(altWords[i]) !== -1) { wantsAlt = true; break; }
    }

    const scored = items.map(function (it) {
      const name = String(it.name || "").toLowerCase();
      const artNames = (it.artists || []).map(function (a) {
        return String(a.name || "").toLowerCase();
      });
      let s = 0;
      let exactArtist = false;
      let partialArtist = false;
      for (let i = 0; i < artNames.length; i++) {
        const n = artNames[i];
        if (n === lowArtist) { exactArtist = true; break; }
        if (n.indexOf(lowArtist) !== -1 || lowArtist.indexOf(n) !== -1) partialArtist = true;
      }
      if (exactArtist) s += 50;
      else if (partialArtist) s += 30;
      if (name === lowTitle) s += 30;
      else if (name.indexOf(lowTitle) !== -1 || lowTitle.indexOf(name) !== -1) s += 18;
      if (!wantsAlt) {
        for (let i = 0; i < altWords.length; i++) {
          if (name.indexOf(altWords[i]) !== -1) { s -= 15; break; }
        }
      }
      s += Math.min(20, Math.floor((it.popularity || 0) / 5));
      return { it: it, s: s };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    const best = scored[0] && scored[0].it;
    if (!best) {
      return jsonResponse({ bpm: null, key: null, matched: false });
    }

    const afUrl = "https://api.spotify.com/v1/audio-features/" + best.id;
    const afr = await fetch(afUrl, {
      headers: { "Authorization": "Bearer " + token },
    });
    if (!afr.ok) {
      return jsonResponse({
        bpm: null, key: null, matched: true,
        spotifyId: best.id, trackName: best.name,
        error: "audio-features failed", status: afr.status,
      });
    }
    const af = await afr.json();
    const tempo = af.tempo;
    const bpm = typeof tempo === "number" && tempo > 0 ? Math.round(tempo) : null;
    const key = toCamelot(af.key, af.mode);

    return jsonResponse({
      bpm: bpm,
      key: key,
      matched: true,
      spotifyId: best.id,
      trackName: best.name,
      trackArtist: (best.artists || []).map(function (a) { return a.name; }).join(", "),
    });
  } catch (e) {
    return jsonResponse({ error: String(e && e.message ? e.message : e) }, 500);
  }
});
