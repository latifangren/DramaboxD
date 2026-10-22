# Dekripsi SigL360 — Base URL FreeReels KETEMU

Hasil reverse `libSigL360.so` (Ghidra 12.1.4 headless) + dekripsi penuh
`assets/SigL360.dat`. Lanjutan dari `docs/teardown-freereels-2.3.40.md`.

## Temuan utama

| Indeks | String |
|---:|---|
| 41836 | **`https://apiv2.free-reels.com`** ← base URL API (dipakai `Retrofit.baseUrl(SigL360.d(41836))`) |
| 86389 | `https://apiv2.fr` (konstanta prefiks, terkait mekanisme domain cadangan) |
| 68374 | `https://apiv2.free-reels.com/frv2-api/risk/sm/proxy` |
| 13508 | `https://trace.free-reels.com` (telemetri) |
| 4073 | `https://free-reels.com` (web) |
| 24363/24364 | `https://m.mydramawave.com` / `https://m-test.mydramawave.com` (brand saudara DramaWave) |

**Prefix path:** interceptor `ApiPathInterceptor` menambahkan **`/frv2-api`** di depan
path Retrofit. Bukti live (22 Okt 2026, dari VM ini):

- `POST https://apiv2.free-reels.com/frv2-api/anonymous/login` body `{}` →
  HTTP 200 `{"code":400,"message":"Invalid parameters"}` (server memproses; tinggal
  parameter yang benar — body/headers dari `HeaderInterceptor` + login anonim).
- Path tanpa prefix → 404 nginx. Jadi URL efektif = base + `/frv2-api` + path endpoint
  di `docs/freereels-endpoints.txt` (241 path).

Catatan: host ini BISA dijangkau dari VM (beda dengan `api.sansekai.my.id` yang 403).

String indeks 0–20-an ternyata milik MOD (mis. `destaseo_mod_pref`,
`https://t.me/addlist/...`, update-check ke repo GitHub destaseomods) — sang modder
menyuntikkan string-nya sendiri ke tabel yang sama.

## Mekanisme dekripsi (persis native)

- `SigL360.dat`: `[u32be count=91502][count × (u32be offset, u32be length)][blob]`.
  Offset absolut dari awal file; blob mulai tepat setelah tabel.
- `rsbox[256]`: permutasi yang dibangun `FUN_0011cf34` (via `__call_once`) dari tabel
  256 byte di `libSigL360.so` file offset `0x11a85`:
  `rsbox[T[2k]] = 2k`, `rsbox[T[2k+1]] = 2k|1`.
- `Java_com_SigL360_d` @ `0x1cbf0`: untuk indeks `i`, posisi `j`:
  `plain[j] = ((rsbox[cipher[j]] ^ ((i + 0x7e) & 0xff)) + j) & 0xff`, hasil dibaca UTF-8.
- Jalur anti-tamper (`sig_is_compromised`, cek hash META-INF + signature PackageManager,
  SHA-256) hanya meracuni rsbox (`+0x2a ^ 0x69` per byte) bila integritas gagal —
  dekripsi luring memakai rsbox bersih.
- `c(byte[])` (init) menerima isi file `.dat` dari sisi Java: `com.SigL360` membaca
  entry zip dari APK-nya sendiri lalu meneruskannya ke native.

## Perkakas

- `tools/sigl360-decrypt.py` — dekriptor mandiri (baca langsung dari APK):
  `python3 tools/sigl360-decrypt.py 41836` per indeks, `--all` untuk kamus penuh
  (91.502 string → `sigl360-kamus.tsv`, ~3,5 MB, tidak di-commit).
- Bukti disebut pakai REA/Ghidra? Putaran ini: **Ghidra headless langsung**
  (bukan wrapper REA), sama seperti putaran native ModemCaps.
