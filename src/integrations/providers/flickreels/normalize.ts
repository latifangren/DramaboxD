import type { Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";

// Parser payload Nuxt (__NUXT_DATA__, format devalue) + JSON-LD FlickReels.
//
// Devalue: payload = array JSON datar. Objek direpresentasikan sebagai
// keymap {namaField: indeks}, dan nilai sebenarnya ada di payload[indeks]
// (bisa primitif, keymap lain, atau array indeks). Resolusi di sini dangkal
// dua tingkat — cukup untuk kartu seri, detail, dan daftar episode.

type Payload = unknown[];

const NUXT_RE = /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const HREF_RE = /\/playlist\/([a-z0-9-]+)\/(\d+)\/episode-1/g;

export function extractNuxtData(html: string): Payload | null {
  const m = NUXT_RE.exec(html);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    return Array.isArray(parsed) ? (parsed as Payload) : null;
  } catch {
    return null;
  }
}

function isKeymap(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Resolusi satu nilai devalue: indeks -> entri payload; selain itu apa adanya. */
function deref(data: Payload, v: unknown): unknown {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < data.length) return data[v];
  return v;
}

/** Resolusi keymap menjadi objek bidang -> nilai (elemen array ikut dideref dangkal). */
export function resolveKeymap(data: Payload, keymap: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, raw] of Object.entries(keymap)) {
    const value = deref(data, raw);
    out[field] = Array.isArray(value) ? value.map((el) => deref(data, el)) : value;
  }
  return out;
}

function findKeymaps(data: Payload, required: string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const entry of data) {
    if (isKeymap(entry) && required.every((k) => k in entry)) out.push(resolveKeymap(data, entry));
  }
  return out;
}

/** Peta playletId -> slug dari href kartu di HTML (slug wajib benar untuk URL episode). */
export function parseSlugMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of html.matchAll(HREF_RE)) {
    if (!map.has(m[2])) map.set(m[2], m[1]);
  }
  return map;
}

function toSummary(card: Record<string, unknown>, slug?: string): SeriesSummary | null {
  const numericId = card["playlet_id"];
  const title = card["title"];
  if (numericId === undefined || typeof title !== "string" || !slug) return null;
  const summary: SeriesSummary = {
    id: `${slug}/${String(numericId)}`,
    title,
    cover: typeof card["cover"] === "string" ? card["cover"] : undefined,
  };
  const uploadNum = Number(card["upload_num"]);
  if (Number.isFinite(uploadNum) && uploadNum > 0) summary.episodeCount = uploadNum;
  return summary;
}

/** Kartu seri dari halaman mana pun (beranda/classify/search): keymap playlet + slug dari href. */
export function parseSeriesCards(html: string): SeriesSummary[] {
  const data = extractNuxtData(html);
  if (!data) return [];
  const slugs = parseSlugMap(html);
  const byId = new Map<string, SeriesSummary>();
  for (const card of findKeymaps(data, ["playlet_id", "title", "cover"])) {
    const numericId = String(card["playlet_id"]);
    const summary = toSummary(card, slugs.get(numericId));
    if (summary && !byId.has(summary.id)) byId.set(summary.id, summary);
  }
  return [...byId.values()];
}

export interface FlickReelsEpisodeStub {
  index: number;
  id?: string;
  title?: string;
  duration?: number;
  snapshot?: string;
  locked: boolean;
}

export interface FlickReelsSeriesPage {
  detail: SeriesDetail;
  startPayNum?: number;
  stubs: FlickReelsEpisodeStub[];
}

