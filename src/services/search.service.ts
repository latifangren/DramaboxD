import type { Config } from "../infrastructure/config/index.js";
import { ProviderUnavailableError } from "../shared/errors/index.js";
import { createProvider } from "../integrations/providers/registry.js";
import type { SeriesSummary } from "../shared/types/index.js";
import { PlatformService } from "./platform.service.js";

export interface ProviderSearchResult {
  provider: string;
  results: (SeriesSummary & { provider: string })[];
}

export interface GlobalSearchResult {
  query: string;
  /** Hasil gabungan semua provider (yang gagal dicatat di `failures`, tidak menjatuhkan total). */
  results: (SeriesSummary & { provider: string })[];
  perProvider: ProviderSearchResult[];
  failures: { provider: string; error: string }[];
}

/** Pencarian satu provider + pencarian global paralel (Promise.allSettled). */
export class SearchService {
  constructor(
    private readonly config: Config,
    private readonly platforms: PlatformService,
  ) {}

  async searchOne(providerSlug: string, query: string): Promise<ProviderSearchResult> {
    const provider = createProvider(providerSlug, this.config);
    try {
      const results = await provider.search(query);
      return { provider: providerSlug, results: results.map((r) => ({ ...r, provider: providerSlug })) };
    } catch (err) {
      throw new ProviderUnavailableError(providerSlug, err);
    }
  }

  async searchGlobal(query: string): Promise<GlobalSearchResult> {
    const slugs = this.platforms.activeSlugs();
    const settled = await Promise.allSettled(slugs.map((slug) => this.searchOne(slug, query)));
    const perProvider: ProviderSearchResult[] = [];
    const failures: { provider: string; error: string }[] = [];
    settled.forEach((result, i) => {
      if (result.status === "fulfilled") perProvider.push(result.value);
      else failures.push({ provider: slugs[i], error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
    });
    return {
      query,
      results: perProvider.flatMap((p) => p.results),
      perProvider,
      failures,
    };
  }
}
