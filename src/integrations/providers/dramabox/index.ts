import { HttpClient } from "../../../infrastructure/http/client.js";
import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { normalizeDetail, normalizeEpisodes, normalizeSeriesList } from "./normalize.js";

/**
 * Provider DramaBox — pola SekaiDrama.
 *
 * SekaiDrama tidak scrape dramabox.com langsung; route Next.js-nya adalah
 * proxy tipis ke API upstream terkonfigurasi:
 *   GET {base}/dramabox/search?query=<q>
 *   GET {base}/dramabox/latest
 *   GET {base}/dramabox/trending
 *   GET {base}/dramabox/foryou
 *   GET {base}/dramabox/detail?bookId=<id>
 *   GET {base}/dramabox/get-allepisode?bookId=<id>
 *
 * Provider ini mengikuti kontrak yang sama. Base URL bisa diganti lewat
 * DRAMABOX_API_BASE (mis. API Sansekai publik, mirror sendiri, atau server
 * lokal yang kompatibel) tanpa mengubah kode.
 */
export class DramaBoxProvider implements DramaProvider {
  readonly name = "dramabox";
  readonly displayName = "DramaBox";
  readonly isEnabled = true;
  private readonly http: HttpClient;
  private readonly base: string;

  constructor(opts: { apiBase: string; timeoutMs?: number; delayMs?: number; http?: HttpClient }) {
    this.base = `${opts.apiBase.replace(/\/+$/, "")}/dramabox`;
    this.http = opts.http ?? new HttpClient({ timeoutMs: opts.timeoutMs, delayMs: opts.delayMs });
  }

  private url(path: string, params?: Record<string, string>): string {
    const u = new URL(`${this.base}/${path}`);
    for (const [k, v] of Object.entries(params ?? {})) u.searchParams.set(k, v);
    return u.toString();
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const raw = await this.http.getJson(this.url("search", { query }));
    // Hasil non-drama (mis. aktor) tidak punya bookId dan tersaring di normalizer.
    return normalizeSeriesList(raw);
  }

  async latest(): Promise<SeriesSummary[]> {
    return normalizeSeriesList(await this.http.getJson(this.url("latest")));
  }

  async trending(): Promise<SeriesSummary[]> {
    return normalizeSeriesList(await this.http.getJson(this.url("trending")));
  }

  async foryou(): Promise<SeriesSummary[]> {
    return normalizeSeriesList(await this.http.getJson(this.url("foryou")));
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.http.getJson(this.url("detail", { bookId: id })));
  }

  async episodes(id: string): Promise<Episode[]> {
    return normalizeEpisodes(await this.http.getJson(this.url("get-allepisode", { bookId: id })));
  }
}
