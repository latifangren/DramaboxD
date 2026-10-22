import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Normalisasi bentuk mentah upstream DramaBox -> model internal.
// Sengaja toleran: API hosted (pola SekaiDrama) membungkus data dalam
// beberapa bentuk yang pernah terlihat di referensi terbuka:
//   - array langsung:            [ {bookId, bookName, ...}, ... ]
//   - objek buku tunggal:        { book: {...}, chapterList: [...] }
//   - bungkus data:              { data: [...] } / { data: { book, chapterList } }
// Chapter mentah: { chapterId/id, chapterIndex/index, chapterName/name,
//   chapterImg/cover, duration/viewingDuration, mp4, m3u8Url,
//   cdnList: [{ cdnDomain, videoPathList: [{ quality, videoPath, isDefault }] }],
//   isCharge/chapterPrice/unlock }

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

export function unwrapData(raw: unknown): unknown {
  if (isRaw(raw) && "data" in raw && raw.data != null) return raw.data;
  return raw;
}

export function asArray(raw: unknown): Raw[] {
  const data = unwrapData(raw);
  if (Array.isArray(data)) return data.filter(isRaw);
  if (isRaw(data)) {
    for (const key of ["list", "books", "bookList", "chapterList", "chapters", "results", "items"]) {
      if (Array.isArray(data[key])) return (data[key] as unknown[]).filter(isRaw);
    }
  }
  return [];
}

export function normalizeSeries(raw: Raw): SeriesSummary | null {
  const book = isRaw(raw.book) ? raw.book : raw;
  const id = str(book.bookId) ?? str(book.id) ?? (num(book.bookId) != null ? String(book.bookId) : undefined);
  const title = str(book.bookName) ?? str(book.title) ?? str(book.name);
  if (!id || !title) return null;
  const tags = Array.isArray(book.tags)
    ? (book.tags as unknown[]).filter((t): t is string => typeof t === "string")
    : Array.isArray(book.labels)
      ? (book.labels as unknown[]).filter((t): t is string => typeof t === "string")
      : undefined;
  return {
    id,
    title,
    cover: str(book.cover) ?? str(book.bookCover) ?? str(book.image),
    episodeCount: num(book.chapterCount) ?? num(book.totalChapter) ?? num(book.episodeCount),
    language: str(book.language) ?? str(book.simpleLanguage),
    tags,
  };
}

export function normalizeSeriesList(raw: unknown): SeriesSummary[] {
  return asArray(raw)
    .map(normalizeSeries)
    .filter((s): s is SeriesSummary => s !== null);
}

export function normalizeDetail(raw: unknown): SeriesDetail {
  const data = unwrapData(raw);
  const base = isRaw(data) ? normalizeSeries(data) : null;
  if (!base) throw new Error("Respons detail tidak berisi bookId/bookName yang dikenali.");
  const book = isRaw(data) && isRaw(data.book) ? data.book : (data as Raw);
  return {
    ...base,
    synopsis: str(book.introduction) ?? str(book.synopsis) ?? str(book.desc),
    author: str(book.author),
  };
}

function streamFromCdnList(raw: Raw): string | undefined {
  const cdnList = Array.isArray(raw.cdnList) ? raw.cdnList.filter(isRaw) : [];
  let best: { url: string; quality: number; isDefault: boolean } | undefined;
  for (const cdn of cdnList) {
    const domain = str(cdn.cdnDomain) ?? "";
    const paths = Array.isArray(cdn.videoPathList) ? cdn.videoPathList.filter(isRaw) : [];
    for (const p of paths) {
      const videoPath = str(p.videoPath);
      if (!videoPath) continue;
      const url = videoPath.startsWith("http") ? videoPath : `${domain.replace(/\/+$/, "")}/${videoPath.replace(/^\/+/, "")}`;
      const candidate = { url, quality: num(p.quality) ?? 0, isDefault: num(p.isDefault) === 1 || p.isDefault === true };
      if (!best || (candidate.isDefault && !best.isDefault) || (candidate.isDefault === best.isDefault && candidate.quality > best.quality)) {
        // Utamakan varian .m3u8; di antara sesama .m3u8 utamakan isDefault lalu kualitas tertinggi.
        if (!best || best.url.includes(".m3u8") === url.includes(".m3u8")) best = candidate;
        else if (url.includes(".m3u8")) best = candidate;
      }
    }
  }
  return best?.url;
}

export function normalizeEpisode(raw: Raw, position: number): Episode {
  const index = num(raw.chapterIndex) ?? num(raw.index) ?? num(raw.episodeIndex) ?? position;
  const charged = num(raw.isCharge) === 1 || num(raw.chapterPrice) !== undefined && (num(raw.chapterPrice) ?? 0) > 0;
  const unlock = typeof raw.unlock === "boolean" ? raw.unlock : undefined;
  const streamUrl =
    str(raw.m3u8Url) ?? str(raw.m3u8) ?? str(raw.mp4) ?? str(raw.videoUrl) ?? str(raw.url) ?? streamFromCdnList(raw);
  return {
    index,
    id: str(raw.chapterId) ?? str(raw.id) ?? str(raw.vid),
    title: str(raw.chapterName) ?? str(raw.name) ?? str(raw.title),
    duration: num(raw.duration) ?? num(raw.viewingDuration),
    snapshot: str(raw.chapterImg) ?? str(raw.cover) ?? str(raw.snapshot) ?? str(raw.image),
    streamUrl,
    locked: unlock === false ? true : streamUrl ? false : charged ? true : undefined,
  };
}

export function normalizeEpisodes(raw: unknown): Episode[] {
  const data = unwrapData(raw);
  let list: Raw[] = [];
  if (Array.isArray(data)) list = data.filter(isRaw);
  else if (isRaw(data)) {
    for (const key of ["chapterList", "chapters", "chapterVoList", "episodes", "list"]) {
      if (Array.isArray(data[key])) {
        list = (data[key] as unknown[]).filter(isRaw);
        break;
      }
    }
  }
  return list
    .map((item, i) => normalizeEpisode(item, i + 1))
    .sort((a, b) => a.index - b.index);
}
