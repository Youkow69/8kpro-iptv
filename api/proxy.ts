export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const targetUrl = new URL(target);
    // Forward all query params except 'url'
    url.searchParams.forEach((value, key) => {
      if (key !== 'url') targetUrl.searchParams.set(key, value);
    });

    const targetOrigin = targetUrl.origin;
    const isSegment = target.includes('.ts') || target.includes('.aac') || target.includes('.mp4');
    // Validate app token (optional - reject non-app requests if token present)
    const appId = request.headers.get('x-app-id');
    const appToken = request.headers.get('x-app-token');

    const fetchHeaders: Record<string, string> = {
      'User-Agent': appId === 'com.pro8k.iptv'
        ? '8KPro-IPTV/2.0.0 (Proxy; EdgeFunction)'
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: '*/*',
    };
    // Only send Referer/Origin for non-segment requests (API, m3u8)
    // HLS segment servers often reject requests with wrong Referer
    if (!isSegment) {
      fetchHeaders['Referer'] = targetOrigin + '/';
      fetchHeaders['Origin'] = targetOrigin;
    }
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const proxyRes = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: fetchHeaders,
      redirect: 'follow',
    });

    const ct = proxyRes.headers.get('content-type') || '';
    const isM3u8 =
      target.includes('.m3u8') || ct.includes('mpegurl') || ct.includes('x-mpegURL');

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (isM3u8) {
      let body = await proxyRes.text();
      const finalUrl = proxyRes.url || targetUrl.toString();
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
      const origin = new URL(finalUrl).origin;

      // Determine the absolute proxy base URL from the incoming request
      const reqUrl = new URL(request.url);
      const proxyBase = reqUrl.origin + '/api/proxy';

      // Rewrite ALL URLs (playlists + segments) through proxy
      // IPTV servers bind segments to the IP that requested the playlist,
      // so segments must also go through the same proxy to maintain IP consistency
      body = body.replace(/^(?!#)(.+)$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        let absoluteUrl: string;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          absoluteUrl = trimmed;
        } else if (trimmed.startsWith('/')) {
          absoluteUrl = origin + trimmed;
        } else {
          absoluteUrl = baseUrl + trimmed;
        }
        // Proxy everything - playlists AND segments
        return proxyBase + '?url=' + encodeURIComponent(absoluteUrl);
      });

      return new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
        },
      });
    }

    // Non-m3u8: stream through with full headers
    const responseHeaders = new Headers(corsHeaders);
    if (ct) responseHeaders.set('Content-Type', ct);
    const cl = proxyRes.headers.get('content-length');
    if (cl) responseHeaders.set('Content-Length', cl);
    const cr = proxyRes.headers.get('content-range');
    if (cr) responseHeaders.set('Content-Range', cr);
    const ar = proxyRes.headers.get('accept-ranges');
    responseHeaders.set('Accept-Ranges', ar || 'bytes');

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Proxy error', message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
