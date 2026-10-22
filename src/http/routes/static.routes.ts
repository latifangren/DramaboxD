import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

/** Aset statis frontend SPA dari ./public (relatif terhadap CWD proyek). */
export function registerStaticRoutes(app: Hono): void {
  app.use("/*", serveStatic({ root: "./public" }));
}
