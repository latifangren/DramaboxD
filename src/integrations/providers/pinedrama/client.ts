import { HttpError } from "../../../infrastructure/http/client.js";

// Klien WEB PineDrama (pinedrama.com) — hasil uji jalur web 22 Okt 2026,
// lihat docs/teardown-pinedrama-47.1.4.md. (API aplikasi TikTok-nya terkunci
// MetaSec; jalur web ini yang dipakai.)
//
// Situs Next.js: halaman seri membawa <script type="application/ld+json">
// (metadata seri) + payload RSC (episode_list berisi flag can_play).
// URL putar dari API same-origin situs:
//   GET /api/episode/getEpisodePlayUrl?series_slug=&language=&episode_id=
//   -> {code: 200, data: {url}} | {code: 500, msg: "Episode unavailable"}
//
// Wajib UA browser: CDN situs memblokir fingerprint TLS non-browser
// (Python urllib kena 404; Node fetch & curl lolos).

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export interface PineDramaClientOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
  fetchFn?: typeof fetch;
}

export class PineDramaClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly language: string;
  private lastRequestAt = 0;

  constructor(opts: PineDramaClientOptions) {
    this.base = opts.siteBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.language = opts.language ?? "en";
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  /** Ambil HTML halaman (dengan 1x ulangan — situs kadang membalas kosong sesaat). */
  async getHtml(path: string): Promise<string> {
    await this.pace();
    const url = `${this.base}${path}`;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.fetchFn(url, {
          headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml" },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
        const text = await res.text();
        if (text.length > 0) return text;
        lastErr = new Error(`Halaman kosong dari ${url}`);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(`Gagal mengambil ${url}`);
  }

  /** URL putar satu episode; null bila episode tidak tersedia/terkunci. */
  async getPlayUrl(slug: string, episodeId: number): Promise<string | null> {
    await this.pace();
    const params = new URLSearchParams({
      series_slug: slug,
      language: this.language,
      episode_id: String(episodeId),
    });
    const url = `${this.base}/api/episode/getEpisodePlayUrl?${params.toString()}`;
    const res = await this.fetchFn(url, {
      headers: {
        "user-agent": BROWSER_UA,
        accept: "application/json",
        referer: `${this.base}/dramas/${slug}/ep${episodeId}`,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
    const body = (await res.json()) as { code?: number; data?: { url?: string } };
    if (body.code !== 200 || !body.data?.url) return null;
    return body.data.url;
  }
}
