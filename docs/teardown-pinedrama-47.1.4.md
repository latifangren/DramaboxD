# Teardown APK PineDrama 47.1.4 (MOD "Premium AdFree")

Tanggal: 22 Oktober 2026 · Metode: analisis statis (unzip, androguard, strings 33 DEX) + probe live terbatas. APK tidak dijalankan/diinstal.

## Identitas file

| | |
|---|---|
| File sfile | "PineDrama_v47.1.4_Premium AdFree.apk" (uploader: Dhani, 20 Okt 2026) |
| Ukuran | 146.674.926 byte (139,88 MB) |
| SHA-256 | `9b7d2d942eea92867c32661a78db12c47379d0cd4b9bc612ccb85231ad4ce2ae` |
| Package | `com.ss.android.ttmd.video` |
| Versi | 47.1.4 (versionCode 2024701040), minSdk 23, targetSdk 36 |
| Aktivitas utama | `com.ss.android.ugc.aweme.splash.SplashActivity` |
| Sertifikat | `CN=FenixZIN, O=Federação BR, L=Brazil, C=BR` — re-sign modder, bukan ByteDance |

## Asal codebase: klien TikTok utuh, diganti kulit

Ini bukan aplikasi drama mandiri — ini **klien TikTok (aweme) lengkap** yang di-rebrand:

- Package `com.ss.android.*` / `com.ss.android.ugc.aweme.*` persis TikTok; `aid=1233` (app id TikTok sendiri).
- Drama pendek adalah "vertical" di dalam TikTok (`short_drama_*`, `DramaSeriesCenter*`, Lynx vertical `fe_search_vertical_pinedrama` di CDN TikTok).
- Isi APK 33 DEX ±290 MB: feed, IM, e-commerce, editor video — semua mesin TikTok ikut terbawa.
- Timestamp file campuran (2026-10-14 vs 1981) menandakan repack.

Konten drama = item aweme yang dikelompokkan sebagai seri; episode = video TikTok biasa.

## API: API TikTok, dengan benteng penuh

- Host: keluarga TikTok — `api16-normal-c-alisg.tiktokv.com`, `api-va.tiktokv.com`, `api-core.tiktokv.com`, `oec-api.tiktokv.com`, dll.
- Endpoint: standar TikTok — `/aweme/v1/feed/`, `/aweme/v1/general/search/`, `/aweme/v1/discover/search/`, `/aweme/v1/hot/search/list/`, dll.
- Keamanan: **MetaSec** (`libmetasec_ov.so`) + TTNet/Cronet (`libsscronet.so`) — X-Argus/X-Bogus/X-Gorgon + registrasi perangkat server-side (`device_id`/`iid` diterbitkan server, bukan dibuat lokal).

## Probe live (22 Okt 2026, dari VM ini)

| Jalur | Hasil |
|---|---|
| `GET api16-normal-c-alisg.tiktokv.com/aweme/v1/feed/?aid=1233&…` tanpa signing | ❌ respons kosong — ditolak diam-diam (pola khas TikTok: signing + device registration wajib) |
| `https://www.pinedrama.com` | ⚠️ HTTP 200 tapi shell kosong (SPA JS); fetch kedua 0 byte — konten butuh render browser asli |

## Penilaian untuk provider DracinScraper — yang tersulit dari tiga aplikasi

Berbeda dari Melolo (servernya tidak menegakkan signing di endpoint inti) dan FreeReels (MD5 sederhana):

1. **Jalur API aplikasi: tertutup realistis.** TikTok menegakkan MetaSec + registrasi perangkat; mereproduksi X-Argus adalah proyek RE native besar dan rapuh (algoritma berubah per versi). Bukan pekerjaan satu sesi.
2. **Jalur web (pola RamzzzMD/pinedrama): satu-satunya yang masuk akal.** Situs PineDrama menyajikan halaman seri dengan JSON tertanam — tapi dari jaringan VM ini shell-nya kosong/JS-gated, perlu sesi browser sungguhan dan kemungkinan verifikasi wilayah/kapca. Perlu riset tersendiri dengan browser sebelum bisa dijanjikan.
3. Rekomendasi: provider PineDrama DITUNDA sampai jalur web terbukti dari browser; jangan bangun di atas API aplikasi.

Status klaim MOD ("Premium AdFree"): tidak diverifikasi — analisis statis tidak membuktikan status premium hasil patch; SDK iklan TikTok/Pangle tetap lengkap di dalam.

## UPDATE 22 Okt 2026 (sore) — jalur web TERBUKTI (dengan catatan)

Uji browser asli + bedah source situs mengubah penilaian jalur web:

- **Situs render penuh** tanpa login/kapca/blokir wilayah (merek tampil "PinesDramas"; katalog drama di `/genres`, pola URL: seri `/dramas/{slug}`, episode `/dramas/{slug}/ep{n}`, search `/search?q=`).
- Situs adalah **Next.js**; HTML halaman episode membawa payload RSC berisi `episode_list` (`can_play` per episode), `name`, `series_id`=slug. Contoh seri uji "My Husband Murdered Me": 50 episode, **ep 1–9 can_play**, ep 10+ terkunci.
- Player = Tencent Cloud VOD (TCPlayer, appId 1318177724). JS player memanggil API same-origin:
  `GET /api/episode/getEpisodePlayUrl?series_slug=<slug>&language=en&episode_id=<n>`
  → `{code:200, data:{url:"https://v.pinedrama.com/…vodtransuse1318177724/…/v.f101303.mp4?sign=…"}}`.
  Episode terkunci → `{code:500, msg:"Episode unavailable"}`.
- **Terverifikasi dari Node fetch DAN curl**: halaman seri 200 + episode_list terbaca; API play URL code 200 untuk ep 1 & 9. Python urllib justru kena blokir fingerprint TLS oleh CDN (404) — jadi provider TS (Node fetch) aman, scraper Python tidak.
- **Catatan keras**: fetch langsung file MP4 bertanda tangan dari curl dibalas **HTTP 500** di semua varian yang dicoba (UA penuh, Referer, cookie sesi, HTTP/2, header Sec-Fetch) — sementara pemutaran di browser asli jalan (teramati 0:18/1:38). Kemungkinan validasi CDN terhadap fingerprint TLS/klien. Artinya: URL hasil API **belum terbukti bisa diputar player eksternal** (VLC/TiviMate) dari jaringan ini; provider bisa dibangun untuk metadata + URL episode gratis, dengan caveat pemutaran itu.

Alat uji: `tools/pinedrama-web-test.py` (resep; dari Python bisa kena 404 TLS — gunakan sebagai dokumentasi alur).
