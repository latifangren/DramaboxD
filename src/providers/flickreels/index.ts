import type {
  DramaProvider,
  Episode,
  SeriesDetail,
  SeriesSummary,
} from "../../types.js";
import { FlickReelsClient } from "./client.js";
import {
  parseSeriesCards,
  parseSeriesPage,
  parseVideoObject,
  stubsToEpisodes,
  type VideoObjectInfo,
} from "./normalize.js";

export interface FlickReelsProviderOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
}

/**
 * Provider FlickReels — jalur WEB (www.flickreels.net), hasil probe live
 * 22 Okt 2026 (docs/teardown-flickreels-web.md). Situs Nuxt SSR: katalog,
 * pencarian, detail, dan daftar episode semuanya dari payload __NUXT_DATA__
 * di HTML; stream per episode dari JSON-LD VideoObject halaman episode
 * (m3u8 bertanda tangan di CDN farsunpteltd). Episode mulai start_pay_num
 * terkunci (is_lock) dan halaman episodenya tidak memuat contentUrl —
 * dihormati apa adanya.
 *
 * ID seri = "<slug>/<playletId>" karena slug URL wajib benar (slug asal 404).
 */
export class FlickReelsProvider implements DramaProvider {
  readonly name = "flickreels";
  private readonly client: FlickReelsClient;
  private readonly pageCache = new Map<string, string>();

  constructor(opts: FlickReelsProviderOptions) {
    this.client = new FlickReelsClient({
      siteBase: opts.siteBase,
      timeoutMs: opts.timeoutMs,
      delayMs: opts.delayMs,
    });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const html = await this.client.getHtml(`/search?keyword=${encodeURIComponent(query)}`);
    return parseSeriesCards(html);
  }

  /** Halaman classify = katalog utama situs. */
  async latest(): Promise<SeriesSummary[]> {
    const html = await this.client.getHtml("/classify");
    return parseSeriesCards(html);
  }

  /** Beranda = seksi-seksi pilihan/hot situs (tidak ada feed trending khusus). */
  async trending(): Promise<SeriesSummary[]> {
    const html = await this.client.getHtml("/");
    return parseSeriesCards(html);
  }

  async detail(id: string): Promise<SeriesDetail> {
    const page = await this.seriesPage(id);
    return page.detail;
  }

  async episodes(id: string): Promise<Episode[]> {
    const { slug, numericId } = splitId(id);
    const page = await this.seriesPage(id);
    const streams = new Map<number, VideoObjectInfo>();
    // Halaman episode-1 yang sudah diambil memuat stream episode 1 — hemat satu fetch.
    const firstHtml = this.pageCache.get(this.client.episodePagePath(slug, numericId, 1));
    if (firstHtml) streams.set(1, parseVideoObject(firstHtml));
    for (const stub of page.stubs) {
      if (stub.locked || stub.index === 1) continue;
      try {
        const html = await this.client.getHtml(this.client.episodePagePath(slug, numericId, stub.index));
        streams.set(stub.index, parseVideoObject(html));
      } catch {
        // Episode tanpa stream yang bisa diambil tampil sebagai tanpa stream.
      }
    }
    return stubsToEpisodes(page.stubs, streams);
  }

  private async seriesPage(id: string) {
    const { slug, numericId } = splitId(id);
    const path = this.client.episodePagePath(slug, numericId, 1);
    let html = this.pageCache.get(path);
    if (!html) {
      html = await this.client.getHtml(path);
      this.pageCache.set(path, html);
    }
    const page = parseSeriesPage(html, id);
    if (!page) throw new Error(`FlickReels: payload seri tidak ditemukan untuk "${id}"`);
    return page;
  }
}

export function splitId(id: string): { slug: string; numericId: string } {
  const slash = id.lastIndexOf("/");
  if (slash <= 0 || slash === id.length - 1) {
    throw new Error(
      `ID FlickReels harus berbentuk "<slug>/<playletId>" (seperti hasil search/latest) — dapat: "${id}"`,
    );
  }
  return { slug: id.slice(0, slash), numericId: id.slice(slash + 1) };
}
