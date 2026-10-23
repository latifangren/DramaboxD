import type {
  DramaProvider,
  Episode,
  SeriesDetail,
  SeriesSummary,
} from "../../../shared/types/index.js";
import { GoodShortClient, type GoodShortBook } from "./client.js";
import {
  bookToSummary,
  chaptersToEpisodes,
  latestFromHome,
  normalizeDetail,
  trendingFromHome,
} from "./normalize.js";

export interface GoodShortProviderOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
}

/**
 * Provider GoodShort — jalur WEB resmi (www.goodshort.com), hasil probe live
 * 23 Okt 2026 (docs/teardown-goodshort-web.md). API same-origin /hwycreels/*
 * (POST JSON polos, amplop {status:0, data}); bahasa katalog mengikuti
 * Accept-Language. Detail dari book/detail, episode dari chapter/page —
 * episode gratis membawa m3u8Path (HLS bertanda tangan v3.goodshort.com,
 * durasi playTime akurat), episode berbayar tidak diberi URL oleh server.
 */
export class GoodShortProvider implements DramaProvider {
  readonly name = "goodshort";
  readonly displayName = "GoodShort";
  readonly isEnabled = true;
  private readonly client: GoodShortClient;
  private readonly detailCache = new Map<string, GoodShortBook>();

  constructor(opts: GoodShortProviderOptions) {
    this.client = new GoodShortClient({
      siteBase: opts.siteBase,
      timeoutMs: opts.timeoutMs,
      delayMs: opts.delayMs,
      language: opts.language,
    });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.client.searchSeo(query, 1, 20);
    return (data.page?.records ?? []).map(bookToSummary);
  }

  /** Umpan kolom beranda resmi sebagai latest (situs tidak punya feed tanggal khusus). */
  async latest(): Promise<SeriesSummary[]> {
    return latestFromHome(await this.client.homeIndex());
  }

  /** Kolom "Most Trending" beranda resmi. */
  async trending(): Promise<SeriesSummary[]> {
    return trendingFromHome(await this.client.homeIndex());
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.rawBook(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    const records = [];
    let pageNo = 1;
    for (;;) {
      const page = await this.client.chapterPage(id, pageNo, 100);
      const batch = page.records ?? [];
      records.push(...batch);
      const pages = page.pages ?? 1;
      if (pageNo >= pages || batch.length === 0) break;
      pageNo += 1;
      if (pageNo > 50) break; // pengaman; seri terpanjang pun jauh di bawah ini
    }
    return chaptersToEpisodes(records);
  }

  private async rawBook(id: string): Promise<GoodShortBook> {
    const cached = this.detailCache.get(id);
    if (cached) return cached;
    const data = await this.client.bookDetail(id);
    if (!data.book) throw new Error(`GoodShort: buku "${id}" tidak ditemukan`);
    this.detailCache.set(id, data.book);
    return data.book;
  }
}
