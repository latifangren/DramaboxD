import { networkInterfaces } from "node:os";
import type { Context } from "hono";
import type { PlatformService } from "../../services/platform.service.js";

export function lanIps(): string[] {
  const out: string[] = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

export function statusController(version: string, platforms: PlatformService) {
  return (c: Context) =>
    c.json({
      status: "ok",
      app: "DramaboxD",
      version,
      lanIps: lanIps(),
      providers: platforms.activeSlugs(),
    });
}
