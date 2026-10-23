import type { Episode, SeriesDetail, SeriesSummary } from "../../types.js";
import type {
  GoodShortBook,
  GoodShortChapter,
  GoodShortHomeData,
  GoodShortHomeItem,
} from "./client.js";

// Normalisasi bentuk mentah GoodShort -> model bersama.

export function bookToSummary(book: GoodShortBook): SeriesSummary {
  return {
    id: book.bookId,
    title: book.bookName ?? "",
    cover: book.cover,
    episodeCount: book.chapterCount,
  };
}

function homeItemToSummary(item: GoodShortHomeItem): SeriesSummary | null {
  if (!item.action) return null;
  return {
    id: item.action,
    title: item.bookName ?? item.name ?? "",
    cover: item.cover,
  };
}

function collectColumn(data: GoodShortHomeData, column: (name: string) => boolean): SeriesSummary[] {
  const out: SeriesSummary[] = [];
  const seen = new Set<string>();
  for (const col of data.pageColumns ?? []) {
    if (!column((col.name ?? "").toLowerCase())) continue;
    for (const item of col.items ?? []) {
      const summary = homeItemToSummary(item);
      if (summary && !seen.has(summary.id)) {
        seen.add(summary.id);
        out.push(summary);
      }
    }
  }
  return out;
}

/** Kolom "Most Trending" di beranda resmi = trending. */
export function trendingFromHome(data: GoodShortHomeData): SeriesSummary[] {
  return collectColumn(data, (name) => name.includes("trending"));
}

/** Umpan beranda (semua kolom selain banner & trending) sebagai latest. */
export function latestFromHome(data: GoodShortHomeData): SeriesSummary[] {
  return collectColumn(data, (name) => name !== "banner" && !name.includes("trending"));
}

export function normalizeDetail(book: GoodShortBook): SeriesDetail {
  const tags = new Set<string>();
  for (const tag of [...(book.tagsList ?? []), ...(book.genreList ?? [])]) {
    if (tag.name) tags.add(tag.name);
  }
  return {
    id: book.bookId,
    title: book.bookName ?? "",
    cover: book.cover,
    episodeCount: book.chapterCount,
    synopsis: book.introduction,
    tags: tags.size ? [...tags] : undefined,
  };
}

export function chaptersToEpisodes(records: GoodShortChapter[]): Episode[] {
  const sorted = [...records].sort((a, b) => chapterIndex(a) - chapterIndex(b));
  return sorted.map((chapter) => {
    const episode: Episode = {
      index: chapterIndex(chapter),
      id: chapter.id,
      duration: chapter.playTime && chapter.playTime > 0 ? chapter.playTime : undefined,
      snapshot: chapter.image,
      // Server tidak memberi m3u8Path untuk episode berbayar (price > 0).
      locked: !chapter.m3u8Path,
    };
    if (chapter.m3u8Path) episode.streamUrl = chapter.m3u8Path;
    return episode;
  });
}

function chapterIndex(chapter: GoodShortChapter): number {
  if (typeof chapter.index === "number" && chapter.index > 0) return chapter.index;
  const fromName = Number.parseInt(chapter.chapterName ?? "", 10);
  return Number.isFinite(fromName) && fromName > 0 ? fromName : 0;
}
