# DracinScraper

Scrape drama pendek Cina (dracin) dari berbagai provider dan hasilkan **playlist `.m3u` per judul** — 1 file = 1 judul, semua episode terurut:

```m3u
#EXTM3U
#EXTINF:58 tvg-logo="https://.../Snapshots/xxx.jpg" group-title="Menolak Lima Pasangan Wanitaku",Episode 44
https://.../vod-112094/.../...-sd.m3u8
```

## Status (v0.13.0)

- ✅ Kerangka provider seragam pola **SekaiDrama** (Sansekai/SekaiDrama): satu interface untuk semua provider.
- ✅ Provider **DramaBox** — adapter API upstream terkonfigurasi.
- ✅ Provider **FreeReels** — API resmi aplikasi (hasil reverse APK 2.3.40: dekripsi SigL360, login anonim bertanda tangan MD5, URL putar per episode via `info_push_v2`). **Live terverifikasi penuh**: scrape "Passionate Love" → 81/81 episode tertulis jadi M3U (22 Okt 2026). Detail: `docs/tes-live-freereels.md`.
- ✅ Provider **Melolo** — API resmi aplikasi (hasil reverse APK 5.1.8: search + directory + RPC `video_model` JSON tanpa signing; stream MP4 langsung). **Live terverifikasi penuh**: scrape "Learning To Love 2" → 86/86 episode tertulis (22 Okt 2026). Detail: `docs/teardown-melolo-5.1.8.md`. Catatan: discovery (latest/trending) Melolo ada di bookmall yang kena risk control MetaSec, jadi kedua perintah itu melempar error jelas — pakai `search`.
- ✅ Provider **PineDrama** — jalur **web** (pinedrama.com): metadata dari JSON-LD halaman seri, daftar episode dari payload RSC (`can_play`), URL putar dari API situs `getEpisodePlayUrl` (MP4 bertanda tangan). **Live terverifikasi**: scrape "My Husband Murdered Me" → 9 episode gratis tertulis, 41 terkunci tercatat dilewati (22 Okt 2026). Detail: `docs/teardown-pinedrama-47.1.4.md`. Catatan: (1) search dibatasi katalog yang ter-render server karena pencarian drama bawaan situs rusak & tidak ada API search drama; (2) durasi episode tidak disediakan web (EXTINF -1); (3) URL MP4 terverifikasi bisa diputar di browser — pemutaran di player eksternal belum terverifikasi dari jaringan pengembangan (fetch langsung via curl dibalas 500 oleh CDN).
- ✅ Penulis M3U + CLI + mode `mock` offline.
- ✅ Provider **DrakorKu** — panel "Your Videos Channel" (`kampretloh.top/v3`), hasil teardown APK 5.1.2: API teks terang (base URL + API key klien dari AppConfig + header persis app; tanpa itu server membalas kosong). **Genre-nya drakor** (drama Korea sub Indo), bukan dracin — disertakan karena pipeline-nya sama. Model panel: category (cid) = seri, post = episode dengan MP4 langsung; tidak ada paywall di level API. ID seri = cid angka. Detail: `docs/teardown-drakorku-5.1.2.md`. Catatan: trending = urutan rating (panel tidak punya feed trending); durasi episode tidak diberikan API (EXTINF -1).
- ✅ Provider **ReelShort** — jalur **web** (`www.reelshort.com/api`): signing HMAC-SHA256 (secret dari bundle JS publik), dekripsi amplop AES-128-CBC → base64 → zlib untuk respons terenkripsi, sesi anonim. APK Android-nya terkunci SecShell — tidak dipakai. **Live terverifikasi**: search/detail/51 chapter "The Great and Powerful Genie" semua memberi `video_url` m3u8 (v-mps.crazymaplestudios.com, CDN yang sama dengan contoh M3U awal proyek) + durasi. ID seri = `book_id` hex (bukan `t_book_id`). Detail: `docs/teardown-reelshort-4.1.00.md`, `docs/riset-reelshort-web.md`. Catatan: trending = urutan `read_count` dari feed home (webInfo tidak memberi label seksi).
- ✅ Provider **NetShort** — jalur **web** (netshort.com): API same-origin `/prod-web-api` beramplop enkripsi penuh persis klien resmi (AES-256-ECB + RSA, kunci dari bundle publik situs). Stream = MP4 bertanda tangan per episode dari `episode_info`; episode `isLock` tidak diberi voucher oleh server. **Live terverifikasi**: scrape "Back to the '90s: A Pop Queen's Comeback" → 7/30 episode gratis tertulis, 23 terkunci tercatat (22 Okt 2026). Detail: `docs/teardown-netshort-web.md`.
- ✅ Provider **FlickReels** — jalur **web** (www.flickreels.net, Nuxt SSR): seluruh data seri + episode dari payload `__NUXT_DATA__` halaman episode; stream dari JSON-LD VideoObject (HLS bertanda tangan). ID seri komposit `slug/playletId` (slug wajib persis, dari href kartu katalog). **Live terverifikasi**: scrape "Daddy's Little Savior" (58 ep) → 9/58 tertulis, 49 terkunci tercatat. Detail: `docs/teardown-flickreels-web.md`.
- ✅ Provider **ShortMax** — jalur **web resmi** (www.shorttv.live): API `shortweb.shorttv.live/app-api/app` beramplop AES-128-CBC dua arah persis klien web resmi (kunci=IV dari bundle publik; header X-Encrypted + Language-Code wajib). Satu panggilan detail memuat semua episode; stream HLS bertanda tangan (segmen terbuka). **Live terverifikasi**: scrape "Chasing Love" (66 ep) → 7/66 tertulis (~1,5 dtk; `lockBegin` 7), 59 terkunci dihormati. Detail: `docs/teardown-shortmax-web.md`.
- ✅ Provider **GoodShort** — jalur **web resmi** (www.goodshort.com): API same-origin `/hwycreels/*` warisan backend GoodNovel (JSON polos; bahasa katalog via Accept-Language, tiap edisi bahasa = bookId sendiri). Episode gratis membawa `m3u8Path` (HLS bertanda tangan) + `playTime` terverifikasi akurat sebagai durasi; episode berbayar tidak diberi field itu oleh server. **Live terverifikasi**: scrape 64 episode → 9/64 tertulis (~2,4 dtk), 55 terkunci dihormati. Detail: `docs/teardown-goodshort-web.md`.
- ✅ **Bahasa terpadu ID/EN (v0.13.0)** — satu saklar bahasa di WebUI menggerakkan string UI, bahasa katalog/metadata per-request untuk provider yang mendukungnya secara bawaan (ReelShort, PineDrama, NetShort, ShortMax, GoodShort — terverifikasi live: katalog Indonesia ShortMax/GoodShort adalah edisi asli platform, bukan hasil terjemahan), dan default subtitle player. Platform yang katalognya tetap ditandai jujur di halaman Platform (badge 🌐 "Ikut bahasa"). Subtitle player kini native-first: subtitle bawaan provider (sidecar) dan track tertanam HLS otomatis dipilih bila cocok dengan bahasa UI; terjemahan mesin hanya lewat opsi manual di menu subtitle.
- ✅ **Kontrol player diperkaya (v0.13.0)** — volume + mute (tersimpan sebagai preferensi), Picture-in-Picture, dan menu kualitas HLS (Otomatis / level rendisi manual dari `hls.levels`); menu hanya tampil bila stream punya lebih dari satu rendisi. Tanpa sistem kunci buatan: episode hanya tidak terputar bila platform sumber sendiri menahannya.
- ✅ 68/68 test lolos, typecheck bersih (`npm test`, `npm run typecheck`).
- ⚠️ DramaBox: API publik Sansekai (`api.sansekai.my.id`) menolak request dari IP VM pengembangan dengan HTTP 403 (22 Okt 2026). Adapter tetap bisa diarahkan ke base lain (mirror/self-host) lewat `DRAMABOX_API_BASE`. Pipeline penuh terverifikasi lewat mode `mock`.
- ⏭️ Roadmap provider: habis — 10 provider aktif; LokLok diparkir (APK terproteksi DPT-Shell + Dex2C-Pro).

