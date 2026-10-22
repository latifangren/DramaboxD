import { HttpError } from "../../../infrastructure/http/client.js";

// Klien panel "Your Videos Channel" milik DrakorKu — hasil teardown APK
// 5.1.2, lihat docs/teardown-drakorku-5.1.2.md. API teks terang total:
// tidak ada signing/enkripsi/sesi; cukup base URL + API key klien yang
// tertanam di app (config/AppConfig.java) + header persis aplikasi.
//
// WAJIB (kalau tidak, server membalas HTTP 200 body kosong):
//   User-Agent: Dalvik/7.1.12.1.0 (com.drakorku.dramakoreasubindo U; Android ; 20175 Build/NMF260)
//   Accept: application/vnd.yourapi.v1.full+json
//   Data-Agent: Your Videos Channel
//
// Semua respons beramplop {status: "ok", count, count_total, pages, ...}.

export interface DrakorKuClientOptions {
  apiBase: string;
  apiKey: string;
  timeoutMs?: number;
  delayMs?: number;
  fetchFn?: typeof fetch;
}

export class DrakorKuClient {
  private readonly base: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  private lastRequestAt = 0;

  constructor(opts: DrakorKuClientOptions) {
    this.base = opts.apiBase.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
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

  async getJson(path: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
    await this.pace();
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    );
    const url = `${this.base}/${path}?${qs.toString()}`;
    const res = await this.fetchFn(url, {
      headers: {
        "user-agent":
          "Dalvik/7.1.12.1.0 (com.drakorku.dramakoreasubindo U; Android ; 20175 Build/NMF260)",
        accept: "application/vnd.yourapi.v1.full+json",
        "data-agent": "Your Videos Channel",
        "cache-control": "max-age=0",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
    const text = await res.text();
    if (!text.trim()) {
      throw new Error(
        `Respons kosong dari ${path} — panel menolak permintaan (api_key berubah / panel pindah domain?).`,
      );
    }
    const body = JSON.parse(text) as Record<string, unknown>;
    if (body.status !== "ok") {
      throw new Error(`Panel DrakorKu menjawab status=${String(body.status)} untuk ${path}.`);
    }
    return body;
  }

  /** Episode terbaru lintas seri (key daftar: latest_anime). */
  async getVideos(page: number, count: number): Promise<Record<string, unknown>> {
    return this.getJson("api/get_videos", { page, count, api_key: this.apiKey });
  }

  /** Pencarian episode berdasarkan kata kunci (key daftar: posts). */
  async searchPosts(query: string, count: number): Promise<Record<string, unknown>> {
    return this.getJson("api/get_search_results", {
      user_search: query,
      count,
      api_key: this.apiKey,
    });
  }

  /** Daftar seri (kategori). sort ala panel, mis. "c.cid DESC" / "c.rating DESC". */
  async getCategories(sort: string): Promise<Record<string, unknown>> {
    return this.getJson("api/get_category_genre", {
      user_search: "",
      sort,
      api_key: this.apiKey,
    });
  }

  /** Satu seri + episode-episodenya (sort "n.id ASC" = urutan unggah ~ urutan episode). */
  async getCategoryVideos(
    cid: string,
    page: number,
    count: number,
    sort = "n.id ASC",
  ): Promise<Record<string, unknown>> {
    return this.getJson("api/get_category_videos", {
      id: cid,
      page,
      count,
      sort,
      api_key: this.apiKey,
    });
  }
}
