# Teardown APK Melolo 5.1.8 (MOD "Eksklusif VIP")

Tanggal: 22 Oktober 2026 · Metode: analisis statis (unzip, androguard, strings 13 DEX) + probe live terbatas. APK tidak dijalankan/diinstal.

## Identitas file

| | |
|---|---|
| File sfile | "Melolo - Drama Pendek v5.1.8 Latest Version MOD Eksklusif VIP Ramadhan Aktif.apk" (uploader: Destaseo Mods, 5 Mar 2026) |
| Ukuran | 85.824.404 byte |
| SHA-256 | `2474f5dcef5e1e4cc5bc4008266d16eff9a43e4aed8613bfc4b1ba3b459ddc10` |
| Package | `com.worldance.drama` |
| Versi | 5.1.8 (versionCode 51819), minSdk 23, targetSdk 35 |
| Aktivitas utama | `com.worldance.novel.pages.splash.SplashActivity` |

## Asal codebase: platform novel+drama ByteDance ("i18n_novel")

Berbeda total dari FreeReels (DramaWave). Melolo dibangun di atas platform baca/video ByteDance untuk pasar internasional:

- Package aplikasi `com.worldance.*` dengan modul `novel` + `drama` menyatu (aset `book_*`, `chapter_*`, epub/txt — aplikasi ini memang novel DAN drama).
- API bergaya **RPC ByteDance**: 106 endpoint beranotasi `$GET/$POST` (daftar lengkap: `docs/melolo-endpoints.txt`), model protobuf (`com.bytedance.rpc.model.EpisodeInfo`), UI sebagian Lynx.
- `app_id=645713`, `app_key=android` (dari URL bawaan aplikasi).
- SDK ByteDance lengkap: TTNet/Cronet (`libsscronet.so`), APM/isnssdk, Pangle.

## MOD / tanda tangan: re-sign pihak ketiga

APK membawa **dua sertifikat**:

1. `CN=DramaGrid, O=POLIGON PTE. LTD., Singapore` — tampak sebagai sertifikat pengembang asli.
2. `CN=np, Nanjing, Jiangsu, CN` — self-signed generik.

keytool melaporkan error digest SHA-256 untuk AndroidManifest.xml → manifest tidak cocok dengan tanda tangan asli: file ini **sudah diutak-atik dan di-sign ulang**. Klaim MOD di judul sfile = "Eksklusif VIP Ramadhan Aktif" — status VIP hasil patch tidak diverifikasi (analisis statis); SDK iklan lengkap tetap ada di dalam.

## API

- **Host: `https://api.tmtreader.com`** (teks terang di DEX, tanpa enkripsi ala SigL360).
- Keamanan transport ditangani **MetaSec** (`libmetasec_ov.so`): header `X-Argus`, `X-Gorgon`, `X-Khronos`, `X-Ladon`, `X-SS-STUB` — tanda tangan anti-bot native ByteDance, kelas berat (jauh di atas MD5 FreeReels).

Endpoint kunci untuk DracinScraper:

| Fungsi | Endpoint |
|---|---|
| Search | `GET /i18n_novel/search/page/v1/` (`query`, `offset`, `count`) + `/search/suggest/v1/`, `/search/front_page/v1/` |
| Detail | `GET /i18n_novel/book/books/detail/` |
| Daftar episode | `GET /i18n_novel/book/directory/info/v1/` (`book_id`) → `item_list` (ID item) + `paid_item_id_set` |
| Stream | `POST /novel/player/video_model/v1/`, `/novel/player/video_detail/v1/`, varian `multi_*` |
| Discovery | `GET /i18n_novel/bookmall/tab/v1/`, `/bookmall/plan/v1/`, `/bookmall/outer/book_rank/` |

## Probe live (22 Okt 2026, dari VM ini) — pintu TIDAK tertutup rapat

Parameter umum minimal yang teramati cukup untuk sebagian endpoint: `app_id=645713&version_name=5.1.8&device_id=<angka>`.

