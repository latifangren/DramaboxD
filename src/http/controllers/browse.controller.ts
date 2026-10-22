import type { Context } from "hono";
import type { BrowseService } from "../../services/browse.service.js";

/** GET /api/browse — billboard + baris katalog per provider (cache 15 mnt). */
export function browseController(browse: BrowseService) {
  return async (c: Context) => c.json(await browse.browse());
}
