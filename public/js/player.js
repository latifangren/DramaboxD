// DramaboxD Vertical 9:16 Video Player Controller (3-Column Layout Watch Page)
import { Api } from "./api.js";
import { getLanguage, t } from "./i18n.js";
import { Store } from "./store.js";

export class VerticalPlayer {
  constructor() {
    this.video = document.getElementById("videoPlayer");
    this.loader = document.getElementById("playerLoader");
    this.loaderText = document.getElementById("playerLoaderText");
    this.errorEl = document.getElementById("playerErrorMessage");

    // Controls
    this.playPauseBtn = document.getElementById("playerPlayPauseBtn");
    this.prevBtn = document.getElementById("playerPrevBtn");
    this.nextBtn = document.getElementById("playerNextBtn");
    this.skipBackBtn = document.getElementById("playerSkipBack");
    this.skipForwardBtn = document.getElementById("playerSkipForward");
    this.timeDisplay = document.getElementById("playerTimeDisplay");
    this.seekbarContainer = document.getElementById("playerProgressBarContainer");
    this.seekbarFill = document.getElementById("playerProgressBar");
    this.speedSelect = document.getElementById("playerSpeedSelect");
    this.subtitleSelect = document.getElementById("playerSubtitleSelect");
    this.muteBtn = document.getElementById("playerMuteBtn");
    this.volumeSlider = document.getElementById("playerVolumeSlider");
    this.qualitySelect = document.getElementById("playerQualitySelect");
    this.pipBtn = document.getElementById("playerPipBtn");
    this.autoplayToggle = document.getElementById("playerAutoplayToggle");
    this.fullscreenBtn = document.getElementById("playerFullscreenBtn");

    // Kolom Kiri: Metadata
    this.watchPoster = document.getElementById("watchPoster");
    this.watchTitle = document.getElementById("watchTitle");
    this.watchCurrentEp = document.getElementById("watchCurrentEp");
    this.watchEpCountChip = document.getElementById("watchEpCountChip");
    this.watchPlatformChip = document.getElementById("watchPlatformChip");
    this.watchSynopsis = document.getElementById("watchSynopsis");
    this.watchBookmarkBtn = document.getElementById("watchBookmarkBtn");
    this.watchBackBtn = document.getElementById("watchBackBtn");

    // Kolom Kanan: Grid Episode & UpNext
    this.watchEpTotalCount = document.getElementById("watchEpTotalCount");
    this.watchEpisodeGrid = document.getElementById("watchEpisodeGrid");
    this.watchUpNextList = document.getElementById("watchUpNextList");

    this.currentDrama = null;
    this.currentEpisodes = [];
    this.currentIndex = 0;
    this.hls = null;
    this.lastSavedTime = 0;
    this.onBackCallback = null;
    // Subtitle bawaan provider (sidecar) untuk episode aktif + elemen <track>-nya
    this.sidecarSubs = [];
    this.sidecarTrackEls = [];
    this.translateTrackEl = null;
    this.autoSubDone = false;

    this.initEvents();
  }

  initEvents() {
    // Play / Pause toggle
    this.playPauseBtn?.addEventListener("click", () => this.togglePlay());
    this.video?.addEventListener("click", () => this.togglePlay());
    this.video?.addEventListener("play", () => this.updatePlayIcon(true));
    this.video?.addEventListener("pause", () => this.updatePlayIcon(false));

    // Navigasi episode
    this.prevBtn?.addEventListener("click", () => this.playEpisode(this.currentIndex - 1));
    this.nextBtn?.addEventListener("click", () => this.playEpisode(this.currentIndex + 1));

    // Skip ±10 detik
    this.skipBackBtn?.addEventListener("click", () => this.skip(-10));
    this.skipForwardBtn?.addEventListener("click", () => this.skip(10));

    // Seekbar click to seek
    this.seekbarContainer?.addEventListener("click", (e) => this.onSeekbarClick(e));

    // Kecepatan putar
    this.speedSelect?.addEventListener("change", (e) => {
      const speed = parseFloat(e.target.value);
      this.video.playbackRate = speed;
      Store.setPrefs({ speed });
    });

    // Toggle autoplay
    this.autoplayToggle?.addEventListener("change", (e) => {
      Store.setPrefs({ autoplay: e.target.checked });
    });

    // Layar Penuh
    this.fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());

