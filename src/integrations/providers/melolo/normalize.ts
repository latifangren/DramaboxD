import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Normalisasi respons API Melolo (platform i18n_novel ByteDance) -> model internal.
// Bentuk mentah (terverifikasi live 22 Okt 2026, fixture: fixtures/melolo-sample.json):
//   search:    { search_data: [{ books: [Book] }], has_more, next_offset }
//   Book:      { book_id, book_name, author, abstract, thumb_url, serial_count
//                (string!), language, genre }
//   directory: { book_info: Book, item_list: ["<item_id>", ...] (urut),
//                item_paid_info_list: [{item_id, is_paid}] }
//   video_model: data.video_model adalah STRING JSON (model TTVideoEngine):
//                { video_duration, poster_url,
//                  video_list: { video_N: { definition, vheight, main_url (base64),
//                                           backup_url_1 (base64) } } }

type Raw = Record<string, unknown>;

function isRaw(v: unknown): v is Raw {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeBook(raw: Raw): SeriesSummary | null {
  const id = str(raw.book_id);
  const title = str(raw.book_name);
  if (!id || !title) return null;
  const genre = raw.genre;
  return {
    id,
    title,
    cover: str(raw.thumb_url),
    episodeCount: num(raw.serial_count),
    language: str(raw.language) ?? str(raw.original_language),
    tags: Array.isArray(genre) ? genre.filter((t): t is string => typeof t === "string") : undefined,
  };
}

export function normalizeSearch(data: unknown): SeriesSummary[] {
  if (!isRaw(data) || !Array.isArray(data.search_data)) return [];
  const out: SeriesSummary[] = [];
  for (const group of data.search_data) {
    if (!isRaw(group) || !Array.isArray(group.books)) continue;
    for (const b of group.books) {
      if (!isRaw(b)) continue;
      const s = normalizeBook(b);
      if (s) out.push(s);
    }
  }
  return out;
}

export function bookInfoOf(directoryData: unknown): Raw | null {
  return isRaw(directoryData) && isRaw(directoryData.book_info) ? directoryData.book_info : null;
}

export function normalizeDetail(directoryData: unknown): SeriesDetail {
  const info = bookInfoOf(directoryData);
  const base = info ? normalizeBook(info) : null;
  if (!info || !base) throw new Error("Respons directory Melolo tidak berisi book_info yang dikenali.");
  return { ...base, synopsis: str(info.abstract) ?? str(info.sub_abstract) };
}

export interface DirectoryItems {
  itemIds: string[];
  paidIds: Set<string>;
}

export function directoryItems(directoryData: unknown): DirectoryItems {
  const itemIds: string[] = [];
  const paidIds = new Set<string>();
  if (!isRaw(directoryData)) return { itemIds, paidIds };
  if (Array.isArray(directoryData.item_list)) {
    for (const it of directoryData.item_list) {
      if (typeof it === "string" && it !== "") itemIds.push(it);
      else if (typeof it === "number") itemIds.push(String(it));
    }
  }
  if (Array.isArray(directoryData.item_paid_info_list)) {
    for (const p of directoryData.item_paid_info_list) {
      if (isRaw(p) && p.is_paid === true && (typeof p.item_id === "string" || typeof p.item_id === "number")) {
        paidIds.add(String(p.item_id));
      }
    }
  }
  if (Array.isArray(directoryData.paid_item_id_set)) {
    for (const p of directoryData.paid_item_id_set) {
      if (typeof p === "string" || typeof p === "number") paidIds.add(String(p));
    }
  }
  return { itemIds, paidIds };
}

/** main_url video_model ter-encode base64; nilai yang sudah URL polos dibiarkan. */
export function decodeStreamUrl(value: unknown): string | undefined {
  const s = str(value);
  if (!s) return undefined;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  try {
    const decoded = Buffer.from(s, "base64").toString("utf8");
    return decoded.startsWith("http") ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export interface VideoModelInfo {
  duration?: number;
  poster?: string;
  streamUrl?: string;
  definition?: string;
}

/** Urai string JSON video_model -> info putar. Pilih definisi tertinggi (vheight terbesar). */
export function parseVideoModel(data: unknown): VideoModelInfo {
  if (!isRaw(data) || typeof data.video_model !== "string") return {};
  let model: Raw;
  try {
    const parsed: unknown = JSON.parse(data.video_model);
    if (!isRaw(parsed)) return {};
    model = parsed;
  } catch {
    return {};
  }
  const out: VideoModelInfo = {
    duration: num(model.video_duration),
    poster: str(model.poster_url),
  };
  if (isRaw(model.video_list)) {
    const entries = Object.values(model.video_list).filter(isRaw);
    entries.sort((a, b) => (num(a.vheight) ?? 0) - (num(b.vheight) ?? 0));
    const best = entries[entries.length - 1];
    if (best) {
      out.streamUrl = decodeStreamUrl(best.main_url) ?? decodeStreamUrl(best.backup_url_1);
      out.definition = str(best.definition);
    }
  }
  return out;
}

export function mergeEpisode(itemId: string, position: number, info: VideoModelInfo, paid: boolean): Episode {
  return {
    index: position,
    id: itemId,
    duration: info.duration,
    snapshot: info.poster,
    streamUrl: info.streamUrl,
    locked: info.streamUrl ? false : paid ? true : undefined,
  };
}
