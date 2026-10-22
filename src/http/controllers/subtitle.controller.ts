import type { Context } from "hono";
import { AppError, ValidationError } from "../../shared/errors/index.js";
import type { SubtitleService } from "../../services/subtitle.service.js";

/** GET /api/subtitles?url=<manifest.m3u8>&provider= — track subtitle dari manifest HLS. */
export function subtitleController(subtitles: SubtitleService) {
  return async (c: Context) => {
    const url = c.req.query("url");
    if (!url) throw new ValidationError("Parameter url wajib ada");
    const tracks = await subtitles.extractFromManifest(url, c.req.query("provider"));
    return c.json({ tracks });
  };
}

/** Terjemahan subtitle on-the-fly: belum diimplementasikan — jawab eksplisit. */
export function subtitleTranslateController() {
  return (c: Context) => {
    throw new AppError(
      "Terjemahan subtitle on-the-fly belum diimplementasikan (ekstraksi track sudah jalan).",
      501,
      "not_implemented",
    );
  };
}
