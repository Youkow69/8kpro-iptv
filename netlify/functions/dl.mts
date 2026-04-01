import type { Context } from "@netlify/functions";

const APK_URL = 'https://github.com/Youkow69/8kpro-iptv/releases/latest/download/8kpro.apk';

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (code && code.toLowerCase() !== '8k') {
    return Response.json({ error: 'Invalid code' }, { status: 400 });
  }

  try {
    const res = await fetch(APK_URL, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
      },
    });

    if (!res.ok || !res.body) {
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
    return new Response(null, {
      status: 302,
      headers: { 'Location': APK_URL, 'Cache-Control': 'no-cache' },
    });
  }
};

export const config = {
  path: ["/api/dl", "/dl"],
};
