# LokLok 1.3.0.3000 "VIP/Premium" (Karina) — Catatan Teardown

APK dari link sfile yang dikirim user 22 Okt 2026. Analisis statis saja; APK
tidak diinstal/dijalankan. **Verdict: tembok proteksi ganda — analisis statis
tidak bisa mencapai API.** Ini app pertama dari 5 yang dibedah yang berhenti
di tahap teardown.

## Identitas

| | |
|---|---|
| File | `LokLok_v1.3.0.3000_VlP__Premium__SFILE.MOBI_.apk`, 83.770.916 byte |
| SHA-256 | `d3ed951d2b6766cbb5234c4dd60def3fb1486801c9829dc3ebac84b92160ce68` |
| Package | `com.kosmo.trum` |
| Versi | 1.3.0 (versionCode 130), nama app "Loklok" |
| Main activity | `com.kosmo.trum.module_home.HomeActivityNew` |
| Sertifikat | CN=**dpt** (kunci bawaan packer DPT-Shell — re-sign total) |
| Uploader | Karina, 21 Okt 2026 |

LokLok = aplikasi agregator streaming film/drama/anime yang besar di Asia
Tenggara; katalognya campuran (bukan khusus dracin/drakor).

## Proteksi — DUA lapis packer

1. **DPT-Shell** (sertifikat CN=dpt; `com.kosmo.trum.shell.ProxyApplication` +
   `JniBridge`): seluruh DEX asli terenkripsi; saat runtime diekstrak ke
   folder `dpt-libs/` dan dimuat lewat proxy application. `JniBridge`
   memuat `lib830f622c2304076e.so` secara native.
2. **NP Manager ApkDex2C-Pro v3.1.40** (`assets/protected_by_np/
   ApkDex2CPro_*.txt`, ProtectTime 2026-10-19 19:49:04; runtime
   `libpglarmor.so`): method-method penting dikompilasi dex→C (native),
   string dienkripsi (`assets/a.json` = array byte terenkripsi;
   `libsigner.so` 945KB untuk signing request di native).

### Bukti temboknya

- `classes.dex` tunggal **79MB**, tapi hasil JADX hanya **5 kelas shell**
  (ProxyApplication, ProxyComponentFactory, JniBridge, MainActivity, a, b)
  — sisanya payload terenkripsi, bukan kelas yang bisa dibaca.
- Strings 583 ribu baris dari DEX: host konten NOL — yang muncul hanya SDK
  iklan (PubNative/HyBid, AppLovin, Meta Audience Network di
  `assets/audience_network/`), Google, dan referensi tipe `com.kosmo.trum.*`
  (net/request, net/response, net/netease, routes, module_home, dst.) tanpa
  isi method/URL.
- Strings `libpglarmor.so`: tidak ada URL API (terenkripsi juga).
- `assets/components.json` & `supplierconfig.json`: hanya konfigurasi SDK
  iklan (zmaticoo + app-id store OEM Tiongkok: vivo/xiaomi/huawei/oppo).
- Pencarian web untuk dokumentasi API LokLok versi ini: tidak ada hasil yang
  relevan (hasil pencarian tertukar dengan loklak/Loki).

## Yang masih bisa disimpulkan

- Struktur modul app (dari referensi tipe): `module_home`, `net` (request/
  response terpisah, ada sub-paket `netease`), `routes` (ARouter), `config/ab`
  (A/B test), `ad` (lapisan iklan sendiri). Arsitektur app modern modular —
  konsisten dengan LokLok resmi.
- Klaim "VIP/Premium" pada MOD tidak bisa diverifikasi dari statis: logika
  entitlement-nya ikut terkompilasi native/terenkripsi bersama sisanya.

## Jalur yang tersisa (di luar analisis statis)

1. **Runtime dump**: jalankan di perangkat/emulator root, dump DEX hasil
   dekripsi DPT dari memori (Frida/dumper), lalu ulangi teardown seperti
   biasa. Dex2C tetap menyisakan method native, tapi URL/endpoint biasanya
   ikut di DEX hasil dump. Butuh perangkat — tidak bisa dari VM ini.
2. **Cari build LokLok lain yang tidak diproteksi** (versi lebih lama /
   sumber lain tanpa Dex2C+DPT) — pola 4 app sebelumnya: MOD dari rantai
   distribusi lain sering polos.
3. Lewati dulu — katalog LokLok tumpang tindih dengan sumber yang sudah
   jadi provider (FreeReels/Melolo/PineDrama/DrakorKu).

Sesuai pola sesi: provider TIDAK dibangun (belum ada API yang terpetakan).
