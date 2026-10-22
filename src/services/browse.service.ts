import type { Config } from "../infrastructure/config.js";
import { createProvider } from "../providers/registry.js";
import type { DramaProvider, SeriesSummary } from "../types.js";

export interface BrowseRow {
  provider: string;
  title: string;
  items: SeriesSummary[];
}

export interface BrowsePayload {
  featured: (SeriesSummary & { provider: string }) | null;
  rows: BrowseRow[];
}

export class BrowseService {
  private cache: { data: BrowsePayload; timestamp: number } | undefined;
  private readonly ttlMs: number;

  constructor(
    private readonly config: Config,
    ttlMs = 10 * 60 * 1000, // 10 menit
  ) {
    this.ttlMs = ttlMs;
  }

  private getProvider(name: string): DramaProvider {
    return createProvider(name, this.config);
  }

  async getBrowse(forceRefresh = false): Promise<BrowsePayload> {
    const now = Date.now();
    if (!forceRefresh && this.cache && now - this.cache.timestamp < this.ttlMs) {
      return this.cache.data;
    }

    const providersToFetch = ["reelshort", "freereels", "dramabox", "melolo", "pinedrama", "mock"];
    const rows: BrowseRow[] = [];

    const results = await Promise.allSettled(
      providersToFetch.map(async (name) => {
        try {
          const p = this.getProvider(name);
          const [trending, latest] = await Promise.allSettled([p.trending(), p.latest()]);
          const trendingItems = trending.status === "fulfilled" ? trending.value : [];
          const latestItems = latest.status === "fulfilled" ? latest.value : [];

          // Gabungkan dan deduplikasi per provider
          const map = new Map<string, SeriesSummary>();
          for (const item of [...trendingItems, ...latestItems]) {
            if (!map.has(item.id)) map.set(item.id, item);
          }

          const items = Array.from(map.values());
          return {
            provider: name,
            title: `Populer di ${name.toUpperCase()}`,
            items,
          };
        } catch {
          return { provider: name, title: name, items: [] };
        }
      }),
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.items.length > 0) {
        rows.push(res.value);
      }
    }

    // Prioritaskan ReelShort & FreeReels sebagai hero billboard
    let featured: (SeriesSummary & { provider: string }) | null = null;
    const preferred = rows.find((r) => r.provider === "reelshort" || r.provider === "freereels");
    if (preferred && preferred.items.length > 0) {
      const cand = preferred.items.find((item) => item.cover);
      if (cand) featured = { ...cand, provider: preferred.provider };
    }

    if (!featured) {
      for (const r of rows) {
        const candidate = r.items.find((item) => item.cover);
        if (candidate) {
          featured = { ...candidate, provider: r.provider };
          break;
        }
      }
    }

    const payload: BrowsePayload = {
      featured,
      rows,
    };

    this.cache = { data: payload, timestamp: now };
    return payload;
  }
}
