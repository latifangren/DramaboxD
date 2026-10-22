import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { PineDramaClient } from "./client.js";
import { buildEpisodes, parseCatalog, parseSeriesPage } from "./normalize.js";

/**
 * Provider PineDrama — jalur WEB (pinedrama.com), lihat
 * docs/teardown-pinedrama-47.1.4.md. (API aplikasi = API TikTok terkunci
 * MetaSec + registrasi perangkat; tidak dipakai.)
 *
 * Alur:
 *   search   katalog server-render di /genres (+ halaman genre), disaring
 *            menurut judul/slug. CATATAN: pencarian drama bawaan situs rusak
 *            di sisi server (tab Short Dramas menggantung), dan tidak ada
 *            API search drama — jadi cakupan search = katalog yang
 *            ter-render server (terbatas, belasan judul).
 *   latest   katalog /genres urutan halaman (ada seksi "Latest Short Dramas")
 *   trending katalog yang sama (situs tidak menyediakan feed trending drama)
 *   detail   halaman seri: JSON-LD + episode_list RSC (flag can_play)
 *   episodes per episode yang can_play: GET /api/episode/getEpisodePlayUrl
 *            -> MP4 bertanda tangan (v.pinedrama.com). Episode selain itu
 *            ditandai terkunci. Durasi per episode tidak disediakan web.
 *
 * ID seri = slug situs (mis. "my-husband-murdered-me"); CLI menerima slug itu.
 */
export class PineDramaProvider implements DramaProvider {
  readonly name = "pinedrama";
  readonly displayName = "PineDrama";
  readonly isEnabled = true;
  private readonly client: PineDramaClient;
  private catalogCache: SeriesSummary[] | null = null;
  private seriesCache = new Map<string, ReturnType<typeof parseSeriesPage>>();

  constructor(opts: {
    siteBase: string;
    timeoutMs?: number;
    delayMs?: number;
    language?: string;
    client?: PineDramaClient;
  }) {
    this.client =
      opts.client ??
      new PineDramaClient({
        siteBase: opts.siteBase,
        timeoutMs: opts.timeoutMs,
        delayMs: opts.delayMs,
        language: opts.language,
      });
  }

  private async catalog(): Promise<SeriesSummary[]> {
    if (this.catalogCache) return this.catalogCache;
    const byId = new Map<string, SeriesSummary>();
    const pages = ["/genres", "/genres/romance", "/genres/revenge", "/genres/rebirth"];
    for (const path of pages) {
      try {
        for (const s of parseCatalog(await this.client.getHtml(path))) {
          if (!byId.has(s.id)) byId.set(s.id, s);
        }
      } catch {
        // halaman genre tertentu gagal tidak menggagalkan katalog keseluruhan
      }
    }
    this.catalogCache = [...byId.values()];
    return this.catalogCache;
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.catalog();
    return (await this.catalog()).filter(
      (s) => s.title.toLowerCase().includes(q) || s.id.replace(/-/g, " ").includes(q),
    );
  }

  async latest(): Promise<SeriesSummary[]> {
    return this.catalog();
  }

  async trending(): Promise<SeriesSummary[]> {
    return this.catalog();
  }

  private async series(slug: string): Promise<ReturnType<typeof parseSeriesPage>> {
    const cached = this.seriesCache.get(slug);
    if (cached) return cached;
    const parsed = parseSeriesPage(await this.client.getHtml(`/dramas/${slug}`), slug);
    this.seriesCache.set(slug, parsed);
    return parsed;
  }

  async detail(id: string): Promise<SeriesDetail> {
    return (await this.series(id)).detail;
  }

  async episodes(id: string): Promise<Episode[]> {
    const { detail, playableIds, totalEpisodes } = await this.series(id);
    const playUrls = new Map<number, string | null>();
    for (const epId of playableIds) {
      playUrls.set(epId, await this.client.getPlayUrl(id, epId));
    }
    return buildEpisodes(totalEpisodes, playableIds, playUrls, detail.cover);
  }
}
