import type { Context } from "hono";
import type { StreamProxyService } from "../../services/stream-proxy.service.js";

export class StreamController {
  constructor(private readonly streamProxyService: StreamProxyService) {}

  async proxy(c: Context) {
    const targetUrl = c.req.query("url");
    if (!targetUrl) {
      return c.text("Parameter url wajib ada", 400);
    }

    try {
      const range = c.req.header("range");
      return await this.streamProxyService.proxyStream(targetUrl, range);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.text(`Stream Proxy Error: ${message}`, 502);
    }
  }
}
