import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Config } from "../infrastructure/config/index.js";
import { BrowseService } from "../services/browse.service.js";
import { DramaService } from "../services/drama.service.js";
import { PlatformService } from "../services/platform.service.js";
import { SearchService } from "../services/search.service.js";
import { StreamProxyService } from "../services/stream-proxy.service.js";
import { SubtitleService } from "../services/subtitle.service.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { registerApiRoutes } from "./routes/api.routes.js";
import { registerStaticRoutes } from "./routes/static.routes.js";

export interface Services {
  platforms: PlatformService;
  browse: BrowseService;
  search: SearchService;
  drama: DramaService;
  streamProxy: StreamProxyService;
  subtitles: SubtitleService;
}

export function buildServices(config: Config): Services {
  const platforms = new PlatformService(config);
  const streamProxy = new StreamProxyService(config);
  return {
    platforms,
    browse: new BrowseService(config, platforms),
    search: new SearchService(config, platforms),
    drama: new DramaService(config),
    streamProxy,
    subtitles: new SubtitleService(streamProxy),
  };
}

/** Factory aplikasi Hono — transport murni: middleware, rute, batas error. */
export function createApp(config: Config, version: string): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", cors());
  registerApiRoutes(app, buildServices(config), version);
  registerStaticRoutes(app);
  return app;
}
