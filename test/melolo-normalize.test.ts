import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  decodeStreamUrl,
  directoryItems,
  mergeEpisode,
  normalizeDetail,
  normalizeSearch,
  parseVideoModel,
} from "../src/integrations/providers/melolo/normalize.js";

async function fixture(): Promise<{ search: unknown; directory: unknown; videoModel: unknown }> {
  const raw = await readFile(new URL("../fixtures/melolo-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

function dataOf(env: unknown): unknown {
  return (env as { data: unknown }).data;
}

test("normalizeSearch: grup search_data -> buku (serial_count string terbaca angka)", async () => {
  const { search } = await fixture();
  const list = normalizeSearch(dataOf(search));
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Learning To Love 2");
  assert.equal(list[0].id, "7689370093171526661");
  assert.equal(list[0].episodeCount, 86);
});

test("normalizeDetail + directoryItems: book_info + item_list urut", async () => {
  const { directory } = await fixture();
  const d = normalizeDetail(dataOf(directory));
  assert.equal(d.title, "Learning To Love 2");
  assert.match(d.synopsis ?? "", /cold-hearted/);
  const { itemIds, paidIds } = directoryItems(dataOf(directory));
  assert.equal(itemIds.length, 3);
  assert.equal(paidIds.size, 0);
});

test("decodeStreamUrl: base64 -> URL, URL polos dibiarkan, sampah ditolak", () => {
  const b64 = Buffer.from("https://cdn.example.test/v.mp4", "utf8").toString("base64");
  assert.equal(decodeStreamUrl(b64), "https://cdn.example.test/v.mp4");
  assert.equal(decodeStreamUrl("https://cdn.example.test/v.mp4"), "https://cdn.example.test/v.mp4");
  assert.equal(decodeStreamUrl("bukan-url-sama-sekali"), undefined);
  assert.equal(decodeStreamUrl(""), undefined);
});

test("parseVideoModel: pilih definisi tertinggi + durasi + poster", async () => {
  const { videoModel } = await fixture();
  const info = parseVideoModel(dataOf(videoModel));
  assert.equal(info.streamUrl, "https://v16-ml.melolostatic.com/example/720p.mp4");
  assert.equal(info.definition, "720p");
  assert.equal(info.duration, 83.7);
  assert.match(info.poster ?? "", /poster-example/);
});

test("mergeEpisode: tanpa stream + episode berbayar -> terkunci", () => {
  const ep = mergeEpisode("item-x", 7, {}, true);
  assert.equal(ep.streamUrl, undefined);
  assert.equal(ep.locked, true);
  const free = mergeEpisode("item-y", 8, { streamUrl: "https://x/v.mp4" }, true);
  assert.equal(free.locked, false);
});