## Cara pakai

```bash
npm install
npm run build

node dist/cli.js providers
node dist/cli.js search "passionate" --provider freereels   # FreeReels (live)
node dist/cli.js scrape <seriesId> --provider freereels --out output
node dist/cli.js scrape-search "passionate" --provider freereels --out output
node dist/cli.js scrape-search "love" --provider melolo --out output   # Melolo (live)
node dist/cli.js scrape my-husband-murdered-me --provider pinedrama --out output  # PineDrama web (ID = slug)
node dist/cli.js scrape 3730 --provider drakorku --out output  # DrakorKu (ID = cid kategori)
node dist/cli.js scrape 6a5191d8fa9f9f7a09081789 --provider reelshort --out output  # ReelShort web (ID = book_id hex)
node dist/cli.js search "pewaris"                      # DramaBox (live, butuh upstream yang bisa diakses)
node dist/cli.js scrape <bookId> --out output          # -> output/<slug-judul>.m3u

# Offline (fixture lokal, tanpa jaringan):
node dist/cli.js scrape-search "contoh" --provider mock --out output
```

Perintah lain: `latest`, `trending`, `detail <id>`, `episodes <id>` — semua mendukung `--provider` dan `--json`.

## Konfigurasi

Salin `.env.example` sebagai acuan (atau set environment langsung):

