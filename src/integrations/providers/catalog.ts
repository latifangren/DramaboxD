// Direktori platform — metadata tampilan untuk /api/platforms (pola halaman
// dramaflix.net/id/platforms: platform aktif + seksi "segera hadir").
// Angka dramaCount hanya diisi bila katalog upstream memang memberi angka
// (saat ini belum ada — jangan mengarang angka katalog platform lain).
import type { PlatformInfo } from "../../shared/types/index.js";

export const ACTIVE_PLATFORMS: PlatformInfo[] = [
  {
    slug: "reelshort",
    displayName: "ReelShort",
    status: "active",
    kind: "web-api",
    dramaCount: null,
    description: {
      id: "API web resmi (HMAC-SHA256 + amplop AES) — m3u8 persis pola CDN Crazy Maple.",
      en: "Official web API (HMAC-SHA256 + AES envelope) — m3u8 straight from the Crazy Maple CDN.",
    },
  },
  {
    slug: "freereels",
    displayName: "FreeReels",
    status: "active",
    kind: "apk-api",
    dramaCount: null,
    description: {
      id: "API aplikasi DramaWave (login tamu MD5, unlock per episode via info_push_v2).",
      en: "DramaWave app API (MD5 guest login, per-episode unlock via info_push_v2).",
    },
  },
  {
    slug: "pinedrama",
    displayName: "PineDrama",
    status: "active",
    kind: "web-api",
    dramaCount: null,
    description: {
      id: "Jalur web pinedrama.com (JSON-LD + payload RSC, MP4 bertanda tangan).",
      en: "pinedrama.com web route (JSON-LD + RSC payload, signed MP4 play URLs).",
    },
  },
  {
    slug: "melolo",
    displayName: "Melolo",
    status: "active",
    kind: "apk-api",
    dramaCount: null,
    description: {
      id: "API aplikasi ByteDance (video_model → MP4 langsung per definisi).",
      en: "ByteDance app API (video_model → direct MP4 per definition).",
    },
  },
  {
    slug: "drakorku",
    displayName: "DrakorKu",
    status: "active",
    kind: "panel",
    dramaCount: null,
    description: {
      id: "Drama Korea sub Indo dari panel Your Videos Channel — MP4 langsung tanpa paywall API.",
      en: "Korean dramas with Indonesian subs from a Your Videos Channel panel — direct MP4, no API paywall.",
    },
  },
  {
    slug: "netshort",
    displayName: "NetShort",
    status: "active",
    kind: "web-api",
    dramaCount: null,
    description: {
      id: "Jalur web netshort.com (amplop enkripsi AES/RSA persis klien resmi) — MP4 bertanda tangan per episode, episode terkunci dihormati.",
      en: "netshort.com web route (AES/RSA envelope like the official client) — signed MP4 per episode, locked episodes respected.",
    },
  },
  {
    slug: "dramabox",
    displayName: "DramaBox",
    status: "active",
    kind: "web-api",
    dramaCount: null,
    description: {
      id: "Adapter mirror Sansekai. Dari sebagian jaringan upstream membalas 403 — status live tergantung IP.",
      en: "Sansekai mirror adapter. Upstream answers 403 from some networks — live status depends on IP.",
    },
  },
];

/** Roadmap riset (lihat docs/) — ditampilkan sebagai "segera hadir". */
export const PLANNED_PLATFORMS: PlatformInfo[] = [
  { slug: "flickreels", displayName: "FlickReels", status: "coming-soon", dramaCount: null },
  { slug: "shortmax", displayName: "ShortMax", status: "coming-soon", dramaCount: null },
  { slug: "goodshort", displayName: "GoodShort", status: "coming-soon", dramaCount: null },
  { slug: "loklok", displayName: "LokLok", status: "coming-soon", dramaCount: null },
];
