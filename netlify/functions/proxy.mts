import type { Context } from "@netlify/functions";

export default async (request: Request, _context: Context) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const targetUrl = new URL(target);
    url.searchParams.forEach((value, key) => {
      if (key !== "url") targetUrl.searchParams.set(key, value);
    });

    // Forward Range header for video seeking + Referer to avoid 403
    const targetOrigin = targetUrl.origin;
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: targetOrigin + "/",
      Origin: targetOrigin,
    };
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const proxyRes = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: fetchHeaders,
      redirect: "follow",
    });

    const ct = proxyRes.headers.get("content-type") || "";
    const isM3u8 =
      target.includes(".m3u8") ||
      ct.includes("mpegurl") ||
      ct.includes("x-mpegURL");

    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });

    if (isM3u8) {
      let body = await proxyRes.text();

      // The final URL after redirects
      const finalUrl = proxyRes.url || targetUrl.toString();
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
      const origin = new URL(finalUrl).origin;

      // Rewrite segment/playlist URLs to go through our proxy
      body = body.replace(/^(?!#)(.+)$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        let absoluteUrl: string;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          absoluteUrl = trimmed;
        } else if (trimmed.startsWith("/")) {
          absoluteUrl = origin + trimmed;
        } else {
          absoluteUrl = baseUrl + trimmed;
        }
        return "/api/proxy?url=" + encodeURIComponent(absoluteUrl);
      });

      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(body, { status: 200, headers });
    }

    // Non-m3u8: stream through with Range support
    if (ct) headers.set("Content-Type", ct);
    const cl = proxyRes.headers.get("content-length");
    if (cl) headers.set("Content-Length", cl);
    const cr = proxyRes.headers.get("content-range");
    if (cr) headers.set("Content-Range", cr);
    const ar = proxyRes.headers.get("accept-ranges");
    headers.set("Accept-Ranges", ar || "bytes");

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: "Proxy error", message }, { status: 502 });
  }
};

export const config = {
  path: "/api/proxy",
};
