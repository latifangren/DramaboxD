#!/usr/bin/env python3
"""Dekriptor string SigL360 (FreeReels 2.3.40) — hasil reverse libSigL360.so via Ghidra.

Mekanisme (Java_com_SigL360_d @ 0x1cbf0, init rsbox FUN_0011cf34):
  SigL360.dat = [u32be count][count x (u32be offset, u32be length)][blob terenkripsi]
  rsbox = permutasi invers dari tabel 256 byte di libSigL360.so file offset 0x11a85:
          rsbox[T[2k]] = 2k ; rsbox[T[2k+1]] = 2k|1
  plain[j] = ((rsbox[cipher[j]] ^ ((index + 0x7e) & 0xff)) + j) & 0xff

Pakai: FREEREELS_APK=apk/freereels-2.3.40-mod.apk python3 tools/sigl360-decrypt.py [index ...]
Flag --all (atau tanpa argumen): dekrip semua -> sigl360-kamus.tsv
"""
import os
import struct
import sys
import zipfile

APK = os.environ.get("FREEREELS_APK", "apk/freereels-2.3.40-mod.apk")
with zipfile.ZipFile(APK) as z:
    SO = z.read("lib/arm64-v8a/libSigL360.so")
    DAT = z.read("assets/SigL360.dat")

T = SO[0x11A85 : 0x11A85 + 256]
rsbox = bytearray(256)
for k in range(128):
    rsbox[T[2 * k]] = 2 * k
    rsbox[T[2 * k + 1]] = (2 * k) | 1
assert sorted(rsbox) == list(range(256)), "rsbox bukan permutasi"

count = struct.unpack_from(">I", DAT, 0)[0]
entries = [struct.unpack_from(">II", DAT, 4 + i * 8) for i in range(count)]


def dec(idx: int) -> bytes:
    off, ln = entries[idx]
    k = (idx + 0x7E) & 0xFF
    return bytes(((rsbox[DAT[off + j]] ^ k) + j) & 0xFF for j in range(ln))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--all"]
    if "--all" in sys.argv or not args:
        with open("sigl360-kamus.tsv", "w", encoding="utf-8") as f:
            for i in range(count):
                s = dec(i).decode("utf-8", "replace").replace("\t", " ").replace("\n", "\\n")
                f.write(f"{i}\t{s}\n")
        print(f"{count} string -> sigl360-kamus.tsv")
    else:
        for a in args:
            idx = int(a)
            print(idx, repr(dec(idx).decode("utf-8", "replace")))
