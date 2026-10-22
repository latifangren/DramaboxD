import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeDetail,
  normalizeEpisodes,
  normalizeSearchResults,
  parseCatalogList,
  parseHomeList,
} from "../src/integrations/providers/netshort/normalize.js";
import type {
  NetShortDetailData,
  NetShortEpisodeData,
} from "../src/integrations/providers/netshort/client.js";

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/netshort-sample.json", import.meta.url), "utf8"),
) as {
  search: Parameters<typeof normalizeSearchResults>[0];
  detail: NetShortDetailData;
  episodeInfo: Record<string, NetShortEpisodeData>;
  catalogHtmlSnippet: string;
};

test("netshort search: judul dibersihkan dari tag highlight", () => {
  const results = normalizeSearchResults(fixture.search);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "2100427254992797698");
  assert.equal(results[0].title, "QUEEN OF BLOOD");
  assert.ok(results[0].cover?.includes("awscover.netshort.com"));
});

test("netshort detail: nama, sinopsis, label, jumlah episode", () => {
  const detail = normalizeDetail(fixture.detail);
  assert.equal(detail.title, "Back to the ’90s: A Pop Queen’s Comeback");
  assert.equal(detail.episodeCount, 30);
  assert.ok(detail.synopsis?.includes("Grammy"));
  assert.ok(detail.tags?.includes("Time Travel"));
});

test("netshort episodes: voucher hanya untuk yang tidak terkunci, durasi & snapshot ikut", () => {
  const infos = new Map<number, NetShortEpisodeData>(
    Object.entries(fixture.episodeInfo).map(([k, v]) => [Number(k), v]),
  );
  const episodes = normalizeEpisodes(fixture.detail, infos);
  assert.equal(episodes.length, 30);
  const ep1 = episodes[0];
  assert.equal(ep1.index, 1);
  assert.equal(ep1.locked, false);
  assert.ok(ep1.streamUrl?.includes("cfcdn.netshort.com"));
  assert.equal(ep1.duration, 143.417);
  assert.ok(ep1.snapshot?.includes("awscover.netshort.com"));
  const locked = episodes.filter((e) => e.locked);
  assert.ok(locked.length > 0, "fixture harus memuat episode terkunci");
  for (const ep of locked) assert.equal(ep.streamUrl, undefined);
});

test("netshort katalog all-plots: TVSeries JSON-LD ter-parse", () => {
  const items = parseCatalogList(fixture.catalogHtmlSnippet);
  assert.ok(items.length >= 1);
  assert.equal(items[0].id, "2113091819067854850");
  assert.equal(items[0].episodeCount, 30);
  assert.ok(items[0].tags?.includes("Time Travel"));
});

test("netshort beranda: daftar RSC ter-parse setelah unescape", () => {
  const raw = '\\"shortPlayId\\":\\"2113091819067854850\\",\\"shortPlayName\\":\\"Back to the ’90s\\",\\"shortPlayNameNoHL\\":\\"Back to the ’90s: A Pop Queen’s Comeback\\",\\"shortPlayNameUrl\\":\\"/episode/x-2113091819067854850\\",\\"fullEpisodeNameUrl\\":\\"/full-episodes/x-2113091819067854850\\",\\"shortPlayCover\\":\\"https://awscover.netshort.com/cover.webp\\"';
  const items = parseHomeList(raw);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Back to the ’90s: A Pop Queen’s Comeback");
});
