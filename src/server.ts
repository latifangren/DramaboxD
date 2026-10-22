import os from "node:os";
import { serve } from "@hono/node-server";
import { createApp } from "./http/app.js";
import { loadConfig } from "./infrastructure/config.js";

const config = loadConfig();
const app = createApp(config);

console.log(`Starting DramaboxD Streaming Server on port ${config.port}...`);
serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  },
  (info) => {
    console.log(`🚀 DramaboxD Web Platform aktif:`);
    console.log(`- Local: http://localhost:${info.port}`);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`- LAN:   http://${net.address}:${info.port}`);
        }
      }
    }
  },
);
