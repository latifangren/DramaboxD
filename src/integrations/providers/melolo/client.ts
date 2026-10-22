import { HttpError } from "../../../infrastructure/http/client.js";

// Klien API Melolo (api.tmtreader.com) — hasil reverse APK 5.1.8,
// lihat docs/teardown-melolo-5.1.8.md.
//
// Tanpa login dan tanpa tanda tangan MetaSec untuk endpoint inti
// (search/directory/player terverifikasi live 22 Okt 2026). Semua request
// membawa parameter umum aplikasi: app_id=645713, version_name, device_id.
// Respons berbentuk {code, message, data, log_id} dengan code 0 = sukses
// (endpoint bookmall discovery membalas code 1050007 risk control — di luar
// jalur inti dan memang tidak dipakai provider ini).

export interface MeloloClientOptions {
  apiBase: string;
  timeoutMs?: number;
  delayMs?: number;
  versionName?: string;
  deviceId?: string;
  fetchFn?: typeof fetch;
}

interface ApiEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
}

export class MeloloClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly versionName: string;
  private readonly deviceId: string;
  private lastRequestAt = 0;

  constructor(opts: MeloloClientOptions) {
    this.base = opts.apiBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.versionName = opts.versionName ?? "5.1.8";
    this.deviceId = opts.deviceId ?? "7268586056781432322";
  }

  private commonParams(): URLSearchParams {
    return new URLSearchParams({
      app_id: "645713",
      version_name: this.versionName,
      device_id: this.deviceId,
    });
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  private async request(path: string, extra: Record<string, string>, body?: unknown): Promise<unknown> {
    await this.pace();
    const params = this.commonParams();
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    const url = `${this.base}${path}?${params.toString()}`;
    const res = await this.fetchFn(url, {
      method: body !== undefined ? "POST" : "GET",
      headers: {
        "user-agent": "okhttp/4.12.0",
        accept: "application/json",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(res.status, url, text);
    }
    const env = (await res.json()) as ApiEnvelope;
    if (env.code !== undefined && env.code !== 0) {
      throw new Error(`Melolo API ${path} -> code ${env.code}: ${env.message ?? "?"}`);
    }
    return env.data;
  }

  async get(path: string, params: Record<string, string> = {}): Promise<unknown> {
    return this.request(path, params);
  }

  async post(path: string, body: unknown, params: Record<string, string> = {}): Promise<unknown> {
    return this.request(path, params, body);
  }
}
