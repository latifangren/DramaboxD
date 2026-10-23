# Teardown: FlickReels (www.flickreels.net) — jalur WEB

Tanggal: 22 Okt 2026 · Metode: bedah payload SSR + probe live Node fetch/curl
· Status: provider DIBANGUN & live terverifikasi (DramaboxD v0.9.0).

## Ringkasan

FlickReels adalah situs **Nuxt SSR** (bukan Next). Tidak ada API JSON yang
dipakai halaman — semua data tertanam di HTML:

1. **Payload `__NUXT_DATA__`** (format *devalue*): array JSON datar; objek =
   keymap `{field: indeks}`, nilai sebenarnya di `payload[indeks]` (primitif,
   keymap lain, atau array indeks). Resolusi dua tingkat cukup untuk semua
   kebutuhan provider.
2. **JSON-LD `VideoObject`** di halaman episode: `contentUrl` (m3u8
   bertanda tangan), `duration` ISO 8601, `thumbnailUrl`, sinopsis.

## URL & ID

- Seri: `/playlist/<slug>/<playletId>/episode-<n>` — **slug wajib benar**
  (slug asal → 404). Karena itu ID provider = `"<slug>/<playletId>"`
  (preseden: PineDrama memakai slug sebagai ID).
- Slug untuk sebuah ID diambil dari href kartu di halaman katalog/search.

## Model data (dari halaman episode mana pun — payload memuat data seri penuh)

- Seri (keymap ber-`list` + `start_pay_num`): `playlet_id`, `title`, `cover`,
  `upload_num` (total episode), `introduce` (sinopsis), `tag_name`,
  **`start_pay_num`** = episode pertama berbayar (judul uji: 10).
- Episode (`list[]`): `chapter_id`, `chapter_num`, **`is_lock`** (0/1),
  `chapter_cover` (snapshot), `chapter_title`, `duration` (detik, number).
- Konsisten dengan perilaku halaman: episode terkunci tidak memuat
  `contentUrl` di JSON-LD-nya.

## Stream

- Per episode tak terkunci: buka halaman episodenya → JSON-LD `contentUrl`
  = m3u8 bertanda tangan di `*.farsunpteltd.net/playlet-hls/` (token
  `verify=<expiry>-<sig>`). Terverifikasi: playlist HLS valid + segmen TS.
- Katalog: `/classify` (paginasi `?page=N`, ±12 kartu/halaman), beranda `/`
  (seksi pilihan), pencarian `/search?keyword=<q>` — semuanya SSR dengan
  kartu keymap `playlet_id/title/cover/upload_num` di payload yang sama.

## Kunci dihormati

Episode `is_lock: 1` tidak pernah dimintakan streamnya; judul uji
"Daddy's Little Savior" (14288, 58 episode): **9 tertulis, 49 terkunci**
tercatat di laporan scrape.

## Bukti live (22 Okt 2026)

- latest/search mengembalikan kartu dengan ID komposit + jumlah episode.
- Scrape judul uji: 9/58 episode dalam ~5,5 detik; M3U berisi durasi asli,
  snapshot per episode, dan URL HLS bertanda tangan.

## Berkas terkait

- Provider: `src/integrations/providers/flickreels/{client,index,normalize}.ts`
- Fixture/test: `fixtures/flickreels-sample.json`, `test/flickreels-normalize.test.ts`
- Env: `FLICKREELS_SITE_BASE` (default `https://www.flickreels.net`)
