import type { Context } from "hono";
import type { SubtitleService } from "../../services/subtitle.service.js";

export class SubtitleController {
  constructor(private readonly subtitleService: SubtitleService) {}

  async getTranslatedSubtitle(c: Context) {
    const url = c.req.query("url");
    const from = c.req.query("from") || "auto";
    const to = c.req.query("to") || "id";

    if (!url) {
      return c.text("Parameter url wajib ada", 400);
    }

    try {
      const vtt = await this.subtitleService.fetchAndTranslateVtt(url, from, to);
      const resHeaders = new Headers();
      resHeaders.set("Content-Type", "text/vtt; charset=utf-8");
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Cache-Control", "public, max-age=3600");

      return new Response(vtt, {
        status: 200,
        headers: resHeaders,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.text(`Gagal menerjemahkan subtitle: ${message}`, 502);
    }
  }

  async translatePayload(c: Context) {
    try {
      const body = await c.req.json();
      const rawVtt = body.vtt;
      const to = body.to || "id";
      const from = body.from || "auto";

      if (!rawVtt) {
        return c.json({ error: "Field 'vtt' wajib diisi" }, 400);
      }

      const translated = await this.subtitleService.translateVtt(rawVtt, from, to);
      return c.json({ ok: true, to, vtt: translated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal memproses translasi" }, 500);
    }
  }
}
