import { createCipheriv, createDecipheriv } from "node:crypto";
import { HttpError } from "../../../infrastructure/http/client.js";

// Klien API WEB ShortMax / ShortTV (www.shorttv.live) — hasil probe live
// 22 Okt 2026, lihat docs/teardown-shortmax-web.md.
//
// Backend resmi situs: https://shortweb.shorttv.live/app-api/app (Spring).
// Semua endpoint POST dan beramplop enkripsi persis klien web resmi:
//   - body request  = AES-128-CBC-PKCS7(JSON, kunci) -> base64
//   - SELURUH body respons juga ciphertext base64 yang sama
//   - kunci = IV = string "shortwebapiaesen" tertanam di bundle publik situs
//   - header wajib: X-Encrypted: "true", Language-Code: <locale>
// Tanpa header itu server membalas 500 "非法请求" (permintaan ilegal).
// Materi kuncinya materi bundle publik — membuktikan bentuk klien,
// bukan entitlement. Episode di luar rentang gratis tidak diberi URL
// stream oleh server (encryptedVideoUrl kosong) — dihormati apa adanya.

const SECRET_KEY = "shortwebapiaesen";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface ShortMaxClientOptions {
  apiBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
  fetchFn?: typeof fetch;
}

interface Envelope<T> {
  code: number;
  msg?: string;
  data: T;
}

function encryptBody(value: unknown): string {
  const key = Buffer.from(SECRET_KEY, "utf8");
  const cipher = createCipheriv("aes-128-cbc", key, key);
  return Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]).toString("base64");
}

function decryptBody<T>(payload: string): T {
  const key = Buffer.from(SECRET_KEY, "utf8");
  const decipher = createDecipheriv("aes-128-cbc", key, key);
  const plain = Buffer.concat([decipher.update(Buffer.from(payload.trim(), "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plain) as T;
}

export class ShortMaxClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly language: string;
  private lastRequestAt = 0;

  constructor(opts: ShortMaxClientOptions) {
    this.base = opts.apiBase.replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.delayMs = opts.delayMs ?? 500;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.language = opts.language ?? "en";
  }

  private async pace(): Promise<void> {
    if (this.delayMs > 0 && this.lastRequestAt > 0) {
      const wait = this.delayMs - (Date.now() - this.lastRequestAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestAt = Date.now();
  }

  /** POST terenkripsi; mengembalikan data dari amplop {code, msg, data}. */
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    await this.pace();
    const res = await this.fetchFn(`${this.base}${path}`, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: "https://www.shorttv.live/",
        Origin: "https://www.shorttv.live",
        "X-Encrypted": "true",
        "Language-Code": this.language,
      },
      body: encryptBody(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, `ShortMax API ${path} HTTP ${res.status}`);
    const envelope = decryptBody<Envelope<T>>(await res.text());
    if (envelope.code !== 0) {
      throw new HttpError(502, `ShortMax API ${path} code ${envelope.code}: ${envelope.msg ?? "?"}`);
    }
    return envelope.data;
  }

  searchPage(query: string, pageNum = 1, pageSize = 20): Promise<ShortMaxSearchPage> {
    return this.post<ShortMaxSearchPage>("/search/searchPage", {
      pageSize,
      pageNum,
      searchText: query,
    });
  }

  searchHot(): Promise<ShortMaxHotItem[]> {
    return this.post<ShortMaxHotItem[]>("/search/searchHot", {});
  }

  queryPage(pageNum = 1, pageSize = 20): Promise<ShortMaxCatalogPage> {
    return this.post<ShortMaxCatalogPage>("/cmsShortPlay/queryPage", { pageSize, pageNum });
  }

  queryDetail(shortPlayId: string): Promise<ShortMaxDetailData> {
    return this.post<ShortMaxDetailData>("/cmsShortPlay/queryDetail", {
      shortPlayId: Number(shortPlayId),
    });
  }
}

// --- Bentuk mentah upstream (subset yang dipakai) ---

export interface ShortMaxLabel {
  labelName?: string;
  displayName?: string;
}

export interface ShortMaxSeriesItem {
  shortPlayId: number;
  shortPlayName?: string;
  rawName?: string;
  summary?: string;
  coverId?: string;
  labelList?: ShortMaxLabel[];
}

export interface ShortMaxSearchPage {
  data?: ShortMaxSeriesItem[];
  total?: number;
}

export interface ShortMaxCatalogPage {
  list?: ShortMaxSeriesItem[];
  total?: number;
}

export interface ShortMaxHotItem {
  shortPlayId: number;
  shortPlayName?: string;
}

export interface ShortMaxEpisodeRaw {
  episodeNum: number;
  coverId?: string;
  frameExtractionCover?: string;
  /** JSON string {"video_480": url, "video_720": url, "video_1080": url}; "" bila terkunci. */
  encryptedVideoUrl?: string;
}

export interface ShortMaxDetailData {
  shortPlayId: number;
  shortPlayName?: string;
  rawName?: string;
  summary?: string;
  coverId?: string;
  /** Episode gratis terakhir (episodeNum <= lockBegin terbuka). */
  lockBegin?: number;
  labelList?: ShortMaxLabel[];
  classList?: ShortMaxLabel[];
  episodeList?: ShortMaxEpisodeRaw[];
}
