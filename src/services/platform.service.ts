import type { Config } from "../infrastructure/config/index.js";
import { ACTIVE_PLATFORMS, PLANNED_PLATFORMS } from "../integrations/providers/catalog.js";
import type { PlatformInfo } from "../shared/types/index.js";

/** Direktori platform: aktif (terimplementasi & tidak dimatikan) + segera hadir. */
export class PlatformService {
  constructor(private readonly config: Config) {}

  list(): PlatformInfo[] {
    const disabled = new Set(this.config.disabledProviders);
    const active = ACTIVE_PLATFORMS.map((p) =>
      disabled.has(p.slug) ? { ...p, status: "coming-soon" as const } : p,
    );
    return [...active, ...PLANNED_PLATFORMS];
  }

  activeSlugs(): string[] {
    const disabled = new Set(this.config.disabledProviders);
    return ACTIVE_PLATFORMS.map((p) => p.slug).filter((slug) => !disabled.has(slug));
  }
}
