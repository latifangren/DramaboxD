import { isIP } from "node:net";
import type { Config } from "../infrastructure/config/index.js";
import { StreamForbiddenError, ValidationError } from "../shared/errors/index.js";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Referer asal per provider — beberapa CDN menolak request tanpa referer situs asal. */
const PROVIDER_REFERERS: Record<string, string> = {
  reelshort: "https://www.reelshort.com/",
  pinedrama: "https://www.pinedrama.com/",
  freereels: "https://www.freereels.com/",
};

/** Suffix host CDN yang dikenal dari teardown provider (ARCHITECTURE.md §6.1). */
const KNOWN_CDN_SUFFIXES = [
  "crazymaplestudios.com",
  "mydramawave.com",
  "ibyteimg.com",
  "pinedrama.com",
  "melolostatic.com",
  "googlevideo.com",
  "akamaized.net",
  "cloudfront.net",
];

function isPrivateIp(host: string): boolean {
  if (isIP(host) === 0) return false;
  if (host.startsWith("10.") || host.startsWith("127.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return true;
  const m172 = /^172\.(\d+)\./.exec(host);
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return true;
  const lower = host.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/**
 * Proxy stream: meneruskan Range, menyamarkan header per provider, dan menulis
 * ulang playlist HLS supaya segmen ikut lewat proxy. SSRF dijaga: hanya
 * http/https publik — IP privat/LAN/localhost selalu ditolak.
 */
export class StreamProxyService {
  constructor(private readonly config: Config) {}

  assertUrlAllowed(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new ValidationError("Parameter url tidak valid");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new StreamForbiddenError("Hanya URL http/https yang boleh diproksi");
    }
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) {
      throw new StreamForbiddenError("URL ke jaringan internal tidak diizinkan");
    }
    return url;
  }

  isKnownHost(host: string): boolean {
    const h = host.toLowerCase();
    return (
      KNOWN_CDN_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`)) ||
      this.config.streamExtraHosts.some((extra) => h === extra || h.endsWith(`.${extra}`))
    );
  }

  upstreamHeaders(url: URL, range: string | undefined, provider?: string): Record<string, string> {
    const headers: Record<string, string> = { "User-Agent": BROWSER_UA };
    const referer = (provider && PROVIDER_REFERERS[provider]) || `${url.protocol}//${url.host}/`;
    headers["Referer"] = referer;
    headers["Origin"] = referer.replace(/\/$/, "");
    if (range) headers["Range"] = range;
    return headers;
  }

  async proxy(rawUrl: string, opts: { range?: string; provider?: string } = {}): Promise<Response> {
    const url = this.assertUrlAllowed(rawUrl);
    const upstream = await fetch(url, { headers: this.upstreamHeaders(url, opts.range, opts.provider) });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Disposition", "inline");
    for (const h of ["content-type", "content-length", "content-range"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const isM3u8 = url.pathname.includes(".m3u8") || contentType.includes("mpegurl");
    if (isM3u8 && upstream.ok) {
      const text = await upstream.text();
      headers.set("content-type", "application/vnd.apple.mpegurl");
      headers.delete("content-length");
      return new Response(this.rewritePlaylist(text, url, opts.provider), { status: 200, headers });
    }
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  }

  /** Tulis ulang URI segmen/kunci/varian supaya kembali lewat /api/stream. */
  rewritePlaylist(text: string, base: URL, provider?: string): string {
    const basePath = base.href.substring(0, base.href.lastIndexOf("/") + 1);
    const wrap = (abs: string) =>
      `/api/stream?url=${encodeURIComponent(abs)}${provider ? `&provider=${encodeURIComponent(provider)}` : ""}`;
    return text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_m, uri: string) => `URI="${wrap(new URL(uri, basePath).href)}"`);
        }
        return wrap(new URL(trimmed, basePath).href);
      })
      .join("\n");
  }
}
