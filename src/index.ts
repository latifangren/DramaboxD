// Bootstrap DramaboxD — muat konfigurasi, bangun aplikasi, layani di LAN.
import { serve } from "@hono/node-server";
import { loadConfig } from "./infrastructure/config/index.js";
import { logger } from "./infrastructure/logger/index.js";
import { createApp } from "./http/app.js";
import { lanIps } from "./http/controllers/status.controller.js";

const VERSION = "0.11.0";

const config = loadConfig();
const app = createApp(config, VERSION);

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  logger.info("DramaboxD aktif", { version: VERSION, port: info.port });
  console.log(`🎬 DramaboxD v${VERSION}`);
  console.log(`- Local: http://localhost:${info.port}`);
  for (const ip of lanIps()) console.log(`- LAN:   http://${ip}:${info.port}`);
});
