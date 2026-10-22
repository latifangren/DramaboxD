# DrakorKu 5.1.2 "MOD NO ADS" (Bayu Stecu) — Catatan Teardown

APK dari link sfile yang dikirim user 22 Okt 2026. Analisis statis + probe API
live; APK tidak diinstal/dijalankan. **Catatan cakupan: ini aplikasi DRAKOR
(drama Korea sub Indo), bukan dracin** — di luar roadmap provider DracinScraper,
tapi arsitektur API-nya paling terbuka dari semua app yang dibedah sejauh ini.

## Identitas

| | |
|---|---|
| File | `DrakorKu_V5.1.2_MOD_NO_ADS_By_Bayu_Stecu__SFILE.MOBI_.apk`, 16.590.937 byte |
| SHA-256 | `453205614705e2f4589ab73c051042b550085d4a4f0e97a654161e58c6620eec` |
| Package | `com.drakorku.dramakoreasubindo` |
| Versi | 5.1.2 (versionCode 5), minSdk 23, targetSdk 36 |
| Nama app | **"DrakorKu MOD"** — label MOD tertanam di APK itu sendiri |
| Sertifikat | kunci publik generik AOSP (`android@android.com`, CN=Android) — bukan sertifikat developer asli |
| Uploader | Bayu Stecu (21 Okt 2026); classes3.dex & classes4.dex bertimestamp **2026-10-21** (segar — hasil modifikasi/repack terakhir), DEX lain 1981 (epoch zip) |

## Isi & asal codebase

- 5 DEX (~28MB) + 1 lib native (`librtmp-jni.so` — buat fitur Live TV/RTMP).
- Kode app sendiri kecil & rapi: `com.drakorku.dramakoreasubindo` (activities/
  adapters/config/databases/fragments/models/**rests**/utils).
- Backend = panel PHP generik **"Your Videos Channel"** (header khas
  `Data-Agent: Your Videos Channel`) — panel admin streaming yang dipakai
  banyak app streaming lokal; app ini cuma klien tipisnya.
- Monetisasi: AppLovin MAX + Meta Audience Network
  (`assets/audience_network.dex`) + belasan partner mediasi di string.
  Di `AppConfig`, ID banner/inter AppLovin **kosong** (`""`), native terisi —
  konsisten dengan klaim "NO ADS" diatur dari panel (`ads/settings`
  mengembalikan `ad_status` yang bisa dimatikan server-side). Klaim bebas
  iklan total tidak diverifikasi dari statis saja.

## API — teks terang, TANPA signing/enkripsi sama sekali

Konfigurasi di `config/AppConfig.java` (kelas app, dari classes3.dex):

- **Base URL: `https://kampretloh.top/v3/`** (`ADMIN_PANEL_URL`; bisa dioverride
  remote lewat SharedPref `webbase` — panel app semacam ini memang sering
  ganti domain)
- **API key (klien, tertanam di app):**
  `cda11y63tfI7rwln8BLeiKTvjsD5g2Mox01RzkhQCEXSGWbqYO`

`rests/RestAdapter.java` menambahkan dua header yang **wajib** — tanpa ini
server membalas HTTP 200 body kosong:

- `User-Agent: Dalvik/7.1.12.1.0 (com.drakorku.dramakoreasubindo U; Android ; 20175 Build/NMF260)`
- `Accept: application/vnd.yourapi.v1.full+json`
- plus per-endpoint: `Data-Agent: Your Videos Channel`, `Cache-Control: max-age=0`

### Endpoint (Retrofit `rests/ApiInterface.java`)

| Endpoint | Fungsi |
|---|---|
| `GET api/get_package_name` | bootstrap/verifikasi package |
| `GET api/get_videos?page&count&api_key` | daftar episode terbaru (semua seri campur) |
| `GET api/get_search_results?user_search&count&api_key` | pencarian |
| `GET api/get_category_videos?id&page&count&sort&api_key` | episode per seri (id = cid) |
| `GET api/get_category_genre`, `api/get_genre_index` | kategori & genre |
| `GET api/get_post_detail?id&cat_id&user_search` | detail episode + URL stream |
| `GET api/get_post_detail_category_drakor?cid&...` | detail per seri |
| `GET api/get_tv?api_key` | channel Live TV (RTMP/HLS) |
| `GET api/get_user_token?user_unique_id` | token user |
| `GET ads/settings?package_name&api_key` | konfigurasi iklan (terverifikasi balas JSON) |
| `config/get_category_rating.php`, `config/save_category_rating.php` (POST) | rating per seri |
| `register.php`, `config/backup_data.php`, `config/restore_data.php`, `req.php` | token FCM, backup favorit, request judul |

Daftar lengkap: `docs/drakorku-endpoints.txt`.

## Probe live (22 Okt 2026, dari VM) — SEMUA JALAN

Dengan header lengkap di atas:

- `api/get_package_name` → `{"package_name":"com.drakorku.dramakoreasubindo"}`
- `api/get_videos?page=1&count=3` → `status ok`, **`count_total: 57382` video** —
  katalog 57 ribu episode. Item contoh: "Where The Mask Ends Eps 15",
  `video_url` = **MP4 langsung** `http://rambutan.whatbox.ca:28835/Mantap/WhereTheMaskEnds/15.mp4`
  (host seedbox Whatbox), thumbnail dari CDN MyDramaList (`i.mydramalist.com`).
- `api/get_category_videos?id=3730` → seri "Where The Mask Ends": 15 episode,
  rating 8.3, tahun 2026, genre "Historical, Romance", gambar + trailer MP4.
- `api/get_post_detail?id=57930` → detail episode lengkap dengan URL MP4 yang sama.

### Model data

- **Category (cid) = satu seri drakor** (judul, poster MyDramaList, rating,
  tahun, genre, status OnGoing/Complete, trailer).
- **Post/Video (vid) = satu episode** (judul "… Eps N", `video_url` MP4
  langsung + varian `video_url_hd`/`video_url_eng` bila ada, thumbnail,
  total_views, date_time).
- Tidak ada konsep "terkunci" — tidak ada paywall di level API; semua URL
  stream terekspos ke siapa pun yang memegang API key klien di atas.

## Penilaian

Dari sisi keterbukaan, ini target termudah sejauh ini: nol enkripsi, nol
signing, nol sesi — cukup base URL + API key + dua header. Provider
DrakorKu (di luar DracinScraper, atau sebagai modul drakor terpisah) bisa
dibangun persis pola provider lain: search = get_search_results, katalog seri
= get_category_genre/get_category_videos, episodes = get_category_videos per
cid, stream = video_url apa adanya. Sesuai instruksi user ("analisa dulu"),
provider BELUM dibangun.

Risiko keberlanjutan: domain panel (`kampretloh.top`) dan host file
(seedbox) gampang berganti; app mengantisipasinya lewat override `webbase`.
