import { Hono } from "hono";
import type { BrowseController } from "../controllers/browse.controller.js";
import type { DramaController } from "../controllers/drama.controller.js";
import type { GenreController } from "../controllers/genre.controller.js";
import type { PlatformController } from "../controllers/platform.controller.js";
import type { SearchController } from "../controllers/search.controller.js";
import type { StatusController } from "../controllers/status.controller.js";
import type { StreamController } from "../controllers/stream.controller.js";
import type { SubtitleController } from "../controllers/subtitle.controller.js";

export interface ApiControllers {
  status: StatusController;
  platform: PlatformController;
  browse: BrowseController;
  search: SearchController;
  drama: DramaController;
  stream: StreamController;
  subtitle: SubtitleController;
  genre: GenreController;
}

export function createApiRouter(controllers: ApiControllers): Hono {
  const router = new Hono();

  router.get("/status", (c) => controllers.status.getStatus(c));
  router.get("/providers", (c) => controllers.platform.getProviders(c));
  router.get("/platforms", (c) => controllers.platform.getAll(c));
  router.get("/genres", (c) => controllers.genre.getAll(c));
  router.get("/genres/:slug", (c) => controllers.genre.getBySlug(c));
  router.get("/browse", (c) => controllers.browse.handle(c));
  router.get("/search", (c) => controllers.search.searchSingle(c));
  router.get("/search/global", (c) => controllers.search.searchGlobal(c));
  router.get("/search/suggest", (c) => controllers.search.suggest(c));
  router.get("/drama/:provider/:id", (c) => controllers.drama.getDetail(c));
  router.get("/drama/:provider/:id/episode/:epIndex", (c) => controllers.drama.getEpisodeStream(c));
  router.get("/stream", (c) => controllers.stream.proxy(c));
  router.get("/stream/subtitle", (c) => controllers.subtitle.getTranslatedSubtitle(c));
  router.post("/stream/subtitle/translate", (c) => controllers.subtitle.translatePayload(c));

  return router;
}
