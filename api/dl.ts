export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  // Simple redirect to GitHub release - Downloader will follow it
  return new Response(null, {
    status: 302,
    headers: {
      'Location': 'https://github.com/Youkow69/8kpro-iptv/releases/download/v1.0.4/app-release.apk',
    },
  });
}
