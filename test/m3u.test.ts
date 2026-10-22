import assert from "node:assert/strict";
import test from "node:test";
import { buildM3u, slugify } from "../src/shared/utils/m3u.js";
import type { Episode } from "../src/shared/types/index.js";

test("slugify mengikuti pola nama file contoh pengguna", () => {
  assert.equal(slugify("Menolak Lima Pasangan Wanitaku"), "menolak-lima-pasangan-wanitaku");
  assert.equal(slugify("  CEO's Secret Love! "), "ceo-s-secret-love");
});

test("buildM3u: format EXTINF persis contoh (durasi, tvg-logo snapshot, group-title)", () => {
  const episodes: Episode[] = [
    { index: 45, duration: 95, snapshot: "https://cdn.example.test/snap/45.jpg", streamUrl: "https://cdn.example.test/vod/ep45-sd.m3u8" },
    { index: 44, duration: 58, snapshot: "https://cdn.example.test/snap/44.jpg", streamUrl: "https://cdn.example.test/vod/ep44-sd.m3u8" },
  ];
  const { content, written, skipped } = buildM3u({ title: "Menolak Lima Pasangan Wanitaku" }, episodes);
  const lines = content.split("\n");
  assert.equal(lines[0], "#EXTM3U");
  // Episode harus terurut 44 lalu 45 walau input acak.
  assert.equal(lines[1], '#EXTINF:58 tvg-logo="https://cdn.example.test/snap/44.jpg" group-title="Menolak Lima Pasangan Wanitaku",Episode 44');
  assert.equal(lines[2], "https://cdn.example.test/vod/ep44-sd.m3u8");
  assert.equal(lines[3], '#EXTINF:95 tvg-logo="https://cdn.example.test/snap/45.jpg" group-title="Menolak Lima Pasangan Wanitaku",Episode 45');
  assert.equal(written.length, 2);
  assert.equal(skipped.length, 0);
});

test("buildM3u: episode terkunci/tanpa stream dilewati dan tercatat, bukan ditulis diam-diam", () => {
  const episodes: Episode[] = [
    { index: 1, duration: 60, streamUrl: "https://cdn.example.test/ep1.m3u8" },
    { index: 2, duration: 60, locked: true },
    { index: 3, duration: 60 },
  ];
  const { content, written, skipped } = buildM3u({ title: "Uji" }, episodes);
  assert.equal(written.length, 1);
  assert.equal(skipped.length, 2);
  assert.equal(skipped[0].reason, "terkunci di upstream");
  assert.equal(skipped[1].reason, "stream URL kosong");
  assert.ok(!content.includes("Episode 2"));
});
