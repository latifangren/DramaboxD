// Probe live GoodShort (jalur web resmi) — API same-origin /hwycreels/*, JSON polos.
// Jalan: node tools/goodshort-web-probe.mjs [bookId]
// Detail: docs/teardown-goodshort-web.md
const BASE = "https://www.goodshort.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export async function api(path, body, lang = "en") {
  const r = await fetch(BASE + path, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/json", Referer: BASE + "/", Origin: BASE, "Accept-Language": lang }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  return r.json();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2] ?? "31001217415";
  const d = await api("/hwycreels/book/detail", { bookId: id });
  const page = await api("/hwycreels/chapter/page", { bookId: id, pageNo: 1, pageSize: 100 });
  const free = (page.data.records ?? []).filter((c) => c.m3u8Path).length;
  console.log(d.data.book.bookName, "| chapters:", page.data.total, "| gratis (ada m3u8Path):", free);
}
