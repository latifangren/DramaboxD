import type { Context } from "hono";
import type { DramaService } from "../../services/drama.service.js";

/** GET /api/drama/:provider/:id — detail + daftar episode. */
export function dramaController(drama: DramaService) {
  return async (c: Context) => {
    const provider = c.req.param("provider") ?? "";
    const id = c.req.param("id") ?? "";
    return c.json(await drama.getDrama(provider, id));
  };
}
