import axios from 'axios';
import type {
  XtreamCredentials,
  AuthResponse,
  Category,
  LiveStream,
  VodStream,
  Series,
  SeriesInfo,
} from '../types/xtream';
import { getSecureHeaders } from './security';

// On native (Capacitor), use Vercel proxy since IPTV servers are behind Cloudflare
// and block direct requests. On web, use relative /api/proxy (same origin).
function isNative(): boolean {
  const cap = (window as any)?.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return !!cap.platform && cap.platform !== 'web';
}

const VERCEL_PROXY = 'https://8kproultimate.vercel.app/api/proxy';
// Always use absolute URL — mpegts.js worker can't resolve relative URLs
const PROXY = isNative()
  ? VERCEL_PROXY
  : (window.location.origin + '/api/proxy');

function proxyUrl(creds: XtreamCredentials, params?: Record<string, string>) {
  const server = creds.server.replace(/\/+$/, '');
  const target = `${server}/player_api.php`;

  // Native app: connect DIRECTLY (Cloudflare allows mobile IPs, blocks datacenter IPs)
  if (isNative()) {
    const sp = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      ...params,
    });
    return `${target}?${sp.toString()}`;
  }

  // Web: use proxy (needed for CORS + Cloudflare)
  const sp = new URLSearchParams({
    url: target,
    username: creds.username,
    password: creds.password,
    ...params,
  });
  return `${PROXY}?${sp.toString()}`;
}

// Axios instance with secure headers
const secureAxios = axios.create();
secureAxios.interceptors.request.use((config) => {
  const headers = getSecureHeaders();
  for (const [key, value] of Object.entries(headers)) {
    config.headers.set(key, value);
  }
  return config;
});

export async function authenticate(creds: XtreamCredentials): Promise<AuthResponse> {
  const { data } = await secureAxios.get<AuthResponse>(proxyUrl(creds));
  if (!data.user_info || data.user_info.auth !== 1) {
    throw new Error('Authentication failed');
  }
  return data;
}

export async function getLiveCategories(creds: XtreamCredentials): Promise<Category[]> {
  const { data } = await secureAxios.get<Category[]>(proxyUrl(creds, { action: 'get_live_categories' }));
  return data;
}

export async function getLiveStreams(creds: XtreamCredentials, categoryId?: string): Promise<LiveStream[]> {
  const params: Record<string, string> = { action: 'get_live_streams' };
  if (categoryId) params.category_id = categoryId;
  const { data } = await secureAxios.get<LiveStream[]>(proxyUrl(creds, params));
  return data;
}

export async function getVodCategories(creds: XtreamCredentials): Promise<Category[]> {
  const { data } = await secureAxios.get<Category[]>(proxyUrl(creds, { action: 'get_vod_categories' }));
  return data;
}

export async function getVodStreams(creds: XtreamCredentials, categoryId?: string): Promise<VodStream[]> {
  const params: Record<string, string> = { action: 'get_vod_streams' };
  if (categoryId) params.category_id = categoryId;
  const { data } = await secureAxios.get<VodStream[]>(proxyUrl(creds, params));
  return data;
}

export async function getSeriesCategories(creds: XtreamCredentials): Promise<Category[]> {
  const { data } = await secureAxios.get<Category[]>(proxyUrl(creds, { action: 'get_series_categories' }));
  return data;
}

export async function getSeriesList(creds: XtreamCredentials, categoryId?: string): Promise<Series[]> {
  const params: Record<string, string> = { action: 'get_series' };
  if (categoryId) params.category_id = categoryId;
  const { data } = await secureAxios.get<Series[]>(proxyUrl(creds, params));
  return data;
}

export async function getSeriesInfo(creds: XtreamCredentials, seriesId: number): Promise<SeriesInfo> {
  const { data } = await secureAxios.get<SeriesInfo>(proxyUrl(creds, {
    action: 'get_series_info',
    series_id: seriesId.toString(),
  }));
  return data;
}

export function proxyStreamUrl(rawUrl: string): string {
  return `${PROXY}?url=${encodeURIComponent(rawUrl)}`;
}

/** Extract the original URL from a proxied URL */
export function getOriginalUrlFromProxy(proxyUrl: string): string | null {
  try {
    const url = new URL(proxyUrl, window.location.origin);
    return url.searchParams.get('url');
  } catch {
    return null;
  }
}

export function buildLiveStreamUrl(creds: XtreamCredentials, streamId: number): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/live/${creds.username}/${creds.password}/${streamId}.ts`;
  // Native app: connect DIRECTLY to IPTV server (no CORS in WebView, no proxy timeout)
  // Web: use proxy (needed for CORS)
  if (isNative()) return raw;
  return proxyStreamUrl(raw);
}

export function buildVodStreamUrl(creds: XtreamCredentials, streamId: number, extension: string): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/movie/${creds.username}/${creds.password}/${streamId}.${extension}`;
  if (isNative()) return raw;
  return proxyStreamUrl(raw);
}

export function buildSeriesStreamUrl(creds: XtreamCredentials, episodeId: string, extension: string): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/series/${creds.username}/${creds.password}/${episodeId}.${extension}`;
  if (isNative()) return raw;
  return proxyStreamUrl(raw);
}
