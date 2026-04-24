// Supabase Edge Function: resolve artist+title → Spotify track →
// audio features (tempo / key). Normalized to { bpm, key } where key
// is Camelot notation.
//
// Deploy:  supabase functions deploy spotify-features
// Secrets: supabase secrets set SPOTIFY_CLIENT_SECRET=your_secret
//
// Client ID is public so it's hardcoded below.

const SPOTIFY_CLIENT_ID = '9c56376392234db29ec8efdd0f98789d';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory token cache (survives across warm invocations).
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }
  const secret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!secret) throw new Error('server missing SPOTIFY_CLIENT_SECRET');

  const basic = btoa(`${SPOTIFY_CLIENT_ID}:${secret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`spotify auth failed: ${res.status}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };
  return cachedToken.token;
}

// Pitch-class → Camelot map. Spotify returns key 0..11 (C..B) and mode
// 0 (minor) or 1 (major).
//                  C   C#  D   D#  E   F   F#  G   G#  A   A#  B
const MAJOR = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
const MINOR = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];

function toCamelot(key: number, mode: number): string | null {
  if (key < 0 || key > 11) return null;
  return mode === 1 ? MAJOR[key] : MINOR[key];
}

// Strip parens, "feat." etc. to improve Spotify search hit rate.
function cleanTitle(s: string): string {
  return s
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s*\[[^\]]*\]/g, ' ')
    .replace(/\bfeat\.?\b.*$/i, ' ')
    .replace(/\bft\.?\b.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtist(s: string): string {
  // Take first artist if "A & B" / "A, B" / "A feat. B".
  return s
    .split(/\s*(?:&|,|feat\.?|ft\.?|and)\s+/i)[0]
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const artistRaw = url.searchParams.get('artist') || '';
  const titleRaw  = url.searchParams.get('title')  || '';
  if (!artistRaw || !titleRaw) {
    return new Response(JSON.stringify({ error: 'missing artist or title' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const artist = cleanArtist(artistRaw);
  const title  = cleanTitle(titleRaw);

  try {
    const token = await getAccessToken();

    // 1. Search for the track.
    const q = `track:${title} artist:${artist}`;
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`;
    const sr = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!sr.ok) {
      return new Response(JSON.stringify({ error: 'spotify search failed', status: sr.status }), {
        status: 502,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    const sdata = await sr.json();
    const items = sdata.tracks?.items || [];
    if (!items.length) {
      return new Response(JSON.stringify({ bpm: null, key: null, matched: false }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    // 2. Pick the best match: prefer exact-ish artist+title match; fall
    //    back to first result. Also de-prioritize "remix"/"live"/etc.
    const lowArtist = artist.toLowerCase();
    const lowTitle  = title.toLowerCase();
    const altWords = ['remix','live','karaoke','cover','instrumental','acoustic','demo','edit'];
    const wantsAlt = altWords.some(w => lowTitle.includes(w));
    const scored = items.map((it: any) => {
      const name = (it.name || '').toLowerCase();
      const artNames = (it.artists || []).map((a: any) => (a.name || '').toLowerCase());
      let s = 0;
      if (artNames.some((n: string) => n === lowArtist)) s += 50;
      else if (artNames.some((n: string) => n.includes(lowArtist) || lowArtist.includes(n))) s += 30;
      if (name === lowTitle) s += 30;
      else if (name.includes(lowTitle) || lowTitle.includes(name)) s += 18;
      if (!wantsAlt) for (const w of altWords) if (name.includes(w)) { s -= 15; break; }
      s += Math.min(20, Math.floor((it.popularity || 0) / 5));
      return { it, s };
    }).sort((a: any, b: any) => b.s - a.s);
    const best = scored[0].it;
    if (!best) {
      return new Response(JSON.stringify({ bpm: null, key: null, matched: false }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }

    // 3. Audio features.
    const afUrl = `https://api.spotify.com/v1/audio-features/${best.id}`;
    const afr = await fetch(afUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!afr.ok) {
      return new Response(JSON.stringify({
        bpm: null, key: null, matched: true,
        spotifyId: best.id, trackName: best.name,
        error: 'audio-features failed', status: afr.status,
      }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    const af = await afr.json();
    const bpm = Number.isFinite(af.tempo) && af.tempo > 0 ? Math.round(af.tempo) : null;
    const key = toCamelot(af.key, af.mode);

    return new Response(JSON.stringify({
      bpm, key, matched: true,
      spotifyId: best.id,
      trackName: best.name,
      trackArtist: (best.artists || []).map((a: any) => a.name).join(', '),
    }), {
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
