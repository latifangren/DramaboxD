import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeDetail, normalizeEpisodes, normalizeSeriesList } from "../src/integrations/providers/dramabox/normalize.js";

async function fixture(): Promise<{ search: unknown; detail: { chapterList: unknown } }> {
  const raw = await readFile(new URL("../fixtures/dramabox-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

test("normalizeSeriesList: aktor tanpa bookId tersaring (pola SekaiDrama)", async () => {
  const { search } = await fixture();
  const list = normalizeSeriesList(search);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "990001");
  assert.equal(list[0].title, "Contoh Drama Uji");
  assert.equal(list[0].episodeCount, 3);
});

test("normalizeDetail: book + introduction terbaca", async () => {
  const { detail } = await fixture();
  const d = normalizeDetail(detail);
  assert.equal(d.title, "Contoh Drama Uji");
  assert.match(d.synopsis ?? "", /mock/);
});

test("normalizeEpisodes: m3u8Url langsung, cdnList memilih m3u8 default, terkunci tanpa stream", async () => {
  const { detail } = await fixture();
  const eps = normalizeEpisodes(detail.chapterList);
  assert.equal(eps.length, 3);
  assert.equal(eps[0].streamUrl, "https://cdn.example.test/vod-990001/ep1-sd.m3u8");
  assert.equal(eps[0].duration, 62);
  // Ep2 tidak punya m3u8Url; dari cdnList harus terpilih varian .m3u8 isDefault, bukan mp4 360p.
  assert.equal(eps[1].streamUrl, "https://cdn.example.test/vod-990001/ep2-sd.m3u8");
  // Ep3 terkunci: stream kosong, locked=true.
  assert.equal(eps[2].streamUrl, undefined);
  assert.equal(eps[2].locked, true);
});

test("normalizeEpisodes: bungkus { data: { chapterList } } juga dikenali", () => {
  const eps = normalizeEpisodes({ data: { chapterList: [{ chapterIndex: 1, m3u8Url: "https://x.test/a.m3u8" }] } });
  assert.equal(eps.length, 1);
  assert.equal(eps[0].index, 1);
});
