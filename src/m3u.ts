import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Episode, ScrapeReport, SeriesDetail } from "./types.js";

/** "Menolak Lima Pasangan Wanitaku" -> "menolak-lima-pasangan-wanitaku" */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tanpa-judul";
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "'").replace(/[\r\n]+/g, " ").trim();
}

export interface BuildM3uResult {
  content: string;
  written: Episode[];
  skipped: ScrapeReport["skipped"];
}

/**
 * Bangun isi playlist 1 judul, format mengikuti contoh pengguna:
 *
 *   #EXTM3U
 *   #EXTINF:58 tvg-logo="<snapshot>" group-title="<judul>",Episode 44
 *   https://.../...-sd.m3u8
 *
 * Episode tanpa stream URL (terkunci / kosong) TIDAK ditulis, tapi dicatat
 * di `skipped` supaya kelihatan di laporan.
 */
export function buildM3u(series: Pick<SeriesDetail, "title">, episodes: Episode[]): BuildM3uResult {
  const lines: string[] = ["#EXTM3U"];
  const written: Episode[] = [];
  const skipped: ScrapeReport["skipped"] = [];

  const sorted = [...episodes].sort((a, b) => a.index - b.index);
  for (const ep of sorted) {
    if (!ep.streamUrl) {
      skipped.push({ index: ep.index, reason: ep.locked ? "terkunci di upstream" : "stream URL kosong" });
      continue;
    }
    const duration = ep.duration && ep.duration > 0 ? Math.round(ep.duration) : -1;
    const logo = ep.snapshot ? ` tvg-logo="${escapeAttr(ep.snapshot)}"` : "";
    const label = ep.title?.trim() ? ep.title.trim() : `Episode ${ep.index}`;
    lines.push(`#EXTINF:${duration}${logo} group-title="${escapeAttr(series.title)}",${label}`);
    lines.push(ep.streamUrl);
    written.push(ep);
  }
  return { content: lines.join("\n") + "\n", written, skipped };
}

export async function writeSeriesM3u(
  outDir: string,
  provider: string,
  series: SeriesDetail,
  episodes: Episode[],
): Promise<ScrapeReport> {
  const { content, written, skipped } = buildM3u(series, episodes);
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${slugify(series.title)}.m3u`);
  await writeFile(file, content, "utf8");
  return {
    provider,
    seriesId: series.id,
    title: series.title,
    file,
    episodesFound: episodes.length,
    episodesWritten: written.length,
    skipped,
  };
}

/** Playlist gabungan: semua judul, group-title per judul. */
export function buildIndexM3u(entries: Array<{ series: SeriesDetail; episodes: Episode[] }>): string {
  const parts: string[] = [];
  for (const { series, episodes } of entries) {
    const { content, written } = buildM3u(series, episodes);
    if (written.length > 0) parts.push(content.replace(/^#EXTM3U\n/, ""));
  }
  return "#EXTM3U\n" + parts.join("");
}
