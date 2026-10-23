import type { Context } from "hono";
import type { BrowseService } from "../../services/browse.service.js";
import { langParam } from "../lang.js";

export class BrowseController {
  constructor(private readonly browseService: BrowseService) {}

  async handle(c: Context) {
    try {
      const payload = await this.browseService.getBrowse(false, langParam(c));
      return c.json(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal memuat katalog browse" }, 500);
    }
  }
}
