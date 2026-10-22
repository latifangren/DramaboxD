import { createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { inflateSync, inflateRawSync } from "node:zlib";
import { HttpError } from "../../../infrastructure/http/client.js";

// Klien API WEB ReelShort (www.reelshort.com/api) — hasil riset + probe live
// 22 Okt 2026, lihat docs/riset-reelshort-web.md & docs/teardown-reelshort-4.1.00.md.
// (API aplikasi Android-nya terkunci SecShell; jalur web ini yang dipakai.)
//
// Mekanisme (mengikuti bundle JS publik situs):
//   - Header umum: apiVersion 1.0.4, channelId WEB41001, clientVer 2.4.00,
//     devId (12 char acak + epoch ms), lang, session "" (anonim), ts, uid 0.
//   - sign = HMAC-SHA256 atas string kanonik "k=v&k=v..." (body+header umum,
//     nilai kosong dibuang, kunci terurut, objek di-JSON-kan). Secret tertanam
//     di bundle publik — hanya membuktikan bentuk klien, bukan entitlement.
//   - Sebagian respons terenkripsi: AES-128-CBC -> base64 -> zlib -> JSON.
//   - Amplop: {code: 0, msg, data}; code 101 = sesi wajib, 502 = parameter
//     ditolak (mis. id salah ruang).
// WAJIB fetch ala browser (Node fetch lolos; urllib Python putus TLS di CDN).

const SIGN_SECRET = "zj8N6zKEdrK8d1MxwHSvExdgQ868q1yT";
const AES_PAIRS: Array<[string, string]> = [
  ["VvRSNGFynLBW7aCP", "gLn8sxqpzyNjehDP"],
  ["jlcVUHH9XgmYlfsK", "fOEZ9V4a3VaniWAa"],
];

export interface ReelShortClientOptions {
  apiBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
  fetchFn?: typeof fetch;
}

export class ReelShortClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly language: string;
  private readonly devId: string;
  private lastRequestAt = 0;

  constructor(opts: ReelShortClientOptions) {
    this.base = opts.apiBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.language = opts.language ?? "en";
    this.devId =
      randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) +
      String(Date.now());
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  /** String kanonik + tanda tangan HMAC-SHA256 (diekspos untuk test). */
  static sign(payload: Record<string, unknown>): string {
    const items: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(payload)) {
      if (v === "" || v === null || v === undefined || v === "null") continue;
      items.push([k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
    }
    items.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const canonical = items.map(([k, v]) => `${k}=${v}`).join("&");
    return createHmac("sha256", SIGN_SECRET).update(canonical).digest("hex");
  }

  /** Dekripsi amplop terenkripsi (diekspos untuk test). */
  static decodeBody(text: string): Record<string, unknown> {
    const t = text.trim();
    if (t.startsWith("{")) return JSON.parse(t) as Record<string, unknown>;
    for (const [key, iv] of AES_PAIRS) {
      for (const inflate of [inflateSync, inflateRawSync]) {
        try {
          const d = createDecipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
          const plain = Buffer.concat([d.update(Buffer.from(t, "base64")), d.final()]);
          const inner = Buffer.from(plain.toString("utf8").trim(), "base64");
          return JSON.parse(inflate(inner).toString("utf8")) as Record<string, unknown>;
        } catch {
          // pasangan/mode berikutnya
        }
      }
    }
    throw new Error("Respons ReelShort tidak bisa didekripsi/diuraikan.");
  }

  private async request(
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    await this.pace();
    const common: Record<string, unknown> = {
      apiVersion: "1.0.4",
      channelId: "WEB41001",
      clientVer: "2.4.00",
      lang: this.language,
      session: "",
      uid: "0",
      devId: this.devId,
      ts: String(Math.floor(Date.now() / 1000)),
    };
    const payload: Record<string, unknown> = { ...(query ?? {}), ...(body ?? {}), ...common };
    const sign = ReelShortClient.sign(payload);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    };
    for (const [k, v] of Object.entries(payload)) headers[k] = String(v);
    headers.sign = sign;
    const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
    const url = `${this.base}${path}${qs}`;
    const res = await this.fetchFn(url, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, url, await res.text().catch(() => ""));
    const envelope = ReelShortClient.decodeBody(await res.text());
    if (envelope.code !== 0) {
      throw new Error(
        `ReelShort menjawab code=${String(envelope.code)} (${String(envelope.msg ?? "?")}) untuk ${path}.`,
      );
    }
    return (envelope.data ?? {}) as Record<string, unknown>;
  }

  post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request(path, body);
  }

  get(path: string, query: Record<string, string>): Promise<Record<string, unknown>> {
    return this.request(path, undefined, query);
  }
}
