# Tes Live API FreeReels — JALAN PENUH (22 Okt 2026)

Lanjutan `docs/dekripsi-sigl360.md`. Semua request di bawah ditembak langsung
dari VM ini ke `https://apiv2.free-reels.com` dan dibalas sukses.

## Resep sesi (hasil bongkar source)

**Login anonim** — `POST /frv2-api/anonymous/login`

- Body: `{"device_id": <UUID>, "device_name": "<BRAND> <MODEL>", "sign": ...}`
  - `device_id`: UUID (DeviceIdManager: UUID persisten / GAID — format UUID yang divalidasi server)
  - `device_name`: `Build.BRAND + " " + Build.MODEL` (DeviceUtils.a())
  - `sign` = `md5_hex("8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv" + device_id)`
    (dari disassembly `LoginViewModel$d.invokeSuspend` di classes10.dex +
    `toolkit/B.a()` = MD5 hex; konstanta kunci = SigL360 indeks 13260)
- Header perangkat lengkap ala HeaderInterceptor **wajib** — yang bikin
  percobaan awal gagal `{"code":400,"message":"Invalid parameters"}` adalah
  header yang kurang (terutama `app-name: com.freereels.app`, `app-version: 2.3.40`,
  `device-id`, `session-id`, `x-device-*`, `language`, `device`, dll).
  Set lengkapnya ada di `tools/freereels-live-test.py`.
- Balasan: `data = {user_id, name:"Guest", auth_key, auth_secret}` —
  `auth_key` = oauth_token, `auth_secret` = oauth_secret.

**Header Authorization** (semua request selain login):

```
oauth_signature=<md5_hex("8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv&" + auth_secret)>,oauth_token=<auth_key>,ts=<millis>
```

(HeaderInterceptor: kunci tanda tangan = SigL360 indeks 67308 =
`8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv&`, digabung oauth_secret, di-MD5 via `p040d1/e.a`.)

## Hasil tes (semua HTTP 200, code 200)

| Endpoint | Hasil |
|---|---|
| `POST /anonymous/login` | sukses, sesi Guest + auth_key/secret diterbitkan |
| `POST /search/hot-list-v2` body `{next, timestamp}` | 20 item seri + page_info |
| `POST /search/drama` body `{keyword, next, timestamp}` | 20 item, paginasi `next=offset=20&page_size=20` |
| `GET /search/trending_searches` | daftar seri trending |
| `GET /drama/info_v2?series_id=xuyr3DtXPt` | "Passionate Love": `episode_list` 81 episode (id, cover, duration, episode_price) + objek `episode` yang sedang tayang |

**m3u8 bisa diputar:** episode 1 (unlock=true) membawa
`external_audio_h264_m3u8` di host `video-v6.mydramawave.com` — isinya master
playlist HLS valid (varian 540x960 / 720x1280 / 1080x1920 + grup audio).
Field `m3u8_url`/`video_url` pada seri ini kosong; yang terisi varian
external-audio (h264/h265). Episode terkunci: URL kosong, `episode_price` 60.

## Lapisan unlock — TERJAWAB (tes lanjutan, 22 Okt 2026)

Dugaan "episode_list cuma lapisan pertama" BENAR. Arsitekturnya:

- `info_v2` → `episode_list` = **metadata saja**: URL selalu kosong dan
  `episode_price` ditampilkan, apa pun status putarnya.
- URL putar diambil **per episode** lewat
  `GET /drama/info_push_v2?series_id=<id>&episode_key=<episode_id>`
  → objek `episode` dengan `unlock` + `external_audio_h264_m3u8` terisi.
  Terverifikasi untuk episode 5, 20, 40, dan 81 (finale) dari
  "Passionate Love": semuanya `unlock=true` dan playlist-nya valid
  (`#EXTM3U` multi-bitrate). Durasi tetap diambil dari `episode_list`
  (objek episode di info_push_v2 tidak membawa durasi).
- `POST /drama/unlock_episode` body
  `{series_id, episode_id, auto_unlock, check_auto_unlock, diamond_auto_unlock, check_diamond_auto_unlock}`
  juga mengembalikan objek Episode yang sama (URL terisi) untuk sesi Guest.
- Kenapa gratis: seri ini `pay_mode = IAA` (iklan) dengan jendela free lebar
  (`free_start`/`free_end`) — label harga 60 koin di daftar ternyata kosmetik.
  Seri dengan pay_mode koin murni mungkin tetap menagih saldo di
  `unlock_episode`; mekanismenya sama.
- Bukan ini jalurnya: `GET /drama/download` = fitur unduh offline
  (Guest: `403 Permission denied`), `GET /drama/v2/download` balas error
  server untuk id seri/episode.

## Yang masih terbuka

- `GET /homepage/v2/tab/index` masih 400 (butuh `tab_key` dari
  `/homepage/v3/tab/list` dulu, kemungkinan) — tidak kritis; jalur
  search → info_v2 → info_push_v2 per episode sudah cukup buat
  scrape → M3U penuh satu seri.

## Perkakas

`tools/freereels-live-test.py` — reproduksi mandiri (bikin sesi tamu baru
tiap jalan, tanpa kredensial tersimpan): login → hot-list → search → info_v2.
