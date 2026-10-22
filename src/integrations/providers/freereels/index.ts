import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { FreeReelsClient } from "./client.js";
import {
  episodeMetas,
  mergeEpisode,
  normalizeDetail,
  normalizeSeriesList,
  playEpisodeOf,
} from "./normalize.js";

/**
 * Provider FreeReels — API resmi aplikasi (apiv2.free-reels.com), hasil
 * reverse APK 2.3.40. Lihat docs/tes-live-freereels.md.
 *
 * Alur:
 *   search   POST /search/drama {keyword, next: null, timestamp}   (halaman pertama, 20 item)
 *   trending POST /search/hot-list-v2 {next: null, timestamp}
 *   latest   GET  /search/trending_searches  (daftar temuan aplikasi; dipakai sebagai "latest")
 *   detail   GET  /drama/info_v2?series_id=<id>
 *   episodes info_v2 (metadata: durasi/cover) + per episode
 *            GET /drama/info_push_v2?series_id=<id>&episode_key=<epId>
 *            untuk URL putar — episode_list di info_v2 memang selalu kosong URL-nya.
 *
 * Sesi tamu dibuat sekali oleh FreeReelsClient (login anonim) dan dipakai ulang.
 */
export class FreeReelsProvider implements DramaProvider {
  readonly name = "freereels";
  readonly displayName = "FreeReels";
  readonly isEnabled = true;
  private readonly client: FreeReelsClient;
  private infoCache = new Map<string, unknown>();

  constructor(opts: {
    apiBase: string;
    timeoutMs?: number;
    delayMs?: number;
    deviceName?: string;
    client?: FreeReelsClient;
  }) {
    this.client =
      opts.client ??
      new FreeReelsClient({
        apiBase: opts.apiBase,
        timeoutMs: opts.timeoutMs,
        delayMs: opts.delayMs,
        deviceName: opts.deviceName,
      });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.client.post("/search/drama", {
      keyword: query,
      next: null,
      timestamp: String(Date.now()),
    });
    return normalizeSeriesList(data);
  }

  async latest(): Promise<SeriesSummary[]> {
    return normalizeSeriesList(await this.client.get("/search/trending_searches"));
  }

  async trending(): Promise<SeriesSummary[]> {
    const data = await this.client.post("/search/hot-list-v2", {
      next: null,
      timestamp: String(Date.now()),
    });
    return normalizeSeriesList(data);
  }

  private async info(id: string): Promise<unknown> {
    const cached = this.infoCache.get(id);
    if (cached !== undefined) return cached;
    const data = await this.client.get(`/drama/info_v2?series_id=${encodeURIComponent(id)}`);
    this.infoCache.set(id, data);
    return data;
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.info(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    const infoData = await this.info(id);
    const seriesTitle = normalizeDetail(infoData).title;
    const metas = episodeMetas(infoData);
    const out: Episode[] = [];
    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i];
      const epId = typeof meta.id === "string" ? meta.id : undefined;
      let play = null;
      if (epId) {
        const pushData = await this.client.get(
          `/drama/info_push_v2?series_id=${encodeURIComponent(id)}&episode_key=${encodeURIComponent(epId)}`,
        );
        play = playEpisodeOf(pushData);
      }
      const ep = mergeEpisode(meta, i + 1, play);
      // API memberi nama episode = judul seri untuk semua episode; samakan
      // dengan format contoh pengguna: label "Episode N" di M3U.
      if (ep.title === seriesTitle) ep.title = undefined;
      out.push(ep);
    }
    return out.sort((a, b) => a.index - b.index);
  }
}
