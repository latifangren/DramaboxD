import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Config } from "../infrastructure/config.js";
import { BrowseService } from "../services/browse.service.js";
import { DramaService } from "../services/drama.service.js";
import { GenreService } from "../services/genre.service.js";
import { PlatformService } from "../services/platform.service.js";
import { SearchService } from "../services/search.service.js";
import { StreamProxyService } from "../services/stream-proxy.service.js";
import { SubtitleService } from "../services/subtitle.service.js";
import { BrowseController } from "./controllers/browse.controller.js";
import { DramaController } from "./controllers/drama.controller.js";
import { GenreController } from "./controllers/genre.controller.js";
import { PlatformController } from "./controllers/platform.controller.js";
import { SearchController } from "./controllers/search.controller.js";
import { StatusController } from "./controllers/status.controller.js";
import { StreamController } from "./controllers/stream.controller.js";
import { SubtitleController } from "./controllers/subtitle.controller.js";
import { createApiRouter } from "./routes/api.routes.js";

export function createApp(config: Config): Hono {
  const app = new Hono();

  // Middleware
  app.use("*", cors());

  // Inisialisasi Service Layer
  const browseService = new BrowseService(config);
  const searchService = new SearchService(config);
  const dramaService = new DramaService(config);
  const platformService = new PlatformService();
  const streamProxyService = new StreamProxyService();
  const subtitleService = new SubtitleService();
  const genreService = new GenreService(browseService);

  // Inisialisasi Controller Layer
  const controllers = {
    status: new StatusController(),
    platform: new PlatformController(platformService),
    browse: new BrowseController(browseService),
    search: new SearchController(searchService),
    drama: new DramaController(dramaService),
    stream: new StreamController(streamProxyService),
    subtitle: new SubtitleController(subtitleService),
    genre: new GenreController(genreService),
  };

  // Mount API Sub-router
  app.route("/api", createApiRouter(controllers));

  // Static Assets (Web Client UI)
  app.use("/*", serveStatic({ root: "./public" }));

  return app;
}
