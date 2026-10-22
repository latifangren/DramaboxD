import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ReelShortClient } from "../src/integrations/providers/reelshort/client.js";
import {
  bookToDetail,
  bookToSummary,
  chaptersToEpisodes,
  flattenHallBooks,
  type RawBook,
  type RawChapterInfo,
} from "../src/integrations/providers/reelshort/normalize.js";

interface Fixture {
  searchItems: RawBook[];
  book: RawBook;
  chapterInfo: RawChapterInfo;
  hallLists: Array<{ type: number; books: RawBook[] }>;
}

async function fixture(): Promise<Fixture> {
  const raw = await readFile(new URL("../fixtures/reelshort-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

test("bookToSummary: id = book_id hex (bukan t_book_id)", async () => {
  const fx = await fixture();
  const s = bookToSummary(fx.searchItems[0]);
  assert.match(s.id, /^[0-9a-f]{24}$/);
  assert.equal(s.title, fx.searchItems[0].book_title);
  assert.ok((s.episodeCount ?? 0) > 0);
});

test("bookToDetail: sinopsis HTML dibersihkan, total dari online_base", async () => {
  const fx = await fixture();
  const d = bookToDetail(fx.book);
  assert.equal(d.episodeCount, fx.book.online_base?.length);
  assert.ok(!/<[a-z]+>/i.test(d.synopsis ?? ""));
});

test("flattenHallBooks: seksi webInfo diratakan + dedupe", async () => {
  const fx = await fixture();
  const hall = { lists: [...fx.hallLists, ...fx.hallLists] };
  const books = flattenHallBooks(hall);
  assert.equal(books.length, fx.hallLists.reduce((n, l) => n + l.books.length, 0));
});

test("chaptersToEpisodes: video_url + durasi dari chapter info; tanpa URL = terkunci", async () => {
  const fx = await fixture();
  const chapters = fx.book.online_base ?? [];
  const infos = new Map<string, RawChapterInfo>([
    [chapters[0].chapter_id as string, fx.chapterInfo],
  ]);
  const eps = chaptersToEpisodes(chapters, infos);
  assert.equal(eps[0].streamUrl, fx.chapterInfo.video_url);
  assert.equal(eps[0].duration, fx.chapterInfo.duration);
  assert.equal(eps[0].locked, false);
  assert.equal(eps[1].locked, true);
});

test("client.sign: deterministik & berubah bila payload berubah", () => {
  const a = ReelShortClient.sign({ word: "love", page: 1, ts: "1700000000" });
  const b = ReelShortClient.sign({ page: 1, word: "love", ts: "1700000000" });
  const c = ReelShortClient.sign({ word: "hate", page: 1, ts: "1700000000" });
  assert.equal(a, b); // urutan kunci tidak berpengaruh (kanonik terurut)
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("client.decodeBody: JSON polos lolos apa adanya", () => {
  const env = ReelShortClient.decodeBody('{"code":0,"data":{"x":1}}');
  assert.equal(env.code, 0);
});
