# ReelShort — Riset Jalur Web (TANPA APK)

Riset 22 Okt 2026 atas permintaan user ("Apa belum reelshort?"). Sumber:
repo komunitas **Youssefzdb/reelshort-api-docs** (dokumentasi web API,
contoh klien Python terverifikasi-versi-live menurut penulisnya),
AmmarrBN/reelshort-api ⭐17, wanglinsaputra/Rest-Api-ReelShort ⭐3,
AmmarrBN/dracinviewer ⭐9.

**Kaitan proyek:** contoh format M3U asli user memakai URL `-sd.m3u8` dari
CDN `v-mps.crazymaplestudios.com` — itu CDN ReelShort (Crazy Maple Studio).
ReelShort boleh jadi sumber contoh itu.

## Arsitektur web API (dari dokumentasi komunitas)

- Situs Next.js; API **same-origin**: `https://www.reelshort.com/api`
  (tidak ada host API terpisah di bundle produksi).
- CDN media: video `v-mps.crazymaplestudios.com`, gambar
  `v-img.crazymaplestudios.com`.
- Header wajib tiap panggilan: `apiVersion: 1.0.4`, `channelId: WEB41001`
  (desktop) / `WEB42001` (mobile), `clientVer: 2.4.00`, `devId` (12 char acak
  + epoch ms, persisten), `lang` (en/ar — ikut menandatangani & melokalkan
  katalog), `session` ("" = anonim), `ts` (detik unix), `uid: 0`.
- **Signing: HMAC-SHA256** atas string kanonik `k=v&k=v…` (gabungan body +
  header umum, nilai kosong dibuang, kunci terurut naik, objek di-JSON-kan).
  Secret-nya tertanam di bundle JS publik — hanya membuktikan "bentuk
  klien", bukan entitlement. (Nilai secret sengaja tidak disalin ke repo
  ini; ambil dari repo dokumentasi di atas / bundle situs.)
- Sebagian respons terenkripsi: **AES-128-CBC (PKCS7) → base64 → zlib
  inflate → JSON**, pasangan key/iv tertanam di bundle (dua pasang
  terdokumentasi di repo sumber).
- Kode respons: 0 sukses; 101 = sesi/login wajib; 104 validasi; 403; 405.

## Endpoint konten (tanpa sesi)

| Method | Path | Fungsi |
|---|---|---|
| POST | `/api/ms/hall/webInfo` | feed home (banner, tab, daftar, chapter_count) |
| POST | `/api/ms/hall/webBookShelfPage` | halaman bookshelf |
| POST | `/api/ms/hall/webNewReleaseBooks` | rilis baru |
| POST | `/api/video/search/webSearch` | search `{word, page}` |
| GET | `/api/video/book/getBookInfo?book_id=` | detail seri + `online_base[]` (indeks chapter lengkap) |
| GET | `/api/video/book/getChapterInfo?book_id=&chapter_id=` | metadata episode **termasuk `video_url` (m3u8)** |
| GET | `/api/video/book/getFreeChapter` | payload episode gratis |
| GET | `/api/video/book/getTagList?language=` | taksonomi tag |
| GET | `/api/video/book/getTagBook` | seri per tag (paginasi) |

Session-gated (code 101 bila anonim): `getChapterList`, `getChapterContent`,
`getRecommendBook`, riwayat/koleksi user.

## Alur resolusi konten

```
/movie/<slug>-<book_id>  (SSR __NEXT_DATA__: online_base[] = semua chapter_id)
  -> GET getChapterInfo -> data.video_url (HLS m3u8 di v-mps)
Jalan pintas SSR: /episodes/episode-<n>-<slug>-<book_id>-<chapter_id>
  -> __NEXT_DATA__.props.pageProps.data.video_url
```

## Status probe dari VM ini — TERVERIFIKASI LIVE (22 Okt 2026, update malam)

- Percobaan pertama: klien referensi Python **urllib gagal di lapisan
  jaringan** (TLS putus saat membaca respons — blokir fingerprint seperti
  PineDrama).
- **Probe ulang memakai Node fetch BERHASIL PENUH** (tool:
  `tools/reelshort-web-probe.cjs`; detail di
  `docs/teardown-reelshort-4.1.00.md`):
  - `webInfo` code 0; `webSearch` code 0 setelah dekripsi amplop
    (AES-128-CBC → **base64 lagi** → zlib → JSON — langkah base64 di tengah
    adalah bagian yang tidak tertulis jelas di ringkasan README).
  - `getBookInfo` wajib `book_id` **hex 24-char** (bukan `t_book_id`
    numerik dari search — itu ditolak code 502).
  - `getChapterInfo` ep 1/10/31/51 pada judul uji: semua memberi
    `video_url` m3u8 di `v-mps.crazymaplestudios.com/vod-112094/…` +
    durasi, sesi anonim, tanpa kunci sampai episode terakhir.
- Provider siap dibangun dari resep ini; menunggu aba-aba user.
