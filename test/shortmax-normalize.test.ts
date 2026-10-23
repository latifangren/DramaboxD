import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  itemToSummary,
  normalizeDetail,
  normalizeEpisodes,
  pickStreamUrl,
} from "../src/integrations/providers/shortmax/normalize.js";
import type {
  ShortMaxCatalogPage,
  ShortMaxDetailData,
  ShortMaxSearchPage,
} from "../src/integrations/providers/shortmax/client.js";

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/shortmax-sample.json", import.meta.url), "utf8"),
) as {
  detail: { data: ShortMaxDetailData };
  catalog: { data: ShortMaxCatalogPage };
  search: { data: ShortMaxSearchPage };
};

test("shortmax katalog: item -> ringkasan (id numerik jadi string, cover absolut)", () => {
  const item = fixture.catalog.data.list?.[0];
  assert.ok(item);
  const summary = itemToSummary(item);
  assert.equal(summary.id, String(item.shortPlayId));
  assert.ok(summary.title.length > 0);
  assert.ok(summary.cover?.startsWith("https://akamai-static.shorttv.live/"));
});

test("shortmax search: total besar, item ter-parse", () => {
  assert.ok((fixture.search.data.total ?? 0) > 100);
  assert.ok((fixture.search.data.data ?? []).length >= 1);
});

test("shortmax detail: nama, sinopsis, tag dari displayName label+class", () => {
  const detail = normalizeDetail(fixture.detail.data);
  assert.equal(detail.title, "Chasing Love");
  assert.ok(detail.synopsis?.includes("Emperor"));
  assert.ok(detail.tags?.includes("Time Travel"));
  assert.ok(detail.tags?.includes("Period Dramas"));
});

test("shortmax episodes: gratis s/d lockBegin, sisanya terkunci tanpa stream", () => {
  const episodes = normalizeEpisodes(fixture.detail.data);
  assert.equal(episodes.length, 10);
  const free = episodes.filter((e) => !e.locked);
  assert.equal(free.length, 7);
  for (const ep of free) assert.ok(ep.streamUrl?.includes(".m3u8"));
  for (const ep of episodes.filter((e) => e.locked)) assert.equal(ep.streamUrl, undefined);
  assert.equal(episodes[7].index, 8);
  assert.equal(episodes[7].locked, true);
});

test("shortmax pickStreamUrl: preferensi 720, tahan JSON rusak", () => {
  const raw = fixture.detail.data.episodeList?.[0].encryptedVideoUrl;
  assert.ok(pickStreamUrl(raw)?.includes("_720/"));
  assert.equal(pickStreamUrl(""), undefined);
  assert.equal(pickStreamUrl("bukan-json"), undefined);
  assert.equal(pickStreamUrl(undefined), undefined);
});
