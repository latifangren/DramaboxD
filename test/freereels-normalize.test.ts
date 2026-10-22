import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizationHeader, loginSign } from "../src/providers/freereels/client.js";
import {
  episodeMetas,
  mergeEpisode,
  normalizeDetail,
  normalizeSeriesList,
  playEpisodeOf,
} from "../src/providers/freereels/normalize.js";

async function fixture(): Promise<{ search: unknown; detail: unknown; push: unknown }> {
  const raw = await readFile(new URL("../fixtures/freereels-sample.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}

function dataOf(env: unknown): unknown {
  return (env as { data: unknown }).data;
}

test("signing: loginSign & authorizationHeader mengikuti rumus aplikasi (MD5)", () => {
  const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
  const key = "8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv";
  assert.equal(loginSign("device-123"), md5(key + "device-123"));
  assert.equal(
    authorizationHeader("AK", "AS", 1700000000000),
    `oauth_signature=${md5(key + "&AS")},oauth_token=AK,ts=1700000000000`,
  );
});

test("normalizeSeriesList: item search FreeReels terbaca (judul, episode, tag bersih)", async () => {
  const { search } = await fixture();
  const list = normalizeSeriesList(dataOf(search));
  assert.equal(list.length, 2);
  assert.equal(list[0].title, "Passionate Love");
  assert.equal(list[0].episodeCount, 81);
  assert.ok((list[0].tags ?? []).every((t) => !t.includes("{") && !t.includes("}")));
});

test("normalizeDetail + episodeMetas: info_v2 terbaca, URL daftar memang kosong", async () => {
  const { detail } = await fixture();
  const d = normalizeDetail(dataOf(detail));
  assert.equal(d.title, "Passionate Love");
  assert.match(d.synopsis ?? "", /Emily Parker/);
  const metas = episodeMetas(dataOf(detail));
  assert.equal(metas.length, 3);
  assert.equal(metas[0].m3u8_url, "");
});

test("mergeEpisode: URL putar dari info_push_v2 (external_audio_h264) + durasi dari metadata", async () => {
  const { detail, push } = await fixture();
  const metas = episodeMetas(dataOf(detail));
  const play = playEpisodeOf(dataOf(push));
  assert.ok(play);
  const ep = mergeEpisode(metas[2], 3, play);
  assert.equal(ep.index, 3);
  assert.match(ep.streamUrl ?? "", /^https:\/\/video-.*\.m3u8$/);
  assert.equal(ep.locked, false);
  assert.equal(typeof ep.duration, "number");
});

test("mergeEpisode: tanpa objek putar -> stream kosong; unlock=false -> terkunci", async () => {
  const { detail } = await fixture();
  const metas = episodeMetas(dataOf(detail));
  const noPlay = mergeEpisode(metas[0], 1, null);
  assert.equal(noPlay.streamUrl, undefined);
  const locked = mergeEpisode(metas[0], 1, { unlock: false });
  assert.equal(locked.locked, true);
});
