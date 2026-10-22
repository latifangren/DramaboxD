# Teardown: NetShort (netshort.com) — jalur WEB

Tanggal: 22 Okt 2026 · Metode: bedah bundle JS publik + probe live Node fetch
· Status: provider DIBANGUN & live terverifikasi (DramaboxD v0.8.0).

## Ringkasan

NetShort adalah platform short drama (ByteDance-family stack: TOS VOD
`awscover`/`cfcdn.netshort.com`). Situsnya Next.js; data tidak ada di HTML —
semua lewat API same-origin `https://netshort.com/prod-web-api` yang
**wajib beramplop enkripsi** (tanpa amplop: HTTP 500 dari backend Java).

## Amplop enkripsi (persis klien web resmi, dari bundle publik)

- Header wajib: `Content-Language: <lang>`, `OS: 4`, `canary: v1`,
  `version: 1.2.0`, UA browser, `Content-Type: application/json;charset=utf-8`.
- Kunci sesi AES: fungsi pembangkit di klien membuat string acak lalu
  MEMBUANGNYA dan memakai konstanta tetap → kunci sesi efektif konstan.
- Request: `body = AES-256-ECB-PKCS7(JSON, kunci sesi)` (base64);
  header `encrypt-key = RSA-PKCS1v1.5-encrypt(kunci publik tertanam, base64(kunci sesi))`.
- Respons terenkripsi bila header `encrypt-key` hadir: dekripsi RSA dengan
  kunci privat tertanam (juga di bundle) → kunci AES → dekripsi body.
- Kedua kunci RSA + kunci sesi adalah materi bundle publik — membuktikan
  bentuk klien, bukan entitlement (sama kelas dengan secret HMAC ReelShort).

## Endpoint yang dipakai (semua POST, amplop {code:200, msg, data})

| Fungsi | Endpoint | Body |
|---|---|---|
| Search | `/web/short_play/search/keyword/seo` | `{queryKeyword, pageQuery:{pageNum, pageSize}}` → `{list[], totalHits}` |
| Detail | `/web/v4/short_play/detail_info/cascade_label` | `{shortPlayId}` → nama, cover, sinopsis (`shotIntroduce`), `shortPlayLabels`, `videoEpisodeInfos[]` |
| Episode | `/web/v4/short_play/episode_info` | `{shortPlayId, episodeNo}` → `playVoucher`, `duration` (string desimal!), `episodeCover`, `subtitleList`, `isLock` |

Endpoint lain yang terpetakan (belum dipakai): `/web/auth/visitor_login`
(`{deviceCode, os}`), `/web/web/v3/latest_recommend`, label feed
`/web/web/v5/load_short_play_label`.

## Model data & stream

- ID seri = `shortPlayId` numerik (dari URL `/episode/<slug>-<id>`).
- `videoEpisodeInfos` di detail memuat SEMUA episode: `{episodeId, episodeNo,
  isLock, episodeCover}`.
- Stream = `playVoucher`: URL MP4 bertanda tangan di `cfcdn.netshort.com`
  (terverifikasi 206 + `video/mp4` + Range jalan).
- **Kunci dihormati**: episode `isLock: true` → `playVoucher: null` untuk sesi
  anonim. Jumlah episode gratis bervariasi per judul (judul uji: 7 dari 30).
- Durasi dikirim sebagai STRING desimal — normalisasi mengonversi ke number.

## Discovery (latest/trending) — dari SSR, bukan API

- latest: `/drama/all-plots` — ItemList JSON-LD `TVSeries` di payload SSR
  (id dari `@id`, name, image, genre, numberOfEpisodes; urutan menurun).
- trending: beranda `/` — objek shortPlay di payload RSC (perlu unescape
  berlapis); isinya seksi-seksi pilihan situs (Hot Series dkk).

## Bukti live (22 Okt 2026)

- Search "queen": `totalHits 3786`.
- Scrape "Back to the '90s: A Pop Queen's Comeback" (`2113091819067854850`):
  **7/30 episode tertulis** ke M3U dalam ~4,5 detik (durasi + snapshot asli),
  23 terkunci tercatat di laporan — sesuai perilaku upstream.

## Berkas terkait

- Provider: `src/integrations/providers/netshort/{client,index,normalize}.ts`
- Probe: `tools/netshort-web-probe.mjs` (menghasilkan amplop yang sama)
- Fixture/test: `fixtures/netshort-sample.json`, `test/netshort-normalize.test.ts`
- Env: `NETSHORT_SITE_BASE` (default `https://netshort.com`),
  `NETSHORT_LANGUAGE` (default `en`)
