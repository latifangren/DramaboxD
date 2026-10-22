import type { Hono } from "hono";
import { browseController } from "../controllers/browse.controller.js";
import { dramaController } from "../controllers/drama.controller.js";
import { platformController, providersController } from "../controllers/platform.controller.js";
import { globalSearchController, searchController } from "../controllers/search.controller.js";
import { statusController } from "../controllers/status.controller.js";
import { streamController } from "../controllers/stream.controller.js";
import { subtitleController, subtitleTranslateController } from "../controllers/subtitle.controller.js";
import type { Services } from "../app.js";

export function registerApiRoutes(app: Hono, services: Services, version: string): void {
  app.get("/api/status", statusController(version, services.platforms));
  app.get("/api/platforms", platformController(services.platforms));
  app.get("/api/providers", providersController(services.platforms));
  app.get("/api/browse", browseController(services.browse));
  app.get("/api/search", searchController(services.search));
  app.get("/api/search/global", globalSearchController(services.search));
  app.get("/api/drama/:provider/:id", dramaController(services.drama));
  app.get("/api/stream", streamController(services.streamProxy));
  app.get("/api/subtitles", subtitleController(services.subtitles));
  app.post("/api/subtitles/translate", subtitleTranslateController());
}
