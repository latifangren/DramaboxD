import type { Config } from "../infrastructure/config.js";
import { FreeReelsClient } from "../providers/freereels/client.js";
import { playEpisodeOf, streamUrlOf } from "../providers/freereels/normalize.js";
import { MeloloClient } from "../providers/melolo/client.js";
import { parseVideoModel } from "../providers/melolo/normalize.js";
import { PineDramaClient } from "../providers/pinedrama/client.js";
import { ReelShortClient } from "../providers/reelshort/client.js";
import { createProvider, type UiLanguage } from "../providers/registry.js";
import type { Episode, SeriesDetail } from "../types.js";

export interface DramaDetailResult {
  provider: string;
  detail: SeriesDetail;
  episodes: Episode[];
}

export interface SingleEpisodeStreamResult {
  provider: string;
  seriesId: string;
  index: number;
  id?: string;
  streamUrl?: string;
  duration?: number;
}

export class DramaService {
  constructor(private readonly config: Config) {}

  async getDramaDetail(provider: string, id: string, language?: UiLanguage): Promise<DramaDetailResult> {
    const p = createProvider(provider, this.config, language);
    const detail = await p.detail(id);

    // Mode cepat (Fast-loading for Web UI): Jangan loop puluhan request upfront
    if (provider === "reelshort") {
      const client = new ReelShortClient({
        apiBase: this.config.reelshortApiBase,
        language: language ?? this.config.reelshortLanguage,
        timeoutMs: this.config.timeoutMs,
      });
      const book = (await client.get("/api/video/book/getBookInfo", { book_id: id })) as {
        online_base?: Array<{ chapter_id?: string; serial_number?: number; video_pic?: string; status?: number }>;
      };
      const chapters = Array.isArray(book.online_base) ? book.online_base : [];
      const episodes: Episode[] = chapters.map((ch, idx) => {
        const epNum = typeof ch.serial_number === "number" && ch.serial_number > 0 ? ch.serial_number : idx + 1;
        return {
          index: epNum,
          id: ch.chapter_id,
          title: `Episode ${epNum}`,
          snapshot: ch.video_pic,
          locked: ch.status === 2,
        };
      });

      // Pre-resolve episode 1 agar langsung siap diputar instan
      if (episodes.length > 0 && episodes[0].id) {
        try {
          const ch1 = (await client.get("/api/video/book/getChapterInfo", {
            book_id: id,
            chapter_id: episodes[0].id,
          })) as { video_url?: string; duration?: number };
          episodes[0].streamUrl = ch1.video_url;
          episodes[0].duration = ch1.duration;
        } catch {}
      }

      return { provider, detail, episodes };
    }

    if (provider === "freereels") {
      const client = new FreeReelsClient({
        apiBase: this.config.freereelsApiBase,
        timeoutMs: this.config.timeoutMs,
        deviceName: this.config.freereelsDeviceName,
      });
      const infoData = (await client.get(`/drama/info_v2?series_id=${encodeURIComponent(id)}`)) as {
        info?: {
          episode_list?: Array<{ id?: string; name?: string; cover?: string; duration?: number; is_lock?: boolean }>;
        };
      };
      const list = Array.isArray(infoData.info?.episode_list) ? infoData.info.episode_list : [];
      const episodes: Episode[] = list.map((ep, idx) => ({
        index: idx + 1,
        id: ep.id,
        title: `Episode ${idx + 1}`,
        duration: ep.duration,
        snapshot: ep.cover,
        locked: ep.is_lock ?? false,
      }));

      // Pre-resolve episode 1
      if (episodes.length > 0 && episodes[0].id) {
        try {
          const push = (await client.get(
            `/drama/info_push_v2?series_id=${encodeURIComponent(id)}&episode_key=${encodeURIComponent(episodes[0].id)}`,
          )) as unknown;
          const play = playEpisodeOf(push);
          if (play) {
            episodes[0].streamUrl = streamUrlOf(play);
          }
        } catch {}
      }

      return { provider, detail, episodes };
    }

    if (provider === "melolo") {
      const client = new MeloloClient({
        apiBase: this.config.meloloApiBase,
        deviceId: this.config.meloloDeviceId,
        timeoutMs: this.config.timeoutMs,
      });
      const dirData = (await client.get("/i18n_novel/book/directory/info/v1/", { book_id: id })) as {
        data?: { item_list?: string[]; item_paid_info_list?: Array<{ item_id: number; is_paid: boolean }> };
      };
      const itemIds = dirData.data?.item_list || [];
      const episodes: Episode[] = itemIds.map((itemId, idx) => ({
        index: idx + 1,
        id: itemId,
        title: `Episode ${idx + 1}`,
        locked: false,
      }));

      // Pre-resolve episode 1
      if (episodes.length > 0 && episodes[0].id) {
        try {
          const videoData = await client.post("/novel/player/video_model/v1/", {
            video_id: episodes[0].id,
            biz_param: {
              video_platform: 1024,
              need_all_video_definition: true,
              use_os_player: false,
              video_id_type: 0,
              caller_scene: "series",
            },
          });
          const model = parseVideoModel(videoData);
          if (model?.streamUrl) episodes[0].streamUrl = model.streamUrl;
          if (model?.duration) episodes[0].duration = model.duration;
        } catch {}
      }

      return { provider, detail, episodes };
    }

    // Default untuk dramabox, drakorku, mock yang sudah mengembalikan stream langsung
    const episodes = await p.episodes(id);
    return { provider, detail, episodes };
  }

