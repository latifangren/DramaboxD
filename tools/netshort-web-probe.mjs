// Probe live NetShort (jalur web) — amplop AES-256-ECB + RSA persis klien web resmi.
// Jalan: node tools/netshort-web-probe.mjs [shortPlayId] [episodeNo]
// Detail: docs/teardown-netshort-web.md
import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, constants } from "node:crypto";

const PUB = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2poXMstZ8NCWE7915MXz
DWC5/t+oB2waGfskPqSZwLqxd4ZBR0H1cb1tAZRZcV7P+LmOd6SYNxhnELaWuKTD
+D3xkz8Tt1L5j/ynGqVt1MDbiQIEzXQKUkNDSH6T0A+Xzo/67/8QOQXlVJfW06res
baeNvibfx6Qc78j96bCIPlxPrtieilVTBHUFOXjirxK/ki/mO8P2smRbpt73fsQW
dGmTGMfYGvfPApGyxbxLkL/qrBjU25XpM8a0MBqzFWUAchHmqSBJ6Mbfam1SSgf3
b2U28s67nOW+JiOrhd6iVLcsLFxXA54HX+Zbej3AbOB6jKaEmp/bz1amneE1NYXw
wIDAQAB
-----END PUBLIC KEY-----`;
const PRIV = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCK0Tl1pd7bjTRU93bWoHW1hLCDj2+9bg1MgY8j5C7xXaw6bJfToXhWbH1fXNbnFFVqxyYNErcuOUwJZxyDgcxUXM4yWnRseb2GF97GOicAQ2keDzVYmwky4lrSRwvcXutJRLPUCRQNfc6upfk2G5TKh6/CcP4TV1eXTF7+vdEw2SHxAOITKbSfcaZXr/hVs6a1aRHsBF+7RG99ebwZIP6/AgIyqX9RbDVN6ixi1v2G3/bwAULHLSqGdSaqij/ca17fbFGITaeCeEaZ6d/P4ZuOK+PEPdbPQt6SbY4lZaYwRvdrpH73kigPITgDzIDONFybJ1m7wRKlq1wxWHwbimptAgMBAAECggEAPz3cYJXFtt5YphDrahJGLgEabYVOUc2ub1li/eX54OpdCWzpqneYnD7myyg/m5zu4SuDUVdibsOZuXrpSZw7m3+ATP5apgS8bDe5vTNHC16qqBAjrI9NHIp09/F4HNh9dq6/Am10XkUfgP+KTrU4DyDL2NijV+pltD8N1B5kDE1igokVcsavhnu2INoMRXYE78Wq6urNECuFWw9hldv81M9m2w56t1CQOUukpo4mfmLjZRe2s+kwtcBVefGHP8Cj0OeH2dGltjl2YSQMRBFUCVoixYpOrcjIHoqzWri8IfUZ2tW+nUvHl5IZ9RVxefnFaLGnxiXd2sk6Sn4aD/l9YQKBgQDVv3HaOZxHRqlNSPrNGqplGhE066HnDsq6MlPukiovxE43CRBmpTnk9zDCqrDh9t2HbJuao7nSq5WlBERWgwqXU/qDpH43W7Y/lJfHkDv6A2m0viJa0a9x8+CJpNnCDu1ATo4/IQKwoXYice6JKnUyXgkGKn+HipiN6tO0EtWHlQKBgQCmQfklKFtXtm/FZ6NIMs+d+EyvaE5xNLKGYQxmiCR10WGYd8ZV+K0Q6qXHS+a32TirWB9F3TqPOklTytMrfPZB3BCXj4weEldb8W716G8FYf7LLhaT+MdpF7KDcruObwoQAvKV3N4eX6tUEMmdrx9hpCmmIU5EeXUkhGdmwk7BeQKBgAIXMkThJV8pGMTRvuo8pYgBnkN3PoklAuSZU2rU8Sawc9dj9k4atZtAs7BjvQEoyffmHwt/KHUgCoGnrgdulq7uOlgJRtbBxeGPUYC5L2z9lY4YAfwDawThTsPp4dtdDAMCAbAqYX1axu4FUUD0MltAwjPWPJMVzvIsZs+vE3mVAoGAJPja3OaCmZjadj2709xoyypic0dw2j/ry3JdfZec9A5h87P/CTNJ2U81GoLIhe3qakAohDLUSPGfSOD74NnjMXYswmeLs0xE3Q9tq4XK2pmWPby8DJ/wSHCapByplN0gkbr2E1mQk5SW1xT8oPJGukH1eRpC+3s/D6XaEMH5HZECgYEAigoX5l39LDsCgeaUcI4S9grkaas/WsKv37eqo3oD9Qk6VFiMM5L5Zig6aXJxuAPLVjb38caJRPmPmOXLT2kEP1E1h6OJOhEhETwVIUtcBzsK25ju9LqL89bC+W0uS7BPvk6Tcws/tXHCkQCTgb9jVXceZ2ox+6axvlW/5WgHt5Q=
-----END PRIVATE KEY-----`;
const KEY = Buffer.from("5k3KYTOO9jnO0CeyGhdHc3pIjGnVgrMN", "utf8");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const base = "https://netshort.com/prod-web-api";
const enc = (p, k) => { const c = createCipheriv("aes-256-ecb", k, null); return Buffer.concat([c.update(p, "utf8"), c.final()]).toString("base64"); };
const dec = (b, k) => { const d = createDecipheriv("aes-256-ecb", k, null); return Buffer.concat([d.update(Buffer.from(b, "base64")), d.final()]).toString("utf8"); };

export async function apiPost(path, bodyObj) {
  const encKey = publicEncrypt({ key: PUB, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(KEY.toString("base64"), "utf8")).toString("base64");
  const res = await fetch(base + path, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/json;charset=utf-8", Accept: "application/json", Referer: "https://netshort.com/", Origin: "https://netshort.com", "Content-Language": "en", OS: "4", canary: "v1", version: "1.2.0", "encrypt-key": encKey }, body: enc(JSON.stringify(bodyObj), KEY) });
  let text = await res.text();
  const rk = res.headers.get("encrypt-key");
  if (rk) { const kb = privateDecrypt({ key: PRIV, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(rk, "base64")).toString("utf8"); text = dec(text, Buffer.from(kb, "base64")); }
  return JSON.parse(text);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2] ?? "2113091819067854850";
  const ep = Number(process.argv[3] ?? 1);
  const r = await apiPost("/web/v4/short_play/episode_info", { shortPlayId: id, episodeNo: ep });
  console.log(JSON.stringify(r, null, 1).slice(0, 900));
}
