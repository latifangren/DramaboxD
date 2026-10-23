// Probe live ShortMax/ShortTV (jalur web resmi) — amplop AES-128-CBC dua arah + header X-Encrypted/Language-Code.
// Detail: docs/teardown-shortmax-web.md
import { createCipheriv, createDecipheriv } from "node:crypto";
const BASE = "https://shortweb.shorttv.live/app-api/app";
const KEY = Buffer.from("shortwebapiaesen", "utf8");
const enc = (obj) => { const c = createCipheriv("aes-128-cbc", KEY, KEY); return Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]).toString("base64"); };
const dec = (b64) => { const d = createDecipheriv("aes-128-cbc", KEY, KEY); return Buffer.concat([d.update(Buffer.from(b64, "base64")), d.final()]).toString("utf8"); };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export async function api(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "User-Agent": UA, Referer: "https://www.shorttv.live/", Origin: "https://www.shorttv.live", "Content-Type": "application/json", "X-Encrypted": "true", "Language-Code": "en" }, body: enc(body), signal: AbortSignal.timeout(25000) });
  const raw = await r.text();
  return JSON.parse(dec(raw.trim()));
}

// Demo bila dijalankan langsung: node tools/shortmax-web-probe.mjs [shortPlayId]
if (import.meta.url === `file://${process.argv[1]}`) {
  const id = Number(process.argv[2] ?? 36517);
  const d = await api("/cmsShortPlay/queryDetail", { shortPlayId: id });
  console.log(d.data.shortPlayName, "| episodes:", d.data.episodeList.length, "| lockBegin:", d.data.lockBegin);
}
