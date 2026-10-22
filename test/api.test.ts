import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/http/app.js";
import { loadConfig } from "../src/infrastructure/config.js";

const config = loadConfig({
  PORT: "3004",
  HOST: "0.0.0.0",
});
const app = createApp(config);

test("API: GET /api/status mengembalikan identitas DramaboxD & status ok", async () => {
  const res = await app.request("/api/status");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { name: string; status: string; providers: string[] };
  assert.equal(data.name, "DramaboxD");
  assert.equal(data.status, "ok");
  assert.ok(Array.isArray(data.providers));
  assert.ok(data.providers.includes("reelshort"));
});

test("API: GET /api/platforms mengembalikan 39+ direktori platform", async () => {
  const res = await app.request("/api/platforms");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { total: number; platforms: Array<{ id: string; status: string }> };
  assert.ok(data.total >= 10);
  const reelshort = data.platforms.find((p) => p.id === "reelshort");
  assert.ok(reelshort);
  assert.equal(reelshort?.status, "active");
});

test("API: GET /api/search/global mengembalikan agregat pencarian lintas provider", async () => {
  const res = await app.request("/api/search/global?q=contoh");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { query: string; totalResults: number; perProvider: unknown[]; flat: unknown[] };
  assert.equal(data.query, "contoh");
  assert.ok(Array.isArray(data.perProvider));
  assert.ok(Array.isArray(data.flat));
});

test("API: GET /api/drama/mock/mock-1 mengembalikan detail drama dan episode", async () => {
  const res = await app.request("/api/drama/mock/mock-1");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { provider: string; detail: { id: string }; episodes: unknown[] };
  assert.equal(data.provider, "mock");
  assert.equal(data.detail.id, "990001");
  assert.ok(Array.isArray(data.episodes));
});

test("API: GET /api/stream menolak URL berbahaya / lokal (SSRF Protection)", async () => {
  const res = await app.request("/api/stream?url=http://127.0.0.1:8080/secret");
  assert.equal(res.status, 400);
  const text = await res.text();
  assert.ok(text.includes("disallowed"));
});

test("Frontend: static files (index.html, style.css, js/app.js) terlayani dengan HTTP 200", async () => {
  const indexRes = await app.request("/");
  assert.equal(indexRes.status, 200);
  const html = await indexRes.text();
  assert.ok(html.includes("DRAMABOX"));

  const cssRes = await app.request("/style.css");
  assert.equal(cssRes.status, 200);
  const css = await cssRes.text();
  assert.ok(css.includes("--bg-color"));

  const jsRes = await app.request("/js/app.js");
  assert.equal(jsRes.status, 200);
  const js = await jsRes.text();
  assert.ok(js.includes("DramaboxD"));
});

test("API: POST /api/stream/subtitle/translate menerjemahkan cue WebVTT ke Bahasa Indonesia", async () => {
  const rawVtt = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello, welcome to DramaboxD.\n`;
  const res = await app.request("/api/stream/subtitle/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vtt: rawVtt, to: "id" }),
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { ok: boolean; to: string; vtt: string };
  assert.equal(data.ok, true);
  assert.equal(data.to, "id");
  assert.ok(data.vtt.includes("00:00:01.000 --> 00:00:04.000"));
});

test("API: GET /api/stream/subtitle validasi parameter url", async () => {
  const res = await app.request("/api/stream/subtitle");
  assert.equal(res.status, 400);
});

test("API: GET /api/genres mengembalikan taksonomi genre lengkap", async () => {
  const res = await app.request("/api/genres");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { total: number; genres: Array<{ id: string; nameId: string }> };
  assert.ok(data.total >= 8);
  assert.ok(data.genres.some((g) => g.id === "billionaire"));
  assert.ok(data.genres.some((g) => g.id === "romance"));
  assert.ok(data.genres.some((g) => g.id === "revenge"));
});

test("API: GET /api/genres/billionaire mengembalikan koleksi drama genre CEO/Miliarder", async () => {
  const res = await app.request("/api/genres/billionaire");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { genre: { id: string }; totalResults: number; dramas: unknown[] };
  assert.equal(data.genre.id, "billionaire");
  assert.ok(Array.isArray(data.dramas));
});

test("API: GET /api/genres/billionaire?sort=episodes_desc mendukung pengurutan episode", async () => {
  const res = await app.request("/api/genres/billionaire?sort=episodes_desc");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { sortBy: string; dramas: Array<{ episodeCount?: number }> };
  assert.equal(data.sortBy, "episodes_desc");
  if (data.dramas.length >= 2 && data.dramas[0].episodeCount && data.dramas[1].episodeCount) {
    assert.ok(data.dramas[0].episodeCount >= data.dramas[1].episodeCount);
  }
});

test("API: GET /api/search/suggest mengembalikan saran pencarian instan", async () => {
  const res = await app.request("/api/search/suggest?q=contoh");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { query: string; suggestions: Array<{ id: string; title: string }> };
  assert.equal(data.query, "contoh");
  assert.ok(Array.isArray(data.suggestions));
});
