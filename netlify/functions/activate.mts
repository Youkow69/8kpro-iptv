import type { Context } from "@netlify/functions";

const SUPABASE_URL = 'https://gqptnqmcofqhyvfuzqjy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHRucW1jb2ZxaHl2ZnV6cWp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDM2NzIsImV4cCI6MjA4OTkxOTY3Mn0.zAy8woLJbH1k7ALubhesnrdDVSs1wCpv_hqcqbt2BWU';

const corsHeaders = {
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

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const rawMac = url.searchParams.get('mac')?.toUpperCase().replace(/[^0-9A-F]/g, '') || '';
    const listAll = url.searchParams.get('list') === 'all';
    const adminKey = url.searchParams.get('adminKey');

    if (listAll) {
      if (adminKey !== (process.env.ADMIN_KEY || '8kpro2026')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }
      const res = await supaFetch('devices?select=*&order=created_at.desc');
      const devices = await res.json();
      return Response.json(devices, { headers: corsHeaders });
    }

    if (!rawMac) return Response.json({ error: 'MAC required' }, { status: 400, headers: corsHeaders });
    const mac = rawMac.match(/.{1,2}/g)?.join(':') || rawMac;

    const res = await supaFetch(`devices?mac=eq.${encodeURIComponent(mac)}&status=eq.active&select=*`);
    const devices = await res.json();

    if (devices.length > 0) {
      const d = devices[0];
      return Response.json({
        activated: true,
        username: d.iptv_username,
        password: d.iptv_password,
        server: d.server_url,
      }, { headers: corsHeaders });
    }
    return Response.json({ activated: false }, { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { mac, m3u_url, adminKey, device_key, name, username, notes } = body;

      if (adminKey !== (process.env.ADMIN_KEY || '8kpro2026')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }

      if (!mac || !m3u_url) {
        return Response.json({ error: 'MAC and M3U URL required' }, { status: 400, headers: corsHeaders });
      }

      const parsedUrl = new URL(m3u_url);
      const iptvUser = parsedUrl.searchParams.get('username');
      const iptvPass = parsedUrl.searchParams.get('password');
      if (!iptvUser || !iptvPass) {
        return Response.json({ error: 'Invalid M3U URL' }, { status: 400, headers: corsHeaders });
      }

      const serverUrl = parsedUrl.origin;
      const macClean = mac.toUpperCase();

      const existing = await supaFetch(`devices?mac=eq.${encodeURIComponent(macClean)}&select=id`);
      const existingData = await existing.json();

      let res;
      if (existingData.length > 0) {
        res = await supaFetch(`devices?mac=eq.${encodeURIComponent(macClean)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            device_key: device_key || null, name: name || null, username: username || null,
            server_url: serverUrl, iptv_username: iptvUser, iptv_password: iptvPass,
            m3u_url, status: 'active', notes: notes || null, updated_at: new Date().toISOString(),
          }),
        });
      } else {
        res = await supaFetch('devices', {
          method: 'POST',
          body: JSON.stringify({
            mac: macClean, device_key: device_key || null, name: name || null, username: username || null,
            server_url: serverUrl, iptv_username: iptvUser, iptv_password: iptvPass,
            m3u_url, status: 'active', notes: notes || null,
          }),
        });
      }

      if (res.ok) {
        return Response.json({ success: true, mac: macClean, username: iptvUser }, { headers: corsHeaders });
      }
      const err = await res.text();
      return Response.json({ error: 'DB error: ' + err }, { status: 500, headers: corsHeaders });
    } catch {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
    }
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const mac = url.searchParams.get('mac')?.toUpperCase();
    if (!mac) return Response.json({ error: 'MAC required' }, { status: 400, headers: corsHeaders });

    await supaFetch(`devices?mac=eq.${encodeURIComponent(mac)}`, { method: 'DELETE' });
    return Response.json({ success: true }, { headers: corsHeaders });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
};

export const config = {
  path: "/api/activate",
};
