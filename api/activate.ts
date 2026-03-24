export const config = { runtime: 'edge' };

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'Youkow69/8kpro-iptv';
const FILE_PATH = 'devices.json';

async function getDevices(): Promise<Record<string, { username: string; password: string; server: string }>> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const content = atob(data.content);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveDevices(devices: Record<string, any>): Promise<boolean> {
  try {
    // Get current SHA
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
    });
    let sha = '';
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    const body: any = {
      message: 'Update devices',
      content: btoa(JSON.stringify(devices, null, 2)),
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return putRes.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

  // GET - check if MAC is activated
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mac = url.searchParams.get('mac')?.replace(/:/g, '').toLowerCase();
    if (!mac) return new Response(JSON.stringify({ error: 'MAC required' }), { status: 400, headers });

    const devices = await getDevices();
    const device = devices[mac];
    if (device) {
      return new Response(JSON.stringify({ activated: true, ...device }), { status: 200, headers });
    }
    return new Response(JSON.stringify({ activated: false }), { status: 200, headers });
  }

  // POST - register MAC with M3U URL (admin only)
  if (req.method === 'POST') {
    try {
      const { mac, m3u_url, adminKey } = await req.json();

      // Simple admin auth
      if (adminKey !== (process.env.ADMIN_KEY || '8kpro2026')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
      }

      if (!mac || !m3u_url) {
        return new Response(JSON.stringify({ error: 'MAC and M3U URL required' }), { status: 400, headers });
      }

      // Parse M3U URL to extract credentials
      const parsedUrl = new URL(m3u_url);
      const username = parsedUrl.searchParams.get('username');
      const password = parsedUrl.searchParams.get('password');
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'Invalid M3U URL - missing username/password' }), { status: 400, headers });
      }

      const server = parsedUrl.origin;
      const macClean = mac.replace(/:/g, '').toLowerCase();

      const devices = await getDevices();
      devices[macClean] = { username, password, server };
      const saved = await saveDevices(devices);

      if (saved) {
        return new Response(JSON.stringify({ success: true, mac: macClean, username }), { status: 200, headers });
      }
      return new Response(JSON.stringify({ error: 'Failed to save' }), { status: 500, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}
