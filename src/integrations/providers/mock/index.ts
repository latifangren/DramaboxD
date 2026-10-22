import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../../shared/types/index.js";
import { normalizeDetail, normalizeEpisodes, normalizeSeriesList } from "../dramabox/normalize.js";

/**
 * Provider mock: menjalankan seluruh pipeline (search/detail/episodes/M3U)
 * dari fixture lokal, tanpa jaringan. Dipakai test dan mode `--mock` di CLI
 * untuk verifikasi saat upstream tidak bisa dijangkau.
 */
export class MockProvider implements DramaProvider {
  readonly name = "mock";
  readonly displayName = "Mock";
  readonly isEnabled = true;
  private cache: { search: unknown; detail: unknown } | null = null;

  constructor(private readonly fixturePath?: string) {}

  private async load(): Promise<{ search: unknown; detail: unknown }> {
    if (this.cache) return this.cache;
    const p =
      this.fixturePath ??
      fileURLToPath(new URL("../../../../fixtures/dramabox-sample.json", import.meta.url));
    const parsed = JSON.parse(await readFile(p, "utf8")) as { search: unknown; detail: unknown };
    this.cache = parsed;
    return parsed;
  }

  async search(_query: string): Promise<SeriesSummary[]> {
    return normalizeSeriesList((await this.load()).search);
  }

  async latest(): Promise<SeriesSummary[]> {
    return this.search("");
  }

  async trending(): Promise<SeriesSummary[]> {
    return this.search("");
  }

  async detail(_id: string): Promise<SeriesDetail> {
    return normalizeDetail((await this.load()).detail);
  }

  async episodes(_id: string): Promise<Episode[]> {
    const detail = (await this.load()).detail as { chapterList?: unknown };
    return normalizeEpisodes(detail.chapterList ?? []);
  }
}
