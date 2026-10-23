# DramaboxD

Platform streaming drama pendek (dracin) lokal yang modular: agregator katalog + pemutar web bergaya Netflix/DramaFlix dari banyak platform (ReelShort, FreeReels, PineDrama, Melolo, DrakorKu, DramaBox), plus CLI pengekspor **playlist `.m3u` per judul** — 1 file = 1 judul, semua episode terurut:

```m3u
#EXTM3U
#EXTINF:58 tvg-logo="https://.../Snapshots/xxx.jpg" group-title="Menolak Lima Pasangan Wanitaku",Episode 44
https://.../vod-112094/.../...-sd.m3u8
```

Arsitektur berlapis (transport → service → integration/provider SPI → infrastructure) didokumentasikan di **[ARCHITECTURE.md](ARCHITECTURE.md)** — tidak ada layer yang dilompati, provider baru cukup implementasi kontrak `DramaProvider` + registrasi.

## Menjalankan WebUI

```bash
npm install
npm run serve        # tsx src/index.ts — http://localhost:3004 (dan IP LAN untuk HP/TV)
# produksi: npm run build && npm start
```

Fitur: billboard + baris katalog per platform, pencarian global semua platform sekaligus, halaman direktori Platform (aktif/segera hadir), pemutar vertikal 9:16 (Hls.js, lewati ±10 dtk, kecepatan, auto-next, subtitle dari manifest HLS), Lanjutkan Menonton + Daftar Saya (localStorage), dan UI dwibahasa ID/EN. Proxy stream `/api/stream` menjaga SSRF (IP privat ditolak) dan menyamarkan Referer per platform.

Endpoint utama: `/api/status`, `/api/platforms`, `/api/browse`, `/api/search`, `/api/search/global`, `/api/drama/:provider/:id`, `/api/stream`, `/api/subtitles`.

## Status (v0.11.0)

