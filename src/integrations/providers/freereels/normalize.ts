import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Normalisasi respons API FreeReels (DramaWave) -> model internal.
// Bentuk mentah (terverifikasi live 22 Okt 2026, fixture: fixtures/freereels-sample.json):
//   search/hot:  { page_info: {next, has_more}, items: [Series] }
//   Series:      { id, name, desc, cover, episode_count, series_tag[], content_tags[],
//                  lang / original_audio_language, pay_mode, free }
//   info_v2:     { info: { ...Series, episode_list: [EpMeta], episode: EpPlay } }
//   EpMeta:      { id, name, cover, duration (string detik), episode_price, m3u8_url: "" }
//   info_push_v2:{ info: { episode: EpPlay } }
//   EpPlay:      { id, index, unlock, duration, m3u8_url, video_url,
//                  external_audio_h264_m3u8, external_audio_h265_m3u8, cover }

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

function tagsOf(raw: Raw): string[] | undefined {
  const from = Array.isArray(raw.series_tag) ? raw.series_tag : Array.isArray(raw.content_tags) ? raw.content_tags : undefined;
  if (!from) return undefined;
  // content_tags kadang berisi markup "Secret {{Love}}" — bersihkan kurungnya.
  const tags = from
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.replace(/[{}]/g, "").trim())
    .filter((t) => t !== "");
  return tags.length > 0 ? tags : undefined;
}

export function normalizeSeries(raw: Raw): SeriesSummary | null {
  const id = str(raw.id);
  const title = str(raw.name) ?? str(raw.title);
  if (!id || !title) return null;
  return {
    id,
    title,
    cover: str(raw.cover),
    episodeCount: num(raw.episode_count),
    language: str(raw.lang) ?? str(raw.original_audio_language),
    tags: tagsOf(raw),
  };
}

export function normalizeSeriesList(data: unknown): SeriesSummary[] {
  const items = isRaw(data) && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return items.filter(isRaw).map(normalizeSeries).filter((s): s is SeriesSummary => s !== null);
}

/** Ambil objek info dari bungkus data info_v2 / info_push_v2. */
export function infoOf(data: unknown): Raw | null {
  if (isRaw(data) && isRaw(data.info)) return data.info;
  return isRaw(data) ? data : null;
}

export function normalizeDetail(data: unknown): SeriesDetail {
  const info = infoOf(data);
  const base = info ? normalizeSeries(info) : null;
  if (!info || !base) throw new Error("Respons info_v2 tidak berisi seri yang dikenali.");
  return { ...base, synopsis: str(info.desc) };
}

/** URL stream dari objek episode putar: utamakan m3u8_url, lalu varian external-audio (yang benar-benar terisi untuk seri IAA). */
export function streamUrlOf(ep: Raw): string | undefined {
  return (
    str(ep.m3u8_url) ??
    str(ep.external_audio_h264_m3u8) ??
    str(ep.external_audio_h265_m3u8) ??
    str(ep.video_url)
  );
}

/** Gabungkan metadata episode (dari episode_list) dengan objek putar (dari info_push_v2). */
export function mergeEpisode(meta: Raw, position: number, play: Raw | null): Episode {
  const streamUrl = play ? streamUrlOf(play) : undefined;
  const unlock = play && typeof play.unlock === "boolean" ? play.unlock : undefined;
  return {
    index: position,
    id: str(meta.id),
    title: str(meta.name),
    duration: num(meta.duration) ?? (play ? num(play.duration) : undefined),
    snapshot: str(meta.cover) ?? (play ? str(play.cover) : undefined),
    streamUrl,
    locked: streamUrl ? false : unlock === false ? true : undefined,
  };
}

export function episodeMetas(data: unknown): Raw[] {
  const info = infoOf(data);
  if (!info || !Array.isArray(info.episode_list)) return [];
  return info.episode_list.filter(isRaw);
}

export function playEpisodeOf(data: unknown): Raw | null {
  const info = infoOf(data);
  return info && isRaw(info.episode) ? info.episode : null;
}
