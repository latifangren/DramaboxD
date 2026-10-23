import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  bookToSummary,
  chaptersToEpisodes,
  latestFromHome,
  normalizeDetail,
  trendingFromHome,
} from "../src/integrations/providers/goodshort/normalize.js";
import type {
  GoodShortChapterPage,
  GoodShortDetailData,
  GoodShortHomeData,
  GoodShortSearchData,
} from "../src/integrations/providers/goodshort/client.js";

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/goodshort-sample.json", import.meta.url), "utf8"),
) as {
  detail: { data: GoodShortDetailData };
  chapters: { data: GoodShortChapterPage };
  search: { data: GoodShortSearchData };
  home: { data: GoodShortHomeData };
};

test("goodshort search: records buku -> ringkasan", () => {
  const records = fixture.search.data.page?.records ?? [];
  assert.ok(records.length >= 1);
  const summary = bookToSummary(records[0]);
  assert.match(summary.id, /^3100\d+$/);
  assert.ok(summary.title.length > 0);
  assert.ok(summary.cover?.includes("acf.goodshort.com"));
});

test("goodshort detail: nama, sinopsis, tag dari tagsList+genreList", () => {
  const book = fixture.detail.data.book;
  assert.ok(book);
  const detail = normalizeDetail(book);
  assert.equal(detail.episodeCount, 64);
  assert.ok(detail.synopsis?.includes("Chloe Anderson"));
  assert.ok((detail.tags ?? []).length >= 2);
});

test("goodshort episodes: m3u8Path menentukan kunci; durasi dari playTime", () => {
  const episodes = chaptersToEpisodes(fixture.chapters.data.records ?? []);
  assert.equal(episodes.length, 11);
  const ep1 = episodes[0];
  assert.equal(ep1.index, 1);
  assert.equal(ep1.locked, false);
  assert.ok(ep1.streamUrl?.includes("v3.goodshort.com"));
  assert.equal(ep1.duration, 151);
  const ep10 = episodes[9];
  assert.equal(ep10.index, 10);
  assert.equal(ep10.locked, true);
  assert.equal(ep10.streamUrl, undefined);
});

test("goodshort beranda: kolom Most Trending terpisah dari umpan umum", () => {
  const trending = trendingFromHome(fixture.home.data);
  assert.ok(trending.length >= 1);
  assert.ok(trending.every((s) => /^\d+$/.test(s.id)));
  const latest = latestFromHome(fixture.home.data);
  assert.ok(latest.length >= 1);
  const trendingIds = new Set(trending.map((s) => s.id));
  assert.ok(latest.every((s) => !trendingIds.has(s.id)));
});
