// Model data ternormalisasi — semua provider wajib menghasilkan bentuk ini,
// supaya penulis M3U tidak perlu tahu bentuk mentah upstream.
//
// Bentuk mentah DramaBox yang jadi acuan normalisasi (dari referensi terbuka
// akmaldira/dramabox-downloader): Book { bookId, bookName, cover, chapterCount,
// labels/tags, language } dan Chapter { index, mp4, m3u8Url, cover, duration,
// unlock, cdnList[].videoPathList[] }.

export interface SeriesSummary {
  /** ID unik di provider asal (DramaBox: bookId). */
  id: string;
  title: string;
  cover?: string;
  /** Jumlah episode bila diketahui dari daftar/search. */
  episodeCount?: number;
  language?: string;
  tags?: string[];
}

export interface SeriesDetail extends SeriesSummary {
  synopsis?: string;
  author?: string;
}

export interface Episode {
  /** Nomor episode 1-based, sesuai urutan cerita. */
  index: number;
  /** ID episode di provider asal, bila ada. */
  id?: string;
  title?: string;
  /** Durasi dalam detik; 0 / undefined bila upstream tidak memberi. */
  duration?: number;
  /** Thumbnail/snapshot episode — dipakai sebagai tvg-logo di M3U. */
  snapshot?: string;
  /** URL stream yang bisa diputar (utamakan .m3u8, fallback .mp4). */
  streamUrl?: string;
  /** true bila episode terkunci di upstream (stream biasanya kosong). */
  locked?: boolean;
  /** Daftar subtitle bila disediakan upstream. */
  subtitles?: SubtitleTrack[];
}

export interface SubtitleTrack {
  lang: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

export interface PlatformInfo {
  id: string;
  name: string;
  dramaCount: number;
  status: "active" | "planned" | "coming_soon";
  icon?: string;
  description?: string;
}

export interface GlobalSearchResult {
  provider: string;
  results: SeriesSummary[];
  error?: string;
}

/** Kontrak provider, mengikuti pola SekaiDrama: satu pola seragam per provider. */
export interface DramaProvider {
  /** Slug provider, mis. "dramabox". */
  readonly name: string;
  search(query: string): Promise<SeriesSummary[]>;
  latest(): Promise<SeriesSummary[]>;
  trending(): Promise<SeriesSummary[]>;
  detail(id: string): Promise<SeriesDetail>;
  /** Semua episode satu judul, sudah terurut menaik per index. */
  episodes(id: string): Promise<Episode[]>;
}

export interface ScrapeReport {
  provider: string;
  seriesId: string;
  title: string;
  file: string;
  episodesFound: number;
  episodesWritten: number;
  /** Episode yang dilewati (terkunci / tanpa stream URL) — tidak ditulis diam-diam. */
  skipped: Array<{ index: number; reason: string }>;
}
