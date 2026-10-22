import type { Context } from "hono";
import type { PlatformService } from "../../services/platform.service.js";

export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  getAll(c: Context) {
    const platforms = this.platformService.getAllPlatforms();
    return c.json({
      total: platforms.length,
      platforms,
    });
  }

  getProviders(c: Context) {
    const providers = this.platformService.getActiveProviderIds();
    return c.json({ providers });
  }
}