    // Volume & bisu (tersimpan sebagai preferensi)
    this.muteBtn?.addEventListener("click", () => {
      if (!this.video) return;
      this.video.muted = !this.video.muted;
      Store.setPrefs({ muted: this.video.muted });
    });
    this.volumeSlider?.addEventListener("input", (e) => {
      if (!this.video) return;
      const v = parseFloat(e.target.value);
      this.video.volume = v;
      this.video.muted = v === 0;
      Store.setPrefs({ volume: v, muted: this.video.muted });
    });
    this.video?.addEventListener("volumechange", () => this.syncVolumeUi());

    // Picture-in-Picture
    this.pipBtn?.addEventListener("click", () => this.togglePip());

    // Kualitas HLS (level manual; -1 = otomatis)
    this.qualitySelect?.addEventListener("change", (e) => {
      if (this.hls) this.hls.currentLevel = parseInt(e.target.value, 10);
    });

    // Bookmark tombol di watch page
    this.watchBookmarkBtn?.addEventListener("click", () => {
      if (!this.currentDrama) return;
      const inList = Store.toggleMyList(this.currentDrama);
      this.updateBookmarkButton(inList);
    });

    // Tombol Kembali
    this.watchBackBtn?.addEventListener("click", () => {
      if (this.onBackCallback) this.onBackCallback();
    });

