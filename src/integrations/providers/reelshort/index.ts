import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { ReelShortClient } from "./client.js";
import {
  bookToDetail,
  bookToSummary,
  chaptersToEpisodes,
  flattenHallBooks,
  type RawBook,
  type RawChapterInfo,
} from "./normalize.js";

/**
 * Provider ReelShort — jalur WEB (www.reelshort.com/api), lihat
 * docs/riset-reelshort-web.md & docs/teardown-reelshort-4.1.00.md.
 * (API aplikasi Android terkunci SecShell; web API-nya terbuka dengan
 * signing HMAC dari bundle publik + dekripsi amplop AES.)
 *
 * Alur:
 *   search   POST /api/video/search/webSearch {word, page} (terenkripsi,
 *            didekripsi klien) -> data.lists[]
 *   latest   POST /api/ms/hall/webInfo -> semua seksi buku diratakan
 *            (urutan feed home), dedupe per book_id
 *   trending daftar yang sama, diurutkan read_count menurun (webInfo tidak
 *            memberi label seksi; ini proxy yang paling masuk akal)
 *   detail   GET /api/video/book/getBookInfo?book_id=<hex> (+ online_base)
 *   episodes per chapter di online_base: GET /api/video/book/getChapterInfo
 *            -> video_url (m3u8 v-mps.crazymaplestudios.com) + duration.
 *            Chapter tanpa video_url ditandai terkunci.
 *
 * ID seri = book_id hex 24-char (BUKAN t_book_id numerik — endpoint detail
 * menolaknya dengan code 502).
 */
export class ReelShortProvider implements DramaProvider {
  readonly name = "reelshort";
  readonly displayName = "ReelShort";
  readonly isEnabled = true;
  private readonly client: ReelShortClient;
  private bookCache = new Map<string, RawBook>();

  constructor(opts: {
    apiBase: string;
    timeoutMs?: number;
    delayMs?: number;
    language?: string;
    client?: ReelShortClient;
  }) {
    this.client =
      opts.client ??
      new ReelShortClient({
        apiBase: opts.apiBase,
        timeoutMs: opts.timeoutMs,
        delayMs: opts.delayMs,
        language: opts.language,
      });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.client.post("/api/video/search/webSearch", { word: query, page: 1 });
    const lists = Array.isArray(data.lists) ? (data.lists as RawBook[]) : [];
    return lists.filter((b) => b.book_id).map(bookToSummary);
  }

  async latest(): Promise<SeriesSummary[]> {
    const hall = await this.client.post("/api/ms/hall/webInfo", {});
    return flattenHallBooks(hall).slice(0, 24).map(bookToSummary);
  }

  async trending(): Promise<SeriesSummary[]> {
    const hall = await this.client.post("/api/ms/hall/webInfo", {});
    return flattenHallBooks(hall)
      .sort((a, b) => (b.read_count ?? 0) - (a.read_count ?? 0))
      .slice(0, 24)
      .map(bookToSummary);
  }

  private async book(id: string): Promise<RawBook> {
    const cached = this.bookCache.get(id);
    if (cached) return cached;
    const data = (await this.client.get("/api/video/book/getBookInfo", {
      book_id: id,
    })) as RawBook;
    if (!data || !data.book_id) {
      throw new Error(`Seri ReelShort "${id}" tidak ditemukan (ingat: pakai book_id hex, bukan t_book_id).`);
    }
    this.bookCache.set(id, data);
    return data;
  }

  async detail(id: string): Promise<SeriesDetail> {
    return bookToDetail(await this.book(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    const book = await this.book(id);
    const chapters = Array.isArray(book.online_base) ? book.online_base : [];
    const infos = new Map<string, RawChapterInfo>();
    for (const ch of chapters) {
      if (!ch.chapter_id) continue;
      const info = (await this.client.get("/api/video/book/getChapterInfo", {
        book_id: id,
        chapter_id: ch.chapter_id,
      })) as RawChapterInfo;
      infos.set(ch.chapter_id, info);
    }
    return chaptersToEpisodes(chapters, infos);
  }
}
