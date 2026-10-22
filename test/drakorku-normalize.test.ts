import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  categoryToDetail,
  categoryToSummary,
  parseEpisodeNumber,
  postsToEpisodes,
  postsToSeries,
  stripHtml,
  type RawCategory,
  type RawPost,
} from "../src/providers/drakorku/normalize.js";

interface Fixture {
  searchPosts: RawPost[];
  category: RawCategory;
  categoryCountTotal: number;
  categoryPosts: RawPost[];
  categories: RawCategory[];
}

async function fixture(): Promise<Fixture> {
  const raw = await readFile(new URL("../fixtures/drakorku-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

test("postsToSeries: post episode dikelompokkan per cat_id", async () => {
  const fx = await fixture();
  const series = postsToSeries(fx.searchPosts);
  assert.ok(series.length >= 1);
  assert.ok(series.every((s) => s.id && s.title && s.title !== "(tanpa judul)"));
  assert.ok(series.some((s) => s.title === "Awaken"));
});

test("categoryToSummary/Detail: cid -> id, sinopsis HTML dibersihkan", async () => {
  const fx = await fixture();
  const sum = categoryToSummary(fx.category);
  assert.equal(sum.id, String(fx.category.cid));
  const det = categoryToDetail(fx.category, fx.categoryCountTotal);
  assert.equal(det.episodeCount, 15);
  assert.ok(!/<[a-z]+>/i.test(det.synopsis ?? ""), "sinopsis bebas tag HTML");
});

test("parseEpisodeNumber: pola judul panel", () => {
  assert.equal(parseEpisodeNumber("Where The Mask Ends Eps 15"), 15);
  assert.equal(parseEpisodeNumber("Awaken Eps 01"), 1);
  assert.equal(parseEpisodeNumber("Judul Episode 7"), 7);
  assert.equal(parseEpisodeNumber("Judul Tanpa Nomor"), null);
});

test("postsToEpisodes: terurut per nomor, stream = MP4 (HD diutamakan)", async () => {
  const fx = await fixture();
  const eps = postsToEpisodes(fx.categoryPosts);
  assert.equal(eps.length, fx.categoryPosts.length);
  const idx = eps.map((e) => e.index);
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  assert.ok(eps.every((e) => e.locked === false && /\.mp4/.test(e.streamUrl ?? "")));
  const hd = postsToEpisodes([
    { vid: 9, cat_id: 1, video_title: "X Eps 2", video_url: "http://h/sd.mp4", video_url_hd: "http://h/hd.mp4" },
  ]);
  assert.equal(hd[0].streamUrl, "http://h/hd.mp4");
});

test("stripHtml: markup panel -> teks bersih", () => {
  assert.equal(stripHtml("<p>Halo <strong>dunia</strong></p>"), "Halo dunia");
  assert.equal(stripHtml(undefined), undefined);
});
