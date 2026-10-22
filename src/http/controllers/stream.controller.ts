import type { Context } from "hono";
import { ValidationError } from "../../shared/errors/index.js";
import type { StreamProxyService } from "../../services/stream-proxy.service.js";

/** GET /api/stream?url=&provider= — proxy video/HLS dengan penjagaan SSRF. */
export function streamController(proxy: StreamProxyService) {
  return async (c: Context) => {
    const url = c.req.query("url");
    if (!url) throw new ValidationError("Parameter url wajib ada");
    const provider = c.req.query("provider");
    const res = await proxy.proxy(url, { range: c.req.header("range"), provider });
    return res;
  };
}
