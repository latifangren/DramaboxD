import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import {
  LANGUAGE_AWARE_PROVIDERS,
  createProvider,
  isLanguageAware,
} from "../src/providers/registry.js";
import { langParam } from "../src/http/lang.js";

const config = loadConfig();

test("tabel kapabilitas bahasa: tepat 5 provider sadar-bahasa", () => {
  assert.deepEqual(
    [...LANGUAGE_AWARE_PROVIDERS].sort(),
    ["goodshort", "netshort", "pinedrama", "reelshort", "shortmax"],
  );
  for (const name of ["dramabox", "freereels", "melolo", "drakorku", "flickreels", "mock"]) {
    assert.equal(isLanguageAware(name), false, name);
  }
});

test("createProvider menerima override bahasa id/en tanpa error", () => {
  for (const name of LANGUAGE_AWARE_PROVIDERS) {
    for (const lang of ["id", "en"] as const) {
      const p = createProvider(name, config, lang);
      assert.equal(p.name, name);
    }
  }
  // Provider tak-sadar-bahasa tetap bisa dibangun dengan parameter bahasa.
  assert.equal(createProvider("melolo", config, "id").name, "melolo");
});

test("langParam hanya menerima id/en", () => {
  const ctx = (q: Record<string, string | undefined>) =>
    ({ req: { query: (k: string) => q[k] } }) as never;
  assert.equal(langParam(ctx({ lang: "id" })), "id");
  assert.equal(langParam(ctx({ lang: "en" })), "en");
  assert.equal(langParam(ctx({ lang: "fr" })), undefined);
  assert.equal(langParam(ctx({})), undefined);
});
