import { TtlCache } from "../infrastructure/cache/index.js";
import type { Config } from "../infrastructure/config/index.js";
import { createProvider } from "../integrations/providers/registry.js";
import type { SeriesSummary } from "../shared/types/index.js";
import { PlatformService } from "./platform.service.js";

export interface BrowseRow {
  provider: string;
  title: string;
  items: SeriesSummary[];
}

export interface BrowsePayload {
  featured: (SeriesSummary & { provider: string }) | null;
  rows: BrowseRow[];
}

const BROWSE_TTL_MS = 15 * 60 * 1000; // ARCHITECTURE.md §5: katalog 15–30 mnt

/** Agregasi katalog beranda: billboard + satu baris per provider aktif. */
export class BrowseService {
  private readonly cache = new TtlCache();

  constructor(
    private readonly config: Config,
    private readonly platforms: PlatformService,
  ) {}

  async browse(): Promise<BrowsePayload> {
    return this.cache.getOrFetch("browse:all", BROWSE_TTL_MS, () => this.fetchAll());
  }

  private async fetchAll(): Promise<BrowsePayload> {
    const slugs = this.platforms.activeSlugs();
    const settled = await Promise.allSettled(
      slugs.map(async (slug) => {
        const provider = createProvider(slug, this.config);
        const [trending, latest] = await Promise.allSettled([provider.trending(), provider.latest()]);
        const byId = new Map<string, SeriesSummary>();
        for (const item of [
          ...(trending.status === "fulfilled" ? trending.value : []),
          ...(latest.status === "fulfilled" ? latest.value : []),
        ]) {
          if (!byId.has(item.id)) byId.set(item.id, item);
        }
        return {
          provider: slug,
          title: `Trending di ${provider.displayName}`,
          items: [...byId.values()],
        } satisfies BrowseRow;
      }),
    );

    const rows = settled
      .filter((r): r is PromiseFulfilledResult<BrowseRow> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((row) => row.items.length > 0);

    return { featured: pickFeatured(rows), rows };
  }
}

function pickFeatured(rows: BrowseRow[]): (SeriesSummary & { provider: string }) | null {
  const preferred = rows.find((r) => r.provider === "reelshort" || r.provider === "freereels");
  const ordered = preferred ? [preferred, ...rows.filter((r) => r !== preferred)] : rows;
  for (const row of ordered) {
    const candidate = row.items.find((item) => item.cover);
    if (candidate) return { ...candidate, provider: row.provider };
  }
  return null;
}
