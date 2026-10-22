import type { SubtitleTrack } from "../shared/types/index.js";
import { StreamProxyService } from "./stream-proxy.service.js";

/**
 * Ekstraksi track subtitle dari manifest HLS (#EXT-X-MEDIA TYPE=SUBTITLES).
 * Terjemahan on-the-fly belum diimplementasikan — endpoint terjemahan menjawab
 * 501 secara eksplisit (lihat subtitle.controller), bukan diam-diam gagal.
 */
export class SubtitleService {
  constructor(private readonly proxy: StreamProxyService) {}

  async extractFromManifest(manifestUrl: string, provider?: string): Promise<SubtitleTrack[]> {
    const url = this.proxy.assertUrlAllowed(manifestUrl);
    const res = await fetch(url, { headers: this.proxy.upstreamHeaders(url, undefined, provider) });
    if (!res.ok) return [];
    const text = await res.text();
    return parseSubtitleTracks(text, url);
  }
}

export function parseSubtitleTracks(manifest: string, base: URL): SubtitleTrack[] {
  const basePath = base.href.substring(0, base.href.lastIndexOf("/") + 1);
  const tracks: SubtitleTrack[] = [];
  for (const line of manifest.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("#EXT-X-MEDIA:") || !trimmed.includes("TYPE=SUBTITLES")) continue;
    const uri = /URI="([^"]+)"/.exec(trimmed)?.[1];
    if (!uri) continue;
    const name = /NAME="([^"]+)"/.exec(trimmed)?.[1] ?? "Subtitle";
    const language = /LANGUAGE="([^"]+)"/.exec(trimmed)?.[1];
    tracks.push({
      name,
      language,
      url: new URL(uri, basePath).href,
      default: trimmed.includes("DEFAULT=YES"),
    });
  }
  return tracks;
}
