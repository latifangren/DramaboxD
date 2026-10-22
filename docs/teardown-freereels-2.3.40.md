# Teardown: FreeReels 2.3.40 MOD (sfile.co) — 22 Okt 2026

Sumber: `https://sfile.co/BjvLiXPkBre` ("FreeReels - Drama and Series 2.3.40 MOD No Ads Latest Version.apk", uploader Destaseo).
File lokal: `apk/freereels-2.3.40-mod.apk` — 70.320.566 byte, SHA-256 `6dd84bde3ef10ea025d2c114d1b3c6ce3bb5ab8c293094f2fd03de8593e6428f`.
Metode: analisis statis saja (unzip, JADX 1.5.6, strings DEX). APK tidak dijalankan/diinstal.

## 1. Identitas

| | |
|---|---|
| Package | `com.freereels.app` |
| Versi | 2.3.40 (versionCode 200340001), compileSdk 35 / Android 15 |
| Isi | 4.873 file, 160 MB ter-ekstrak, 13 DEX (±89 MB), native arm64 (LiteAV/Tencent player, MMKV, Crashlytics, Pangle, dll) |
| Application class | `com.dramawave.app.DramaApp`, tema `Theme.DramaWave` |

**Temuan terbesar: FreeReels 2.3.40 dibangun di atas codebase DramaWave.** Hampir semua class aplikasi ber-package `com.dramawave.*` (feature home/detail/profile/wallet/novel, service API, model), FreeReels hanya flavor-nya: build flavor `freereelsRelease`, deeplink `freereels://freereels.app/...`, class migrasi `FreeReelsDataMigration`. Artinya **API FreeReels ≈ API DramaWave** — satu provider di DracinScraper kemungkinan bisa melayani dua brand ini.

## 2. Ini MOD beneran — ditandatangani ulang modder

- Sertifikat penanda tangan: `CN=DESTASEOMODS, O=DESTASEOMODS, L=Nganjuk, C=ID` (self-signed, dibuat 13 Nov 2025), file `META-INF/DESTASEOMODS.RSA`. Bukan sertifikat publisher asli (SKYWORK AI).
- Konsekuensi: tidak bisa update menimpa versi Play Store, dan isi tidak bisa diasumsikan sama dengan rilis resmi.
- Klaim "No Ads" **tidak terverifikasi** dari analisis statis: SDK iklan masih lengkap di dalam APK (AdMob, AppLovin, Pangle/ByteDance, TopOn/AnyThink, Fyber, Unity Ads, Vungle, Meta Audience Network — termasuk 2 DEX tambahan di `assets/audience_network/`), dan app punya `AdBlockUsageGuard` (cek pemblokir iklan bawaan developer). Tanpa APK original sebagai pembanding, perubahan persis sang modder tidak bisa dipastikan — yang pasti hanya re-sign + kemungkinan patch di level DEX.
- Permission 44 item, termasuk yang tidak berhubungan dengan streaming: CAMERA, READ_CLIPBOARD, WRITE_CALENDAR, READ_PHONE_STATE, BLUETOOTH. Untuk APK re-sign pihak ketiga, ini alasan tambahan untuk tidak menginstal di HP utama.

## 3. Arsitektur API (yang relevan buat DracinScraper)

- **Retrofit + OkHttp + Cronet (QUIC)**, factory di `com.dramawave.core.network.a`: `Retrofit.baseUrl(SigL360.d(41836))`.
- **Host API tidak ada dalam bentuk teks.** Semua string sensitif (base URL, domain cadangan, sebagian path/key) dienkripsi dan dibuka saat runtime oleh library native **`libSigL360.so`** (`com.SigL360.d(<index>)`, data di `assets/SigL360.dat`). Indeks penting: `41836` = base URL utama, `23523` = kunci domain cadangan. Pola yang sama seperti enkripsi string ModemCaps: membongkar host butuh reverse `libSigL360.so` + format `SigL360.dat` (kerja lanjutan terpisah, belum dikerjakan).
- **Rantai interceptor** (urutan di OkHttpClient): `ApiBackupHostInterceptor` → `DdnsInterceptor` (DDNS/host dinamis) → `BackupDomainInterceptor` → `ApiPathInterceptor` → `HeaderInterceptor` (header + signing) → `LoggingInterceptor` → `ErrorCodeInterceptor` → `GzipRequestInterceptor`. Jadi akses API butuh sesi + header hasil interceptor, bukan sekadar GET polos.
- **Login anonim tersedia**: `POST /anonymous/login` — sesuai pola provider lain (sesi tamu dibuat otomatis, diperbarui saat kedaluwarsa).

