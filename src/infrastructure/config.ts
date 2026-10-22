export interface Config {
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
  delayMs: number;
  timeoutMs: number;
  outDir: string;
  port: number;
  host: string;
}

function intFromEnv(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
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
    delayMs: intFromEnv(env.DRACIN_DELAY_MS, 500),
    timeoutMs: intFromEnv(env.DRACIN_TIMEOUT_MS, 30_000),
    outDir: env.DRACIN_OUT_DIR ?? "output",
    port: intFromEnv(env.PORT, 3004),
    host: env.HOST ?? "0.0.0.0",
  };
}