| Endpoint | Hasil tanpa header MetaSec |
|---|---|
| `GET /i18n_novel/search/page/v1/?query=love&offset=0&count=10` | ✅ **code 0, hasil asli** (search_data → books: book_id, book_name, author, thumb_url, abstrak, serial_count, …) |
| `GET /i18n_novel/book/directory/info/v1/?book_id=…` | ✅ **code 0** — book_info + item_list 86 episode + paid_item_id_set (kosong untuk buku uji) |
| `GET /i18n_novel/book/books/detail/?book_id=…` | ⚠️ code 4000 PARAM_INVALID — nama parameter belum tepat |
| `GET /i18n_novel/bookmall/tab/v1/` | ❌ code 1050007 `BOOKMALL_RISK_CONTROL_ERROR` — risk control aktif di sini |
| `POST /novel/player/video_model/v1/` (body JSON tebakan) | ⏳ respons kosong/timeout — kemungkinan butuh body RPC (protobuf/thrift), bukan JSON polos |

## Penilaian untuk provider DracinScraper

- **Search + daftar episode SUDAH bisa live tanpa tanda tangan** — separuh pipeline terbukti jalan persis seperti FreeReels kemarin.
- Struktur data cocok dengan model internal DracinScraper: book ≈ seri (book_id/book_name/thumb_url/abstract), item ≈ episode (item_id + urutan dari item_list).

## UPDATE 22 Okt 2026 (sore) — video_model TUNTAS, stream didapat

Penggalian JADX (classes10/11.dex) menemukan layanan RPC-nya:
`seriessdk/com/dragon/read/saas/rpc/rpc/PlayerApiService` — serialisasi **JSON** (`o0.JSON`, Gson), bukan protobuf. Konstruksi request persis dari call site aplikasi (`oO00oOO080/oO.OOo`):

```
POST https://api.tmtreader.com/novel/player/video_model/v1/?app_id=645713&version_name=5.1.8&device_id=<angka>
Content-Type: application/json

{"video_id": "<item_id dari directory>",
 "biz_param": {"video_platform": 1024,          // enum VideoPlatformType.Mixed (int!)
               "need_all_video_definition": true,
               "use_os_player": false,
               "video_id_type": 0,               // enum VideoSeriesIdType.VideoId (int!)
               "caller_scene": "series"}}
```

Catatan: enum WAJIB integer — varian nama string ("Mixed"/"VideoId") dibalas kosong oleh server. `NovelCommonParam` boleh kosong.

**Respons** `{code: 0, data: {video_model: "<string JSON>", expire_time, video_width/height}}`. String `video_model` (model TTVideoEngine) berisi:

- `video_list`: dict `video_2..video_5` per definisi (360p–720p) → `main_url` **ter-encode base64** (decode = URL MP4 di `v16-ml.melolostatic.com`), `backup_url_1`, `codec_type: bytevc1`, flag `encrypt: true`
- `video_duration` (detik, float), `poster_url`, `fallback_api` (VOD ByteIntl), `url_expire`

**Terverifikasi live penuh**: seri uji "Learning To Love 2" (86 ep) — ep 1, 2, 41, 86 semua code 0; file MP4 ep 1 terunduh HTTP 200 (4,3 MB, header MP4 valid `ftypisom` + moov terbaca). Alat uji: `tools/melolo-live-test.py`.

Perbedaan penting vs FreeReels: stream Melolo = **MP4 langsung** (bukan HLS m3u8), codec bytevc1 (varian H.265 ByteDance — dukungan player di luar aplikasi bervariasi). Untuk M3U, URL MP4 tetap sah sebagai entri playlist; durasi dari `video_duration`, snapshot episode tidak ada per item (poster_url = poster seri per video_model).

Sisa untuk implementasi provider: petakan search/directory/video_model ke kontrak DramaProvider (detail bisa dari book_info directory — endpoint `books/detail` yang PARAM_INVALID tidak lagi kritis), hormati jeda antar request (86 episode = 86 panggilan video_model).
