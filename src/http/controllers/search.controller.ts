import type { Context } from "hono";
import { ValidationError } from "../../shared/errors/index.js";
import type { SearchService } from "../../services/search.service.js";

/** GET /api/search?q=&provider= — satu provider (default reelshort). */
export function searchController(search: SearchService) {
  return async (c: Context) => {
    const q = c.req.query("q")?.trim() ?? "";
    if (!q) throw new ValidationError("Query 'q' wajib diisi");
    const provider = c.req.query("provider") ?? "reelshort";
    const result = await search.searchOne(provider, q);
    return c.json({ provider, query: q, results: result.results });
  };
}

/** GET /api/search/global?q= — semua provider aktif secara paralel. */
export function globalSearchController(search: SearchService) {
  return async (c: Context) => {
    const q = c.req.query("q")?.trim() ?? "";
    if (!q) throw new ValidationError("Query 'q' wajib diisi");
    return c.json(await search.searchGlobal(q));
  };
}
