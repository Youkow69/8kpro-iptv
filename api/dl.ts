export const config = {
  runtime: 'edge',
};

export default async function handler(): Promise<Response> {
  // Redirect to static APK in public folder
  return Response.redirect('https://iptv-smarters-vert.vercel.app/8kpro.apk', 302);
}
