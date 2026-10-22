import type { Episode, SeriesDetail, SeriesSummary, SubtitleTrack } from "../../../shared/types/index.js";
import type {
  NetShortDetailData,
  NetShortEpisodeData,
  NetShortSearchData,
} from "./client.js";

// Normalisasi bentuk mentah NetShort -> model bersama.

export function normalizeSearchResults(data: NetShortSearchData): SeriesSummary[] {
  return (data.list ?? []).map((item) => ({
    id: item.shortPlayId,
    title: stripHighlight(item.shortPlayNameNoHL ?? item.shortPlayName ?? ""),
    cover: item.shortPlayCover,
  }));
}

function stripHighlight(name: string): string {
  return name.replace(/<[^>]*>/g, "").trim();
}

export function normalizeDetail(data: NetShortDetailData): SeriesDetail {
  const episodeCount =
    data.videoEpisodeInfos?.length ??
    Object.values(data.languageDetail ?? {})[0]?.value2;
  return {
    id: data.shortPlayId,
    title: data.shortPlayName ?? "",
    cover: data.shortPlayCover,
    episodeCount,
    synopsis: data.shotIntroduce,
    tags: data.shortPlayLabels ? Object.keys(data.shortPlayLabels) : undefined,
  };
}

/**
 * Gabungkan stub episode dari detail (semua episode + status kunci + cover)
 * dengan hasil episode_info per episode (voucher putar + durasi + subtitle).
 * Episode terkunci tidak pernah punya voucher dari server — dihormati apa adanya.
 */
export function normalizeEpisodes(
  detail: NetShortDetailData,
  infos: Map<number, NetShortEpisodeData>,
): Episode[] {
  const stubs = [...(detail.videoEpisodeInfos ?? [])].sort((a, b) => a.episodeNo - b.episodeNo);
  return stubs.map((stub) => {
    const info = infos.get(stub.episodeNo);
    const locked = stub.isLock ?? info?.isLock ?? false;
    const episode: Episode = {
      index: stub.episodeNo,
      id: stub.episodeId,
      snapshot: info?.episodeCover ?? stub.episodeCover,
      locked,
    };
    if (info) {
      if (info.episodeTitle) episode.title = info.episodeTitle;
      const duration = typeof info.duration === "string" ? Number.parseFloat(info.duration) : info.duration;
      if (duration) episode.duration = duration;
      if (!locked && info.playVoucher) episode.streamUrl = info.playVoucher;
      const subtitles = normalizeSubtitles(info.subtitleList);
      if (subtitles.length) episode.subtitles = subtitles;
    }
    return episode;
  });
}

function normalizeSubtitles(list: NetShortEpisodeData["subtitleList"]): SubtitleTrack[] {
  if (!Array.isArray(list)) return [];
  const tracks: SubtitleTrack[] = [];
  for (const item of list) {
    const url = item.url ?? item.subtitleUrl;
    if (!url) continue;
    tracks.push({
      name: item.languageName ?? item.name ?? item.language ?? "Subtitle",
      language: item.language,
      url,
    });
  }
  return tracks;
}

const TV_SERIES_RE =
  /"@type":"TVSeries","@id":"https:\/\/netshort\.com\/full-episodes\/[a-z0-9-]+-(\d+)#series","name":"([^"]+)","url":"[^"]+","image":"([^"]+)","genre":\[([^\]]*)\],"numberOfEpisodes":(\d+)/g;

/** Katalog /drama/all-plots: ItemList JSON-LD TVSeries di payload SSR (urutan menurun = terbaru). */
export function parseCatalogList(html: string): SeriesSummary[] {
  const out: SeriesSummary[] = [];
  for (const m of html.matchAll(TV_SERIES_RE)) {
    out.push({
      id: m[1],
      title: m[2],
      cover: m[3],
      tags: [...m[4].matchAll(/"([^"]+)"/g)].map((g) => g[1]),
      episodeCount: Number.parseInt(m[5], 10),
    });
  }
  return out;
}

const HOME_ITEM_RE =
  /"shortPlayId":"(\d+)","shortPlayName":"((?:[^"\\]|\\.)*)","shortPlayNameNoHL":"((?:[^"\\]|\\.)*)","shortPlayNameUrl":"([^"]*)","fullEpisodeNameUrl":"([^"]*)","shortPlayCover":"([^"]*)"/g;

/** Beranda: daftar short play pilihan (seksi Hot Series dkk) di payload RSC yang lolos-encode berlapis. */
export function parseHomeList(html: string): SeriesSummary[] {
  let text = html;
  for (let i = 0; i < 4; i++) {
    const next = text.replace(/\\\\"/g, '"').replace(/\\"/g, '"');
    if (next === text) break;
    text = next;
  }
  const byId = new Map<string, SeriesSummary>();
  for (const m of text.matchAll(HOME_ITEM_RE)) {
    if (byId.has(m[1])) continue;
    byId.set(m[1], {
      id: m[1],
      title: m[3].replace(/\\u([0-9a-fA-F]{4})/g, (_s, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      ),
      cover: m[6],
    });
  }
  return [...byId.values()];
}
