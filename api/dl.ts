export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  const apkUrl =
    'https://github.com/Youkow69/8kpro-iptv/releases/download/v1.0.0/8kpro.apk';

  // Follow GitHub redirects and stream the APK
  const resp = await fetch(apkUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
    redirect: 'follow',
  });

  if (!resp.ok) {
    return new Response('Download failed', { status: 502 });
  }

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="8kpro.apk"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