/** Halaman episode (payload-nya memuat data SERI penuh + daftar episode). */
export function parseSeriesPage(html: string, fallbackId: string): FlickReelsSeriesPage | null {
  const data = extractNuxtData(html);
  if (!data) return null;
  const seriesMaps = findKeymaps(data, ["playlet_id", "title", "list", "start_pay_num"]);
  if (!seriesMaps.length) return null;
  const series = seriesMaps[0];

  const tags: string[] = [];
  const tagName = series["tag_name"];
  if (Array.isArray(tagName)) {
    for (const t of tagName) if (typeof t === "string") tags.push(t);
  } else if (isKeymap(tagName)) {
    // tag_name kadang keymap {tag_name: idx} per entri — diambil oleh findKeymaps lain; lewati.
  }

  const detail: SeriesDetail = {
    id: fallbackId,
    title: typeof series["title"] === "string" ? series["title"] : "",
    cover: typeof series["cover"] === "string" ? series["cover"] : undefined,
    synopsis: typeof series["introduce"] === "string" ? series["introduce"] : undefined,
    tags: tags.length ? tags : undefined,
  };

  const stubs: FlickReelsEpisodeStub[] = [];
  const listRaw = series["list"];
  if (Array.isArray(listRaw)) {
    for (const el of listRaw) {
      if (!isKeymap(el)) continue;
      const ep = resolveKeymap(data, el as Record<string, unknown>);
      const num = Number(ep["chapter_num"]);
      if (!Number.isFinite(num)) continue;
      stubs.push({
        index: num,
        id: ep["chapter_id"] !== undefined ? String(ep["chapter_id"]) : undefined,
        title: typeof ep["chapter_title"] === "string" ? ep["chapter_title"] : undefined,
        duration: Number(ep["duration"]) || undefined,
        snapshot: typeof ep["chapter_cover"] === "string" ? ep["chapter_cover"] : undefined,
        locked: Number(ep["is_lock"]) === 1,
      });
    }
    stubs.sort((a, b) => a.index - b.index);
  }
  detail.episodeCount = stubs.length || (Number(series["upload_num"]) || undefined);

  const startPayNum = Number(series["start_pay_num"]);
  return { detail, startPayNum: Number.isFinite(startPayNum) ? startPayNum : undefined, stubs };
}

export interface VideoObjectInfo {
  contentUrl?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
}

const LD_JSON_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

/** JSON-LD VideoObject di halaman episode: contentUrl (m3u8 bertanda tangan) episode itu. */
export function parseVideoObject(html: string): VideoObjectInfo {
  for (const m of html.matchAll(LD_JSON_RE)) {
    try {
      const parsed = JSON.parse(m[1]) as Record<string, unknown>;
      const objects = Array.isArray(parsed["@graph"]) ? (parsed["@graph"] as Record<string, unknown>[]) : [parsed];
      for (const obj of objects) {
        if (obj["@type"] === "VideoObject" || typeof obj["contentUrl"] === "string") {
          const thumb = obj["thumbnailUrl"];
          return {
            contentUrl: typeof obj["contentUrl"] === "string" ? obj["contentUrl"] : undefined,
            durationSeconds: typeof obj["duration"] === "string" ? parseIsoDuration(obj["duration"]) : undefined,
            thumbnailUrl: Array.isArray(thumb) ? (thumb[0] as string) : (thumb as string | undefined),
          };
        }
      }
    } catch {
      // blok ld+json lain (breadcrumb dsb.) — abaikan
    }
  }
  return {};
}

/** "PT2M33S" -> 153 detik. */
export function parseIsoDuration(iso: string): number | undefined {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso);
  if (!m) return undefined;
  const total = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return total > 0 ? Math.round(total) : undefined;
}

export function stubsToEpisodes(
  stubs: FlickReelsEpisodeStub[],
  streams: Map<number, VideoObjectInfo>,
): Episode[] {
  return stubs.map((stub) => {
    const info = streams.get(stub.index);
    const episode: Episode = {
      index: stub.index,
      id: stub.id,
      title: stub.title,
      duration: stub.duration ?? info?.durationSeconds,
      snapshot: stub.snapshot ?? info?.thumbnailUrl,
      locked: stub.locked,
    };
    if (!stub.locked && info?.contentUrl) episode.streamUrl = info.contentUrl;
    return episode;
  });
}
