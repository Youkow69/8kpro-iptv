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

function isNative(): boolean {
  // Check Capacitor bridge
  const cap = (window as any)?.Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
    if (cap.platform && cap.platform !== 'web') return true;
  }
  // Fallback: detect if running from local Capacitor server (not Vercel)
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:') return true;
  if (window.location.hostname === 'localhost' && window.location.port === '') return true;
  // Check for Capacitor in user agent or URL
  if (navigator.userAgent.includes('CapacitorApp')) return true;
  return false;
}

const VERCEL_PROXY = 'https://8kproultimate.vercel.app/api/proxy';

function getProxy(): string {
  return isNative() ? VERCEL_PROXY : (window.location.origin + '/api/proxy');
}

// API calls: ALWAYS through proxy (needed for CORS + Cloudflare bypass)
function proxyUrl(creds: XtreamCredentials, params?: Record<string, string>) {
  const server = creds.server.replace(/\/+$/, '');
  const target = `${server}/player_api.php`;
  const sp = new URLSearchParams({
    url: target,
    username: creds.username,
    password: creds.password,
    ...params,
  });
  return `${getProxy()}?${sp.toString()}`;
}

const secureAxios = axios.create();
secureAxios.interceptors.request.use((config) => {
  // Only add secure headers for proxy requests (direct requests reject custom headers)
  if (config.url?.includes('/api/proxy')) {
    const headers = getSecureHeaders();
    for (const [key, value] of Object.entries(headers)) {
      config.headers.set(key, value);
    }
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

function fixIcons<T extends { stream_icon?: string; cover?: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    stream_icon: item.stream_icon?.replace(/^http:\/\//i, 'https://') || '',
    cover: item.cover?.replace(/^http:\/\//i, 'https://') || '',
  }));
}

export async function getLiveStreams(creds: XtreamCredentials, categoryId?: string): Promise<LiveStream[]> {
  const params: Record<string, string> = { action: 'get_live_streams' };
  if (categoryId) params.category_id = categoryId;
  const { data } = await secureAxios.get<LiveStream[]>(proxyUrl(creds, params));
  return fixIcons(data);
}

export async function getVodCategories(creds: XtreamCredentials): Promise<Category[]> {
  const { data } = await secureAxios.get<Category[]>(proxyUrl(creds, { action: 'get_vod_categories' }));
  return data;
}

export async function getVodStreams(creds: XtreamCredentials, categoryId?: string): Promise<VodStream[]> {
  const params: Record<string, string> = { action: 'get_vod_streams' };
  if (categoryId) params.category_id = categoryId;
  const { data } = await secureAxios.get<VodStream[]>(proxyUrl(creds, params));
  return fixIcons(data);
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
  return `${getProxy()}?url=${encodeURIComponent(rawUrl)}`;
}

export function getOriginalUrlFromProxy(proxyUrl: string): string | null {
  try {
    const url = new URL(proxyUrl, window.location.origin);
    return url.searchParams.get('url');
  } catch {
    return null;
  }
}

// Stream URLs: ALL platforms use proxy (CORS + mixed content)
export function buildLiveStreamUrl(creds: XtreamCredentials, streamId: number): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/live/${creds.username}/${creds.password}/${streamId}.ts`;
  return proxyStreamUrl(raw);
}

export function buildVodStreamUrl(creds: XtreamCredentials, streamId: number, extension: string): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/movie/${creds.username}/${creds.password}/${streamId}.${extension}`;
  return proxyStreamUrl(raw);
}

export function buildSeriesStreamUrl(creds: XtreamCredentials, episodeId: string, extension: string): string {
  const server = creds.server.replace(/\/+$/, '');
  const raw = `${server}/series/${creds.username}/${creds.password}/${episodeId}.${extension}`;
  return proxyStreamUrl(raw);
}