| Variabel | Default | Fungsi |
|---|---|---|
| `DRAMABOX_API_BASE` | `https://api.sansekai.my.id/api` | Base API upstream DramaBox |
| `FREEREELS_API_BASE` | `https://apiv2.free-reels.com/frv2-api` | Base API FreeReels |
| `FREEREELS_DEVICE_NAME` | `Google Pixel 8` | Nama perangkat sesi tamu FreeReels |
| `MELOLO_API_BASE` | `https://api.tmtreader.com` | Base API Melolo |
| `MELOLO_DEVICE_ID` | `7268586056781432322` | device_id parameter umum Melolo |
| `PINEDRAMA_SITE_BASE` | `https://pinedrama.com` | Base situs PineDrama (jalur web) |
| `PINEDRAMA_LANGUAGE` | `en` | Bahasa episode PineDrama |
| `DRAKORKU_API_BASE` | `https://kampretloh.top/v3` | Base panel DrakorKu |
| `DRAKORKU_API_KEY` | (key klien dari app 5.1.2) | API key panel DrakorKu |
| `REELSHORT_API_BASE` | `https://www.reelshort.com` | Base situs ReelShort (jalur web) |
| `REELSHORT_LANGUAGE` | `en` | Bahasa katalog ReelShort (`lang`, ikut ditandatangani) |
| `NETSHORT_SITE_BASE` | `https://netshort.com` | Base situs NetShort (jalur web) |
| `NETSHORT_LANGUAGE` | `en` | Bahasa katalog NetShort |
| `FLICKREELS_SITE_BASE` | `https://www.flickreels.net` | Base situs FlickReels (jalur web) |
| `SHORTMAX_API_BASE` | `https://shortweb.shorttv.live/app-api/app` | Base API ShortMax (jalur web resmi) |
| `SHORTMAX_LANGUAGE` | `en` | Bahasa katalog ShortMax (`Language-Code`) |
| `GOODSHORT_SITE_BASE` | `https://www.goodshort.com` | Base situs GoodShort (jalur web resmi) |
| `GOODSHORT_LANGUAGE` | `en` | Bahasa katalog GoodShort (Accept-Language) |
| `DRACIN_DELAY_MS` | `500` | Jeda antar request |
| `DRACIN_TIMEOUT_MS` | `30000` | Timeout per request |
| `DRACIN_OUT_DIR` | `output` | Folder output M3U |

## Arsitektur

```
src/
├── types.ts               Model ternormalisasi + kontrak DramaProvider
│                          (search/latest/trending/detail/episodes)
├── config.ts              Konfigurasi dari environment
├── http.ts                Fetch tipis: timeout, jeda, HttpError jelas
├── m3u.ts                 Penulis M3U: slugify, buildM3u, writeSeriesM3u, index gabungan
├── providers/
│   ├── registry.ts        Daftar provider + roadmap
│   ├── mock.ts            Provider fixture untuk uji offline
│   ├── dramabox/
│   │   ├── index.ts       Adapter endpoint pola SekaiDrama
│   │   └── normalize.ts   Bentuk mentah upstream -> model internal
│   ├── freereels/
│   │   ├── client.ts      Sesi tamu: login anonim + tanda tangan OAuth gaya MD5
│   │   ├── index.ts       Adapter endpoint API aplikasi
│   │   └── normalize.ts   Bentuk mentah API -> model internal
│   ├── melolo/
│   │   ├── client.ts      Parameter umum aplikasi (app_id/device_id), tanpa sesi
│   │   ├── index.ts       Search + directory + RPC video_model
│   │   └── normalize.ts   Book/item/video_model -> model internal (main_url base64)
│   ├── pinedrama/
│   │   ├── client.ts      HTTP situs (UA browser) + API getEpisodePlayUrl
│   │   ├── index.ts       Katalog /genres + halaman seri + URL putar per episode
│   │   └── normalize.ts   JSON-LD + payload RSC + kartu katalog -> model internal
│   ├── netshort/          Web: amplop AES-256-ECB + RSA, MP4 bertanda tangan
│   ├── flickreels/        Web: payload Nuxt SSR + JSON-LD HLS
│   ├── shortmax/          Web: amplop AES-128-CBC dua arah, HLS bertanda tangan
│   └── goodshort/         Web: API /hwycreels JSON polos, HLS + durasi akurat
└── cli.ts                 CLI (tanpa dependensi runtime)
fixtures/                  Contoh respons mentah untuk mock & test
test/                      node:test — normalizer, signing + penulis M3U
```

### Pola DramaBox (dari SekaiDrama)

SekaiDrama tidak meng-scrape dramabox.com langsung; route-nya proxy tipis ke API upstream:

```
GET {base}/dramabox/search?query=<q>
GET {base}/dramabox/latest | /trending | /foryou
GET {base}/dramabox/detail?bookId=<id>
GET {base}/dramabox/get-allepisode?bookId=<id>
```

Provider di sini mengikuti kontrak yang sama, lalu menormalisasi respons (toleran terhadap bungkus `data`, daftar `chapterList`, dan varian stream `m3u8Url`/`mp4`/`cdnList[].videoPathList[]` — utamakan `.m3u8` default). Episode terkunci/tanpa stream **tidak ditulis diam-diam**: dilewati dan dicatat di laporan scrape.

## Referensi

Riset lengkap: `~/workspace/your_files/DracinScraper-Referensi.md` (Sansekai/SekaiDrama, RamzzzMD/pinedrama, akmaldira/dramabox-downloader, peta API hosted DramaBos/anichin).

## Lisensi

MIT