- ✅ Provider **FlickReels** — jalur **web** (flickreels.net, Nuxt SSR): semua data dari payload `__NUXT_DATA__` (format devalue) di HTML + JSON-LD VideoObject per episode (m3u8 bertanda tangan, terverifikasi playlist + segmen TS). ID seri = `<slug>/<playletId>` (slug URL wajib benar). **Live terverifikasi**: scrape "Daddy's Little Savior" → 9/58 episode tertulis (gratis s/d ep 9; `start_pay_num` 10; 49 terkunci dihormati). Detail: `docs/teardown-flickreels-web.md`.
- ✅ Provider **GoodShort** — jalur **web resmi** (www.goodshort.com; intel lama "APK saja" gugur): API same-origin `/hwycreels/*` warisan backend GoodNovel (POST JSON polos, amplop {status:0, data}; bahasa katalog via Accept-Language, tiap edisi bahasa = bookId sendiri). Episode gratis membawa `m3u8Path` (HLS bertanda tangan v3.goodshort.com) + `playTime` yang terverifikasi akurat sebagai durasi; episode berbayar tidak diberi field itu oleh server. **Live terverifikasi**: scrape 64 episode → 9/64 tertulis (~2,4 dtk), 55 terkunci dihormati; search "love" total 500. Roadmap provider riset kini HABIS (PLANNED kosong) — tersisa hanya LokLok yang diparkir atas keputusan user. Detail: `docs/teardown-goodshort-web.md`.
- ✅ Provider **ShortMax** — jalur **web resmi** (www.shorttv.live): API `shortweb.shorttv.live/app-api/app` beramplop AES-128-CBC dua arah persis klien web resmi (kunci=IV dari bundle publik; header X-Encrypted + Language-Code wajib). Satu panggilan detail memuat semua episode; stream HLS bertanda tangan (segmen terbuka). **Live terverifikasi**: scrape "Chasing Love" (66 ep) → 7/66 tertulis (~1,5 dtk; `lockBegin` 7), 59 terkunci dihormati. Jalur API komunitas SAPI sudah mati (host tak menjawab) dan mirror Sansekai 403 dari jaringan ini — keduanya tidak dipakai; detail: `docs/teardown-shortmax-web.md`.
- ✅ Restruktur total ke arsitektur DramaboxD (branch `dev-muse`): backend berlapis `src/{http,services,integrations,infrastructure,shared}`, frontend SPA modular di `public/{css,js}`, nama paket `dramaboxd`.
- ✅ Provider **NetShort** — jalur **web** (netshort.com): API `/prod-web-api` beramplop enkripsi AES-256-ECB + RSA persis klien web resmi (kunci sesi konstan + pasangan kunci RSA dari bundle publik situs; tanpa amplop server membalas 500). Stream = MP4 bertanda tangan (`playVoucher`, cfcdn.netshort.com). **Live terverifikasi**: search "queen" 3.786 hasil; scrape "Back to the '90s: A Pop Queen's Comeback" → 7/30 episode tertulis (23 terkunci dihormati & tercatat). Detail: `docs/teardown-netshort-web.md`. Catatan: jumlah episode gratis bervariasi per judul; durasi upstream berupa string desimal.
- ✅ Kerangka provider seragam pola **SekaiDrama** (Sansekai/SekaiDrama): satu interface untuk semua provider.
- ✅ Provider **DramaBox** — adapter API upstream terkonfigurasi.
- ✅ Provider **FreeReels** — API resmi aplikasi (hasil reverse APK 2.3.40: dekripsi SigL360, login anonim bertanda tangan MD5, URL putar per episode via `info_push_v2`). **Live terverifikasi penuh**: scrape "Passionate Love" → 81/81 episode tertulis jadi M3U (22 Okt 2026). Detail: `docs/tes-live-freereels.md`.
- ✅ Provider **Melolo** — API resmi aplikasi (hasil reverse APK 5.1.8: search + directory + RPC `video_model` JSON tanpa signing; stream MP4 langsung). **Live terverifikasi penuh**: scrape "Learning To Love 2" → 86/86 episode tertulis (22 Okt 2026). Detail: `docs/teardown-melolo-5.1.8.md`. Catatan: discovery (latest/trending) Melolo ada di bookmall yang kena risk control MetaSec, jadi kedua perintah itu melempar error jelas — pakai `search`.
- ✅ Provider **PineDrama** — jalur **web** (pinedrama.com): metadata dari JSON-LD halaman seri, daftar episode dari payload RSC (`can_play`), URL putar dari API situs `getEpisodePlayUrl` (MP4 bertanda tangan). **Live terverifikasi**: scrape "My Husband Murdered Me" → 9 episode gratis tertulis, 41 terkunci tercatat dilewati (22 Okt 2026). Detail: `docs/teardown-pinedrama-47.1.4.md`. Catatan: (1) search dibatasi katalog yang ter-render server karena pencarian drama bawaan situs rusak & tidak ada API search drama; (2) durasi episode tidak disediakan web (EXTINF -1); (3) URL MP4 terverifikasi bisa diputar di browser — pemutaran di player eksternal belum terverifikasi dari jaringan pengembangan (fetch langsung via curl dibalas 500 oleh CDN).
- ✅ Penulis M3U + CLI + mode `mock` offline.
- ✅ Provider **DrakorKu** — panel "Your Videos Channel" (`kampretloh.top/v3`), hasil teardown APK 5.1.2: API teks terang (base URL + API key klien dari AppConfig + header persis app; tanpa itu server membalas kosong). **Genre-nya drakor** (drama Korea sub Indo), bukan dracin — disertakan karena pipeline-nya sama. Model panel: category (cid) = seri, post = episode dengan MP4 langsung; tidak ada paywall di level API. ID seri = cid angka. Detail: `docs/teardown-drakorku-5.1.2.md`. Catatan: trending = urutan rating (panel tidak punya feed trending); durasi episode tidak diberikan API (EXTINF -1).
- ✅ Provider **ReelShort** — jalur **web** (`www.reelshort.com/api`): signing HMAC-SHA256 (secret dari bundle JS publik), dekripsi amplop AES-128-CBC → base64 → zlib untuk respons terenkripsi, sesi anonim. APK Android-nya terkunci SecShell — tidak dipakai. **Live terverifikasi**: search/detail/51 chapter "The Great and Powerful Genie" semua memberi `video_url` m3u8 (v-mps.crazymaplestudios.com, CDN yang sama dengan contoh M3U awal proyek) + durasi. ID seri = `book_id` hex (bukan `t_book_id`). Detail: `docs/teardown-reelshort-4.1.00.md`, `docs/riset-reelshort-web.md`. Catatan: trending = urutan `read_count` dari feed home (webInfo tidak memberi label seksi).
- ✅ 33/33 test lolos, typecheck bersih (`npm test`, `npm run typecheck`).
- ⚠️ DramaBox: API publik Sansekai (`api.sansekai.my.id`) menolak request dari IP VM pengembangan dengan HTTP 403 (22 Okt 2026). Adapter tetap bisa diarahkan ke base lain (mirror/self-host) lewat `DRAMABOX_API_BASE`. Pipeline penuh terverifikasi lewat mode `mock`.
- ⏭️ Roadmap provider: FlickReels, NetShort, ShortMax, GoodShort (LokLok diparkir — proteksi DPT-Shell + Dex2C).

## Cara pakai CLI

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
node dist/cli.js scrape 2113091819067854850 --provider netshort --out output  # NetShort web (ID = shortPlayId numerik)
node dist/cli.js scrape daddys-little-savior/14288 --provider flickreels --out output  # FlickReels web (ID = slug/playletId)
node dist/cli.js scrape 36517 --provider shortmax --out output  # ShortMax web (ID = shortPlayId numerik)
node dist/cli.js scrape 31001217415 --provider goodshort --out output  # GoodShort web (ID = bookId numerik)
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
│   └── pinedrama/
│       ├── client.ts      HTTP situs (UA browser) + API getEpisodePlayUrl
│       ├── index.ts       Katalog /genres + halaman seri + URL putar per episode
│       └── normalize.ts   JSON-LD + payload RSC + kartu katalog -> model internal
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
