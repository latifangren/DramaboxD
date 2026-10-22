export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    bodySnippet?: string,
  ) {
    super(`HTTP ${status} untuk ${url}${bodySnippet ? ` — ${bodySnippet.slice(0, 160)}` : ""}`);
    this.name = "HttpError";
  }
}

export interface HttpClientOptions {
  timeoutMs?: number;
  delayMs?: number;
  userAgent?: string;
}

/** Klien HTTP tipis di atas fetch bawaan Node (>=20): timeout, jeda, error jelas. */
export class HttpClient {
  private lastRequestAt = 0;

  constructor(private readonly opts: HttpClientOptions = {}) {}

  async getJson(url: string): Promise<unknown> {
    const delayMs = this.opts.delayMs ?? 0;
    if (delayMs > 0 && this.lastRequestAt > 0) {
      const wait = delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();

    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "user-agent":
          this.opts.userAgent ??
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
      },
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HttpError(res.status, url, body);
    }
    return res.json();
  }
}
