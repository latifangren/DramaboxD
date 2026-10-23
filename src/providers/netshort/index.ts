import type {
  DramaProvider,
  Episode,
  SeriesDetail,
  SeriesSummary,
} from "../../types.js";
import {
  NetShortClient,
  type NetShortDetailData,
  type NetShortEpisodeData,
} from "./client.js";
import {
  normalizeDetail,
  normalizeEpisodes,
  normalizeSearchResults,
  parseCatalogList,
  parseHomeList,
} from "./normalize.js";

export interface NetShortProviderOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
}

/**
 * Provider NetShort — jalur WEB (netshort.com), hasil probe live 22 Okt 2026
 * (docs/teardown-netshort-web.md). API /prod-web-api beramplop enkripsi
 * AES-256-ECB + RSA persis klien web resmi; stream = MP4 bertanda tangan
 * (playVoucher) dari CDN mereka. Episode terkunci (isLock) tidak diberi
 * voucher oleh server untuk sesi anonim — tercatat sebagai locked.
 * ID seri = shortPlayId numerik (dari URL /episode/<slug>-<id>).
 */
export class NetShortProvider implements DramaProvider {
  readonly name = "netshort";
  private readonly client: NetShortClient;
  private readonly detailCache = new Map<string, NetShortDetailData>();

  constructor(opts: NetShortProviderOptions) {
    this.client = new NetShortClient({
      siteBase: opts.siteBase,
      timeoutMs: opts.timeoutMs,
      delayMs: opts.delayMs,
      language: opts.language,
    });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.client.searchSeo(query, 1, 20);
    return normalizeSearchResults(data);
  }

  /** Katalog all-plots (ItemList menurun) sebagai daftar terbaru. */
  async latest(): Promise<SeriesSummary[]> {
    const html = await this.client.getHtml("/drama/all-plots");
    return parseCatalogList(html);
  }

  /** Pilihan beranda (Hot Series dkk) sebagai trending — situs tidak punya feed trending khusus. */
  async trending(): Promise<SeriesSummary[]> {
    const html = await this.client.getHtml("/");
    return parseHomeList(html);
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.rawDetail(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    const detail = await this.rawDetail(id);
    const stubs = detail.videoEpisodeInfos ?? [];
    const infos = new Map<number, NetShortEpisodeData>();
    for (const stub of stubs) {
      if (stub.isLock) continue; // server tidak memberi voucher untuk yang terkunci
      try {
        const info = await this.client.episodeInfo(id, stub.episodeNo);
        infos.set(stub.episodeNo, info);
      } catch {
        // Satu episode gagal diambil tidak menjatuhkan seluruh daftar;
        // episode itu tampil tanpa stream (tercatat di laporan scrape).
      }
    }
    return normalizeEpisodes(detail, infos);
  }

  private async rawDetail(id: string): Promise<NetShortDetailData> {
    const cached = this.detailCache.get(id);
    if (cached) return cached;
    const data = await this.client.detailInfo(id);
    this.detailCache.set(id, data);
    return data;
  }
}