    // Video progress & tracking
    this.video?.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.video?.addEventListener("ended", () => this.onEnded());
    this.video?.addEventListener("waiting", () => this.showLoader(t("loadingStream")));
    this.video?.addEventListener("playing", () => this.hideLoader());

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      const watchView = document.getElementById("view-watch");
      if (!watchView || watchView.style.display === "none") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          this.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          this.skip(10);
          break;
        case "n":
        case "N":
          if (this.currentIndex < this.currentEpisodes.length - 1) {
            this.playEpisode(this.currentIndex + 1);
          }
          break;
        case "p":
        case "P":
          if (this.currentIndex > 0) {
            this.playEpisode(this.currentIndex - 1);
          }
          break;
        case "f":
        case "F":
          this.toggleFullscreen();
          break;
      }
    });

    // Sync saved prefs
    const prefs = Store.getPrefs();
    if (this.autoplayToggle) this.autoplayToggle.checked = prefs.autoplay ?? true;
    if (this.speedSelect) this.speedSelect.value = String(prefs.speed || 1.0);
    if (this.video) {
      if (typeof prefs.volume === "number") this.video.volume = prefs.volume;
      if (typeof prefs.muted === "boolean") this.video.muted = prefs.muted;
      this.syncVolumeUi();
    }
    if (this.pipBtn && (!document.pictureInPictureEnabled || this.video?.disablePictureInPicture)) {
      this.pipBtn.style.display = "none";
    }
  }

  syncVolumeUi() {
    if (!this.video || !this.muteBtn) return;
    const v = this.video.muted ? 0 : this.video.volume;
    this.muteBtn.textContent = v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
    if (this.volumeSlider) this.volumeSlider.value = String(v);
  }

  async togglePip() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (this.video) {
        await this.video.requestPictureInPicture();
      }
    } catch {
      // PiP ditolak browser (mis. belum ada frame video) — abaikan.
    }
  }

  /** Isi menu kualitas dari level HLS yang tersedia; sembunyikan bila <= 1. */
  populateQuality() {
    if (!this.qualitySelect) return;
    const levels = this.hls ? this.hls.levels || [] : [];
    if (levels.length <= 1) {
      this.qualitySelect.style.display = "none";
      return;
    }
    this.qualitySelect.innerHTML = "";
    const auto = document.createElement("option");
    auto.value = "-1";
    auto.textContent = t("playerQualityAuto");
    this.qualitySelect.appendChild(auto);
    levels.forEach((level, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      const kbps = level.bitrate ? ` (${Math.round(level.bitrate / 1000)} kbps)` : "";
      opt.textContent = level.height ? `${level.height}p${kbps}` : `Level ${idx + 1}${kbps}`;
      this.qualitySelect.appendChild(opt);
    });
    this.qualitySelect.value = "-1";
    if (this.hls) this.hls.currentLevel = -1;
    this.qualitySelect.style.display = "inline-block";
  }

  loadDrama(drama, episodes, startIndex = 0) {
    this.currentDrama = drama;
    this.currentEpisodes = episodes || [];
    this.renderLeftMeta();
    this.renderRightEpisodeGrid();
    this.renderRightUpNext();
    this.playEpisode(startIndex);
  }

  renderLeftMeta() {
    if (!this.currentDrama) return;
    if (this.watchPoster) this.watchPoster.src = this.currentDrama.cover || "";
    if (this.watchTitle) this.watchTitle.textContent = this.currentDrama.title || "Drama";
    if (this.watchEpCountChip) {
      this.watchEpCountChip.textContent = t("episodesCount", { count: this.currentEpisodes.length });
    }
    if (this.watchPlatformChip) {
      this.watchPlatformChip.textContent = (this.currentDrama.provider || "").toUpperCase();
    }
    if (this.watchSynopsis) {
      this.watchSynopsis.textContent = this.currentDrama.synopsis || "Drama pendek vertikal kualitas tinggi.";
    }
    const inList = Store.isInMyList(this.currentDrama.provider, this.currentDrama.id);
    this.updateBookmarkButton(inList);
  }

  updateBookmarkButton(inList) {
    if (!this.watchBookmarkBtn) return;
    this.watchBookmarkBtn.textContent = inList ? t("modalInList") : `🔖 ${t("modalAddList")}`;
    this.watchBookmarkBtn.style.color = inList ? "#46D369" : "#fff";
  }

  renderRightEpisodeGrid() {
    if (!this.watchEpisodeGrid) return;
    this.watchEpisodeGrid.innerHTML = "";
    if (this.watchEpTotalCount) {
      this.watchEpTotalCount.textContent = String(this.currentEpisodes.length);
    }

    this.currentEpisodes.forEach((ep, idx) => {
      const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : idx + 1;
      const btn = document.createElement("button");
      btn.className = `ep-square-btn ${idx === this.currentIndex ? "active" : ""}`;
      btn.textContent = String(epNum);
      btn.title = `Episode ${epNum}`;
      btn.onclick = () => this.playEpisode(idx);
      this.watchEpisodeGrid.appendChild(btn);
    });
  }

  renderRightUpNext() {
    if (!this.watchUpNextList) return;
    this.watchUpNextList.innerHTML = "";
    const nextEpisodes = this.currentEpisodes.slice(this.currentIndex + 1, this.currentIndex + 5);

    if (nextEpisodes.length === 0) {
      this.watchUpNextList.innerHTML = `<div style="font-size:12px;color:#666;padding:8px 0;">Tidak ada episode selanjutnya.</div>`;
      return;
    }

    nextEpisodes.forEach((ep, relIdx) => {
      const absIdx = this.currentIndex + 1 + relIdx;
      const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : absIdx + 1;
      const item = document.createElement("div");
      item.className = "upnext-item";
      item.onclick = () => this.playEpisode(absIdx);

      const thumbUrl = ep.snapshot || this.currentDrama?.cover || "";
      const durStr = ep.duration ? `${Math.round(ep.duration)}s` : "";

      item.innerHTML = `
        <img class="upnext-thumb" src="${thumbUrl}" alt="Ep ${epNum}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 40 56\\' fill=\\'%23111\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
        <div class="upnext-info">
          <div class="upnext-ep-title">Episode ${epNum}</div>
          <div class="upnext-ep-sub">${durStr} ${ep.locked ? '🔒' : '✓ Siap Putar'}</div>
        </div>
      `;
      this.watchUpNextList.appendChild(item);
    });
  }

  async playEpisode(index) {
    if (index < 0 || index >= this.currentEpisodes.length) return;
    this.currentIndex = index;
    this.autoSubDone = false;
    const ep = this.currentEpisodes[index];
    const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : index + 1;

    this.hideError();
    this.showLoader(t("loadingStream"));

    // Update label episode di kiri
    if (this.watchCurrentEp) {
      this.watchCurrentEp.textContent = t("episodeNum", { num: epNum });
    }

    // Highlight kotak episode di kanan
    const buttons = this.watchEpisodeGrid?.querySelectorAll(".ep-square-btn") || [];
    buttons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add("active");
        btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        btn.classList.remove("active");
      }
    });

    // Update antrean selanjutnya
    this.renderRightUpNext();

    // Resolusi stream URL
    let rawStreamUrl = ep.streamUrl;
    if (!rawStreamUrl && this.currentDrama) {
      try {
        const resolved = await Api.resolveEpisodeStream(
          this.currentDrama.provider,
          this.currentDrama.id,
          epNum,
          ep.id,
        );
        if (resolved.streamUrl) {
          rawStreamUrl = resolved.streamUrl;
          ep.streamUrl = resolved.streamUrl;
          if (resolved.duration) ep.duration = resolved.duration;
        }
      } catch (err) {
        console.warn("Gagal resolve stream episode:", err);
      }
    }

    if (!rawStreamUrl) {
      this.hideLoader();
      this.showError(t("streamError"));
      return;
    }

    const streamSrc = Api.getStreamProxyUrl(rawStreamUrl);

    // Subtitle bawaan provider (sidecar) untuk episode ini, bila ada
    this.setSidecarSubtitles(ep.subtitles || []);

    // Pulihkan saved speed
    const prefs = Store.getPrefs();
    this.video.playbackRate = prefs.speed || 1.0;

    // Load Stream via HLS vs MP4
    if (rawStreamUrl.includes(".m3u8")) {
      if (window.Hls && window.Hls.isSupported()) {
        if (this.hls) this.hls.destroy();

        this.hls = new window.Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 4,
        });

        this.hls.loadSource(streamSrc);
        this.hls.attachMedia(this.video);

        this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          this.hideLoader();
          this.populateSubtitles();
          this.populateQuality();
          this.resumePosition();
          this.video.play().catch(() => {});
        });

        this.hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          this.populateSubtitles();
        });

        this.hls.on(window.Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                this.hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                this.hls.recoverMediaError();
                break;
              default:
                this.hideLoader();
                this.showError(t("streamError"));
                break;
            }
          }
        });
      } else if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
        this.video.src = streamSrc;
        this.resumePosition();
        this.video.play().catch(() => {});
      }
    } else {
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
      this.video.src = streamSrc;
      this.populateSubtitles();
      this.populateQuality();
      this.resumePosition();
      this.video.play().catch(() => {});
    }
  }

  togglePlay() {
    if (!this.video) return;
    if (this.video.paused) {
      this.video.play().catch(() => {});
    } else {
      this.video.pause();
    }
  }

  updatePlayIcon(isPlaying) {
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
    }
  }

  skip(seconds) {
    if (!this.video) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seconds));
  }

  onSeekbarClick(e) {
    if (!this.video || !this.video.duration || !this.seekbarContainer) return;
    const rect = this.seekbarContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    this.video.currentTime = pct * this.video.duration;
  }

  onTimeUpdate() {
    if (!this.video || !this.video.duration) return;
    const cur = this.video.currentTime;
    const dur = this.video.duration;

    // Update progress bar
    if (this.seekbarFill) {
      const pct = (cur / dur) * 100;
      this.seekbarFill.style.width = `${pct}%`;
    }

    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${this.formatTime(cur)} / ${this.formatTime(dur)}`;
    }

    // Auto-save progress setiap 3 detik
    if (Math.abs(cur - this.lastSavedTime) > 3) {
      this.lastSavedTime = cur;
      Store.saveWatchProgress({
        provider: this.currentDrama?.provider,
        dramaId: this.currentDrama?.id,
        title: this.currentDrama?.title,
        cover: this.currentDrama?.cover,
        episodeIndex: this.currentIndex,
        episodeCount: this.currentEpisodes.length,
        currentTime: cur,
        duration: dur,
      });
    }
  }

  onEnded() {
    const prefs = Store.getPrefs();
    if (prefs.autoplay && this.currentIndex < this.currentEpisodes.length - 1) {
      this.playEpisode(this.currentIndex + 1);
    }
  }

  resumePosition() {
    const progress = Store.getDramaProgress(this.currentDrama?.provider, this.currentDrama?.id);
    if (progress && progress.lastEpisodeIndex === this.currentIndex && progress.currentTime > 5) {
      if (progress.duration && progress.currentTime < progress.duration - 5) {
        this.video.currentTime = progress.currentTime;
      }
    }
  }

  /**
   * Pasang subtitle bawaan provider (sidecar VTT) sebagai <track> natif.
   * Native-first: yang otomatis menyala hanya track yang bahasanya sama
   * dengan bahasa UI — tidak ada terjemahan otomatis.
   */
  setSidecarSubtitles(subs) {
    this.sidecarSubs = Array.isArray(subs) ? subs.filter((s) => s && s.url) : [];
    for (const el of this.sidecarTrackEls) el.remove();
    this.sidecarTrackEls = [];
    if (this.translateTrackEl) {
      this.translateTrackEl.remove();
      this.translateTrackEl = null;
    }
    if (!this.video) return;
    for (const sub of this.sidecarSubs) {
      const el = document.createElement("track");
      el.kind = "subtitles";
      el.label = sub.label || sub.lang || "Subtitle";
      el.srclang = (sub.lang || "").slice(0, 2) || "und";
      el.src = Api.getStreamProxyUrl(sub.url);
      el.track.mode = "hidden";
      this.video.appendChild(el);
      this.sidecarTrackEls.push(el);
    }
  }

  showSidecarTrack(activeEl) {
    for (const el of this.sidecarTrackEls) {
      el.track.mode = el === activeEl ? "showing" : "hidden";
    }
    if (this.translateTrackEl && this.translateTrackEl !== activeEl) {
      this.translateTrackEl.track.mode = "hidden";
    }
  }

  populateSubtitles() {
    if (!this.subtitleSelect) return;
    const uiLang = getLanguage();
    const hlsTracks = this.hls ? this.hls.subtitleTracks || [] : [];
    const hasAny = hlsTracks.length > 0 || this.sidecarSubs.length > 0;

    this.subtitleSelect.innerHTML = `<option value="-1">${t("playerSubNone")}</option>`;
    if (!hasAny) {
      this.subtitleSelect.style.display = "none";
      return;
    }
    this.subtitleSelect.style.display = "inline-block";

    hlsTracks.forEach((track, idx) => {
      const opt = document.createElement("option");
      opt.value = `hls:${idx}`;
      opt.textContent = track.name || track.lang || `Track ${idx + 1}`;
      this.subtitleSelect.appendChild(opt);
    });

    this.sidecarSubs.forEach((sub, idx) => {
      const opt = document.createElement("option");
      opt.value = `side:${idx}`;
      opt.textContent = sub.label || sub.lang || `Subtitle ${idx + 1}`;
      this.subtitleSelect.appendChild(opt);
    });

    if (this.sidecarSubs.length > 0) {
      const opt = document.createElement("option");
      opt.value = "translate";
      opt.textContent = `🌐 ${t("playerSubTranslate")} (${uiLang.toUpperCase()})`;
      this.subtitleSelect.appendChild(opt);
    }

    // Pilihan otomatis sekali per episode: utamakan subtitle bawaan yang
    // bahasanya sama dengan UI, lalu track HLS yang cocok, selain itu mati.
    if (!this.autoSubDone) {
      this.autoSubDone = true;
      const sideIdx = this.sidecarSubs.findIndex(
        (s) => (s.lang || "").toLowerCase().startsWith(uiLang),
      );
      if (sideIdx >= 0) {
        this.subtitleSelect.value = `side:${sideIdx}`;
        this.showSidecarTrack(this.sidecarTrackEls[sideIdx]);
      } else {
        const langName = uiLang === "id" ? "indonesi" : "english";
        const hlsIdx = hlsTracks.findIndex(
          (track) =>
            (track.lang || "").toLowerCase().startsWith(uiLang) ||
            (track.name || "").toLowerCase().includes(langName),
        );
        if (hlsIdx >= 0 && this.hls) {
          this.subtitleSelect.value = `hls:${hlsIdx}`;
          this.hls.subtitleTrack = hlsIdx;
        }
      }
    }

    this.subtitleSelect.onchange = (e) => {
      const value = String(e.target.value);
      if (this.hls) this.hls.subtitleTrack = -1;
      this.showSidecarTrack(null);
      if (value.startsWith("hls:") && this.hls) {
        this.hls.subtitleTrack = parseInt(value.slice(4), 10);
      } else if (value.startsWith("side:")) {
        const idx = parseInt(value.slice(5), 10);
        this.showSidecarTrack(this.sidecarTrackEls[idx]);
      } else if (value === "translate") {
        this.showTranslatedSubtitle();
      }
    };
  }

  /** Opsi manual: terjemahkan subtitle bawaan terbaik ke bahasa UI. */
  showTranslatedSubtitle() {
    const uiLang = getLanguage();
    const src =
      this.sidecarSubs.find((s) => (s.lang || "").toLowerCase().startsWith("en")) ||
      this.sidecarSubs.find((s) => !(s.lang || "").toLowerCase().startsWith(uiLang)) ||
      this.sidecarSubs[0];
    if (!src || !this.video) return;
    if (this.translateTrackEl) this.translateTrackEl.remove();
    const el = document.createElement("track");
    el.kind = "subtitles";
    el.label = `🌐 ${t("playerSubTranslate")}`;
    el.srclang = uiLang;
    el.src = Api.getTranslatedSubtitleUrl(src.url, src.lang || "auto", uiLang);
    this.video.appendChild(el);
    this.translateTrackEl = el;
    this.showSidecarTrack(null);
    el.track.mode = "showing";
  }

  toggleFullscreen() {
    const frame = document.querySelector(".watch-player-frame") || this.video;
    if (!document.fullscreenElement) {
      frame.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  showLoader(text) {
    if (this.loader) {
      this.loader.style.display = "flex";
      if (this.loaderText && text) this.loaderText.textContent = text;
    }
  }

  hideLoader() {
    if (this.loader) {
      this.loader.style.display = "none";
    }
  }

  showError(msg) {
    if (this.errorEl) {
      this.errorEl.textContent = msg;
      this.errorEl.style.display = "block";
    }
  }

  hideError() {
    if (this.errorEl) {
      this.errorEl.textContent = "";
      this.errorEl.style.display = "none";
    }
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  stop() {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}
