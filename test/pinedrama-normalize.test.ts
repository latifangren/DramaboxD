import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEpisodes,
  parseCatalog,
  parseEpisodeList,
  parseJsonLd,
  parseSeriesPage,
} from "../src/integrations/providers/pinedrama/normalize.js";

interface Fixture {
  seriesJsonLd: Record<string, unknown>;
  episodeList: Array<{ can_play: boolean; episode_id: number }>;
  catalog: Array<{ slug: string; title: string; cover: string }>;
  playUrl: { code: number; data: { url: string } };
  playUrlLocked: { code: number };
}

async function fixture(): Promise<Fixture> {
  const raw = await readFile(new URL("../fixtures/pinedrama-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

/** Rekonstruksi potongan HTML ala situs dari fixture (JSON-LD + payload RSC ter-escape). */
function fakeSeriesHtml(fx: Fixture): string {
  const ld = `<script type="application/ld+json">${JSON.stringify(fx.seriesJsonLd)}</script>`;
  const rsc = JSON.stringify({ episode_list: fx.episodeList }).replace(/"/g, '\\"');
  return `<html><head>${ld}</head><body><script>self.__next_f.push([1,"${rsc}"])</script></body></html>`;
}

function fakeCatalogHtml(fx: Fixture): string {
  return fx.catalog
    .map(
      (c) =>
        `<a rel="noopener" href="https://pinedrama.com/dramas/${c.slug}" aria-label="${c.title}" class="h-full"><img alt="${c.title}" src="${c.cover}"/></a>`,
    )
    .join("\n");
}

test("parseJsonLd: blok seri terpilih (yang punya numberOfEpisodes)", async () => {
  const fx = await fixture();
  const ld = parseJsonLd(fakeSeriesHtml(fx));
  assert.equal(ld?.name, "My Husband Murdered Me");
  assert.equal(ld?.numberOfEpisodes, 50);
});

test("parseEpisodeList: payload RSC ter-escape terbaca", async () => {
  const fx = await fixture();
  const eps = parseEpisodeList(fakeSeriesHtml(fx));
  assert.equal(eps.length, 9);
  assert.ok(eps.every((e) => e.can_play));
});

test("parseSeriesPage: detail + playable + total", async () => {
  const fx = await fixture();
  const page = parseSeriesPage(fakeSeriesHtml(fx), "my-husband-murdered-me");
  assert.equal(page.detail.title, "My Husband Murdered Me");
  assert.equal(page.detail.episodeCount, 50);
  assert.deepEqual(page.detail.tags, ["Rebirth"]);
  assert.equal(page.playableIds.length, 9);
  assert.equal(page.totalEpisodes, 50);
});

test("parseCatalog: kartu /genres -> slug/judul/cover, tanpa duplikat", async () => {
  const fx = await fixture();
  const list = parseCatalog(fakeCatalogHtml(fx) + fakeCatalogHtml(fx));
  assert.equal(list.length, fx.catalog.length);
  assert.equal(list[0].id, fx.catalog[0].slug);
  assert.match(list[0].cover ?? "", /^https:\/\/v\.pinedrama\.com\//);
});

test("buildEpisodes: yang can_play + ada URL tertulis; sisanya terkunci", async () => {
  const fx = await fixture();
  const urls = new Map<number, string | null>([[1, fx.playUrl.data.url], [2, null]]);
  const eps = buildEpisodes(50, fx.episodeList.map((e) => e.episode_id), urls, "https://img/cover.webp");
  assert.equal(eps.length, 50);
  assert.equal(eps[0].streamUrl, fx.playUrl.data.url);
  assert.equal(eps[0].locked, false);
  assert.equal(eps[1].locked, true); // can_play tapi API tidak memberi URL
  assert.equal(eps[9].locked, true); // ep 10 tidak can_play
});