  async getEpisodeStream(
    provider: string,
    seriesId: string,
    index: number,
    epId?: string,
    language?: UiLanguage,
  ): Promise<SingleEpisodeStreamResult> {
    if (provider === "reelshort") {
      const client = new ReelShortClient({
        apiBase: this.config.reelshortApiBase,
        language: language ?? this.config.reelshortLanguage,
        timeoutMs: this.config.timeoutMs,
      });
      let targetChapterId = epId;
      if (!targetChapterId) {
        const book = (await client.get("/api/video/book/getBookInfo", { book_id: seriesId })) as {
          online_base?: Array<{ chapter_id?: string; serial_number?: number }>;
        };
        const found = book.online_base?.find((ch) => ch.serial_number === index);
        targetChapterId = found?.chapter_id;
      }

      if (!targetChapterId) {
        throw new Error(`Episode index ${index} tidak ditemukan di seri ReelShort ${seriesId}`);
      }

      const info = (await client.get("/api/video/book/getChapterInfo", {
        book_id: seriesId,
        chapter_id: targetChapterId,
      })) as { video_url?: string; duration?: number };

      return {
        provider,
        seriesId,
        index,
        id: targetChapterId,
        streamUrl: info.video_url,
        duration: info.duration,
      };
    }

    if (provider === "freereels") {
      const client = new FreeReelsClient({
        apiBase: this.config.freereelsApiBase,
        timeoutMs: this.config.timeoutMs,
        deviceName: this.config.freereelsDeviceName,
      });
      let targetEpKey = epId;
      if (!targetEpKey) {
        const infoData = (await client.get(`/drama/info_v2?series_id=${encodeURIComponent(seriesId)}`)) as {
          info?: { episode_list?: Array<{ id?: string }> };
        };
        const ep = infoData.info?.episode_list?.[index - 1];
        targetEpKey = ep?.id;
      }

      if (!targetEpKey) {
        throw new Error(`Episode index ${index} tidak ditemukan di FreeReels ${seriesId}`);
      }

      const push = (await client.get(
        `/drama/info_push_v2?series_id=${encodeURIComponent(seriesId)}&episode_key=${encodeURIComponent(targetEpKey)}`,
      )) as unknown;
      const play = playEpisodeOf(push);

      return {
        provider,
        seriesId,
        index,
        id: targetEpKey,
        streamUrl: play ? streamUrlOf(play) : undefined,
      };
    }

    if (provider === "melolo") {
      const client = new MeloloClient({
        apiBase: this.config.meloloApiBase,
        deviceId: this.config.meloloDeviceId,
        timeoutMs: this.config.timeoutMs,
      });
      let targetItemId = epId;
      if (!targetItemId) {
        const dirData = (await client.get("/i18n_novel/book/directory/info/v1/", { book_id: seriesId })) as {
          data?: { item_list?: string[] };
        };
        targetItemId = dirData.data?.item_list?.[index - 1];
      }

      if (!targetItemId) {
        throw new Error(`Episode index ${index} tidak ditemukan di Melolo ${seriesId}`);
      }

      const videoData = await client.post("/novel/player/video_model/v1/", {
        video_id: targetItemId,
        biz_param: {
          video_platform: 1024,
          need_all_video_definition: true,
          use_os_player: false,
          video_id_type: 0,
          caller_scene: "series",
        },
      });
      const model = parseVideoModel(videoData);

      return {
        provider,
        seriesId,
        index,
        id: targetItemId,
        streamUrl: model?.streamUrl,
        duration: model?.duration,
      };
    }

    if (provider === "pinedrama") {
      const client = new PineDramaClient({
        siteBase: this.config.pinedramaSiteBase,
        language: this.config.pinedramaLanguage,
        timeoutMs: this.config.timeoutMs,
      });
      const streamUrl = await client.getPlayUrl(seriesId, index);
      return {
        provider,
        seriesId,
        index,
        streamUrl: streamUrl || undefined,
      };
    }

    // Default fallback (mock, drakorku, dramabox)
    const p = createProvider(provider, this.config, language);
    const all = await p.episodes(seriesId);
    const target = all.find((e) => e.index === index) || all[index - 1];
    return {
      provider,
      seriesId,
      index,
      id: target?.id,
      streamUrl: target?.streamUrl,
      duration: target?.duration,
    };
  }
}
