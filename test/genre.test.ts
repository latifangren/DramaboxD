import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";
import {
  GenreService,
  countGenres,
  dramaMatchesGenre,
  splitTags,
  type GenreInfo,
} from "../src/services/genre.service.js";

const service = new GenreService(loadConfig());
const genres = service.getAllGenres();
const byId = (id: string): GenreInfo => {
  const g = service.getGenreById(id);
  assert.ok(g, `genre ${id} harus ada`);
  return g;
};

test("taksonomi genre: >=24, id unik, dwibahasa lengkap, 10 genre lama utuh", () => {
  assert.ok(genres.length >= 24, `hanya ${genres.length} genre`);
  const ids = genres.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, "id genre duplikat");
  for (const g of genres) {
    assert.ok(g.nameId && g.nameEn && g.icon, `genre ${g.id} kurang nama/ikon`);
    assert.ok(g.keywords.length > 0, `genre ${g.id} tanpa kata kunci`);
  }
  for (const legacy of ["billionaire", "romance", "revenge", "reborn", "forbidden-love", "werewolf", "action", "fantasy", "campus", "drama"]) {
    assert.ok(ids.includes(legacy), `genre lama ${legacy} hilang`);
  }
});

test("splitTags memecah tag gabungan koma ala DrakorKu", () => {
  assert.deepEqual(splitTags(["Thriller, Mystery, Crime, Drama"]), ["thriller", "mystery", "crime", "drama"]);
  assert.deepEqual(splitTags(undefined), []);
  assert.deepEqual(splitTags([" Romance ", ""]), ["romance"]);
});

test("dramaMatchesGenre: alias tag persis adalah sinyal terkuat", () => {
  assert.equal(dramaMatchesGenre({ title: "Apapun", tags: ["Billionaire"] }, byId("billionaire")), true);
  assert.equal(dramaMatchesGenre({ title: "Apapun", tags: ["Karma Payback"] }, byId("revenge")), true);
  assert.equal(dramaMatchesGenre({ title: "Apapun", tags: ["Playing Dumb"] }, byId("hidden-identity")), true);
  assert.equal(dramaMatchesGenre({ title: "Apapun", tags: ["Thriller, Mystery, Crime, Drama"] }, byId("mystery-thriller")), true);
  assert.equal(dramaMatchesGenre({ title: "Apapun", tags: ["Thriller, Mystery, Crime, Drama"] }, byId("drama")), true);
});

test("dramaMatchesGenre: fallback kata kunci di judul dan sinopsis", () => {
  assert.equal(dramaMatchesGenre({ title: "My Secret Baby" }, byId("secret-baby")), true);
  assert.equal(dramaMatchesGenre({ title: "Biasa Saja", synopsis: "Ia bangkit membalas dendam pada semua pengkhianat." }, byId("revenge")), true);
  assert.equal(dramaMatchesGenre({ title: "Kisah Kantor", tags: ["Workplace"] }, byId("workplace")), true);
  assert.equal(dramaMatchesGenre({ title: "Kisah Kantor" }, byId("werewolf")), false);
  assert.equal(dramaMatchesGenre({ title: "Polos" }, byId("comedy")), false);
});

test("countGenres menghitung dari pool campuran", () => {
  const pool = [
    { title: "A", tags: ["Billionaire", "Romance"] },
    { title: "B", tags: ["Billionaire"] },
    { title: "Cinta Segitiga Kita", tags: [] },
    { title: "D" },
  ];
  const counted = countGenres(pool, genres);
  const get = (id: string) => counted.find((g) => g.id === id)?.count;
  assert.equal(get("billionaire"), 2);
  // A lewat tag "Romance"; C lewat kata kunci judul "cinta" (fallback judul memang luas).
  assert.equal(get("romance"), 2);
  assert.equal(get("love-triangle"), 1);
  assert.equal(get("vampire"), 0);
});
