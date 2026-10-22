import type { DramaProvider, Episode, SeriesDetail, SeriesSummary } from "../../types.js";
import { MeloloClient } from "./client.js";
import {
  directoryItems,
  mergeEpisode,
  normalizeDetail,
  normalizeSearch,
  parseVideoModel,
} from "./normalize.js";

/**
 * Provider Melolo — API resmi aplikasi (api.tmtreader.com), hasil reverse
 * APK 5.1.8. Lihat docs/teardown-melolo-5.1.8.md.
 *
 * Alur:
 *   search   GET  /i18n_novel/search/page/v1/?query=&offset=0&count=20
 *   detail   GET  /i18n_novel/book/directory/info/v1/?book_id=  (book_info)
 *   episodes directory yang sama (item_list urut) + per item
 *            POST /novel/player/video_model/v1/ dengan body JSON RPC:
 *            {video_id: <item_id>, biz_param: {video_platform: 1024,
 *             need_all_video_definition: true, use_os_player: false,
 *             video_id_type: 0, caller_scene: "series"}}
 *            -> string JSON video_model; main_url per definisi ter-base64.
 *
 * Stream Melolo berupa MP4 langsung (CDN melolostatic), bukan HLS.
 * Discovery (latest/trending) aplikasi ada di bookmall yang kena risk
 * control MetaSec (code 1050007) — kedua method melempar error jelas.
 */
export class MeloloProvider implements DramaProvider {
  readonly name = "melolo";
  private readonly client: MeloloClient;
  private directoryCache = new Map<string, unknown>();

  constructor(opts: {
    apiBase: string;
    timeoutMs?: number;
    delayMs?: number;
    versionName?: string;
    deviceId?: string;
    client?: MeloloClient;
  }) {
    this.client =
      opts.client ??
      new MeloloClient({
        apiBase: opts.apiBase,
        timeoutMs: opts.timeoutMs,
        delayMs: opts.delayMs,
        versionName: opts.versionName,
        deviceId: opts.deviceId,
      });
  }

  async search(query: string): Promise<SeriesSummary[]> {
    const data = await this.client.get("/i18n_novel/search/page/v1/", {
      query,
      offset: "0",
      count: "20",
    });
    return normalizeSearch(data);
  }

  async latest(): Promise<SeriesSummary[]> {
    throw new Error(
      "Melolo: discovery (bookmall) kena risk control MetaSec (BOOKMALL_RISK_CONTROL_ERROR) — gunakan search.",
    );
  }

  async trending(): Promise<SeriesSummary[]> {
    throw new Error(
      "Melolo: discovery (bookmall) kena risk control MetaSec (BOOKMALL_RISK_CONTROL_ERROR) — gunakan search.",
    );
  }

  private async directory(id: string): Promise<unknown> {
    const cached = this.directoryCache.get(id);
    if (cached !== undefined) return cached;
    const data = await this.client.get("/i18n_novel/book/directory/info/v1/", { book_id: id });
    this.directoryCache.set(id, data);
    return data;
  }

  async detail(id: string): Promise<SeriesDetail> {
    return normalizeDetail(await this.directory(id));
  }

  async episodes(id: string): Promise<Episode[]> {
    const { itemIds, paidIds } = directoryItems(await this.directory(id));
    const out: Episode[] = [];
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const data = await this.client.post("/novel/player/video_model/v1/", {
        video_id: itemId,
        biz_param: {
          video_platform: 1024,
          need_all_video_definition: true,
          use_os_player: false,
          video_id_type: 0,
          caller_scene: "series",
        },
      });
      out.push(mergeEpisode(itemId, i + 1, parseVideoModel(data), paidIds.has(itemId)));
    }
    return out.sort((a, b) => a.index - b.index);
  }
}
