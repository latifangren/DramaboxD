import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Normalisasi API web ReelShort -> model internal.
// Bentuk mentah (terverifikasi live 22 Okt 2026, fixture: fixtures/reelshort-sample.json):
//   - Buku: {book_id (hex 24), t_book_id (numerik), book_title, book_pic,
//     special_desc (HTML), chapter_count, theme[], tag_list, read_count, score}
//     ID yang diterima endpoint detail/chapter = book_id HEX (t_book_id ditolak).
//   - getBookInfo data: buku + online_base[] {chapter_id, serial_number,
//     video_pic (snapshot), status}
//   - getChapterInfo data: {video_url (m3u8 di v-mps.crazymaplestudios.com),
//     duration (detik), serial_number, ...}; tanpa video_url = terkunci.

export interface RawBook {
  book_id?: string;
  t_book_id?: string | number;
  book_title?: string;
  book_pic?: string;
  special_desc?: string;
  chapter_count?: number;
  theme?: string[];
  read_count?: number;
  online_base?: RawChapter[];
}

export interface RawChapter {
  chapter_id?: string;
  serial_number?: number;
  video_pic?: string;
  status?: number;
}

export interface RawChapterInfo {
  video_url?: string;
  duration?: number;
  serial_number?: number;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text || undefined;
}

export function bookToSummary(book: RawBook): SeriesSummary {
  return {
    id: str(book.book_id) ?? String(book.t_book_id ?? ""),
    title: str(book.book_title) ?? "(tanpa judul)",
    cover: str(book.book_pic),
    episodeCount: typeof book.chapter_count === "number" ? book.chapter_count : undefined,
    tags: Array.isArray(book.theme) && book.theme.length ? book.theme : undefined,
  };
}

export function bookToDetail(book: RawBook): SeriesDetail {
  const base = bookToSummary(book);
  const total = Array.isArray(book.online_base) ? book.online_base.length : undefined;
  return {
    ...base,
    episodeCount: total ?? base.episodeCount,
    synopsis: stripHtml(book.special_desc),
  };
}

/** Buku-buku dari semua seksi webInfo (type 5002 berisi books[]), dedupe per book_id. */
export function flattenHallBooks(hall: Record<string, unknown>): RawBook[] {
  const byId = new Map<string, RawBook>();
  const lists = Array.isArray(hall.lists) ? (hall.lists as Array<Record<string, unknown>>) : [];
  for (const list of lists) {
    const books = Array.isArray(list.books) ? (list.books as RawBook[]) : [];
    for (const b of books) {
      const id = str(b.book_id);
      if (id && !byId.has(id)) byId.set(id, b);
    }
  }
  return [...byId.values()];
}

export function chaptersToEpisodes(
  chapters: RawChapter[],
  infos: Map<string, RawChapterInfo>,
): Episode[] {
  return chapters
    .map((ch, i) => {
      const info = ch.chapter_id ? infos.get(ch.chapter_id) : undefined;
      const url = str(info?.video_url);
      return {
        index: typeof ch.serial_number === "number" ? ch.serial_number : i + 1,
        id: ch.chapter_id,
        snapshot: str(ch.video_pic),
        duration: typeof info?.duration === "number" ? info.duration : undefined,
        streamUrl: url,
        locked: url ? false : true,
      } satisfies Episode;
    })
    .sort((a, b) => a.index - b.index);
}
