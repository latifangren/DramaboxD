import type { Config } from "../../infrastructure/config/index.js";
import type { DramaProvider } from "../../shared/types/index.js";
import { DramaBoxProvider } from "./dramabox/index.js";
import { DrakorKuProvider } from "./drakorku/index.js";
import { FreeReelsProvider } from "./freereels/index.js";
import { MeloloProvider } from "./melolo/index.js";
import { MockProvider } from "./mock/index.js";
import { NetShortProvider } from "./netshort/index.js";
import { PineDramaProvider } from "./pinedrama/index.js";
import { ReelShortProvider } from "./reelshort/index.js";

/** Provider yang sudah terimplementasi. */
export const IMPLEMENTED = ["dramabox", "freereels", "melolo", "pinedrama", "drakorku", "reelshort", "netshort"] as const;

/** Provider berikutnya sesuai roadmap riset (belum diimplementasikan). */
export const PLANNED = ["flickreels", "shortmax", "goodshort"] as const;

export function createProvider(name: string, config: Config): DramaProvider {
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
        language: config.pinedramaLanguage,
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
        language: config.reelshortLanguage,
      });
    case "netshort":
      return new NetShortProvider({
        siteBase: config.netshortSiteBase,
        timeoutMs: config.timeoutMs,
        delayMs: config.delayMs,
        language: config.netshortLanguage,
      });
    case "mock":
      return new MockProvider();
    default:
      throw new Error(
        `Provider "${name}" belum diimplementasikan. Yang tersedia: ${IMPLEMENTED.join(", ")} (dan "mock" untuk uji offline). Roadmap: ${PLANNED.join(", ")}.`,
      );
  }
}
