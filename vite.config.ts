import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'
import http from 'http'
import https from 'https'

// Force IPv4 for requests (some CDNs like Cloudflare have IPv6 issues with Node)
const ipv4Agent = new http.Agent({
  family: 4,
});
const ipv4AgentHttps = new https.Agent({
  family: 4,
});

function doRequest(
  targetUrl: string,
  method: string,
  callback: (res: http.IncomingMessage, finalUrl: string) => void,
  onError: (err: Error) => void,
  maxRedirects = 8,
  extraHeaders?: Record<string, string>,
) {
  if (maxRedirects <= 0) {
    onError(new Error('Too many redirects'));
    return;
  }

  const parsedUrl = new URL(targetUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const req = client.request(targetUrl, {
    method,
    agent: isHttps ? ipv4AgentHttps : ipv4Agent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': '*/*',
      ...(extraHeaders || {}),
    },
    timeout: 15000,
  }, (res) => {
    if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      // Consume the redirect body
      res.resume();
      const redirectUrl = new URL(res.headers.location, targetUrl).toString();
      doRequest(redirectUrl, method, callback, onError, maxRedirects - 1, extraHeaders);
    } else {
      callback(res, targetUrl);
    }
  });

  req.on('error', onError);
  req.on('timeout', () => {
    req.destroy(new Error('Request timeout'));
  });
  req.end();
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cors-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', (req: IncomingMessage, res: ServerResponse) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': '*',
            });
            res.end();
            return;
          }

          const url = new URL(req.url || '/', 'http://localhost');
          const target = url.searchParams.get('url');

          if (!target) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          const fullUrl = new URL(target);
          url.searchParams.forEach((value, key) => {
            if (key !== 'url') fullUrl.searchParams.set(key, value);
          });

          // Forward Range header for video seeking + Referer to avoid 403
          const targetOrigin = fullUrl.origin;
          const extraHeaders: Record<string, string> = {
            Referer: targetOrigin + '/',
            Origin: targetOrigin,
          };
          if (req.headers.range) {
            extraHeaders['Range'] = req.headers.range;
          }

          doRequest(
            fullUrl.toString(),
            req.method || 'GET',
            (proxyRes, finalUrl) => {
              const ct = proxyRes.headers['content-type'] || '';
              const isM3u8 = target.includes('.m3u8') || ct.includes('mpegurl') || ct.includes('x-mpegURL');

              const headers: Record<string, string> = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': '*',
              };

              if (isM3u8) {
                // Collect the m3u8 body and rewrite segment URLs
                const chunks: Buffer[] = [];
                proxyRes.on('data', (chunk) => chunks.push(chunk));
                proxyRes.on('end', () => {
                  let body = Buffer.concat(chunks).toString('utf-8');
                  // Resolve relative segment URLs to absolute, then wrap in proxy
                  const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
                  body = body.replace(/^(?!#)(.+)$/gm, (line) => {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith('#')) return line;
                    let absoluteUrl: string;
                    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                      absoluteUrl = trimmed;
                    } else if (trimmed.startsWith('/')) {
                      // Absolute path — resolve against the final URL's origin
                      const origin = new URL(finalUrl).origin;
                      absoluteUrl = origin + trimmed;
                    } else {
                      absoluteUrl = baseUrl + trimmed;
                    }
                    return '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
                  });

                  headers['Content-Type'] = 'application/vnd.apple.mpegurl';
                  headers['Content-Length'] = String(Buffer.byteLength(body));
                  res.writeHead(200, headers);
                  res.end(body);
                });
              } else {
                if (proxyRes.headers['content-type']) {
                  headers['Content-Type'] = proxyRes.headers['content-type'];
                }
                if (proxyRes.headers['content-length']) {
                  headers['Content-Length'] = proxyRes.headers['content-length'];
                }
                // Forward Range response headers for video seeking
                if (proxyRes.headers['content-range']) {
                  headers['Content-Range'] = proxyRes.headers['content-range'];
                }
                if (proxyRes.headers['accept-ranges']) {
                  headers['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
                } else {
                  headers['Accept-Ranges'] = 'bytes';
                }
                res.writeHead(proxyRes.statusCode || 200, headers);
                proxyRes.pipe(res);
              }
            },
            (err) => {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
            },
            8,
            extraHeaders,
          );
        });
      },
    },
  ],
})
