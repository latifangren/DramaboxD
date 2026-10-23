import { HttpError } from "../../../infrastructure/http/client.js";

// Klien API WEB GoodShort (www.goodshort.com) — hasil probe live 23 Okt 2026,
// lihat docs/teardown-goodshort-web.md.
//
// Situs resmi (Vue SPA) memakai API same-origin polos di /hwycreels/*
// (warisan backend GoodNovel/GoodReels: "book" = seri, "chapter" = episode).
// Semua POST JSON, amplop {status: 0, data}. Bahasa katalog dikendalikan
// header Accept-Language (situs memilih edisi terlokalisasi per bahasa;
// tiap edisi punya bookId sendiri). Tanpa enkripsi tambahan.
//
// Hak akses episode terlihat di chapter/page: bab gratis punya field
// m3u8Path (HLS bertanda tangan di v3.goodshort.com); bab berbayar
// (price > 0) TIDAK diberi m3u8Path oleh server — dihormati apa adanya.

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface GoodShortClientOptions {
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  /** Kode bahasa katalog, mis. "en", "id", "es" (mengikuti Accept-Language). */
  language?: string;
  fetchFn?: typeof fetch;
}

interface Envelope<T> {
  status: number;
  message?: string;
  data: T;
}

export class GoodShortClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly language: string;
  private lastRequestAt = 0;

  constructor(opts: GoodShortClientOptions) {
    this.base = opts.siteBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.language = opts.language ?? "en";
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    await this.pace();
    const res = await this.fetchFn(`${this.base}${path}`, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: `${this.base}/`,
        Origin: this.base,
        "Accept-Language": this.language,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, `GoodShort API ${path} HTTP ${res.status}`);
    const envelope = (await res.json()) as Envelope<T>;
    if (envelope.status !== 0) {
      throw new HttpError(502, `GoodShort API ${path} status ${envelope.status}: ${envelope.message ?? "?"}`);
    }
    return envelope.data;
  }

  searchSeo(keyword: string, pageNo = 1, pageSize = 20): Promise<GoodShortSearchData> {
    return this.post<GoodShortSearchData>("/hwycreels/book/search/seo", {
      keyword,
      pageNo,
      pageSize,
      type: "DEFAULT",
      seoSearch: false,
      recommendBook: 0,
    });
  }

  homeIndex(): Promise<GoodShortHomeData> {
    return this.post<GoodShortHomeData>("/hwycreels/home/index", { language: this.language });
  }

  bookDetail(bookId: string): Promise<GoodShortDetailData> {
    return this.post<GoodShortDetailData>("/hwycreels/book/detail", { bookId });
  }

  chapterPage(bookId: string, pageNo: number, pageSize = 100): Promise<GoodShortChapterPage> {
    return this.post<GoodShortChapterPage>("/hwycreels/chapter/page", { bookId, pageNo, pageSize });
  }
}

// --- Bentuk mentah upstream (subset yang dipakai) ---

export interface GoodShortTag {
  name?: string;
}

export interface GoodShortBook {
  bookId: string;
  bookName?: string;
  cover?: string;
  introduction?: string;
  chapterCount?: number;
  tagsList?: GoodShortTag[];
  genreList?: GoodShortTag[];
}

export interface GoodShortPage<T> {
  records?: T[];
  total?: number;
  pages?: number;
  current?: number;
}

export interface GoodShortSearchData {
  page?: GoodShortPage<GoodShortBook>;
}

export interface GoodShortHomeItem {
  /** bookId seri (string numerik). */
  action?: string;
  bookName?: string;
  name?: string;
  cover?: string;
  bookResourceUrl?: string;
}

export interface GoodShortHomeColumn {
  name?: string;
  items?: GoodShortHomeItem[];
}

export interface GoodShortHomeData {
  pageColumns?: GoodShortHomeColumn[];
}

export interface GoodShortDetailData {
  book?: GoodShortBook;
}

export interface GoodShortChapter {
  id: string;
  chapterName?: string;
  index?: number;
  /** Harga koin; "0" untuk episode gratis. */
  price?: string;
  /** Durasi detik (terverifikasi cocok dengan jumlah EXTINF playlist). */
  playTime?: number;
  image?: string;
  /** URL HLS bertanda tangan — hanya ada untuk episode gratis. */
  m3u8Path?: string;
}

export type GoodShortChapterPage = GoodShortPage<GoodShortChapter>;
