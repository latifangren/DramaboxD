import type { Context } from "hono";
import type { GenreService } from "../../services/genre.service.js";
import { langParam } from "../lang.js";

export class GenreController {
  constructor(private readonly genreService: GenreService) {}

  async getAll(c: Context) {
    const genres = await this.genreService.getGenresWithCounts(langParam(c));
    return c.json({
      total: genres.length,
      genres,
    });
  }

  async getBySlug(c: Context) {
    const slug = c.req.param("slug");
    if (!slug) {
      return c.json({ error: "Parameter 'slug' wajib diisi" }, 400);
    }

    try {
      const genre = this.genreService.getGenreById(slug);
      if (!genre) {
        return c.json({ error: `Genre '${slug}' tidak ditemukan` }, 404);
      }
      const sortParam = (c.req.query("sort") || "popular") as "popular" | "episodes_desc" | "episodes_asc" | "az" | "za";
      const dramas = await this.genreService.getDramasByGenre(slug, sortParam, langParam(c));
      return c.json({
        genre,
        sortBy: sortParam,
        totalResults: dramas.length,
        dramas,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message || "Gagal mengambil data genre" }, 500);
    }
  }
}
