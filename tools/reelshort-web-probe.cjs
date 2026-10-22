// Probe live API WEB ReelShort (www.reelshort.com/api) — Node, BUKAN urllib
// (urllib kena putus TLS dari CDN; Node fetch lolos — pola sama seperti PineDrama).
// Signing HMAC-SHA256 + dekripsi amplop AES-128-CBC -> base64 -> zlib mengikuti
// dokumentasi komunitas (Youssefzdb/reelshort-api-docs) & terverifikasi live
// 22 Okt 2026: webInfo, webSearch, getBookInfo, getChapterInfo (video_url m3u8).
// SIGN_SECRET tertanam di bundle JS publik situs (lihat repo dokumentasi di atas).

const crypto = require("crypto"), zlib = require("zlib"), fs = require("fs");
const SECRET = "zj8N6zKEdrK8d1MxwHSvExdgQ868q1yT";
const COMMON = { apiVersion: "1.0.4", channelId: "WEB41001", clientVer: "2.4.00", lang: "en", session: "", uid: "0" };
function devId(){ const c="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let s=""; for(let i=0;i<12;i++) s+=c[Math.floor(Math.random()*c.length)]; return s + Date.now(); }
function sign(p){ const it=[]; for(const [k,v] of Object.entries(p)){ if(v===""||v===null||v===undefined||v==="null") continue; it.push([k, typeof v==="object" ? JSON.stringify(v) : String(v)]); } it.sort((a,b)=> a[0]<b[0]?-1:1); return crypto.createHmac("sha256", SECRET).update(it.map(([k,v])=>k+"="+v).join("&")).digest("hex"); }
function decodeBody(text){
  const t = text.trim();
  if (t.startsWith("{")) return JSON.parse(t);
  const pairs = [["VvRSNGFynLBW7aCP","gLn8sxqpzyNjehDP"],["jlcVUHH9XgmYlfsK","fOEZ9V4a3VaniWAa"]];
  for (const [k, iv] of pairs) for (const mode of ["inflateSync","inflateRawSync"]) {
    try { const d = crypto.createDecipheriv("aes-128-cbc", Buffer.from(k), Buffer.from(iv));
      const plain = Buffer.concat([d.update(Buffer.from(t, "base64")), d.final()]);
      const inner = Buffer.from(plain.toString("utf8").trim(), "base64");
      return JSON.parse(zlib[mode](inner).toString("utf8")); } catch(e) {}
  }
  throw new Error("decode gagal");
}
async function call(path, body, query){
  const ts = String(Math.floor(Date.now()/1000));
  const payload = { ...(query||{}), ...(body||{}), ...COMMON, devId: devId(), ts };
  payload.sign = sign(payload);
  const headers = { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36" };
  for (const [k,v] of Object.entries(payload)) headers[k] = String(v);
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const res = await fetch("https://www.reelshort.com"+path+qs, { method: body? "POST":"GET", headers, body: body? JSON.stringify(body): undefined });
  const text = await res.text();
  const j = decodeBody(text);
  console.log(path, "HTTP", res.status, "code:", j.code, "| data:", JSON.stringify(j.data).slice(0, path.includes("getChapterInfo") ? 700 : 420));
  return j;
}
(async()=>{
  const hall = await call("/api/ms/hall/webInfo", {});
  const lists = hall.data?.lists || [];
  console.log("hall lists:", lists.length, "| first list keys:", lists[0] ? Object.keys(lists[0]).join(",") : "-");
  const hb = lists.flatMap(l => l.books || l.book_list || l.lists || [])[0];
  console.log("hall book sample:", JSON.stringify(hb || {}).slice(0, 260));
  await call("/api/video/book/getBookInfo", null, { book_id: "6a5191d8fa9f9f7a09081789" });
  const s = await call("/api/video/search/webSearch", { word: "love", page: 1 });
  const books = s.data?.lists || s.data?.books || [];
  const book = Array.isArray(books) ? books[0] : null;
  if (book) {
    const bid = book.t_book_id || book.book_id || book.id;
    console.log("book_id:", bid, "| title:", book.book_title || book.book_name || book.title);
    const info = await call("/api/video/book/getBookInfo", null, { book_id: "6a5191d8fa9f9f7a09081789" });
    const chapters = info.data?.online_base || [];
    console.log("chapters:", chapters.length, "| first:", JSON.stringify(chapters[0]||{}).slice(0,200));
    for (const ch of [chapters[0], chapters[9], chapters[30], chapters[50]]) {
      if (!ch) continue;
      const ci = await call("/api/video/book/getChapterInfo", null, { book_id: "6a5191d8fa9f9f7a09081789", chapter_id: ch.chapter_id || ch.id });
      const d = ci.data || {};
      console.log("  ep", d.serial_number, "| video_url:", d.video_url ? String(d.video_url).slice(0, 110) : "(kosong)", "| dur:", d.duration ?? d.video_duration ?? "-", "| keys:", Object.keys(d).filter(k => /url|vip|lock|free|price|pay/i.test(k)).join(","));
    }
  }
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
