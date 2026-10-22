export class StreamProxyService {
  private isSafeUrl(targetUrl: string): boolean {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      const host = parsed.hostname.toLowerCase();
      // Block local/internal networks (SSRF prevention)
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.startsWith("172.16.") ||
        host.startsWith("169.254.") ||
        host.endsWith(".local")
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private buildUpstreamHeaders(targetUrl: string, clientRange?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    };

    if (clientRange) {
      headers["Range"] = clientRange;
    }

    const lower = targetUrl.toLowerCase();
    if (lower.includes("pinedrama.com")) {
      headers["Referer"] = "https://pinedrama.com/";
      headers["Origin"] = "https://pinedrama.com";
    } else if (lower.includes("crazymaplestudios.com") || lower.includes("reelshort.com")) {
      headers["Referer"] = "https://www.reelshort.com/";
      headers["Origin"] = "https://www.reelshort.com";
    }

    return headers;
  }

  async proxyStream(targetUrl: string, clientRange?: string): Promise<Response> {
    if (!this.isSafeUrl(targetUrl)) {
      return new Response("Invalid or disallowed stream URL", { status: 400 });
    }

    const headers = this.buildUpstreamHeaders(targetUrl, clientRange);
    const upstreamRes = await fetch(targetUrl, { headers });

    const resHeaders = new Headers();
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Accept-Ranges", "bytes");
    resHeaders.set("Content-Disposition", "inline");

    for (const h of ["content-type", "content-length", "content-range"]) {
      const val = upstreamRes.headers.get(h);
      if (val) resHeaders.set(h, val);
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3u8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl");

    if (isM3u8) {
      const text = await upstreamRes.text();
      const basePath = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            if (trimmed.startsWith("#EXT-X-MEDIA:TYPE=SUBTITLES")) {
              let autoIdLine = "";
              const rewrittenSubLine = line.replace(/URI="([^"]+)"/g, (_, uri) => {
                const absUrl = new URL(uri, basePath).href;
                autoIdLine = line
                  .replace(/NAME="([^"]+)"/g, 'NAME="Bahasa Indonesia (Auto)"')
                  .replace(/LANGUAGE="([^"]+)"/g, 'LANGUAGE="id"')
                  .replace(/DEFAULT=(YES|NO)/g, 'DEFAULT=YES')
                  .replace(/URI="([^"]+)"/g, `URI="/api/stream/subtitle?url=${encodeURIComponent(absUrl)}&to=id"`);
                return `URI="/api/stream?url=${encodeURIComponent(absUrl)}"`;
              });
              return autoIdLine ? `${rewrittenSubLine}\n${autoIdLine}` : rewrittenSubLine;
            }

            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              const absUrl = new URL(uri, basePath).href;
              return `URI="/api/stream?url=${encodeURIComponent(absUrl)}"`;
            });
          }
          const absUrl = new URL(trimmed, basePath).href;
          return `/api/stream?url=${encodeURIComponent(absUrl)}`;
        })
        .join("\n");

      resHeaders.set("content-type", "application/vnd.apple.mpegurl");
      resHeaders.set("content-length", String(Buffer.byteLength(rewritten, "utf8")));
      resHeaders.delete("content-encoding");
      return new Response(rewritten, {
        status: 200,
        headers: resHeaders,
      });
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  }
}
