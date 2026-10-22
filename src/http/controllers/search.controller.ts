import type { Context } from "hono";
import type { SearchService } from "../../services/search.service.js";

export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  async searchSingle(c: Context) {
    const q = c.req.query("q")?.trim() ?? "";
    const providerParam = c.req.query("provider") ?? "melolo";
    if (!q) {
      return c.json({ error: "Query 'q' wajib diisi" }, 400);
    }

    try {
      const results = await this.searchService.searchProvider(providerParam, q);
      return c.json({ provider: providerParam, query: q, results });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal melakukan pencarian" }, 500);
    }
  }

  async searchGlobal(c: Context) {
    const q = c.req.query("q")?.trim() ?? "";
    if (!q) {
      return c.json({ error: "Query 'q' wajib diisi" }, 400);
    }

    try {
      const aggregate = await this.searchService.searchGlobal(q);
      return c.json(aggregate);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal melakukan pencarian global" }, 500);
    }
  }

  async suggest(c: Context) {
    const q = c.req.query("q")?.trim() ?? "";
    if (!q || q.length < 2) {
      return c.json({ query: q, suggestions: [] });
    }

    try {
      const suggestions = await this.searchService.suggest(q);
      return c.json({ query: q, suggestions });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal mengambil saran pencarian" }, 500);
    }
  }
}
