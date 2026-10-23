export interface Config {
  /** Server WebUI (src/index.ts). */
  host: string;
  port: number;
  /** Slug provider yang dimatikan paksa (env DRAMABOXD_DISABLED_PROVIDERS, koma). */
  disabledProviders: string[];
  /** Host CDN tambahan yang diizinkan untuk /api/stream (env DRAMABOXD_STREAM_EXTRA_HOSTS). */
  streamExtraHosts: string[];
  dramaboxApiBase: string;
  freereelsApiBase: string;
  freereelsDeviceName?: string;
  meloloApiBase: string;
  meloloDeviceId?: string;
  pinedramaSiteBase: string;
  pinedramaLanguage?: string;
  drakorkuApiBase: string;
  drakorkuApiKey?: string;
  reelshortApiBase: string;
  reelshortLanguage?: string;
  netshortSiteBase: string;
  netshortLanguage?: string;
  flickreelsSiteBase: string;
  shortmaxApiBase: string;
  shortmaxLanguage?: string;
  goodshortSiteBase: string;
  goodshortLanguage?: string;
  delayMs: number;
  timeoutMs: number;
  outDir: string;
}

function intFromEnv(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.DRAMABOXD_HOST ?? "0.0.0.0",
    port: intFromEnv(env.PORT ?? env.DRAMABOXD_PORT, 3004),
    disabledProviders: (env.DRAMABOXD_DISABLED_PROVIDERS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    streamExtraHosts: (env.DRAMABOXD_STREAM_EXTRA_HOSTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    dramaboxApiBase: (env.DRAMABOX_API_BASE ?? "https://api.sansekai.my.id/api").replace(/\/+$/, ""),
    freereelsApiBase: (env.FREEREELS_API_BASE ?? "https://apiv2.free-reels.com/frv2-api").replace(/\/+$/, ""),
    freereelsDeviceName: env.FREEREELS_DEVICE_NAME,
    meloloApiBase: (env.MELOLO_API_BASE ?? "https://api.tmtreader.com").replace(/\/+$/, ""),
    meloloDeviceId: env.MELOLO_DEVICE_ID,
    pinedramaSiteBase: (env.PINEDRAMA_SITE_BASE ?? "https://pinedrama.com").replace(/\/+$/, ""),
    pinedramaLanguage: env.PINEDRAMA_LANGUAGE,
    drakorkuApiBase: (env.DRAKORKU_API_BASE ?? "https://kampretloh.top/v3").replace(/\/+$/, ""),
    drakorkuApiKey: env.DRAKORKU_API_KEY,
    reelshortApiBase: (env.REELSHORT_API_BASE ?? "https://www.reelshort.com").replace(/\/+$/, ""),
    reelshortLanguage: env.REELSHORT_LANGUAGE,
    netshortSiteBase: (env.NETSHORT_SITE_BASE ?? "https://netshort.com").replace(/\/+$/, ""),
    netshortLanguage: env.NETSHORT_LANGUAGE,
    flickreelsSiteBase: (env.FLICKREELS_SITE_BASE ?? "https://www.flickreels.net").replace(/\/+$/, ""),
    shortmaxApiBase: (env.SHORTMAX_API_BASE ?? "https://shortweb.shorttv.live/app-api/app").replace(/\/+$/, ""),
    shortmaxLanguage: env.SHORTMAX_LANGUAGE,
    goodshortSiteBase: (env.GOODSHORT_SITE_BASE ?? "https://www.goodshort.com").replace(/\/+$/, ""),
    goodshortLanguage: env.GOODSHORT_LANGUAGE,
    delayMs: intFromEnv(env.DRACIN_DELAY_MS, 500),
    timeoutMs: intFromEnv(env.DRACIN_TIMEOUT_MS, 30_000),
    outDir: env.DRACIN_OUT_DIR ?? "output",
  };
}
