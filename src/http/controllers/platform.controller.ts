import type { Context } from "hono";
import type { PlatformService } from "../../services/platform.service.js";

/** GET /api/platforms — direktori platform aktif + segera hadir. */
export function platformController(platforms: PlatformService) {
  return (c: Context) => c.json({ platforms: platforms.list() });
}

/** GET /api/providers — kompatibilitas mundur dengan WebUI lama. */
export function providersController(platforms: PlatformService) {
  return (c: Context) => c.json({ providers: platforms.activeSlugs() });
}
