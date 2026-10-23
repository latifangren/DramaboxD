# Teardown: GoodShort (www.goodshort.com) — jalur WEB resmi

Tanggal: 23 Okt 2026 · Metode: bedah bundle JS publik situs + probe live Node fetch
· Status: provider DIBANGUN & live terverifikasi (DramaboxD v0.11.0).

## Ringkasan

GoodShort (`com.newreading.goodreels`, keluarga GoodNovel) ternyata punya
situs resmi penuh di **www.goodshort.com** (m.goodshort.com me-redirect ke
sana) — intel lama "nol web, APK saja" tidak berlaku lagi. Situsnya Vue SPA
yang memakai API same-origin warisan backend novel mereka:

`POST https://www.goodshort.com/hwycreels/*` — JSON polos, amplop
`{status: 0, message, data}`. "book" = seri, "chapter" = episode.

## Bahasa = edisi katalog

Katalog terlokalisasi: header **Accept-Language** memilih edisi
(EN/ES/PT/ID/…), dan **tiap edisi bahasa adalah bookId berbeda** untuk
cerita yang sama. Provider mengirim bahasa dari konfigurasi
(`GOODSHORT_LANGUAGE`, default `en`).

## Endpoint yang dipakai

| Fungsi | Endpoint | Body | Hasil |
|---|---|---|---|
| Search | `/hwycreels/book/search/seo` | `{keyword, pageNo, pageSize, type:"DEFAULT", seoSearch:false, recommendBook:0}` | `data.page.records[]` (objek book penuh) + `total` |
| Beranda | `/hwycreels/home/index` | `{language}` | `data.pageColumns[]` — kolom bernama ("Most Trending", "Hot List", genre, …) |
| Detail | `/hwycreels/book/detail` | `{bookId}` | `data.book` (nama, cover, introduction, chapterCount, tagsList, genreList) |
| Episode | `/hwycreels/chapter/page` | `{bookId, pageNo, pageSize}` | page `{records[], total, pages}` |

Endpoint lain terpetakan: `/chapter/detail` (per episode), `/genres/*`,
`/seo/resources/*`, `/book/search/hot/words`, `/home/second/list`
(paginasi per kolom).

## Model data & stream

- ID seri = `bookId` numerik (awalan 3100…).
- Record chapter: `{id, chapterName ("001"), index, price ("0" = gratis),
  playTime, image, m3u8Path?}`.
- **Stream**: `m3u8Path` = HLS bertanda tangan di `v3.goodshort.com`
  (`/mts/books/.../origin1/<hash>.m3u8?expiredTime=...&tul=...`).
  Terverifikasi playlist VOD valid.
- **Durasi akurat**: `playTime` (detik) cocok dengan jumlah EXTINF
  playlist (ep uji: 151 vs 151,8 terukur).
- Snapshot per episode dari field `image` (CDN acf.goodshort.com).

## Kunci dihormati

Episode berbayar (`price > 0`, mulai ep 10 pada judul uji) **tidak memiliki
field m3u8Path sama sekali** di respons server untuk sesi anonim —
tercatat sebagai locked. Provider tidak pernah memanggil chapter/detail
untuk mengakalinya.

## Bukti live (23 Okt 2026)

- Search "love": total 500 hasil (edisi EN).
- Scrape "Casarse con un rico sin querer" (31001217415, 64 episode):
  **9/64 episode tertulis dalam ~2,4 detik** dengan durasi + snapshot asli,
  55 terkunci tercatat di laporan.

## Berkas terkait

- Provider: `src/integrations/providers/goodshort/{client,index,normalize}.ts`
- Probe: `tools/goodshort-web-probe.mjs`
- Fixture/test: `fixtures/goodshort-sample.json`, `test/goodshort-normalize.test.ts`
- Env: `GOODSHORT_SITE_BASE` (default `https://www.goodshort.com`),
  `GOODSHORT_LANGUAGE` (default `en`)
