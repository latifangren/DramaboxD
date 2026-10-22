import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
} from "node:crypto";
import { HttpError } from "../../../infrastructure/http/client.js";

// Klien API WEB NetShort (netshort.com) — hasil probe live 22 Okt 2026,
// lihat docs/teardown-netshort-web.md.
//
// Mekanisme (mengikuti persis klien web resmi dari bundle JS publik situs):
//   - API same-origin di <base>/prod-web-api, semua POST JSON.
//   - Amplop enkripsi WAJIB (tanpa ini server membalas 500):
//       body  = AES-256-ECB-PKCS7(JSON, kunci sesi) -> base64
//       header "encrypt-key" = RSA-PKCS1v1.5(kunci publik tertanam) atas
//                              base64(kunci sesi)
//     Kunci sesi di klien resmi sebenarnya KONSTAN (fungsi pembangkitnya
//     membuang string acak yang dibuatnya — bug di pihak mereka).
//   - Respons bisa terenkripsi balik: header "encrypt-key" respons didekripsi
//     RSA dengan kunci privat tertanam -> kunci AES -> dekripsi body.
//   - Kedua kunci RSA + kunci sesi adalah materi bundle publik situs (sama
//     kelasnya dengan secret HMAC ReelShort): membuktikan bentuk klien,
//     bukan entitlement. Episode terkunci (isLock) TIDAK diberi playVoucher
//     oleh server untuk sesi anonim — provider menghormati itu.
//   - Header wajib lain: Content-Language, OS "4", canary "v1",
//     version "1.2.0", UA browser.

const SESSION_KEY = "5k3KYTOO9jnO0CeyGhdHc3pIjGnVgrMN";
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2poXMstZ8NCWE7915MXz
DWC5/t+oB2waGfskPqSZwLqxd4ZBR0H1cb1tAZRZcV7P+LmOd6SYNxhnELaWuKTD
+D3xkz8Tt1L5j/ynGqVt1MDbiQIEzXQKUkNDSH6T0A+Xzo/67/8QOQXlVJfW06res
baeNvibfx6Qc78j96bCIPlxPrtieilVTBHUFOXjirxK/ki/mO8P2smRbpt73fsQW
dGmTGMfYGvfPApGyxbxLkL/qrBjU25XpM8a0MBqzFWUAchHmqSBJ6Mbfam1SSgf3
b2U28s67nOW+JiOrhd6iVLcsLFxXA54HX+Zbej3AbOB6jKaEmp/bz1amneE1NYXw
wIDAQAB
-----END PUBLIC KEY-----`;
const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCK0Tl1pd7bjTRU93bWoHW1hLCDj2+9bg1MgY8j5C7xXaw6bJfToXhWbH1fXNbnFFVqxyYNErcuOUwJZxyDgcxUXM4yWnRseb2GF97GOicAQ2keDzVYmwky4lrSRwvcXutJRLPUCRQNfc6upfk2G5TKh6/CcP4TV1eXTF7+vdEw2SHxAOITKbSfcaZXr/hVs6a1aRHsBF+7RG99ebwZIP6/AgIyqX9RbDVN6ixi1v2G3/bwAULHLSqGdSaqij/ca17fbFGITaeCeEaZ6d/P4ZuOK+PEPdbPQt6SbY4lZaYwRvdrpH73kigPITgDzIDONFybJ1m7wRKlq1wxWHwbimptAgMBAAECggEAPz3cYJXFtt5YphDrahJGLgEabYVOUc2ub1li/eX54OpdCWzpqneYnD7myyg/m5zu4SuDUVdibsOZuXrpSZw7m3+ATP5apgS8bDe5vTNHC16qqBAjrI9NHIp09/F4HNh9dq6/Am10XkUfgP+KTrU4DyDL2NijV+pltD8N1B5kDE1igokVcsavhnu2INoMRXYE78Wq6urNECuFWw9hldv81M9m2w56t1CQOUukpo4mfmLjZRe2s+kwtcBVefGHP8Cj0OeH2dGltjl2YSQMRBFUCVoixYpOrcjIHoqzWri8IfUZ2tW+nUvHl5IZ9RVxefnFaLGnxiXd2sk6Sn4aD/l9YQKBgQDVv3HaOZxHRqlNSPrNGqplGhE066HnDsq6MlPukiovxE43CRBmpTnk9zDCqrDh9t2HbJuao7nSq5WlBERWgwqXU/qDpH43W7Y/lJfHkDv6A2m0viJa0a9x8+CJpNnCDu1ATo4/IQKwoXYice6JKnUyXgkGKn+HipiN6tO0EtWHlQKBgQCmQfklKFtXtm/FZ6NIMs+d+EyvaE5xNLKGYQxmiCR10WGYd8ZV+K0Q6qXHS+a32TirWB9F3TqPOklTytMrfPZB3BCXj4weEldb8W716G8FYf7LLhaT+MdpF7KDcruObwoQAvKV3N4eX6tUEMmdrx9hpCmmIU5EeXUkhGdmwk7BeQKBgAIXMkThJV8pGMTRvuo8pYgBnkN3PoklAuSZU2rU8Sawc9dj9k4atZtAs7BjvQEoyffmHwt/KHUgCoGnrgdulq7uOlgJRtbBxeGPUYC5L2z9lY4YAfwDawThTsPp4dtdDAMCAbAqYX1axu4FUUD0MltAwjPWPJMVzvIsZs+vE3mVAoGAJPja3OaCmZjadj2709xoyypic0dw2j/ry3JdfZec9A5h87P/CTNJ2U81GoLIhe3qakAohDLUSPGfSOD74NnjMXYswmeLs0xE3Q9tq4XK2pmWPby8DJ/wSHCapByplN0gkbr2E1mQk5SW1xT8oPJGukH1eRpC+3s/D6XaEMH5HZECgYEAigoX5l39LDsCgeaUcI4S9grkaas/WsKv37eqo3oD9Qk6VFiMM5L5Zig6aXJxuAPLVjb38caJRPmPmOXLT2kEP1E1h6OJOhEhETwVIUtcBzsK25ju9LqL89bC+W0uS7BPvk6Tcws/tXHCkQCTgb9jVXceZ2ox+6axvlW/5WgHt5Q=
-----END PRIVATE KEY-----`;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface NetShortClientOptions {
  /** Origin situs, mis. "https://netshort.com" (API di <base>/prod-web-api). */
  siteBase: string;
  timeoutMs?: number;
  delayMs?: number;
  language?: string;
  fetchFn?: typeof fetch;
}

