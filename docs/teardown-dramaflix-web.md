# Teardown: DramaFlix (dramaflix.net) sebagai sumber provider — TIDAK LAYAK

Tanggal: 22 Okt 2026 · Metode: bedah statis bundle JS situs + probe anonim
(curl, Node fetch, browser nyata) · Status: riset selesai, provider TIDAK dibangun.

## Ringkasan vonis

DramaFlix adalah agregator (katalognya berasal dari platform sumber yang
sebagian sudah kita integrasikan langsung: PineDrama, ReelShort, FreeReels,
DramaBox, Melolo, NetShort, dll). API-nya terpetakan jelas, TAPI seluruh
`/api/*` dilindungi Cloudflare WAF yang memblokir klien otomatis/datacenter —
halaman HTML lolos, API tidak. Bahkan dari browser nyata, panggilan klien
(stream, komentar, saran pencarian) gagal dan pemutar tidak pernah menerima
stream, termasuk episode gratis. robots.txt situs sendiri menyatakan API
tertutup untuk bot. Menjadikannya provider server-side dari VM ini tidak
realistis tanpa melanggar pertahanan anti-bot mereka secara sengaja.

## Peta API (dari bundle JS publik)

- Katalog: `GET /api/series/<slug>`, `GET /api/series/<slug>/comments`,
  `POST /api/series/<slug>/view`, `GET /api/catalog/platform-status`,
  `GET /api/catalog/lang-counts`, `GET /api/catalog/hevc-ids`,
  `GET /api/site-settings`
- Alur putar: `GET /api/stream/prepare/<id>?ep=<n>` → `{state:"ready"}` →
  `GET /api/series/<slug>?playback=<ts>`; data stream:
  `GET /api/stream/<episodeId>?...` (+ `/api/stream/<episodeId>/renewal-status?locale=`);
  tiket CDN: `GET /api/cdn-ticket` (responsnya memasang izin CDN `dfl-media`)
- Akun/VIP: token Bearer (JWT) di localStorage `token` → header Authorization;
  `/api/auth/me`, `/api/auth/vip-status`, `/api/auth/favorites`,
  `/api/auth/history`, `/api/auth/redeem-code`, `/api/vip/order/`,
  `/api/vip/series/`
- Media: cover di `dramaflix.net/dfl-media/img/covers/<hash>/360.webp`,
  subtitle di `/dfl-media/sub/` (disallow di robots.txt)

## Struktur VIP (terverifikasi dari halaman episode)

- 15 episode pertama gratis; episode 16+ berlabel "khusus VIP" (ikon mahkota).
- Halaman episode VIP tetap terbuka tanpa login/modal — gerbangnya di level
  stream (server menolak menyiapkan stream tanpa status VIP), bukan di UI.
- VIP juga bisa ditebus dengan kode (`redeem-code`) dan ditautkan antar
  perangkat (`/api/app/device/link`, "VIP di TV ini").

## Hasil probe anonim (22 Okt 2026)

| Jalur | Hasil |
|---|---|
| curl halaman `/id`, `/id/drama/<slug>`, `episode-1` | 200, SSR Next.js penuh |
| curl `/api/catalog/platform-status`, `/api/series/<slug>` | 403 (halaman blokir Cloudflare) |
| Node fetch endpoint yang sama | 403 |
| Browser nyata: episode 1 (gratis) | Pemutar error "Sumber video sedang tidak merespons"; stream tidak pernah termuat; komentar & saran pencarian juga gagal |
| Browser nyata: episode 20 (VIP) | Halaman normal, tanpa modal bayar; error pemutar identik dengan episode gratis |

## Kesimpulan & arah yang benar

1. DramaFlix tidak bisa dipakai sebagai provider dari server kita: pertahanan
   Cloudflare-nya memang dirancang menolak pola akses ini, dan melewati
   gerbang VIP mereka berarti mengakali kontrol akses layanan berbayar —
   bukan jalur yang kita ambil.
2. Nilai DramaFlix bagi proyek ini adalah sebagai REFERENSI (sudah dipakai:
   pola UI + direktori platform di v0.7.0). Katalognya bukan sumber unik —
   judul yang sama tersedia di platform sumber.
3. Jalur praktis memperluas katalog DramaboxD = membangun provider sumber
   yang tersisa (NetShort berikutnya — jalur web terbuka, lihat
   `~/workspace/your_files/dracinscraper-sisa-roadmap-intel-2026-10-22.md`),
   bukan mengikis agregatornya.
