import os from "node:os";
import type { Context } from "hono";
import { IMPLEMENTED } from "../../providers/registry.js";

export class StatusController {
  getStatus(c: Context) {
    const nets = os.networkInterfaces();
    const lanIps: string[] = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          lanIps.push(net.address);
        }
      }
    }

    return c.json({
      name: "DramaboxD",
      status: "ok",
      version: "0.12.0",
      lanIps,
      providers: IMPLEMENTED,
    });
  }
}
