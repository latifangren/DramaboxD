# ReelShort "Premium v4.2.20 (VIP Unlocked)" (BALAX) — Catatan Teardown + Jalur Web

APK dari link sfile yang dikirim user 22 Okt 2026 (user menjawab sendiri
pertanyaan "Apa belum reelshort?" dengan APK-nya). Analisis statis + probe
live jalur web; APK tidak diinstal/dijalankan.

**Verdict ganda:** (1) APK-nya terproteksi packer — teardown statis aplikasi
berhenti seperti LokLok; (2) **jalur WEB ReelShort terbukti live penuh** dari
VM ini (search → detail → chapter → `video_url`), jadi provider tetap bisa
dibangun tanpa APK. Lihat `docs/riset-reelshort-web.md` (diperbarui).

## Identitas APK

| | |
|---|---|
| File | `ReelShort_Premium_v4.2.20__Vip_Unlocked_____SFILE.MOBI_.apk`, 79.712.825 byte |
| SHA-256 | `fa47662e1002586d29a4431ba4a59a9ad93efab950881fa3805d8aceb0eb02a2` |
| Package | `com.newleaf.app.android.victor` (ReelShort asli, New Leaf/Crazy Maple) |
| Versi SEBENARNYA | **4.1.00 (4100)** — nama file "v4.2.20" digelembungkan |
| Sertifikat | **CN=NextShort, O=NextShort, Seattle** — BUKAN sertifikat Crazy Maple; re-sign pihak ketiga (rantai "NextShort") |
| Uploader | BALAX, 21 Okt 2026 |

## Proteksi aplikasi: SecShell

- `classes.dex` tunggal 74,5MB ternyata **shell**: hanya 514 kelas, NOL kelas
  `com.newleaf.*` (androguard). Sisanya payload terenkripsi.
- Jejak packer: `lib/arm64-v8a/libSecShell.so` + `libSecShell-x86.so`,
  `libprotect.so`, dan `assets/meta-data/{manifest.mf, rsa.sig, rsa.pub}`
  (metadata khas **SecShell** — packer komersial yang memang dipakai build
  produksi Crazy Maple; jadi proteksi ini kemungkinan bawaan resmi, bukan
  tambahan modder).
- Strings DEX tetap memberi peta kasar: host API aplikasi
  `v-api.crazymaplestudios.com`, CDN `v-mps.crazymaplestudios.com`, dan
  keluarga endpoint yang sama dengan web (`api/video/book/getBookDetail(V)`,
  `getChapterList`, `getChapterContent`, `api/ms/hall/infoV4`,
  `hallWaterfallPagesV4`, `bookShelfPageV4`, `getBooksBySearchBar`,
  `getBooksByTagV4`, `getRankV4`) — tapi logika request/signing ikut
  terenkripsi di dalam shell.
- Klaim "VIP Unlocked" **tidak terverifikasi** (logika entitlement di dalam
  payload terenkripsi).

## Jalur web — TERVERIFIKASI LIVE PENUH (22 Okt 2026, via Node)

Mengikuti dokumentasi komunitas (Youssefzdb/reelshort-api-docs) dan tool
`tools/reelshort-web-probe.cjs`:

- Transport: **Node fetch lolos; Python urllib putus TLS** (pola PineDrama).
- Signing HMAC-SHA256 atas payload+header umum; secret tertanam di bundle JS
  publik situs (bukan rahasia server). Header: apiVersion 1.0.4, channelId
  WEB41001, clientVer 2.4.00, devId acak persisten-format, lang, ts, uid 0,
  session "" (anonim).
- Amplop terenkripsi search: AES-128-CBC → plaintext base64 → zlib → JSON
  (langkah base64 di tengah itu kunci yang sempat menggagalkan dekripsi).
- Hasil probe (semua `code: 0`):
  - `POST /api/ms/hall/webInfo` → feed home 278KB (tab_list, 13 lists)
  - `POST /api/video/search/webSearch {word:"love"}` → `data.lists[]`
    (judul, cover v-img, tema, sinopsis)
  - `GET /api/video/book/getBookInfo?book_id=<hex>` → detail + `online_base[]`
    **51 chapter** (chapter_id, serial_number, video_pic snapshot di v-mps).
    ⚠️ ID yang diterima = `book_id` hex 24-char; `t_book_id` numerik dari
    hasil search ditolak (code 502). Buku punya dua ID — pakai yang hex.
  - `GET /api/video/book/getChapterInfo` ep 1/10/31/51 → **semua memberi
    `video_url`** di `v-mps.crazymaplestudios.com/vod-112094/…` (persis CDN +
    vod-id contoh M3U asli user) + durasi per episode (283/132/60/89 detik).
    Sesi anonim; pada judul uji ini tidak ada episode terkunci yang
    ditemukan sampai episode terakhir.

## Penilaian

ReelShort bisa jadi provider lewat jalur web — tanpa membongkar SecShell.
Resepnya sudah terverifikasi ujung-ke-ujung; tinggal implementasi pola
provider biasa (client Node fetch + signing + dekripsi amplop). Sesuai pola
sesi ("analisa dulu"), provider BELUM dibangun — menunggu aba-aba user.
