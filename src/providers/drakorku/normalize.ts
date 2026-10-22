import type { Episode, SeriesDetail, SeriesSummary } from "../../types.js";

// Normalisasi respons panel Your Videos Channel (DrakorKu) -> model internal.
// Bentuk mentah (terverifikasi live 22 Okt 2026, fixture: fixtures/drakorku-sample.json):
//   - Seri = "category": {cid, category_name, category_image, image_landscape,
//     status_video (OnGoing|Complete), rating, year, genre, desc_anime (HTML)}
//   - Episode = "post": {vid, cat_id, video_title ("<Judul> Eps 15"),
//     video_url, video_url_hd, video_url_eng, video_thumbnail, total_views,
//     date_time, category_name, category_image, ...}
//   - Amplop daftar: get_videos -> latest_anime[], search -> posts[],
//     get_category_videos -> {category, posts[]/latest_anime[], count_total}
// Stream = MP4 langsung (host seedbox), tanpa paywall di level API.

export interface RawCategory {
  cid?: number | string;
  category_name?: string;
  category_image?: string;
  image_landscape?: string;
  status_video?: string;
  rating?: number | string;
  year?: number | string;
  genre?: string;
  desc_anime?: string;
}

export interface RawPost {
  vid?: number | string;
  cat_id?: number | string;
  video_title?: string;
  video_url?: string;
  video_url_hd?: string;
  video_url_eng?: string;
  video_thumbnail?: string;
  category_name?: string;
  category_image?: string;
  genre?: string;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** Buang tag HTML dari sinopsis panel (desc_anime berisi markup). */
export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text || undefined;
}

export function categoryToSummary(cat: RawCategory): SeriesSummary {
  const genre = str(cat.genre);
  return {
    id: String(cat.cid ?? ""),
    title: str(cat.category_name) ?? "(tanpa judul)",
    cover: str(cat.category_image),
    tags: genre ? [genre] : undefined,
  };
}

export function categoryToDetail(cat: RawCategory, episodeCount?: number): SeriesDetail {
  const base = categoryToSummary(cat);
  const meta: string[] = [];
  if (cat.year) meta.push(`Tahun ${cat.year}`);
  if (cat.rating) meta.push(`Rating ${cat.rating}`);
  if (str(cat.status_video)) meta.push(str(cat.status_video) as string);
  const synopsis = stripHtml(cat.desc_anime);
  return {
    ...base,
    episodeCount,
    synopsis: meta.length
      ? [meta.join(" · "), synopsis].filter(Boolean).join("\n\n")
      : synopsis,
  };
}

/** Kelompokkan post episode hasil search -> ringkasan seri per cat_id. */
export function postsToSeries(posts: RawPost[]): SeriesSummary[] {
  const byId = new Map<string, SeriesSummary>();
  for (const p of posts) {
    const cid = p.cat_id == null ? "" : String(p.cat_id);
    if (!cid || byId.has(cid)) continue;
    const genre = str(p.genre);
    byId.set(cid, {
      id: cid,
      title: str(p.category_name) ?? "(tanpa judul)",
      cover: str(p.category_image),
      tags: genre ? [genre] : undefined,
    });
  }
  return [...byId.values()];
}

/** Nomor episode dari judul post: "… Eps 15", "… Eps. 03", "… Episode 7". */
export function parseEpisodeNumber(title: string | undefined): number | null {
  if (!title) return null;
  const m =
    title.match(/eps?\.?\s*(\d{1,4})\b/i) ?? title.match(/episode\s*(\d{1,4})\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function postToEpisode(post: RawPost, fallbackIndex: number): Episode {
  const num = parseEpisodeNumber(post.video_title);
  const stream = str(post.video_url_hd) ?? str(post.video_url) ?? str(post.video_url_eng);
  return {
    index: num ?? fallbackIndex,
    id: post.vid == null ? undefined : String(post.vid),
    title: str(post.video_title),
    snapshot: str(post.video_thumbnail),
    streamUrl: stream,
    locked: stream ? false : true,
  };
}

/** Post-post satu seri -> episode terurut; nomor duplikat/hilang dirapikan per posisi. */
export function postsToEpisodes(posts: RawPost[]): Episode[] {
  const eps = posts.map((p, i) => postToEpisode(p, i + 1));
  eps.sort((a, b) => a.index - b.index);
  return eps;
}

/** Ambil array post dari amplop panel, apapun nama key-nya. */
export function extractPosts(body: Record<string, unknown>): RawPost[] {
  for (const key of ["posts", "latest_anime", "videos"]) {
    const v = body[key];
    if (Array.isArray(v)) return v as RawPost[];
  }
  return [];
}

export function extractCategories(body: Record<string, unknown>): RawCategory[] {
  return Array.isArray(body.categories) ? (body.categories as RawCategory[]) : [];
}
