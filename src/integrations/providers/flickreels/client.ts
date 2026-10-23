import { HttpError } from "../../../infrastructure/http/client.js";

// Klien WEB FlickReels (www.flickreels.net) — hasil probe live 22 Okt 2026,
// lihat docs/teardown-flickreels-web.md.
//
// Situs Nuxt SSR: TIDAK ada API JSON publik yang dipakai halaman — semua data
// tertanam di HTML sebagai payload `__NUXT_DATA__` (format devalue: array
// datar, objek = keymap nama-field -> indeks array). Stream per episode ada
// di JSON-LD VideoObject halaman episode itu sendiri (contentUrl m3u8
// bertanda tangan). Slug pada URL WAJIB benar (slug asal = 404), jadi ID seri
// provider ini berbentuk "<slug>/<playletId>" (pola sama seperti PineDrama
// yang memakai slug sebagai ID).

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface FlickReelsClientOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  fetchFn?: typeof fetch;
}

export class FlickReelsClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  private lastRequestAt = 0;

  constructor(opts: FlickReelsClientOptions) {
    this.base = opts.siteBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async getHtml(path: string): Promise<string> {
    await this.pace();
    const res = await this.fetchFn(`${this.base}${path}`, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, `FlickReels ${path} HTTP ${res.status}`);
    return res.text();
  }

  episodePagePath(slug: string, playletId: string, episodeNo: number): string {
    return `/playlist/${slug}/${playletId}/episode-${episodeNo}`;
  }
}
