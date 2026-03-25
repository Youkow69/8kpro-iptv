export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  // Redirect to GitHub raw release download
  // GitHub releases follow redirects, Downloader handles 302
  return new Response(null, {
    status: 302,
    headers: {
      'Location': 'https://github.com/Youkow69/8kpro-iptv/releases/download/v2.0.0/8kpro.apk',
      'Cache-Control': 'no-cache',
    },
  });
}
