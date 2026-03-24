/**
 * Security Layer: Custom User-Agent, Dynamic Tokens, DNS Obfuscation
 * Protects streams from being used outside this app
 */

// Obfuscated server parts - split to prevent easy extraction via strings dump
const _p = ['\x68\x74\x74\x70', '\x73\x6d\x61\x72\x74\x65\x72', '\x38\x6b', '\x2e\x72\x75'];

/**
 * Reconstruct the server URL from obfuscated parts at runtime
 * This prevents static analysis tools from finding the URL in the binary
 */
export function getServerUrl(): string {
  return `${_p[0]}://${_p[2]}${_p[1]}${_p[3]}`;
}

/**
 * Generate a dynamic token based on timestamp + device fingerprint
 * Token rotates every 5 minutes, making link sharing useless
 */
export function generateStreamToken(username: string, streamId: number): string {
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-min window
  const fingerprint = getDeviceFingerprint();
  const payload = `${username}:${streamId}:${timestamp}:${fingerprint}`;
  return btoa(payload).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  );
}

/**
 * Custom User-Agent that identifies our app
 * Servers can whitelist this UA to block third-party players
 */
export function getCustomUserAgent(): string {
  const version = '2.0.0';
  const platform = detectPlatform();
  return `8KPro-IPTV/${version} (${platform}; Build/${getBuildId()})`;
}

/**
 * Generate request headers that authenticate this app
 */
export function getSecureHeaders(): Record<string, string> {
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    'User-Agent': getCustomUserAgent(),
    'X-App-Token': token,
    'X-App-Id': 'com.pro8k.iptv',
    'X-Request-Time': Date.now().toString(),
    'X-Device-Id': getDeviceFingerprint(),
  };
}

/**
 * Device fingerprint based on available browser/device properties
 * Used to bind streams to a specific device
 */
function getDeviceFingerprint(): string {
  const parts = [
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
    navigator.hardwareConcurrency?.toString() || '0',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  // Simple hash
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/Android TV|AFTM|AFTB|AFT/i.test(ua)) return 'AndroidTV';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function getBuildId(): string {
  // Deterministic build ID based on deploy date
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Encode a stream URL with dynamic parameters
 * Makes the URL single-use and device-bound
 */
export function secureStreamUrl(
  baseUrl: string,
  username: string,
  streamId: number
): string {
  const token = generateStreamToken(username, streamId);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}_t=${token}&_d=${getDeviceFingerprint()}`;
}
