import type { Config } from "../config.js";
import type { DramaProvider } from "../types.js";
import { DramaBoxProvider } from "./dramabox/index.js";
import { DrakorKuProvider } from "./drakorku/index.js";
import { FlickReelsProvider } from "./flickreels/index.js";
import { FreeReelsProvider } from "./freereels/index.js";
import { GoodShortProvider } from "./goodshort/index.js";
import { MeloloProvider } from "./melolo/index.js";
import { MockProvider } from "./mock.js";
import { NetShortProvider } from "./netshort/index.js";
import { PineDramaProvider } from "./pinedrama/index.js";
import { ReelShortProvider } from "./reelshort/index.js";
import { ShortMaxProvider } from "./shortmax/index.js";

/** Provider yang sudah terimplementasi. */
export const IMPLEMENTED = ["dramabox", "freereels", "melolo", "pinedrama", "drakorku", "reelshort", "netshort", "flickreels", "shortmax", "goodshort"] as const;

/** Provider berikutnya sesuai roadmap riset (belum diimplementasikan). */
export const PLANNED = [] as const;

/**
 * Provider yang menghormati pilihan bahasa per-request (terverifikasi live
 * untuk "id" dan "en", 23 Okt 2026): bahasa diteruskan ke mekanisme bawaan
 * masing-masing platform (edisi katalog / header lokalisasi / parameter
 * bertanda tangan). Provider lain katalognya tetap apa pun bahasanya.
 */
export const LANGUAGE_AWARE_PROVIDERS = ["reelshort", "pinedrama", "netshort", "shortmax", "goodshort"] as const;

export function isLanguageAware(name: string): boolean {
  return (LANGUAGE_AWARE_PROVIDERS as readonly string[]).includes(name);
}

/** Bahasa UI yang didukung saklar bahasa (pengaturan terpadu ID/EN). */
export type UiLanguage = "id" | "en";

export function createProvider(name: string, config: Config, language?: UiLanguage): DramaProvider {
  switch (name) {
    case "dramabox":
      return new DramaBoxProvider({
        apiBase: config.dramaboxApiBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
      });
    case "freereels":
      return new FreeReelsProvider({
        apiBase: config.freereelsApiBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        deviceName: config.freereelsDeviceName,
      });
    case "melolo":
      return new MeloloProvider({
        apiBase: config.meloloApiBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        deviceId: config.meloloDeviceId,
      });
    case "pinedrama":
      return new PineDramaProvider({
        siteBase: config.pinedramaSiteBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: language ?? config.pinedramaLanguage,
      });
    case "drakorku":
      return new DrakorKuProvider({
        apiBase: config.drakorkuApiBase,
        apiKey: config.drakorkuApiKey,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
      });
    case "reelshort":
      return new ReelShortProvider({
        apiBase: config.reelshortApiBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: language ?? config.reelshortLanguage,
      });
    case "netshort":
      return new NetShortProvider({
        siteBase: config.netshortSiteBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: language ?? config.netshortLanguage,
      });
    case "flickreels":
      return new FlickReelsProvider({
        siteBase: config.flickreelsSiteBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
      });
    case "shortmax":
      return new ShortMaxProvider({
        apiBase: config.shortmaxApiBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: language ?? config.shortmaxLanguage,
      });
    case "goodshort":
      return new GoodShortProvider({
        siteBase: config.goodshortSiteBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: language ?? config.goodshortLanguage,
      });
    case "mock":
      return new MockProvider();
    default:
      throw new Error(
        `Provider "${name}" belum diimplementasikan. Yang tersedia: ${IMPLEMENTED.join(", ")} (dan "mock" untuk uji offline). Roadmap: ${PLANNED.join(", ")}.`,
      );
  }
}
