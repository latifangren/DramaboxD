# Teardown: ShortMax / ShortTV (www.shorttv.live) — jalur WEB resmi

Tanggal: 22 Okt 2026 · Metode: bedah bundle JS publik situs + probe live Node fetch
· Status: provider DIBANGUN & live terverifikasi (DramaboxD v0.10.0).

## Ringkasan

ShortMax (paket Android `live.shorttv.apps`) punya situs resmi
**www.shorttv.live** (Nuxt). Halaman dramanya SSR berisi data MOCK —
data asli dimuat dari API backend situs:

`https://shortweb.shorttv.live/app-api/app` (backend Spring; ada varian
-pre/-test yang dipilih klien berdasarkan hostname).

## Amplop enkripsi (persis klien web resmi, dari bundle publik)

- Semua endpoint POST. Body request = **AES-128-CBC-PKCS7(JSON) → base64**,
  kunci = IV = string tetap `"shortwebapiaesen"` dari bundle publik.
- **Seluruh body respons juga ciphertext base64** dengan skema yang sama.
- Header wajib: `X-Encrypted: true` + `Language-Code: <locale>` —
  tanpa keduanya server membalas 500 `非法请求` ("permintaan ilegal").
- Kunci bundle publik: membuktikan bentuk klien, bukan entitlement
  (kelas yang sama dengan NetShort/ReelShort).

## Endpoint yang dipakai

| Fungsi | Endpoint | Body | Hasil |
|---|---|---|---|
| Search | `/search/searchPage` | `{pageSize, pageNum, searchText}` | `{data: item[], total}` — mesin relevansi: jumlah item per halaman bisa sedikit walau total besar |
| Trending | `/search/searchHot` | `{}` | daftar hot situs `{shortPlayId, shortPlayName, shortPlayCode}` |
| Latest/katalog | `/cmsShortPlay/queryPage` | `{pageSize, pageNum}` | `{list: item[], total}` |
| Detail+episode | `/cmsShortPlay/queryDetail` | `{shortPlayId}` | seri penuh + `episodeList[]` |

Endpoint lain terpetakan: `/cmsShortPlay/recommend` (perlu nama kategori),
`/cmsShortPlay/queryLanguageCodeListByShortPlayId`, `/webLanguage/queryList`.

## Model data & stream

- ID seri = `shortPlayId` numerik. Item: `shortPlayName`, `summary`,
  `coverId` (= URL cover absolut di akamai-static.shorttv.live),
  `labelList`/`classList` (`displayName` = tag terlokalisasi).
- Detail memuat `lockBegin` = **episode gratis terakhir** dan seluruh
  `episodeList`: `{episodeNum, coverId, frameExtractionCover, encryptedVideoUrl}`.
- `encryptedVideoUrl` adalah STRING JSON `{"video_480": url, "video_720": url,
  "video_1080": url}` berisi m3u8 bertanda tangan di
  `akamai-static.shorttv.live/hls-encrypted/<hash>_<res>/main.m3u8`.
  Terverifikasi: playlist valid, **segmen TS terbuka (tanpa EXT-X-KEY)** —
  "encrypted" hanya soal URL bertanda tangan. Provider memilih 720p.
- Durasi tidak disediakan upstream → EXTINF -1 (sama seperti PineDrama).

## Kunci dihormati

Episode dengan `episodeNum > lockBegin` memiliki `encryptedVideoUrl: ""`
dari server untuk sesi anonim situs — tercatat sebagai locked, tidak
pernah dimintakan stream-nya.

## Jalur yang TIDAK dipakai (dan kenapa)

- **API komunitas SAPI** (`captain.sapimu.au/shortmax/api/v1`, dari repo
  mbendino/shortmax-streaming): host-nya **mati** — DNS menjawab tapi
  koneksi putus dari dua jaringan berbeda (VM + layanan fetch eksternal).
  Modelnya pun trial gateway pihak ketiga (ep 30+ di balik token bot
  Telegram berbayar), kalah bersih dari jalur web resmi ini.
- **Mirror Sansekai** (`api.sansekai.my.id/api/shortmax`): ada dan bentuk
  datanya mirip, tapi membalas 403 untuk jaringan VM ini (sama seperti
  seksi DramaBox mereka) — tidak bisa diverifikasi dari sini.

## Bukti live (22 Okt 2026)

- Search "love": total 934 hasil upstream.
- Scrape "Chasing Love" (36517, 66 episode, lockBegin 7):
  **7/66 episode tertulis dalam ~1,5 detik** (satu panggilan detail),
  59 terkunci tercatat di laporan.

## Berkas terkait

- Provider: `src/integrations/providers/shortmax/{client,index,normalize}.ts`
- Probe: `tools/shortmax-web-probe.mjs`
- Fixture/test: `fixtures/shortmax-sample.json`, `test/shortmax-normalize.test.ts`
- Env: `SHORTMAX_API_BASE` (default `https://shortweb.shorttv.live/app-api/app`),
  `SHORTMAX_LANGUAGE` (default `en`)
