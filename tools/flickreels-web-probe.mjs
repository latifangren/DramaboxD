// Probe live FlickReels (jalur web) — parse payload __NUXT_DATA__ (devalue) + JSON-LD.
// Jalan: node tools/flickreels-web-probe.mjs <slug>/<playletId>
// Detail: docs/teardown-flickreels-web.md
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const id = process.argv[2] ?? "daddys-little-savior/14288";
const [slug, numericId] = [id.slice(0, id.lastIndexOf("/")), id.slice(id.lastIndexOf("/") + 1)];
const html = await (await fetch(`https://www.flickreels.net/playlist/${slug}/${numericId}/episode-1`, { headers: { "User-Agent": UA } })).text();
const data = JSON.parse(html.match(/id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
const deref = (v) => (Number.isInteger(v) && v >= 0 && v < data.length ? data[v] : v);
const resolve = (km) => Object.fromEntries(Object.entries(km).map(([k, v]) => [k, Array.isArray(deref(v)) ? deref(v).map(deref) : deref(v)]));
const series = data.filter((e) => e && typeof e === "object" && !Array.isArray(e) && "start_pay_num" in e).map(resolve)[0];
console.log("title:", series.title, "| episodes:", series.upload_num, "| start_pay_num:", series.start_pay_num);
const eps = series.list.filter((e) => e && typeof e === "object").map(resolve);
console.log("ep1:", eps[0].chapter_title, "| lock:", eps[0].is_lock, "| duration:", eps[0].duration);
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
console.log("contentUrl ep1:", ld.contentUrl ?? "(tidak ada)");
