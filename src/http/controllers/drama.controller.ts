import type { Context } from "hono";
import type { DramaService } from "../../services/drama.service.js";
import { langParam } from "../lang.js";

export class DramaController {
  constructor(private readonly dramaService: DramaService) {}

  async getDetail(c: Context) {
    const provider = c.req.param("provider");
    const id = c.req.param("id");

    if (!provider || !id) {
      return c.json({ error: "Parameter 'provider' dan 'id' wajib diisi" }, 400);
    }

    try {
      const result = await this.dramaService.getDramaDetail(provider, id, langParam(c));
      return c.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal mengambil data drama" }, 500);
    }
  }

  async getEpisodeStream(c: Context) {
    const provider = c.req.param("provider");
    const id = c.req.param("id");
    const epIndex = parseInt(c.req.param("epIndex") || "1", 10);
    const epId = c.req.query("epId");

    if (!provider || !id) {
      return c.json({ error: "Parameter 'provider' dan 'id' wajib diisi" }, 400);
    }

    try {
      const result = await this.dramaService.getEpisodeStream(provider, id, epIndex, epId, langParam(c));
      return c.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal mengambil stream episode" }, 500);
    }
  }
}
