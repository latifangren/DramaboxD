import type { Config } from "../infrastructure/config.js";
import { createProvider, IMPLEMENTED } from "../providers/registry.js";
import type { GlobalSearchResult, SeriesSummary } from "../types.js";

export interface GlobalSearchAggregate {
  query: string;
  totalResults: number;
  perProvider: GlobalSearchResult[];
  flat: Array<SeriesSummary & { provider: string }>;
}

export class SearchService {
  constructor(private readonly config: Config) {}

  async searchProvider(provider: string, query: string): Promise<SeriesSummary[]> {
    const p = createProvider(provider, this.config);
    return await p.search(query);
  }

  async searchGlobal(query: string): Promise<GlobalSearchAggregate> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { query, totalResults: 0, perProvider: [], flat: [] };
    }

    // Eksekusi pencarian serentak ke seluruh provider yang aktif
    const searchTasks = IMPLEMENTED.map(async (providerName) => {
      try {
        const p = createProvider(providerName, this.config);
        const results = await p.search(trimmed);
        return {
          provider: providerName,
          results,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          provider: providerName,
          results: [],
          error: message,
        };
      }
    });

    const settled = await Promise.allSettled(searchTasks);
    const perProvider: GlobalSearchResult[] = [];
    const flat: Array<SeriesSummary & { provider: string }> = [];
    const seenTitles = new Set<string>();

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        perProvider.push(outcome.value);
        for (const item of outcome.value.results) {
          const key = `${outcome.value.provider}:${item.id}`;
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            flat.push({ ...item, provider: outcome.value.provider });
          }
        }
      }
    }

    return {
      query: trimmed,
      totalResults: flat.length,
      perProvider,
      flat,
    };
  }

  async suggest(query: string, limit = 6): Promise<Array<SeriesSummary & { provider: string }>> {
    const qLower = query.toLowerCase();
    const candidates: Array<SeriesSummary & { provider: string }> = [];
    const seen = new Set<string>();

    const fastProviders = ["reelshort", "freereels", "mock"];
    const tasks = fastProviders.map(async (name) => {
      try {
        const p = createProvider(name, this.config);
        const res = await p.search(query);
        return res.map((item) => ({ ...item, provider: name }));
      } catch {
        return [];
      }
    });

    const settled = await Promise.allSettled(tasks);
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        for (const item of outcome.value) {
          const key = `${item.provider}:${item.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push(item);
          }
        }
      }
    }

    return candidates
      .sort((a, b) => {
        const aStarts = (a.title || "").toLowerCase().startsWith(qLower) ? 1 : 0;
        const bStarts = (b.title || "").toLowerCase().startsWith(qLower) ? 1 : 0;
        return bStarts - aStarts;
      })
      .slice(0, limit);
  }
}
