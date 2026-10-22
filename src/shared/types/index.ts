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

export interface SubtitleTrack {
  /** Nama tampilan track, mis. "Indonesia". */
  name: string;
  /** Kode bahasa BCP-47 bila diketahui, mis. "id", "en". */
  language?: string;
  /** URL file subtitle (biasanya .vtt di dalam HLS). */
  url: string;
  default?: boolean;
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
  /** Track subtitle yang diketahui dari payload episode / manifest HLS. */
  subtitles?: SubtitleTrack[];
}

/** Kontrak provider, mengikuti pola SekaiDrama: satu pola seragam per provider. */
export interface DramaProvider {
  /** Slug provider, mis. "dramabox". */
  readonly name: string;
  /** Nama tampilan untuk UI, mis. "DramaBox". */
  readonly displayName: string;
  /** false bila provider dimatikan lewat konfigurasi (DRAMABOXD_DISABLED_PROVIDERS). */
  readonly isEnabled: boolean;
  search(query: string): Promise<SeriesSummary[]>;
  latest(): Promise<SeriesSummary[]>;
  trending(): Promise<SeriesSummary[]>;
  detail(id: string): Promise<SeriesDetail>;
  /** Semua episode satu judul, sudah terurut menaik per index. */
  episodes(id: string): Promise<Episode[]>;
}

/** Status satu platform di direktori /api/platforms. */
export type PlatformStatus = "active" | "coming-soon";

/** Entri direktori platform (aktif = provider terimplementasi). */
export interface PlatformInfo {
  slug: string;
  displayName: string;
  status: PlatformStatus;
  /** Jalur integrasi: api web, api APK, atau panel. */
  kind?: "web-api" | "apk-api" | "panel";
  /** Jumlah drama yang diketahui; null bila upstream tidak memberi angka katalog. */
  dramaCount: number | null;
  description?: { id: string; en: string };
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
