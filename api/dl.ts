export const config = {
  runtime: 'edge',
};

const APK_URL = 'https://github.com/Youkow69/8kpro-iptv/releases/latest/download/8kpro.apk';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  // Short code support: /api/dl?code=8k -> download APK
  // This makes it easy to type on TV: 8kproultimate.vercel.app/api/dl?code=8k
  if (code && code.toLowerCase() !== '8k') {
    return new Response(JSON.stringify({ error: 'Invalid code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Follow GitHub redirects and stream the APK directly
  // Downloader app on Android TV doesn't always handle multiple 302s
  try {
    const res = await fetch(APK_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      },
    });

    if (!res.ok || !res.body) {
      // Fallback to redirect
      return new Response(null, {
        status: 302,
        headers: { 'Location': APK_URL, 'Cache-Control': 'no-cache' },
      });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="8kpro.apk"',
        'Content-Length': res.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    // Fallback to redirect on error
    return new Response(null, {
      status: 302,
      headers: { 'Location': APK_URL, 'Cache-Control': 'no-cache' },
    });
  }
}
