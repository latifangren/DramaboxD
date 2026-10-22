import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Normalisasi halaman web PineDrama -> model internal.
// Sumber data (terverifikasi live 22 Okt 2026, fixture: fixtures/pinedrama-sample.json):
//   - JSON-LD di halaman seri: {name, description, image, numberOfEpisodes, genre}
//   - Payload RSC di halaman seri/episode: "episode_list":[{episode_id, can_play}]
//     (hanya episode yang bisa dimainkan yang dicantumkan situs)
//   - Kartu katalog di /genres: <a href=".../dramas/<slug>" aria-label="<judul>">
//     diikuti <img src="<cover>">
// ID seri untuk provider ini = slug situs.

export interface SeriesPageData {
  detail: SeriesDetail;
  playableIds: number[];
  totalEpisodes: number;
}

/** Uraikan string yang ter-escape ala RSC (\" -> ") secara toleran. */
function unescapeRsc(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

export function parseJsonLd(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script type="application\/ld\+json">(\{.*?\})<\/script>/gs);
  for (const m of blocks) {
    try {
      const obj = JSON.parse(m[1]) as Record<string, unknown>;
      if (typeof obj.numberOfEpisodes === "number" && typeof obj.name === "string") return obj;
    } catch {
      // blok lain (breadcrumb dsb.) — lewati
    }
  }
  return null;
}

export function parseEpisodeList(html: string): Array<{ episode_id: number; can_play: boolean }> {
  const m = html.match(/"episode_list\\":(\[\{.*?\}\])/s) ?? html.match(/"episode_list":(\[\{.*?\}\])/s);
  if (!m) return [];
  try {
    const arr = JSON.parse(unescapeRsc(m[1])) as Array<{ episode_id?: unknown; can_play?: unknown }>;
    return arr
      .filter((e) => typeof e.episode_id === "number")
      .map((e) => ({ episode_id: e.episode_id as number, can_play: e.can_play === true }));
  } catch {
    return [];
  }
}

export function parseSeriesPage(html: string, slug: string): SeriesPageData {
  const ld = parseJsonLd(html);
  if (!ld) throw new Error(`Halaman seri PineDrama untuk "${slug}" tidak berisi JSON-LD seri.`);
  const episodes = parseEpisodeList(html);
  const total =
    typeof ld.numberOfEpisodes === "number" ? ld.numberOfEpisodes : episodes.length;
  const genre = typeof ld.genre === "string" ? ld.genre : undefined;
  return {
    detail: {
      id: slug,
      title: String(ld.name),
      synopsis: typeof ld.description === "string" ? ld.description : undefined,
      cover: typeof ld.image === "string" ? ld.image : undefined,
      episodeCount: total,
      tags: genre ? [genre] : undefined,
    },
    playableIds: episodes.filter((e) => e.can_play).map((e) => e.episode_id),
    totalEpisodes: total,
  };
}

/** Kartu seri dari halaman katalog (/genres): slug + judul + cover. */
export function parseCatalog(html: string): SeriesSummary[] {
  const out: SeriesSummary[] = [];
  const seen = new Set<string>();
  const re = /href="https?:\/\/[^"]*\/dramas\/([a-z0-9-]+)" aria-label="([^"]+)"/g;
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    const tail = html.slice(m.index + m[0].length, m.index + m[0].length + 900);
    const img = tail.match(/src="([^"]+)"/);
    out.push({ id: slug, title: m[2], cover: img?.[1] });
  }
  return out;
}

export function buildEpisodes(
  totalEpisodes: number,
  playableIds: number[],
  playUrls: Map<number, string | null>,
  cover?: string,
): Episode[] {
  const playable = new Set(playableIds);
  const out: Episode[] = [];
  for (let n = 1; n <= totalEpisodes; n++) {
    const url = playable.has(n) ? playUrls.get(n) ?? undefined : undefined;
    out.push({
      index: n,
      id: String(n),
      snapshot: cover,
      streamUrl: url,
      locked: url ? false : true,
    });
  }
  return out;
}
