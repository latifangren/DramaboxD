import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import type {
  ShortMaxDetailData,
  ShortMaxHotItem,
  ShortMaxSeriesItem,
} from "./client.js";

// Normalisasi bentuk mentah ShortMax -> model bersama.
// Catatan upstream: coverId di sini sudah berupa URL absolut CDN mereka.

export function itemToSummary(item: ShortMaxSeriesItem): SeriesSummary {
  return {
    id: String(item.shortPlayId),
    title: (item.shortPlayName ?? item.rawName ?? "").replace(/<[^>]*>/g, "").trim(),
    cover: item.coverId,
  };
}

export function hotToSummaries(items: ShortMaxHotItem[]): SeriesSummary[] {
  return items.map((item) => ({
    id: String(item.shortPlayId),
    title: (item.shortPlayName ?? "").replace(/<[^>]*>/g, "").trim(),
  }));
}

export function normalizeDetail(data: ShortMaxDetailData): SeriesDetail {
  const tags = new Set<string>();
  for (const label of [...(data.labelList ?? []), ...(data.classList ?? [])]) {
    const name = label.displayName ?? label.labelName;
    if (name) tags.add(name);
  }
  return {
    id: String(data.shortPlayId),
    title: data.shortPlayName ?? data.rawName ?? "",
    cover: data.coverId,
    episodeCount: data.episodeList?.length,
    synopsis: data.summary,
    tags: tags.size ? [...tags] : undefined,
  };
}

/** Urutan preferensi kualitas stream dari encryptedVideoUrl. */
const QUALITY_ORDER = ["video_720", "video_1080", "video_480"] as const;

export function pickStreamUrl(encryptedVideoUrl: string | undefined): string | undefined {
  if (!encryptedVideoUrl) return undefined;
  try {
    const parsed = JSON.parse(encryptedVideoUrl) as Record<string, string>;
    for (const quality of QUALITY_ORDER) {
      if (parsed[quality]) return parsed[quality];
    }
    const first = Object.values(parsed)[0];
    return first || undefined;
  } catch {
    return undefined;
  }
}

export function normalizeEpisodes(data: ShortMaxDetailData): Episode[] {
  const lockBegin = data.lockBegin ?? 0;
  const episodes = [...(data.episodeList ?? [])].sort((a, b) => a.episodeNum - b.episodeNum);
  return episodes.map((raw) => {
    const streamUrl = pickStreamUrl(raw.encryptedVideoUrl);
    // Terkunci bila melewati batas gratis situs ATAU server tidak memberi URL.
    const locked = raw.episodeNum > lockBegin || !streamUrl;
    const episode: Episode = {
      index: raw.episodeNum,
      snapshot: raw.frameExtractionCover || raw.coverId || data.coverId,
      locked,
    };
    if (!locked && streamUrl) episode.streamUrl = streamUrl;
    return episode;
  });
}