export interface NetShortEnvelope<T> {
  code: number;
  msg?: string;
  data: T;
}

function aesEncryptBase64(plain: string, key: Buffer): string {
  const cipher = createCipheriv("aes-256-ecb", key, null);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}

function aesDecryptBase64(payload: string, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-ecb", key, null);
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
}

export class NetShortClient {
  private readonly base: string;
  private readonly timeoutMs: number;
  private readonly delayMs: number;
  private readonly fetchFn: typeof fetch;
  readonly language: string;
  private lastRequestAt = 0;

  constructor(opts: NetShortClientOptions) {
    this.base = opts.siteBase.replace(/\/+$/, "");
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

  /** POST terenkripsi ke API; mengembalikan data dari amplop {code, msg, data}. */
  async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    await this.pace();
    const key = Buffer.from(SESSION_KEY, "utf8");
    const encryptKey = publicEncrypt(
      { key: RSA_PUBLIC_KEY, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(key.toString("base64"), "utf8"),
    ).toString("base64");

    const res = await this.fetchFn(`${this.base}/prod-web-api${path}`, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/json;charset=utf-8",
        Accept: "application/json",
        Referer: `${this.base}/`,
        Origin: this.base,
        "Content-Language": this.language,
        OS: "4",
        canary: "v1",
        version: "1.2.0",
        "encrypt-key": encryptKey,
      },
      body: aesEncryptBase64(JSON.stringify(body), key),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, `NetShort API ${path} HTTP ${res.status}`);

    let text = await res.text();
    const responseKey = res.headers.get("encrypt-key");
    if (responseKey) {
      const keyB64 = privateDecrypt(
        { key: RSA_PRIVATE_KEY, padding: constants.RSA_PKCS1_PADDING },
        Buffer.from(responseKey, "base64"),
      ).toString("utf8");
      text = aesDecryptBase64(text, Buffer.from(keyB64, "base64"));
    }
    const envelope = JSON.parse(text) as NetShortEnvelope<T>;
    if (envelope.code !== 200) {
      throw new HttpError(502, `NetShort API ${path} code ${envelope.code}: ${envelope.msg ?? "?"}`);
    }
    return envelope.data;
  }

  /** Ambil HTML SSR (katalog all-plots / beranda) — datanya di payload halaman. */
  async getHtml(path: string): Promise<string> {
    await this.pace();
    const res = await this.fetchFn(`${this.base}${path}`, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new HttpError(res.status, `NetShort ${path} HTTP ${res.status}`);
    return res.text();
  }

  searchSeo(query: string, pageNum = 1, pageSize = 20): Promise<NetShortSearchData> {
    return this.post<NetShortSearchData>("/web/short_play/search/keyword/seo", {
      queryKeyword: query,
      pageQuery: { pageNum, pageSize },
    });
  }

  detailInfo(shortPlayId: string): Promise<NetShortDetailData> {
    return this.post<NetShortDetailData>("/web/v4/short_play/detail_info/cascade_label", {
      shortPlayId,
    });
  }

  episodeInfo(shortPlayId: string, episodeNo: number): Promise<NetShortEpisodeData> {
    return this.post<NetShortEpisodeData>("/web/v4/short_play/episode_info", {
      shortPlayId,
      episodeNo,
    });
  }
}

// --- Bentuk mentah upstream (subset yang dipakai) ---

export interface NetShortSearchItem {
  shortPlayId: string;
  shortPlayNameNoHL?: string;
  shortPlayName?: string;
  shortPlayCover?: string;
  shotIntroduce?: string;
}

export interface NetShortSearchData {
  list?: NetShortSearchItem[];
  totalHits?: number;
}

export interface NetShortEpisodeStub {
  episodeId: string;
  episodeNo: number;
  isLock?: boolean;
  episodeCover?: string;
}

export interface NetShortDetailData {
  shortPlayId: string;
  shortPlayName?: string;
  shortPlayCover?: string;
  shotIntroduce?: string;
  shortPlayLabels?: Record<string, string>;
  videoEpisodeInfos?: NetShortEpisodeStub[];
  languageDetail?: Record<string, { value2?: number }>;
}

export interface NetShortSubtitle {
  language?: string;
  languageName?: string;
  name?: string;
  url?: string;
  subtitleUrl?: string;
}

export interface NetShortEpisodeData {
  episodeId: string;
  episodeNo: number;
  episodeCover?: string;
  episodeTitle?: string;
  playVoucher?: string | null;
  isLock?: boolean;
  /** Upstream mengirim durasi sebagai string desimal ("143.417"). */
  duration?: number | string;
  subtitleList?: NetShortSubtitle[] | null;
}
