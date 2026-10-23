import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseIsoDuration,
  parseSeriesCards,
  parseSeriesPage,
  parseVideoObject,
  stubsToEpisodes,
} from "../src/providers/flickreels/normalize.js";
import { splitId } from "../src/providers/flickreels/index.js";

const fixture = JSON.parse(
  await readFile(new URL("../fixtures/flickreels-sample.json", import.meta.url), "utf8"),
) as { seriesPageHtml: string; classifyHrefs: string[]; classifyNuxt: string };

const ID = "daddys-little-savior/14288";

test("flickreels series page: detail + start_pay_num dari payload Nuxt", () => {
  const page = parseSeriesPage(fixture.seriesPageHtml, ID);
  assert.ok(page);
  assert.equal(page.detail.title, "Daddy's Little Savior");
  assert.equal(page.detail.episodeCount, 58);
  assert.ok(page.detail.synopsis?.includes("Chloe"));
  assert.equal(page.startPayNum, 10);
});

test("flickreels stubs: kunci mulai ep 10, durasi & cover per episode", () => {
  const page = parseSeriesPage(fixture.seriesPageHtml, ID);
  assert.ok(page);
  assert.equal(page.stubs.length, 58);
  assert.equal(page.stubs[0].locked, false);
  assert.equal(page.stubs[0].duration, 153);
  assert.equal(page.stubs[8].locked, false);
  assert.equal(page.stubs[9].locked, true);
  assert.ok(page.stubs.every((s) => s.snapshot?.includes("playlet-hls-cover")));
});

test("flickreels video object: contentUrl m3u8 + durasi ISO", () => {
  const info = parseVideoObject(fixture.seriesPageHtml);
  assert.ok(info.contentUrl?.includes(".m3u8"));
  assert.ok(info.contentUrl?.includes("playlet-hls"));
  assert.equal(info.durationSeconds, 153);
  assert.equal(parseIsoDuration("PT1H2M3S"), 3723);
  assert.equal(parseIsoDuration("PT45S"), 45);
});

test("flickreels episodes: stream hanya untuk yang tidak terkunci", () => {
  const page = parseSeriesPage(fixture.seriesPageHtml, ID);
  assert.ok(page);
  const streams = new Map([[1, parseVideoObject(fixture.seriesPageHtml)]]);
  const episodes = stubsToEpisodes(page.stubs, streams);
  assert.equal(episodes[0].streamUrl, streams.get(1)?.contentUrl);
  assert.equal(episodes[9].locked, true);
  assert.equal(episodes[9].streamUrl, undefined);
});

test("flickreels kartu katalog: slug dari href + keymap payload", () => {
  const html = `<html><body>${fixture.classifyHrefs.map((h) => `<a href="${h}">x</a>`).join("")}<script type="application/json" id="__NUXT_DATA__">${fixture.classifyNuxt}</script></body></html>`;
  const cards = parseSeriesCards(html);
  assert.ok(cards.length >= 3, `kartu ter-parse: ${cards.length}`);
  for (const card of cards) assert.match(card.id, /^[a-z0-9-]+\/\d+$/);
});

test("flickreels splitId: wajib bentuk slug/id", () => {
  assert.deepEqual(splitId(ID), { slug: "daddys-little-savior", numericId: "14288" });
  assert.throws(() => splitId("14288"), /slug/);
});
