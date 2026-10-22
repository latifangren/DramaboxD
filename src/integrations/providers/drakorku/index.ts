import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { DrakorKuClient } from "./client.js";
import {
  categoryToDetail,
  categoryToSummary,
  extractCategories,
  extractPosts,
  postsToEpisodes,
  postsToSeries,
  type RawCategory,
} from "./normalize.js";

/** API key klien yang tertanam di app DrakorKu 5.1.2 (AppConfig.java). */
export const DEFAULT_DRAKORKU_API_KEY = "cda11y63tfI7rwln8BLeiKTvjsD5g2Mox01RzkhQCEXSGWbqYO";

/**
 * Provider DrakorKu — panel "Your Videos Channel"
 * (https://kampretloh.top/v3/), lihat docs/teardown-drakorku-5.1.2.md.
 * CATATAN GENRE: ini katalog DRAKOR (drama Korea sub Indo), bukan dracin —
 * disertakan karena pipeline & format M3U-nya sama.
 *
 * Alur:
 *   search   api/get_search_results (post episode) -> dikelompokkan per cat_id
 *   latest   api/get_category_genre sort "c.cid DESC" (seri terbaru)
 *   trending api/get_category_genre sort "c.rating DESC" (proxy: panel tidak
 *            punya feed trending; rating tertinggi yang paling masuk akal)
 *   detail   objek category dari api/get_category_videos
 *   episodes api/get_category_videos sort "n.id ASC", dipaginasi per 200;
 *            stream = video_url_hd bila ada, else video_url (MP4 langsung).
 *            Nomor episode dibaca dari judul post ("… Eps 15").
 *
 * ID seri = cid kategori (angka, mis. "3730").
 */
export class DrakorKuProvider implements DramaProvider {
  readonly name = "drakorku";
  readonly displayName = "DrakorKu";
  readonly isEnabled = true;
  private readonly client: DrakorKuClient;
  private detailCache = new Map<string, SeriesDetail>();

  constructor(opts: {
    apiBase: string;
    apiKey?: string;
    timeoutMs?: number;
    delayMs?: number;
    client?: DrakorKuClient;
  }) {
    this.client =
      opts.client ??
      new DrakorKuClient({
        apiBase: opts.apiBase,
        apiKey: opts.apiKey ?? DEFAULT_DRAKORKU_API_KEY,
        timeoutMs: opts.timeoutMs,
        delayMs: opts.delayMs,
      });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const body = await this.client.searchPosts(query, 100);
    return postsToSeries(extractPosts(body));
  }

  async latest(): Promise<SeriesSummary[]> {
    const body = await this.client.getCategories("c.cid DESC");
    return extractCategories(body).slice(0, 24).map(categoryToSummary);
  }

  async trending(): Promise<SeriesSummary[]> {
    const body = await this.client.getCategories("c.rating DESC");
    return extractCategories(body).slice(0, 24).map(categoryToSummary);
  }

  async detail(id: string): Promise<SeriesDetail> {
    const cached = this.detailCache.get(id);
    if (cached) return cached;
    const body = await this.client.getCategoryVideos(id, 1, 1);
    const cat = body.category as RawCategory | undefined;
    if (!cat || cat.cid == null) {
      throw new Error(`Seri DrakorKu "${id}" tidak ditemukan di panel.`);
    }
    const total =
      typeof body.count_total === "number" ? body.count_total : undefined;
    const detail = categoryToDetail(cat, total);
    this.detailCache.set(id, detail);
    return detail;
  }

  async episodes(id: string): Promise<Episode[]> {
    const pageSize = 200;
    const first = await this.client.getCategoryVideos(id, 1, pageSize);
    const totalPages = typeof first.pages === "number" ? first.pages : 1;
    const posts = [...extractPosts(first)];
    for (let page = 2; page <= totalPages; page++) {
      const body = await this.client.getCategoryVideos(id, page, pageSize);
      posts.push(...extractPosts(body));
    }
    return postsToEpisodes(posts);
  }
}
