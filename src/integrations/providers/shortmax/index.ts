import type {
  DramaProvider,
  Episode,
  SeriesDetail,
  SeriesSummary,
} from "../../../shared/types/index.js";
import { ShortMaxClient, type ShortMaxDetailData } from "./client.js";
import {
  hotToSummaries,
  itemToSummary,
  normalizeDetail,
  normalizeEpisodes,
} from "./normalize.js";

export interface ShortMaxProviderOptions {
  apiBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
}

/**
 * Provider ShortMax — jalur WEB resmi (www.shorttv.live), hasil probe live
 * 22 Okt 2026 (docs/teardown-shortmax-web.md). API shortweb.shorttv.live
 * beramplop AES-128-CBC dua arah persis klien web resmi. Satu panggilan
 * queryDetail memuat seluruh episodeList; stream = HLS bertanda tangan
 * (segmen terbuka, tanpa kunci segmen). Episode melewati lockBegin situs
 * tidak diberi URL oleh server — tercatat sebagai locked.
 * (Jalur API komunitas SAPI/captain.sapimu.au sudah mati; tidak dipakai.)
 */
export class ShortMaxProvider implements DramaProvider {
  readonly name = "shortmax";
  readonly displayName = "ShortMax";
  readonly isEnabled = true;
  private readonly client: ShortMaxClient;
  private readonly detailCache = new Map<string, ShortMaxDetailData>();

  constructor(opts: ShortMaxProviderOptions) {
    this.client = new ShortMaxClient({
      apiBase: opts.apiBase,
      timeoutMs: opts.timeoutMs,
      delayMs: opts.delayMs,
      language: opts.language,
    });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const page = await this.client.searchPage(query, 1, 20);
    return (page.data ?? []).map(itemToSummary);
  }

  /** Feed katalog queryPage sebagai daftar terbaru. */
  async latest(): Promise<SeriesSummary[]> {
    const page = await this.client.queryPage(1, 20);
    return (page.list ?? []).map(itemToSummary);
  }

  /** Daftar "hot search" situs sebagai trending (situs tidak punya feed trending khusus). */
  async trending(): Promise<SeriesSummary[]> {
    return hotToSummaries(await this.client.searchHot());
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.rawDetail(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    return normalizeEpisodes(await this.rawDetail(id));
  }

  private async rawDetail(id: string): Promise<ShortMaxDetailData> {
    const cached = this.detailCache.get(id);
    if (cached) return cached;
    const data = await this.client.queryDetail(id);
    this.detailCache.set(id, data);
    return data;
  }
}
