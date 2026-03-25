export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://gqptnqmcofqhyvfuzqjy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHRucW1jb2ZxaHl2ZnV6cWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDM2NzIsImV4cCI6MjA4OTkxOTY3Mn0.zAy8woLJbH1k7ALubhesnrdDVSs1wCpv_hqcqbt2BWU';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function supaFetch(path: string, options?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options?.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...options?.headers,
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

  // GET - check if MAC is activated (player app calls this)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const rawMac = url.searchParams.get('mac')?.toUpperCase().replace(/[^0-9A-F]/g, '') || '';
    if (!rawMac) return new Response(JSON.stringify({ error: 'MAC required' }), { status: 400, headers });
    // Normalize to XX:XX:XX:XX:XX:XX format
    const mac = rawMac.match(/.{1,2}/g)?.join(':') || rawMac;

    const res = await supaFetch(`devices?mac=eq.${encodeURIComponent(mac)}&status=eq.active&select=*`);
    const devices = await res.json();

    if (devices.length > 0) {
      const d = devices[0];
      return new Response(JSON.stringify({
        activated: true,
        username: d.iptv_username,
        password: d.iptv_password,
        server: d.server_url,
      }), { status: 200, headers });
    }
    return new Response(JSON.stringify({ activated: false }), { status: 200, headers });
  }

  // POST - register MAC with M3U URL (admin panel calls this)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { mac, m3u_url, adminKey, device_key, name, username, notes } = body;

      if (adminKey !== (process.env.ADMIN_KEY || '8kpro2026')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
      }

      if (!mac || !m3u_url) {
        return new Response(JSON.stringify({ error: 'MAC and M3U URL required' }), { status: 400, headers });
      }

      // Parse M3U URL to extract credentials
      const parsedUrl = new URL(m3u_url);
      const iptvUser = parsedUrl.searchParams.get('username');
      const iptvPass = parsedUrl.searchParams.get('password');
      if (!iptvUser || !iptvPass) {
        return new Response(JSON.stringify({ error: 'Invalid M3U URL' }), { status: 400, headers });
      }

      const serverUrl = parsedUrl.origin;
      const macClean = mac.toUpperCase();

      // Upsert device (insert or update if MAC exists)
      const existing = await supaFetch(`devices?mac=eq.${encodeURIComponent(macClean)}&select=id`);
      const existingData = await existing.json();

      let res;
      if (existingData.length > 0) {
        // Update
        res = await supaFetch(`devices?mac=eq.${encodeURIComponent(macClean)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            device_key: device_key || null,
            name: name || null,
            username: username || null,
            server_url: serverUrl,
            iptv_username: iptvUser,
            iptv_password: iptvPass,
            m3u_url: m3u_url,
            status: 'active',
            notes: notes || null,
            updated_at: new Date().toISOString(),
          }),
        });
      } else {
        // Insert
        res = await supaFetch('devices', {
          method: 'POST',
          body: JSON.stringify({
            mac: macClean,
            device_key: device_key || null,
            name: name || null,
            username: username || null,
            server_url: serverUrl,
            iptv_username: iptvUser,
            iptv_password: iptvPass,
            m3u_url: m3u_url,
            status: 'active',
            notes: notes || null,
          }),
        });
      }

      if (res.ok) {
        return new Response(JSON.stringify({ success: true, mac: macClean, username: iptvUser }), { status: 200, headers });
      }
      const err = await res.text();
      return new Response(JSON.stringify({ error: 'DB error: ' + err }), { status: 500, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
    }
  }

  // DELETE - remove device
  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const mac = url.searchParams.get('mac')?.toUpperCase();
    if (!mac) return new Response(JSON.stringify({ error: 'MAC required' }), { status: 400, headers });

    await supaFetch(`devices?mac=eq.${encodeURIComponent(mac)}`, { method: 'DELETE' });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}
