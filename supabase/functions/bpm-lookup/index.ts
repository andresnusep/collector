// Supabase Edge Function: proxy GetSongBPM with CORS headers.
// Deploy: supabase functions deploy bpm-lookup --no-verify-jwt
// Set key:  supabase secrets set GETSONGBPM_KEY=your_key

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const lookup = url.searchParams.get('lookup');
  if (!lookup) {
    return new Response(JSON.stringify({ error: 'missing lookup' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('GETSONGBPM_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'server missing GETSONGBPM_KEY' }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const upstream = `https://api.getsongbpm.com/search/?api_key=${encodeURIComponent(apiKey)}&type=both&lookup=${encodeURIComponent(lookup)}`;
  try {
    const res = await fetch(upstream);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});
