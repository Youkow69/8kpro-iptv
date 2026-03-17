export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  // Fetch the APK from GitHub and stream it directly (avoids redirect issues with Downloader)
  const ghUrl = 'https://github.com/Youkow69/8kpro-iptv/releases/download/v1.0.2/app-release.apk';

  const res = await fetch(ghUrl, {
    redirect: 'follow',
  });

  if (!res.ok) {
    return new Response('Download failed', { status: 502 });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="8kpro.apk"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