## 4. Endpoint (241 path Retrofit, teks terang)

Daftar lengkap: `docs/freereels-endpoints.txt`. Yang memetakan langsung ke kontrak DracinScraper (`search/detail/episodes`):

| Kebutuhan | Endpoint | Parameter kunci (dari signature) |
|---|---|---|
| Search | `POST /search/drama` (body) | — juga `/search/keywords`, `/search/suggestion`, `/search/hot-list-v2`, `/frv2-api/search/trending_searches` |
| Feed/home | `GET /homepage/v2/tab/index`, `/homepage/v2/tab/feed`, `/home/module/feed`, `/home/tab` | — |
| For You | `GET /foryou/feed`, `GET /foryou/open-series` | — |
| Ranking | `GET /homepage/rank`, `/homepage/v2/rank`, `/homepage/vip_series` | — |
| Detail series | `GET /drama/info_v2` | `series_id`, `scene`, `clip_content`, `campaign` |
| Download/info episode | `GET /drama/download`, `GET /drama/v2/download` | `id` |
| Unlock episode | `POST /drama/unlock_episode`, `/drama/batch_unlock_episode` | — |
| Harga | `GET /drama/price`, `/drama/multi_unlock/price` | `series_id`, `strategy_id` |

Model data (Gson `@SerializedName`, teks terang):

- `Series`: `episode_list`, `episode_info`, `episode_count`, `episode`, `desc`, `actors`, `content_tags`, `finish_status`, …
- `Episode` (`com.dramawave.shared.models.Episode`): **`m3u8_url`**, `external_audio_h264_m3u8`, `external_audio_h265_m3u8` (audio dub terpisah), `duration`, `id`, `name`, `free`, `episode_price`, `subtitle_list`, `sprite_urls` — persis field yang dibutuhkan penulis M3U kita (stream + durasi), plus penanda episode gratis/berbayar.
- Model download (`/drama/download`): `{ name, cover, episode_count, items[], download_num }`.

## 5. Kesimpulan buat DracinScraper

1. Provider FreeReels **layak dikerjakan setelah DramaBox**, dan blueprint-nya sekarang konkret: kontraknya `POST /search/drama` → `GET /drama/info_v2?series_id=` (ambil `episode_list[].m3u8_url` + `duration`) → M3U.
2. Dua pekerjaan prasyarat sebelum provider ini bisa live:
   - **Dekripsi SigL360** (base URL + domain cadangan) — reverse `libSigL360.so`/`SigL360.dat`, atau tangkap host dari lalu lintas perangkat asli.
   - **Replikasi sesi**: alur `/anonymous/login` + header dari `HeaderInterceptor` (kemungkinan ada signing; perlu dibaca lebih dalam saat implementasi).
3. Karena codebase-nya DramaWave, hasil kerja FreeReels kemungkinan besar membuka DramaWave juga (sudah ada di daftar 42 provider DramaBos).

## Artefak kerja

- `apk/freereels-2.3.40-mod.apk` (tidak di-commit, 68 MB)
- `apk/work/dex/all_strings.txt` (1,2 jt string), `apk/work/endpoints.txt`
- `apk/work/jadx-src/` (±400 MB sumber dekompilasi; dihentikan di ±92% — semua class aplikasi `com.dramawave.*` dan interface Retrofit `p032c4.*` sudah ter-dekompilasi, sisa yang belum selesai mayoritas SDK iklan pihak ketiga)
