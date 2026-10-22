import { createHash, randomUUID } from "node:crypto";
import { HttpError } from "../../http.js";

// Klien API FreeReels (apiv2.free-reels.com) — hasil reverse APK 2.3.40,
// lihat docs/dekripsi-sigl360.md dan docs/tes-live-freereels.md.
//
// Alur sesi (persis aplikasi):
//   1. POST /anonymous/login {device_id: UUID, device_name: "<BRAND> <MODEL>",
//      sign: md5(KEY + device_id)} + header perangkat lengkap
//      -> data.auth_key (oauth_token) + data.auth_secret (oauth_secret)
//   2. Request berikutnya membawa header:
//      Authorization: oauth_signature=<md5(KEY + "&" + auth_secret)>,
//                     oauth_token=<auth_key>,ts=<millis>
//
// KEY adalah konstanta aplikasi dari tabel string terenkripsi SigL360
// (indeks 13260 / 67308 — sama, yang kedua dengan akhiran "&").

const SIGN_KEY = "8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv";

function md5Hex(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}

/** sign untuk body login anonim. */
export function loginSign(deviceId: string): string {
  return md5Hex(SIGN_KEY + deviceId);
}

/** Nilai header Authorization untuk request bersesi. */
export function authorizationHeader(authKey: string, authSecret: string, tsMillis: number): string {
  const sig = md5Hex(`${SIGN_KEY}&${authSecret}`);
  return `oauth_signature=${sig},oauth_token=${authKey},ts=${tsMillis}`;
}

export interface FreeReelsClientOptions {
  apiBase: string;
  timeoutMs?: number;
  delayMs?: number;
  /** Nama perangkat untuk login, format aplikasi: "<BRAND> <MODEL>". */
  deviceName?: string;
  /** Paksa device_id tertentu (default: UUID acak per proses). */
  deviceId?: string;
  fetchFn?: typeof fetch;
}

interface ApiEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
}

/**
 * Klien bersesi: login anonim malas (lazy) sekali, lalu dipakai ulang.
 * Semua respons API berbentuk {code, message, data}; code !== 200 dianggap error.
 */
export class FreeReelsClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly deviceId: string;
  private readonly deviceName: string;
  private readonly sessionId = randomUUID();
  private session: { authKey: string; authSecret: string } | null = null;
  private lastRequestAt = 0;

  constructor(opts: FreeReelsClientOptions) {
    this.base = opts.apiBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.deviceId = opts.deviceId ?? randomUUID();
    this.deviceName = opts.deviceName ?? "Google Pixel 8";
  }

  /** Header perangkat — meniru HeaderInterceptor aplikasi; tanpa set ini server menolak (code 400). */
  private deviceHeaders(withAuth: boolean): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "okhttp/4.12.0",
      language: "en-US",
      "app-display-lang": "en-US",
      country: "US",
      timezone: "7",
      "network-type": "wifi",
      "screen-width": "1080",
      "screen-height": "2400",
      "is-mainland": "false",
      "device-country": "US",
      "device-language": "en-US",
      "x-device-model": "Pixel 8",
      "x-device-manufacturer": "Google",
      "x-device-brand": "google",
      "x-device-product": "shiba",
      "x-device-fingerprint":
        "google/shiba/shiba:14/AP2A.240905.003/12231197:user/release-keys",
      "session-id": this.sessionId,
      gaid: "",
      "app-name": "com.freereels.app",
      "app-version": "2.3.40",
      "device-id": this.deviceId,
      "device-version": "34",
      device: "android",
    };
    if (withAuth && this.session) {
      h.authorization = authorizationHeader(this.session.authKey, this.session.authSecret, Date.now());
    }
    return h;
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  private async request(path: string, init: { method: string; body?: unknown }, authed: boolean): Promise<ApiEnvelope> {
    await this.pace();
    const url = `${this.base}${path}`;
    const res = await this.fetchFn(url, {
      method: init.method,
      headers: this.deviceHeaders(authed),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HttpError(res.status, url, body);
    }
    const env = (await res.json()) as ApiEnvelope;
    if (env.code !== undefined && env.code !== 200) {
      throw new Error(`FreeReels API ${path} -> code ${env.code}: ${env.message ?? "?"}`);
    }
    return env;
  }

  /** Login anonim; idempoten — sesi yang sudah ada dipakai ulang. */
  async ensureSession(): Promise<void> {
    if (this.session) return;
    const env = await this.request(
      "/anonymous/login",
      {
        method: "POST",
        body: { device_id: this.deviceId, device_name: this.deviceName, sign: loginSign(this.deviceId) },
      },
      false,
    );
    const data = env.data as { auth_key?: string; auth_secret?: string } | undefined;
    if (!data?.auth_key || !data?.auth_secret) {
      throw new Error("Login anonim FreeReels tidak mengembalikan auth_key/auth_secret.");
    }
    this.session = { authKey: data.auth_key, authSecret: data.auth_secret };
  }

  async get(path: string): Promise<unknown> {
    await this.ensureSession();
    return (await this.request(path, { method: "GET" }, true)).data;
  }

  async post(path: string, body: unknown): Promise<unknown> {
    await this.ensureSession();
    return (await this.request(path, { method: "POST", body }, true)).data;
  }
}
